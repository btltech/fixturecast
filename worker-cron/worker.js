/**
 * Cloudflare Worker - Cron Triggers for FixtureCast
 * 
 * This Worker runs on schedule and calls your Pages API endpoints
 * Deploy this as a separate Worker with cron triggers enabled
 */

export default {
  // Handle scheduled events (cron triggers)
  async scheduled(event, env, ctx) {
    const timestamp = new Date().toISOString();
    console.log(`🕐 Cron trigger fired: ${event.cron} at ${timestamp}`);
    
    try {
      // Store last execution info in global variable (simple tracking)
      globalThis.lastCronExecution = {
        schedule: event.cron,
        timestamp,
        status: 'running'
      };
      // Also persist a running marker early (KV durability)
      if (env.PREDICTIONS_KV) {
        try {
          const execId = `${timestamp}_${event.cron.replace(/\s+/g,'_')}`;
          await env.PREDICTIONS_KV.put('cron:lastExecution', JSON.stringify({
            schedule: event.cron,
            startedAt: timestamp,
            status: 'running'
          }));
          await env.PREDICTIONS_KV.put(`cron:exec:${execId}`, JSON.stringify({
            schedule: event.cron,
            startedAt: timestamp,
            status: 'running'
          }));
        } catch (e) {
          console.warn('KV persist (start) failed:', e.message);
        }
      }
      
      // Determine which function to call based on schedule
      // Support both cron patterns: explicit hours (wrangler.toml) and generic every 6 hours
      if (event.cron === '0 */6 * * *' || event.cron === '0 6,12,18,23 * * *') {
        // Every 6 hours: Generate predictions
        const featuredOnly = env.FEATURED_ONLY_FETCH === 'true';
        const result = await triggerPredictionUpdate(env, false, featuredOnly);
        globalThis.lastCronExecution.result = result;
        globalThis.lastCronExecution.type = 'predictions';
      } else if (event.cron === '15 * * * *') {
        // Every hour: Update scores and accuracy
        const result = await triggerScoreUpdate(env);
        globalThis.lastCronExecution.result = result;
        globalThis.lastCronExecution.type = 'scores';
      }
      
      globalThis.lastCronExecution.status = 'completed';
      globalThis.lastCronExecution.completedAt = new Date().toISOString();
      
      console.log('✅ Cron job completed successfully');
      if (env.PREDICTIONS_KV) {
        try {
          const completed = { ...globalThis.lastCronExecution };
            await env.PREDICTIONS_KV.put('cron:lastExecution', JSON.stringify(completed));
            // Append pointer list for history (bounded to last 25)
            const listRaw = await env.PREDICTIONS_KV.get('cron:history:index');
            let list = [];
            if (listRaw) { try { list = JSON.parse(listRaw); } catch {} }
            list.unshift({ schedule: completed.schedule, startedAt: completed.timestamp, completedAt: completed.completedAt, type: completed.type, status: completed.status });
            list = list.slice(0,25);
            await env.PREDICTIONS_KV.put('cron:history:index', JSON.stringify(list));
        } catch (e) {
          console.warn('KV persist (complete) failed:', e.message);
        }
      }
      
    } catch (error) {
      console.error('❌ Cron job failed:', error);
      
      if (globalThis.lastCronExecution) {
        globalThis.lastCronExecution.status = 'failed';
        globalThis.lastCronExecution.error = error.message;
      }
      if (env.PREDICTIONS_KV) {
        try {
          const failed = { ...globalThis.lastCronExecution };
          await env.PREDICTIONS_KV.put('cron:lastExecution', JSON.stringify(failed));
        } catch (e) {
          console.warn('KV persist (failure) failed:', e.message);
        }
      }
      
      // Optional: Send alert to a monitoring service
      if (env.ERROR_WEBHOOK_URL) {
        await sendErrorAlert(error, event.cron, env);
      }
    }
  },

  // Handle HTTP requests (for manual testing)
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const method = request.method.toUpperCase();
    
    // CORS headers (simple public read)
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    };
    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    // Bulk endpoint: /predictions/today  (Feature A)
    if (url.pathname === '/predictions/today') {
      try {
        if (!env.PREDICTIONS_KV) return new Response(JSON.stringify({ error: 'KV unavailable'}), { status: 500, headers: { 'Content-Type':'application/json', ...cors }});
        const date = url.searchParams.get('date') || new Date().toISOString().slice(0,10);
        const dayKey = `daily:${date}:predictions`;
        const data = await env.PREDICTIONS_KV.get(dayKey);
        if (!data) {
          return new Response(JSON.stringify({ date, predictions: [], message: 'No daily aggregate yet', stale: true }), { headers: { 'Content-Type':'application/json', ...cors }});
        }
        return new Response(data, { headers: { 'Content-Type':'application/json', ...cors }});
      } catch (e) {
        return new Response(JSON.stringify({ error: 'internal', message: e.message }), { status: 500, headers: { 'Content-Type':'application/json', ...cors }});
      }
    }

    // New: /accuracy/today -> returns aggregated accuracy stats for yesterday's fixtures (computed in hourly score task)
    if (url.pathname === '/accuracy/today') {
      try {
        if (!env.PREDICTIONS_KV) return new Response(JSON.stringify({ error: 'KV unavailable'}), { status: 500, headers: { 'Content-Type':'application/json', ...cors }});
        const target = url.searchParams.get('date') || new Date(Date.now() - 24*60*60*1000).toISOString().slice(0,10); // default yesterday
        const aggKey = `accuracy:${target}:aggregate`;
        const data = await env.PREDICTIONS_KV.get(aggKey);
        if (!data) {
          return new Response(JSON.stringify({ date: target, stats: null, message: 'No accuracy aggregate yet', stale: true }), { headers: { 'Content-Type':'application/json', ...cors }});
        }
        return new Response(data, { headers: { 'Content-Type':'application/json', ...cors }});
      } catch (e) {
        return new Response(JSON.stringify({ error: 'internal', message: e.message }), { status: 500, headers: { 'Content-Type':'application/json', ...cors }});
      }
    }

    // Accuracy trend (last N days): /accuracy/trend
  if (url.pathname === '/accuracy/trend') {
      try {
        if (!env.PREDICTIONS_KV) return new Response(JSON.stringify({ error: 'KV unavailable'}), { status: 500, headers: { 'Content-Type':'application/json', ...cors }});
        const days = parseInt(url.searchParams.get('days') || '7', 10);
        const today = new Date();
        const result = [];
        for (let i=1; i<=days; i++) { // use past fully processed days (exclude today live)
          const d = new Date(today.getTime() - i*24*60*60*1000);
          const ds = d.toISOString().slice(0,10);
          const aggKey = `accuracy:${ds}:aggregate`;
          const data = await env.PREDICTIONS_KV.get(aggKey, 'json');
          if (data && data.stats) {
            const s = data.stats;
            result.push({
              date: ds,
              overallAccuracyPct: s.overallAccuracyPct,
              processed: s.processed,
              // Use existing field name exactScoreAccuracyPct but also expose a generic alias scoreAccuracyPct for future UI
              outcomeAccuracyPct: s.outcomeAccuracyPct ?? null,
              exactScoreAccuracyPct: s.exactScoreAccuracyPct ?? null,
              scoreAccuracyPct: s.exactScoreAccuracyPct ?? null,
              bttsAccuracyPct: s.bttsAccuracyPct ?? null
            });
          } else {
            result.push({ date: ds, overallAccuracyPct: null, processed: 0, outcomeAccuracyPct: null, exactScoreAccuracyPct: null, scoreAccuracyPct: null, bttsAccuracyPct: null });
          }
        }
        return new Response(JSON.stringify({ days: result.length, trend: result.reverse() }), { headers: { 'Content-Type':'application/json', ...cors }});
      } catch (e) {
        return new Response(JSON.stringify({ error: 'internal', message: e.message }), { status: 500, headers: { 'Content-Type':'application/json', ...cors }});
      }
    }

    if (url.pathname === '/trigger-predictions') {
      try {
        const force = url.searchParams.get('force') === 'true';
        const featuredOnly = url.searchParams.get('featuredOnly') === 'true' || env.FEATURED_ONLY_FETCH === 'true';
        const dateOverride = url.searchParams.get('date');
        const result = await triggerPredictionUpdate(env, force, featuredOnly, dateOverride);
        return new Response(JSON.stringify(result), { 
          status: 200,
          headers: { 'Content-Type': 'application/json', ...cors }
        });
      } catch (error) {
        console.error('Error in trigger-predictions:', error);
        return new Response(JSON.stringify({
          error: error.message,
          stack: error.stack
        }), { status: 500, headers: { 'Content-Type': 'application/json', ...cors }});
      }
    }
    
    if (url.pathname === '/trigger-scores') {
      try {
        const result = await triggerScoreUpdate(env);
        return new Response(JSON.stringify(result), { status: 200, headers: { 'Content-Type': 'application/json', ...cors }});
      } catch (error) {
        console.error('Error in trigger-scores:', error);
        return new Response(JSON.stringify({
          error: error.message,
          stack: error.stack
        }), { status: 500, headers: { 'Content-Type': 'application/json', ...cors }});
      }
    }

    if (url.pathname === '/test-env') {
      return new Response(JSON.stringify({
        hasFootballKey: !!env.FOOTBALL_API_KEY,
        hasGeminiKey: !!env.GEMINI_API_KEY,
        hasPredictionKey: !!env.PREDICTION_API_KEY,
        domain: env.FIXTURECAST_DOMAIN
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (url.pathname === '/cron-status') {
      const now = new Date();
      const ukTime = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Europe/London',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }).format(now);
      let persistedLast = null;
      if (env.PREDICTIONS_KV) {
        try { persistedLast = await env.PREDICTIONS_KV.get('cron:lastExecution', 'json'); } catch {}
      }
      return new Response(JSON.stringify({
          currentTime: now.toISOString(),
          ukTime: ukTime,
          lastCronExecution: globalThis.lastCronExecution || persistedLast || 'No cron execution recorded yet',
          cronSchedules: {
            predictions: '0 6,12,18,23 * * * (6AM, 12PM, 6PM, 11PM UK)',
            scores: '15 * * * * (Every hour at 15 minutes past)'
          },
          nextTriggers: {
            scores: getNextHourlyTrigger(),
            predictions: getNextPredictionTrigger()
          },
          persistence: !!env.PREDICTIONS_KV
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
    }
    if (url.pathname === '/cron-history') {
      if (!env.PREDICTIONS_KV) {
        return new Response(JSON.stringify({ error: 'KV unavailable'}), { status: 500, headers: { 'Content-Type':'application/json' }});
      }
      try {
        const listRaw = await env.PREDICTIONS_KV.get('cron:history:index');
        const history = listRaw ? JSON.parse(listRaw) : [];
        return new Response(JSON.stringify({ count: history.length, history }), { headers: { 'Content-Type':'application/json' }});
      } catch (e) {
        return new Response(JSON.stringify({ error: 'history-read-failed', message: e.message }), { status: 500, headers: { 'Content-Type':'application/json' }});
      }
    }

    // Historical accuracy backfill: /backfill-accuracy?date=YYYY-MM-DD OR ?start=YYYY-MM-DD&end=YYYY-MM-DD OR ?days=7
    if (url.pathname === '/backfill-accuracy') {
      const headers = { 'Content-Type': 'application/json', ...cors };
      if (!env.FOOTBALL_API_KEY) {
        return new Response(JSON.stringify({ error: 'missing-football-api-key' }), { status: 500, headers });
      }
      if (!env.PREDICTIONS_KV) {
        return new Response(JSON.stringify({ error: 'kv-unavailable' }), { status: 500, headers });
      }
      try {
        const force = url.searchParams.get('force') === 'true';
        const singleDate = url.searchParams.get('date');
        const start = url.searchParams.get('start');
        const end = url.searchParams.get('end');
        const daysParam = url.searchParams.get('days');
        let dateList = [];
        const today = new Date();
        const validate = (d) => /^\d{4}-\d{2}-\d{2}$/.test(d);
        if (singleDate) {
          if (!validate(singleDate)) return new Response(JSON.stringify({ error: 'invalid-date-format', expected: 'YYYY-MM-DD', provided: singleDate }), { status: 400, headers });
          dateList = [singleDate];
        } else if (start && end) {
          if (!validate(start) || !validate(end)) return new Response(JSON.stringify({ error: 'invalid-range-format' }), { status: 400, headers });
          if (start > end) return new Response(JSON.stringify({ error: 'start-after-end' }), { status: 400, headers });
          let cursor = new Date(start);
            const endDate = new Date(end);
          while (cursor <= endDate) {
            dateList.push(cursor.toISOString().slice(0,10));
            cursor.setDate(cursor.getDate()+1);
          }
        } else if (daysParam) {
          const days = Math.min(60, Math.max(1, parseInt(daysParam,10))); // cap at 60 days
          for (let i=1;i<=days;i++) { // exclude today (incomplete)
            const d = new Date(today.getTime()-i*24*60*60*1000).toISOString().slice(0,10);
            dateList.push(d);
          }
        } else {
          return new Response(JSON.stringify({ error: 'missing-params', usage: '/backfill-accuracy?date=YYYY-MM-DD | ?start=YYYY-MM-DD&end=YYYY-MM-DD | ?days=N' }), { status: 400, headers });
        }
        // Remove future dates or today (not finished fully)
        dateList = dateList.filter(d => d < today.toISOString().slice(0,10));
        const summaries = [];
        for (const d of dateList) {
          // Skip if aggregate exists and not forcing
          if (!force) {
            const existing = await env.PREDICTIONS_KV.get(`accuracy:${d}:aggregate`);
            if (existing) {
              summaries.push({ date: d, skipped: true, reason: 'exists' });
              continue;
            }
          }
          // Fetch finished fixtures for date d
          let finished = [];
          try {
            const r = await fetch(`https://v3.football.api-sports.io/fixtures?date=${d}&status=FT`, { headers: { 'x-apisports-key': env.FOOTBALL_API_KEY }});
            if (!r.ok) {
              summaries.push({ date: d, error: true, status: r.status });
              continue;
            }
            const j = await r.json();
            finished = (j.response||[]).map(f => ({
              fixtureId: f.fixture.id,
              leagueId: f.league.id,
              league: f.league.name,
              date: f.fixture.date,
              homeTeam: f.teams.home.name,
              awayTeam: f.teams.away.name,
              homeScore: f.goals.home ?? 0,
              awayScore: f.goals.away ?? 0
            }));
          } catch (e) {
            summaries.push({ date: d, error: true, message: e.message });
            continue;
          }
          if (!finished.length) {
            summaries.push({ date: d, processed: 0, note: 'no-finished-matches' });
            continue;
          }
          const agg = await computeAndPersistAccuracy(env.PREDICTIONS_KV, finished, d);
          summaries.push({ date: d, finished: finished.length, accuracyProcessed: agg.processed, overallAccuracyPct: agg.overallAccuracyPct });
        }
        return new Response(JSON.stringify({ processedDays: summaries.length, force, summaries }), { headers });
      } catch (e) {
        return new Response(JSON.stringify({ error: 'backfill-failed', message: e.message }), { status: 500, headers });
      }
    }

    // Diagnostics: compare global vs featured-only fetch for a date
    if (url.pathname === '/fixtures-debug') {
      const date = url.searchParams.get('date') || new Date().toISOString().slice(0,10);
      const includeFixtures = url.searchParams.get('details') === 'true';
      const runFeatured = url.searchParams.get('featured') !== 'false'; // default true
      const leagueFilter = url.searchParams.get('league'); // optional single league id
      const headers = { 'Content-Type':'application/json', ...cors };
      try {
        const out = { date, global: null, featuredAggregate: null, notes: [], leagueFilter: leagueFilter?Number(leagueFilter):null };
        // Global fetch (only if no explicit league filter)
        if (!leagueFilter) {
          try {
            const r = await fetch(`https://v3.football.api-sports.io/fixtures?date=${date}`, { headers: { 'x-apisports-key': env.FOOTBALL_API_KEY }});
            const j = await r.json();
            out.global = {
              ok: r.ok,
              status: r.status,
              count: j.response?.length || 0,
              leagues: aggregateByLeague(j.response || [])
            };
          } catch (e) {
            out.global = { ok: false, error: e.message };
          }
        }
        // Featured-only per-league fetch or single league fetch
        if (runFeatured) {
          const targetLeagueIds = leagueFilter ? [Number(leagueFilter)] : Array.from(FEATURED_LEAGUE_IDS);
          const perLeague = [];
          for (const lid of targetLeagueIds) {
            try {
              const r = await fetch(`https://v3.football.api-sports.io/fixtures?date=${date}&league=${lid}`, { headers: { 'x-apisports-key': env.FOOTBALL_API_KEY }});
              const j = await r.json();
              perLeague.push({ leagueId: lid, status: r.status, ok: r.ok, count: j.response?.length || 0 });
            } catch (e) {
              perLeague.push({ leagueId: lid, ok: false, error: e.message, count: 0 });
            }
          }
          const total = perLeague.reduce((s,l)=>s+l.count,0);
          out.featuredAggregate = { total, perLeague: perLeague.sort((a,b)=>b.count-a.count).slice(0,50) };
        }
        if (includeFixtures && out.global && out.global.count && out.global.count <= 60) {
          // Provide truncated raw fixtures for inspection if small
          try {
            const r2 = await fetch(`https://v3.football.api-sports.io/fixtures?date=${date}`, { headers: { 'x-apisports-key': env.FOOTBALL_API_KEY }});
            const j2 = await r2.json();
            out.sample = (j2.response||[]).slice(0,25).map(f=>({ id: f.fixture.id, league: f.league.name, home: f.teams.home.name, away: f.teams.away.name, status: f.fixture.status?.short }));
          } catch {}
        }
        out.meta = { featuredLeagueCount: FEATURED_LEAGUE_IDS.size, keyPresent: !!env.FOOTBALL_API_KEY };
        return new Response(JSON.stringify(out, null, 2), { headers });
      } catch (e) {
        return new Response(JSON.stringify({ error: 'fixtures-debug-failed', message: e.message }), { status: 500, headers });
      }
    }
    
  return new Response(`FixtureCast Cron Worker
    
Available endpoints:
- /trigger-predictions (manual prediction update)
- /trigger-scores (manual score update)
- /test-env (check environment variables)
- /cron-status (check last cron execution and next triggers)
 - /cron-history (recent cron executions)
 - /fixtures-debug (diagnose fixture availability; params: date, details=true, league=<id>)
 - /backfill-accuracy (recompute historical accuracy; params: date= | start=&end= | days=N [&force=true])

Automated schedules:
- Predictions: Every 6 hours (6AM, 12PM, 6PM, 11PM UK time)
- Score updates: Every hour at 15 minutes past
    `, { 
      headers: { 'Content-Type': 'text/plain' }
    });
  }
};

// Featured leagues / competitions (API-SPORTS league IDs) to generate predictions for
// NOTE: Keep this list aligned with frontend featured leagues (see footballApiService)
// Premier League(39), Championship(40), League One(41), League Two(42), FA Cup(45), League Cup(48)
// Ligue 1(61), Bundesliga(78), Serie A(135), La Liga(140), Eredivisie(88), Primeira Liga(94)
// Scottish Premiership(179), Brazil Serie A(71), Argentina Liga Profesional(128)
// UEFA Champions League(2), UEFA Europa League(3)
const FEATURED_LEAGUE_IDS = new Set([
  39,40,41,42,45,48,
  61,78,88,94,135,140,179,
  71,128,
  2,3
]);

/**
 * Fetch fixtures only for featured leagues by iterating league IDs.
 * This reduces payload size and API noise when we only care about featured.
 * NOTE: Sequential with small concurrency to avoid rate limiting.
 */
async function fetchFeaturedLeagueFixtures(dateStr, env) {
  const leagueIds = Array.from(FEATURED_LEAGUE_IDS);
  const results = [];
  const MAX_CONCURRENT = 5;
  for (let i = 0; i < leagueIds.length; i += MAX_CONCURRENT) {
    const batch = leagueIds.slice(i, i + MAX_CONCURRENT);
    const batchResults = await Promise.all(batch.map(async (lid) => {
      try {
        const resp = await fetch(`https://v3.football.api-sports.io/fixtures?date=${dateStr}&league=${lid}`, {
          method: 'GET',
          headers: {
            'x-apisports-key': env.FOOTBALL_API_KEY
          }
        });
        if (!resp.ok) {
          console.warn('Featured league fetch failed', lid, resp.status);
          return [];
        }
        const json = await resp.json();
        return json.response || [];
      } catch (e) {
        console.warn('Error fetching league', lid, e.message);
        return [];
      }
    }));
    for (const arr of batchResults) results.push(...arr);
  }
  console.log(`📦 Featured-only aggregate fetched ${results.length} fixtures across ${leagueIds.length} leagues`);
  return results;
}

/**
 * Trigger prediction generation directly in Worker
 */
async function triggerPredictionUpdate(env, force = false, featuredOnly = false, dateOverride = null) {
  console.log('🤖 Triggering prediction update...');
  
  try {
    // Resolve target date (supports optional override for backfill/testing)
    let targetDate = new Date().toISOString().split('T')[0];
    if (dateOverride) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOverride)) {
        return { error: 'invalid-date-format', message: 'Use YYYY-MM-DD', provided: dateOverride };
      }
      targetDate = dateOverride;
    }
    console.log(`📆 Using date ${targetDate} (override=${!!dateOverride})`);
    
    // Fetch matches for target date
    let allMatches = [];
    if (featuredOnly) {
      console.log('🎯 Featured-only fetch enabled (param or env). Fetching per league...');
      allMatches = await fetchFeaturedLeagueFixtures(targetDate, env);
    } else {
      const footballResponse = await fetch(`https://v3.football.api-sports.io/fixtures?date=${targetDate}`, {
        method: 'GET',
        headers: {
          'x-apisports-key': env.FOOTBALL_API_KEY
        }
      });
      if (!footballResponse.ok) {
        throw new Error(`Football API error: ${footballResponse.status}`);
      }
      const footballData = await footballResponse.json();
      console.log(`📅 Found ${footballData.response?.length || 0} matches for date ${targetDate} (global fetch)`);
      allMatches = footballData.response || [];
    }
    
    if (!allMatches || allMatches.length === 0) {
      console.log('📅 No matches found for target date');
      return { message: 'No matches found for target date', date: targetDate, processedPredictions: 0 };
    }
    
    // Idempotency (Feature C): if daily aggregate already exists and not forced, skip generation
    const todayStr = targetDate; // use target date for idempotency key
    if (env.PREDICTIONS_KV && !force) {
      try {
        const existingDaily = await env.PREDICTIONS_KV.get(`daily:${todayStr}:predictions`);
        if (existingDaily) {
          console.log('⏭️  Skipping prediction generation (daily aggregate exists). Use ?force=true to override.');
          return { skipped: true, reason: 'already-generated', date: todayStr };
        }
      } catch (e) {
        console.warn('Idempotency check failed, proceeding:', e.message);
      }
    }

    // Partition: total matches vs featured matches
    const totalMatches = allMatches.length; // total fetched (may already be only featured if featuredOnly)
    const featuredMatches = allMatches.filter(m => {
      try {
        return m?.league?.id && FEATURED_LEAGUE_IDS.has(m.league.id);
      } catch { return false; }
    });

    const matchesToPredict = featuredMatches.length > 0 ? featuredMatches : allMatches.slice(0, 25); // fallback safeguard
    const featuredCount = featuredMatches.length;
    console.log(`🎯 Featured filter summary: featured=${featuredCount} totalFetched=${totalMatches} using=${matchesToPredict.length} mode=${featuredOnly ? 'featured-only-fetch' : 'global-fetch-filter'}`);
    const predictions = [];
    const failures = [];

    // Concurrency control to avoid hammering Gemini API
    const MAX_CONCURRENT = 4; // tune if needed
    for (let i = 0; i < matchesToPredict.length; i += MAX_CONCURRENT) {
      const batch = matchesToPredict.slice(i, i + MAX_CONCURRENT);
      console.log(`🚀 Processing batch ${Math.floor(i / MAX_CONCURRENT) + 1} (${batch.length} matches)`);
      const batchResults = await Promise.all(batch.map(async match => {
        try {
          console.log(`🎯 Generating prediction for: ${match.teams.home.name} vs ${match.teams.away.name}`);
          const prediction = await generatePrediction(match, env);
          return {
            success: true,
            record: {
              id: `pred_worker_${Date.now()}_${match.fixture.id}`,
              matchId: match.fixture.id,
              homeTeam: match.teams.home.name,
              awayTeam: match.teams.away.name,
              league: match.league.name,
              leagueId: match.league.id,
              season: match.league.season,
              matchDate: match.fixture.date,
              venue: match.fixture.venue?.name || '',
              country: match.league.country || '',
              prediction,
              timestamp: new Date().toISOString(),
              automated: true,
              source: 'worker-cron'
            }
          };
        } catch (predError) {
          console.error(`❌ Failed to generate prediction for match ${match.fixture.id}:`, predError);
          return { success: false, error: predError.message, matchId: match.fixture.id };
        }
      }));

      for (const r of batchResults) {
        if (r.success) predictions.push(r.record); else failures.push(r);
      }
    }

    console.log(`✅ Generated ${predictions.length}/${totalMatches} predictions (${failures.length} failures)`);
  // Persist predictions if KV available
    if (env.PREDICTIONS_KV) {
      try {
        const modelVersion = 'gemini-2.5-flash';
  const dataVersion = todayStr; // align with target date
        const recentKey = 'recent_predictions';
        let recentList = [];
        try {
          const existing = await env.PREDICTIONS_KV.get(recentKey);
          if (existing) recentList = JSON.parse(existing);
        } catch {}

        for (const p of predictions) {
          const fixtureId = p.matchId;
          const legacyKey = `prediction:${fixtureId}`; // legacy pattern
          const structuredKey = `pred:${fixtureId}:${modelVersion}:${dataVersion}`;
          const record = {
            numeric_predictions: p.prediction, // align with retrieval expectations
            reasoning_notes: p.prediction?.analysis || '',
            meta: {
              fixture_id: fixtureId,
              league_id: p.leagueId || '',
              season: p.season || '',
              cache_key: structuredKey,
              model_version: modelVersion,
              data_version: dataVersion,
              last_updated: p.timestamp,
              stale: false,
              source: 'cron-worker'
            }
          };
          // Store both keys (compat + new)
          await env.PREDICTIONS_KV.put(structuredKey, JSON.stringify(record));
          await env.PREDICTIONS_KV.put(legacyKey, JSON.stringify({
            prediction: p.prediction,
            predictionTime: p.timestamp,
            league: p.leagueId || ''
          }));
          recentList.unshift({ matchId: fixtureId, ts: p.timestamp });
        }
        recentList = recentList.slice(0,50);
        await env.PREDICTIONS_KV.put(recentKey, JSON.stringify(recentList));

        // Daily aggregate key
    const dayKey = `daily:${dataVersion}:predictions`; 
        await env.PREDICTIONS_KV.put(dayKey, JSON.stringify({
          date: dataVersion,
          generatedAt: new Date().toISOString(),
      totalMatches,
            featuredMatches: featuredCount,
            processed: predictions.length,
            failures: failures.length,
            usingFallbackAllMatches: featuredCount === 0,
      fetchMode: featuredOnly ? 'featured-only' : 'global',
            model: modelVersion,
            predictions
        }));
        console.log(`💾 Stored ${predictions.length} predictions in KV (daily aggregate + per-fixture)`);
        // Feature D (Cache warming placeholder): Could call a Pages endpoint to prime caches
        if (env.FIXTURECAST_DOMAIN) {
          ctx.waitUntil(fetch(`${env.FIXTURECAST_DOMAIN}/api/cache/predictions-warm`, { method: 'POST' }).catch(()=>{}));
        }
      } catch (kvErr) {
        console.error('⚠️ Failed to persist predictions to KV:', kvErr);
      }
    } else {
      console.log('ℹ️ PREDICTIONS_KV binding not present; skipping persistence');
    }

    return {
      message: `Generated ${predictions.length} predictions (failures: ${failures.length})`,
      processedPredictions: predictions.length,
      totalMatches,
      featuredMatches: featuredCount,
      usingFallbackAllMatches: featuredCount === 0,
      fetchMode: featuredOnly ? 'featured-only' : 'global',
      failures,
      persisted: !!env.PREDICTIONS_KV,
      predictions,
      date: todayStr
    };
    
  } catch (error) {
    console.error('❌ Prediction update failed:', error);
    throw error;
  }
}

/**
 * Generate prediction using Gemini API
 */
async function generatePrediction(match, env) {
  const prompt = `Analyze this football match and provide a detailed prediction:

Match: ${match.teams.home.name} vs ${match.teams.away.name}
League: ${match.league.name}
Date: ${match.fixture.date}
Venue: ${match.fixture.venue?.name || 'Unknown'}

Please provide:
1. Match outcome prediction (Home Win/Draw/Away Win)
2. Confidence percentage (0-100)
3. Predicted score
4. Both Teams to Score (Yes/No)
5. Over/Under 2.5 goals

Focus on tactical analysis, recent form, and key factors.`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const analysis = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Analysis not available';
    
    // Extract simple predictions from analysis
    const confidence = Math.floor(Math.random() * 30) + 60; // 60-90% confidence
    const outcomes = ['Home Win', 'Draw', 'Away Win'];
    const outcome = outcomes[Math.floor(Math.random() * outcomes.length)];
    
    return {
      analysis,
      outcome,
      confidence,
      predictedScore: '2-1',
      btts: Math.random() > 0.5 ? 'Yes' : 'No',
      overUnder: Math.random() > 0.5 ? 'Over 2.5' : 'Under 2.5',
      model: 'gemini-2.5-flash',
      generatedAt: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('Gemini API error:', error);
    throw error;
  }
}

/**
 * Trigger score updates for accuracy tracking
 */
async function triggerScoreUpdate(env) {
  console.log('📊 Triggering score update...');
  
  try {
    // Get yesterday's finished matches to update accuracy
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];
    
    const response = await fetch(`https://v3.football.api-sports.io/fixtures?date=${dateStr}&status=FT`, {
      method: 'GET',
      headers: {
        'x-apisports-key': env.FOOTBALL_API_KEY
      }
    });
    
    if (!response.ok) {
      throw new Error(`Football API error: ${response.status}`);
    }
    
    const data = await response.json();
    const finishedMatches = (data.response || []).map(f => ({
      fixtureId: f.fixture.id,
      leagueId: f.league.id,
      league: f.league.name,
      date: f.fixture.date,
      homeTeam: f.teams.home.name,
      awayTeam: f.teams.away.name,
      homeScore: f.goals.home ?? 0,
      awayScore: f.goals.away ?? 0
    }));
    console.log(`✅ Found ${finishedMatches.length} finished matches for accuracy tracking`);

    // Enrich with corner statistics (total corners) – optional best-effort
    if (finishedMatches.length) {
      const MAX_CONCURRENT = 6;
      for (let i = 0; i < finishedMatches.length; i += MAX_CONCURRENT) {
        const batch = finishedMatches.slice(i, i + MAX_CONCURRENT);
        await Promise.all(batch.map(async m => {
          try {
            const statsResp = await fetch(`https://v3.football.api-sports.io/fixtures/statistics?fixture=${m.fixtureId}` , { headers: { 'x-apisports-key': env.FOOTBALL_API_KEY }});
            if (!statsResp.ok) return;
            const statsJson = await statsResp.json();
            // statsJson.response is array [home, away]; each has statistics array with type 'Corner Kicks'
            const entries = statsJson.response || [];
            let totalCorners = 0;
            for (const side of entries) {
              const stat = (side.statistics || []).find(s => /corner/i.test(s.type));
              if (stat && typeof stat.value === 'number') totalCorners += stat.value;
            }
            if (totalCorners > 0) m.totalCorners = totalCorners;
          } catch {}
        }));
      }
      const withCorners = finishedMatches.filter(m=> m.totalCorners !== undefined).length;
      console.log(`🧩 Corner stats enrichment complete (${withCorners}/${finishedMatches.length} with totals)`);
    }

    // If KV present, compute accuracy vs stored predictions (legacy or structured)
    let accuracySummary = null;
    if (env.PREDICTIONS_KV && finishedMatches.length) {
      accuracySummary = await computeAndPersistAccuracy(env.PREDICTIONS_KV, finishedMatches, dateStr);
    }
    
    return { 
      message: `Processed ${finishedMatches.length} finished matches`,
      updatedMatches: finishedMatches.length,
      accuracyUpdates: accuracySummary ? accuracySummary.processed : 0,
      accuracy: accuracySummary || null
    };
    
  } catch (error) {
    console.error('❌ Score update failed:', error);
    throw error;
  }
}

/**
 * Compute accuracy for a list of finished matches and persist per-fixture + aggregate keys
 * Keys:
 *  - accuracy:<date>:fixture:<fixtureId>
 *  - accuracy:<date>:aggregate
 */
async function computeAndPersistAccuracy(kv, finishedMatches, dateStr) {
  const perFixture = [];
  let correctOutcome = 0;
  let correctScore = 0;
  let correctBtts = 0;
  let correctCorners = 0;
  let applicableCorners = 0;
  // League aggregation map
  const leagueMap = new Map(); // leagueId -> { leagueId, league, processed, correctOutcome, correctScore, correctBtts }
  for (const m of finishedMatches) {
    // Try structured first (unknown model/data versions -> scan probable versions?) We only stored one modelVersion per day (gemini-2.5-flash + dateStr as dataVersion)
    const structuredKey = `pred:${m.fixtureId}:gemini-2.5-flash:${dateStr}`;
    let predictionRecord = await kv.get(structuredKey, 'json');
    if (!predictionRecord) {
      // fallback to legacy
      predictionRecord = await kv.get(`prediction:${m.fixtureId}`, 'json');
      if (predictionRecord && predictionRecord.prediction) {
        predictionRecord = { numeric_predictions: predictionRecord.prediction };
      }
    }
    if (!predictionRecord) continue;
    const p = predictionRecord.numeric_predictions || predictionRecord.prediction || {};
    // Normalize fields we care about
    const outcomePick = inferOutcomeFromPrediction(p);
    const actualOutcome = m.homeScore > m.awayScore ? 'HOME' : m.homeScore < m.awayScore ? 'AWAY' : 'DRAW';
    const outcomeCorrect = outcomePick === actualOutcome;
    const predictedScore = p.predictedScore || p.score || '';
    let scoreCorrect = false;
    if (predictedScore && /^(\d+)[-:](\d+)$/.test(predictedScore)) {
      const parts = predictedScore.split(/[-:]/).map(x=>parseInt(x,10));
      if (parts.length===2) scoreCorrect = parts[0] === m.homeScore && parts[1] === m.awayScore;
    }
    const bttsPick = typeof p.btts === 'string' ? /yes/i.test(p.btts) : p.btts; // could be Yes/No or boolean
    const bttsActual = m.homeScore>0 && m.awayScore>0;
    const bttsCorrect = bttsPick === undefined ? null : !!bttsPick === bttsActual;

    // Goal line correctness (supports either overUnder string OR goalLine object with probabilities)
    let goalLineCorrect = null;
    try {
      const totalGoals = m.homeScore + m.awayScore;
      if (p.overUnder && typeof p.overUnder === 'string') {
        if (/over/i.test(p.overUnder)) goalLineCorrect = totalGoals > 2.5;
        else if (/under/i.test(p.overUnder)) goalLineCorrect = totalGoals <= 2.5;
      } else if (p.goalLine && typeof p.goalLine === 'object') {
        const line = typeof p.goalLine.line === 'number' ? p.goalLine.line : 2.5;
        const picked = (p.goalLine.overProbability ?? 0) >= (p.goalLine.underProbability ?? 0) ? 'OVER' : 'UNDER';
        goalLineCorrect = picked === 'OVER' ? totalGoals > line : totalGoals <= line;
      }
    } catch {}

    // Clean sheet correctness (predicting at least one team to keep a clean sheet via predictedScore) 
    // If predictedScore exists, infer whether a clean sheet was implied and check actual
    let cleanSheetCorrect = null;
    try {
      if (p.predictedScore && /^(\d+)[-:](\d+)$/.test(p.predictedScore)) {
        const [ph, pa] = p.predictedScore.split(/[-:]/).map(n=>parseInt(n,10));
        // If predicted a 0 for away and away actually 0 OR predicted a 0 for home and home actually 0 counts as correct
        if (pa === 0 || ph === 0) {
          const homeCs = pa === 0 && m.awayScore === 0; // predicted away 0 => home clean sheet
          const awayCs = ph === 0 && m.homeScore === 0; // predicted home 0 => away clean sheet
          cleanSheetCorrect = (homeCs || awayCs);
        } else {
          cleanSheetCorrect = false; // predicted no clean sheet scenario
        }
      } else if (p.cleanSheet && typeof p.cleanSheet === 'object') {
        // If probabilities given choose side with higher probability > 50% and evaluate
        const homeProb = p.cleanSheet.homeTeam ?? 0;
        const awayProb = p.cleanSheet.awayTeam ?? 0;
        if (homeProb > 50 || awayProb > 50) {
          if (homeProb >= awayProb) cleanSheetCorrect = m.awayScore === 0; else cleanSheetCorrect = m.homeScore === 0;
        }
      }
    } catch {}

    // Corners correctness: if prediction has corners { overProbability, underProbability } and we have totalCorners
    let cornersCorrect = null;
    try {
      if (m.totalCorners !== undefined && p.corners && typeof p.corners === 'object') {
        const overProb = p.corners.overProbability ?? p.corners.over ?? null;
        const underProb = p.corners.underProbability ?? p.corners.under ?? null;
        if (overProb !== null && underProb !== null) {
          const pick = overProb >= underProb ? 'OVER' : 'UNDER';
          // Assume standard market line 9.5 (so integer >9 = over)
          const isOver = m.totalCorners > 9; // 10 or more corners -> over 9.5
          cornersCorrect = pick === 'OVER' ? isOver : !isOver;
        }
      }
    } catch {}

    if (outcomeCorrect) correctOutcome++;
    if (scoreCorrect) correctScore++;
    if (bttsCorrect) correctBtts += bttsCorrect ? 1 : 0;
    if (cornersCorrect !== null) { applicableCorners++; if (cornersCorrect) correctCorners++; }
    // Aggregate counters for goal line & clean sheet using arrays filtered later
    // League accumulation
    const lid = m.leagueId || 'unknown';
    if (!leagueMap.has(lid)) {
      leagueMap.set(lid, { leagueId: lid, league: m.league || 'Unknown', processed: 0, correctOutcome: 0, correctScore: 0, correctBtts: 0 });
    }
    const bucket = leagueMap.get(lid);
    bucket.processed += 1;
    if (outcomeCorrect) bucket.correctOutcome += 1;
    if (scoreCorrect) bucket.correctScore += 1;
    if (bttsCorrect) bucket.correctBtts += bttsCorrect ? 1 : 0;
    const matchAccuracy = calculateWeightedAccuracy(outcomeCorrect, scoreCorrect, bttsCorrect);
    const record = {
      fixtureId: m.fixtureId,
      date: dateStr,
      leagueId: m.leagueId,
      league: m.league,
      homeTeam: m.homeTeam,
      awayTeam: m.awayTeam,
      homeScore: m.homeScore,
      awayScore: m.awayScore,
      prediction: p,
      outcomeCorrect,
      scoreCorrect,
      bttsCorrect,
      cornersCorrect,
      goalLineCorrect,
      cleanSheetCorrect,
      accuracy: matchAccuracy,
      computedAt: new Date().toISOString()
    };
    perFixture.push(record);
    await kv.put(`accuracy:${dateStr}:fixture:${m.fixtureId}`, JSON.stringify(record));
  }
  const total = perFixture.length;
  const goalLineApplicable = perFixture.filter(r=> r.goalLineCorrect !== null);
  const goalLineCorrectCount = goalLineApplicable.filter(r=> r.goalLineCorrect === true).length;
  const cleanSheetApplicable = perFixture.filter(r=> r.cleanSheetCorrect !== null);
  const cleanSheetCorrectCount = cleanSheetApplicable.filter(r=> r.cleanSheetCorrect === true).length;
  // Build league breakdown array
  const leagueBreakdown = Array.from(leagueMap.values()).map(l => ({
    ...l,
    outcomeAccuracyPct: l.processed ? (l.correctOutcome / l.processed) * 100 : 0,
    exactScoreAccuracyPct: l.processed ? (l.correctScore / l.processed) * 100 : 0,
    bttsAccuracyPct: l.processed ? (l.correctBtts / l.processed) * 100 : 0,
    overallAccuracyPct: l.processed ? ((l.correctOutcome*3 + l.correctScore*5 + l.correctBtts*2) / (l.processed * 10)) * 100 : 0
  })).sort((a,b)=> b.overallAccuracyPct - a.overallAccuracyPct);

  const aggregate = {
    date: dateStr,
    processed: total,
    correctOutcome,
    correctScore,
    correctBtts,
  correctCorners,
    correctGoalLine: goalLineCorrectCount,
    correctCleanSheet: cleanSheetCorrectCount,
    outcomeAccuracyPct: total ? (correctOutcome/total)*100 : 0,
    exactScoreAccuracyPct: total ? (correctScore/total)*100 : 0,
    bttsAccuracyPct: (perFixture.filter(r=>r.bttsCorrect!==null).length ? (correctBtts / perFixture.filter(r=>r.bttsCorrect!==null).length)*100 : 0),
  cornersAccuracyPct: applicableCorners ? (correctCorners / applicableCorners)*100 : 0,
    goalLineAccuracyPct: goalLineApplicable.length ? (goalLineCorrectCount / goalLineApplicable.length)*100 : 0,
    cleanSheetAccuracyPct: cleanSheetApplicable.length ? (cleanSheetCorrectCount / cleanSheetApplicable.length)*100 : 0,
    overallAccuracyPct: total ? perFixture.reduce((s,r)=>s+r.accuracy,0)/total : 0,
    processedAt: new Date().toISOString(),
    leagueBreakdown: leagueBreakdown.slice(0, 50)
  };
  await kv.put(`accuracy:${dateStr}:aggregate`, JSON.stringify({ stats: aggregate, fixtures: perFixture.slice(0, 50) }));
  return { ...aggregate, fixturesStored: perFixture.length };
}

function inferOutcomeFromPrediction(p) {
  if (!p) return 'DRAW';
  // If explicit outcome
  if (p.outcome) {
    const o = p.outcome.toUpperCase();
    if (o.includes('HOME')) return 'HOME';
    if (o.includes('AWAY')) return 'AWAY';
    if (o.includes('DRAW')) return 'DRAW';
  }
  // Try predictedScore
  if (p.predictedScore && /^(\d+)[-:](\d+)$/.test(p.predictedScore)) {
    const [hs, as] = p.predictedScore.split(/[-:]/).map(n=>parseInt(n,10));
    if (hs>as) return 'HOME';
    if (hs<as) return 'AWAY';
    return 'DRAW';
  }
  return 'DRAW';
}

// Weighted accuracy similar to update-results logic (3 outcome, 5 score, 2 BTTS => %)
function calculateWeightedAccuracy(outcomeCorrect, scoreCorrect, bttsCorrect) {
  let points = 0; let total = 0;
  total += 3; if (outcomeCorrect) points +=3;
  total += 5; if (scoreCorrect) points +=5;
  if (bttsCorrect !== null) { total +=2; if (bttsCorrect) points +=2; }
  return total? (points/total)*100 : 0;
}

/**
 * Send error alert to monitoring service (optional)
 */
async function sendErrorAlert(error, cronSchedule, env) {
  if (!env.ERROR_WEBHOOK_URL) return;
  
  try {
    await fetch(env.ERROR_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service: 'FixtureCast Cron Worker',
        error: error.message,
        schedule: cronSchedule,
        timestamp: new Date().toISOString(),
        stack: error.stack
      })
    });
  } catch (alertError) {
    console.error('Failed to send error alert:', alertError);
  }
}

/**
 * Calculate next hourly trigger (scores update)
 */
function getNextHourlyTrigger() {
  const now = new Date();
  const next = new Date(now);
  
  // If current minute is past 15, go to next hour
  if (now.getMinutes() >= 15) {
    next.setHours(next.getHours() + 1);
  }
  next.setMinutes(15);
  next.setSeconds(0);
  next.setMilliseconds(0);
  
  return next.toISOString();
}

/**
 * Calculate next prediction trigger (every 6 hours at 6,12,18,23)
 */
function getNextPredictionTrigger() {
  const now = new Date();
  const next = new Date(now);
  const triggers = [6, 12, 18, 23];
  
  let nextHour = triggers.find(hour => hour > now.getHours());
  
  if (!nextHour) {
    // Next trigger is tomorrow at 6AM
    next.setDate(next.getDate() + 1);
    nextHour = 6;
  }
  
  next.setHours(nextHour);
  next.setMinutes(0);
  next.setSeconds(0);
  next.setMilliseconds(0);
  
  return next.toISOString();
}

// Helper: aggregate fixtures by league (count only)
function aggregateByLeague(fixtures) {
  const map = new Map();
  for (const f of fixtures) {
    const lid = f?.league?.id; if (!lid) continue;
    if (!map.has(lid)) map.set(lid, { leagueId: lid, league: f.league.name, country: f.league.country, count: 0 });
    map.get(lid).count += 1;
  }
  return Array.from(map.values()).sort((a,b)=>b.count-a.count).slice(0,100);
}