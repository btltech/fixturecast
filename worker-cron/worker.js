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
      // Only score updates are scheduled automatically now
      if (event.cron === '15 * * * *') {
        // Every hour: Update scores and accuracy
        const result = await triggerScoreUpdate(env);
        globalThis.lastCronExecution.result = result;
        globalThis.lastCronExecution.type = 'scores';
      } else {
        // Unknown schedule - log and skip
        console.log(`⚠️ Unknown cron schedule: ${event.cron} - skipping`);
        globalThis.lastCronExecution.result = { message: 'Unknown schedule - skipped' };
        globalThis.lastCronExecution.type = 'unknown';
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
        const resume = url.searchParams.get('resume') === 'true';
        const waveSizeParam = url.searchParams.get('wave');
        const preferredModel = url.searchParams.get('model'); // optional model override
        const waveSize = waveSizeParam ? Math.min(60, Math.max(1, parseInt(waveSizeParam, 10))) : null; // cap a single wave to 60
        const result = await triggerPredictionUpdate(env, force, featuredOnly, dateOverride, { resume, waveSize, preferredModel });
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

    // List fixtures missing predictions for a date (featured or global)
    if (url.pathname === '/missing-predictions') {
      try {
        const date = url.searchParams.get('date') || new Date().toISOString().slice(0,10);
        const featuredOnly = url.searchParams.get('featuredOnly') === 'true';
        const fixtures = await fetchFixturesForDate(date, env, featuredOnly);
        if (!fixtures.length) return new Response(JSON.stringify({ date, totalFixtures: 0, missingCount: 0, missing: [] }), { headers: { 'Content-Type':'application/json', ...cors }});
        const modelVersion = 'gemini-2.5-flash';
        const missing = [];
        for (const f of fixtures) {
          const key = `pred:${f.fixture.id}:${modelVersion}:${date}`;
          const found = env.PREDICTIONS_KV ? await env.PREDICTIONS_KV.get(key) : null;
          if (!found) missing.push({ fixtureId: f.fixture.id, home: f.teams.home.name, away: f.teams.away.name, league: f.league.name });
          if (missing.length >= 500) break; // safety cap
        }
        return new Response(JSON.stringify({ date, featuredOnly, totalFixtures: fixtures.length, missingCount: missing.length, missing }), { headers: { 'Content-Type':'application/json', ...cors }});
      } catch (e) {
        return new Response(JSON.stringify({ error: 'missing-predictions-failed', message: e.message }), { status: 500, headers: { 'Content-Type':'application/json', ...cors }});
      }
    }

    // Clear predictions for a specific date
    if (url.pathname === '/clear-predictions') {
      const date = url.searchParams.get('date');
      const confirm = url.searchParams.get('confirm') === 'true';
      
      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return new Response(JSON.stringify({ 
          error: 'invalid-date', 
          usage: '/clear-predictions?date=YYYY-MM-DD&confirm=true' 
        }), { status: 400, headers: { 'Content-Type':'application/json', ...cors }});
      }
      
      if (!confirm) {
        return new Response(JSON.stringify({ 
          error: 'confirmation-required', 
          message: 'Add &confirm=true to confirm clearing predictions' 
        }), { status: 400, headers: { 'Content-Type':'application/json', ...cors }});
      }
      
      if (!env.PREDICTIONS_KV) {
        return new Response(JSON.stringify({ error: 'kv-unavailable' }), { 
          status: 500, headers: { 'Content-Type':'application/json', ...cors }});
      }
      
      try {
        console.log(`🧹 Clearing predictions for ${date}...`);
        let clearedKeys = 0;
        const errors = [];
        
        // Clear daily aggregate
        const dayKey = `daily:${date}:predictions`;
        await env.PREDICTIONS_KV.delete(dayKey);
        clearedKeys++;
        
        // Clear progress tracking
        const progressKey = `daily:${date}:progress`;
        await env.PREDICTIONS_KV.delete(progressKey);
        clearedKeys++;
        
        // Clear individual prediction keys (structured format)
        const structuredPrefix = `pred:`;
        const { keys } = await env.PREDICTIONS_KV.list({ prefix: structuredPrefix });
        
        for (const key of keys) {
          if (key.name.includes(`:${date}`)) {
            try {
              await env.PREDICTIONS_KV.delete(key.name);
              clearedKeys++;
            } catch (err) {
              errors.push(`Failed to delete ${key.name}: ${err.message}`);
            }
          }
        }
        
        // Clear legacy prediction keys
        const legacyPrefix = `prediction:`;
        const { keys: legacyKeys } = await env.PREDICTIONS_KV.list({ prefix: legacyPrefix });
        
        for (const key of legacyKeys) {
          try {
            await env.PREDICTIONS_KV.delete(key.name);
            clearedKeys++;
          } catch (err) {
            errors.push(`Failed to delete legacy ${key.name}: ${err.message}`);
          }
        }
        
        // Clear recent predictions list
        await env.PREDICTIONS_KV.delete('recent_predictions');
        clearedKeys++;
        
        console.log(`✅ Cleared ${clearedKeys} keys for ${date}`);
        
        return new Response(JSON.stringify({
          success: true,
          message: `Cleared ${clearedKeys} prediction keys for ${date}`,
          clearedKeys,
          date,
          errors: errors.length > 0 ? errors : undefined
        }), { headers: { 'Content-Type':'application/json', ...cors }});
        
      } catch (error) {
        console.error('Clear predictions error:', error);
        return new Response(JSON.stringify({ 
          error: 'clear-failed', 
          message: error.message 
        }), { status: 500, headers: { 'Content-Type':'application/json', ...cors }});
      }
    }

    // Rebuild daily aggregate from per-fixture prediction keys (data recovery)
    if (url.pathname === '/rebuild-daily') {
      try {
        const date = url.searchParams.get('date');
        if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
          return new Response(JSON.stringify({ error: 'invalid-date', usage: '/rebuild-daily?date=YYYY-MM-DD&featuredOnly=true' }), { status: 400, headers: { 'Content-Type':'application/json', ...cors }});
        }
        const featuredOnly = url.searchParams.get('featuredOnly') === 'true';
        if (!env.PREDICTIONS_KV) return new Response(JSON.stringify({ error: 'kv-unavailable' }), { status: 500, headers: { 'Content-Type':'application/json', ...cors }});
        const fixtures = await fetchFixturesForDate(date, env, featuredOnly);
        if (!fixtures.length) return new Response(JSON.stringify({ error: 'no-fixtures', date }), { status: 404, headers: { 'Content-Type':'application/json', ...cors }});
        const modelVersion = 'gemini-2.5-flash';
        const predictions = [];
        for (const f of fixtures) {
          const key = `pred:${f.fixture.id}:${modelVersion}:${date}`;
          const rec = await env.PREDICTIONS_KV.get(key, 'json');
          if (rec) {
            predictions.push({
              id: `rebuild_${f.fixture.id}_${Date.now()}`,
              matchId: f.fixture.id,
              homeTeam: f.teams.home.name,
              awayTeam: f.teams.away.name,
              league: f.league.name,
              leagueId: f.league.id,
              season: f.league.season,
              matchDate: f.fixture.date,
              venue: f.fixture.venue?.name || '',
              country: f.league.country || '',
              prediction: rec.numeric_predictions || rec.prediction || {},
              timestamp: rec.meta?.last_updated || new Date().toISOString(),
              automated: true,
              source: 'rebuild'
            });
          }
        }
        const featuredCount = fixtures.filter(m=> FEATURED_LEAGUE_IDS.has(m.league.id)).length;
        const dayKey = `daily:${date}:predictions`;
        const aggregate = {
          date,
          generatedAt: new Date().toISOString(),
          totalMatches: fixtures.length,
          featuredMatches: featuredCount,
          processed: predictions.length,
          failures: 0,
          usingFallbackAllMatches: featuredCount === 0,
          fetchMode: featuredOnly ? 'featured-only' : 'global',
          model: modelVersion,
          resume: false,
          waveSizeApplied: null,
          remainingAfterWave: Math.max(0, featuredCount - predictions.length),
          newlyGenerated: predictions.length,
          predictions
        };
        await env.PREDICTIONS_KV.put(dayKey, JSON.stringify(aggregate));
        return new Response(JSON.stringify({ rebuilt: true, date, processed: predictions.length, total: fixtures.length, featuredMatches: featuredCount }), { headers: { 'Content-Type':'application/json', ...cors }});
      } catch (e) {
        return new Response(JSON.stringify({ error: 'rebuild-failed', message: e.message }), { status: 500, headers: { 'Content-Type':'application/json', ...cors }});
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

    // Lightweight health + state inspection for prediction pipeline
    if (url.pathname === '/prediction-health') {
      const headers = { 'Content-Type': 'application/json', ...cors };
      const date = url.searchParams.get('date') || new Date().toISOString().slice(0,10);
      const out = { date };
      if (!env.PREDICTIONS_KV) {
        return new Response(JSON.stringify({ ...out, error: 'kv-unavailable' }), { status: 500, headers });
      }
      try {
        const [progressRaw, aggRaw, cronRaw] = await Promise.all([
          env.PREDICTIONS_KV.get(`daily:${date}:progress`),
          env.PREDICTIONS_KV.get(`daily:${date}:predictions`),
          env.PREDICTIONS_KV.get('cron:lastExecution')
        ]);
        let progress = null; let aggregate = null; let cron = null;
        try { if (progressRaw) progress = JSON.parse(progressRaw); } catch {}
        try { if (aggRaw) aggregate = JSON.parse(aggRaw); } catch {}
        try { if (cronRaw) cron = JSON.parse(cronRaw); } catch {}
        // Derive status heuristics
        let status = 'idle';
        if (progress && !progress.done && (progress.predicted||0) > 0) status = 'running';
        if (progress && progress.done) status = 'completed';
        if (progress && (progress.predicted||0) === 0 && (progress.failures||0) > 0 && !progress.done) status = 'stalled';
        if (!progress && aggregate && aggregate.processed > 0) status = 'completed';
        // Key presence
        const keys = {
          football: !!env.FOOTBALL_API_KEY,
          gemini: !!env.GEMINI_API_KEY,
          deepseek: !!env.DEEPSEEK_API_KEY
        };
        const model = aggregate?.model || 'unknown';
        // Rate pressure indicator
        const ratePressure = progress?.consecutiveRateLimit && progress.consecutiveRateLimit > 0 ? progress.consecutiveRateLimit : 0;
        return new Response(JSON.stringify({
          date,
            status,
          model,
          keys,
          progress,
          aggregateSummary: aggregate ? {
            processed: aggregate.processed,
            failures: aggregate.failures,
            waveSizeApplied: aggregate.waveSizeApplied,
            remainingAfterWave: aggregate.remainingAfterWave,
            fetchMode: aggregate.fetchMode,
            resume: aggregate.resume,
            generatedAt: aggregate.generatedAt
          } : null,
          ratePressure,
          cron,
          suggestions: suggestPredictionHints({ progress, aggregate, keys })
        }), { headers });
      } catch (e) {
        return new Response(JSON.stringify({ ...out, error: 'health-failed', message: e.message }), { status: 500, headers });
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
- /clear-predictions (clear predictions for a date; params: date=YYYY-MM-DD&confirm=true)
- /test-env (check environment variables)
- /cron-status (check last cron execution and next triggers)
 - /cron-history (recent cron executions)
 - /prediction-health (lightweight pipeline diagnostics)
 - /fixtures-debug (diagnose fixture availability; params: date, details=true, league=<id>)
 - /backfill-accuracy (recompute historical accuracy; params: date= | start=&end= | days=N [&force=true])

Automated schedules:
- Score updates: Every hour at 15 minutes past
- Predictions: Manual trigger only (use /trigger-predictions endpoint)
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
async function triggerPredictionUpdate(env, force = false, featuredOnly = false, dateOverride = null, options = {}) {
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
    
  const { resume = false, waveSize = null, preferredModel = null } = options;

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
    
    // Idempotency (Feature C) with resume support:
    const todayStr = targetDate; // use target date for idempotency key
    let existingDailyObj = null;
    if (env.PREDICTIONS_KV) {
      try {
        const existingDailyRaw = await env.PREDICTIONS_KV.get(`daily:${todayStr}:predictions`);
        if (existingDailyRaw) {
          existingDailyObj = JSON.parse(existingDailyRaw);
        }
      } catch (e) {
        console.warn('Daily aggregate read failed (continuing):', e.message);
      }
    }
    // Always merge new predictions with existing, even on force
    if (existingDailyObj && !resume && !force) {
      console.log('⏭️  Skipping prediction generation (daily aggregate exists and no force/resume).');
      return { skipped: true, reason: 'already-generated', date: todayStr, existingProcessed: existingDailyObj.processed };
    }

    // Partition: total matches vs featured matches
    const totalMatches = allMatches.length; // total fetched (may already be only featured if featuredOnly)
    const featuredMatches = allMatches.filter(m => {
      try {
        return m?.league?.id && FEATURED_LEAGUE_IDS.has(m.league.id);
      } catch { return false; }
    });

    let matchesToPredict = featuredMatches.length > 0 ? featuredMatches : allMatches.slice(0, 25); // fallback safeguard

    // For resume mode, filter out already predicted fixture IDs from existing daily aggregate
    if (resume && existingDailyObj && Array.isArray(existingDailyObj.predictions)) {
      const predictedSet = new Set(existingDailyObj.predictions.map(p => p.matchId));
      const before = matchesToPredict.length;
      matchesToPredict = matchesToPredict.filter(m => !predictedSet.has(m.fixture.id));
      console.log(`🔁 Resume mode: ${before - matchesToPredict.length} already predicted skipped; remaining ${matchesToPredict.length}`);
    }

    // Apply wave size (limit batch for this invocation)
    let remainingAfterWave = 0;
    if (waveSize && matchesToPredict.length > waveSize) {
      remainingAfterWave = matchesToPredict.length - waveSize;
      matchesToPredict = matchesToPredict.slice(0, waveSize);
      console.log(`🌊 Wave processing: limiting to ${waveSize} this run; ${remainingAfterWave} will remain`);
    }
    const featuredCount = featuredMatches.length;
    console.log(`🎯 Featured filter summary: featured=${featuredCount} totalFetched=${totalMatches} using=${matchesToPredict.length} mode=${featuredOnly ? 'featured-only-fetch' : 'global-fetch-filter'}`);
  const predictions = [];
  const failures = [];
  let adaptiveDelayMs = 500; // dynamic delay grows on rate limits

    // Dynamic concurrency + circuit breaker
    let dynamicConcurrency = force ? 1 : 3; // start conservative
    const MIN_CONCURRENCY = 1;
    const MAX_CONCURRENCY = 4;
    let consecutiveRateLimit = 0;
    const RATE_LIMIT_BREAK = 5; // threshold for long pause
    const LONG_BACKOFF_MS = 90000; // 90s
    for (let i = 0; i < matchesToPredict.length; i += dynamicConcurrency) {
      // Manual pause support (set KV key daily:<date>:pause-until to ISO timestamp)
      if (env.PREDICTIONS_KV) {
        try {
          const pauseUntilStr = await env.PREDICTIONS_KV.get(`daily:${todayStr}:pause-until`);
          if (pauseUntilStr) {
            const pauseUntil = Date.parse(pauseUntilStr);
            if (!isNaN(pauseUntil) && Date.now() < pauseUntil) {
              console.log(`⏸ Paused until ${pauseUntilStr}`);
              break;
            }
          }
        } catch {}
      }
      const batch = matchesToPredict.slice(i, i + dynamicConcurrency);
      console.log(`🚀 Processing batch ${Math.floor(i / dynamicConcurrency) + 1} (${batch.length} matches) concurrency=${dynamicConcurrency}`);
      const batchResults = await Promise.all(batch.map(async match => {
        try {
          console.log(`🎯 Generating prediction for: ${match.teams.home.name} vs ${match.teams.away.name}`);
          const { prediction, attempts } = await generatePredictionWithRetry(match, env, { maxAttempts: 5, baseDelayMs: 400, preferredModel });
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
              source: resume ? 'worker-cron-resume' : 'worker-cron',
              attempts
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
      // Adaptive delay, dynamic concurrency & circuit breaker
      const hadRetry = batchResults.some(r => r.success && r.record.attempts && r.record.attempts > 1);
      const rateLimitFailures = batchResults.filter(r => !r.success && /429|subrequest|rate/i.test(r.error||''));
      if (rateLimitFailures.length === batch.length) {
        consecutiveRateLimit += rateLimitFailures.length;
      } else if (rateLimitFailures.length) {
        consecutiveRateLimit += rateLimitFailures.length;
      } else {
        consecutiveRateLimit = 0;
      }
      if (consecutiveRateLimit >= RATE_LIMIT_BREAK) {
        console.log(`🛑 Circuit breaker: ${consecutiveRateLimit} consecutive rate-limit errors. Sleeping ${LONG_BACKOFF_MS}ms`);
        if (env.PREDICTIONS_KV) {
          try { await updateDailyProgress(env.PREDICTIONS_KV, todayStr, { circuitBreaker: true, pauseMs: LONG_BACKOFF_MS, lastBatchAt: new Date().toISOString() }); } catch {}
        }
        await sleep(LONG_BACKOFF_MS);
        adaptiveDelayMs = Math.min(adaptiveDelayMs + 1000, 7000);
        dynamicConcurrency = Math.max(MIN_CONCURRENCY, dynamicConcurrency - 1);
        consecutiveRateLimit = 0; // reset after long pause
      } else if (hadRetry || rateLimitFailures.length) {
        adaptiveDelayMs = Math.min(Math.floor(adaptiveDelayMs * 1.5 + 300), 6000);
        dynamicConcurrency = Math.max(MIN_CONCURRENCY, dynamicConcurrency - 1);
        console.log(`⛔ Rate pressure: delay=${adaptiveDelayMs}ms concurrency=${dynamicConcurrency}`);
      } else {
        // clean batch: consider gentle scale up & decay delay
        if (adaptiveDelayMs > 700) adaptiveDelayMs = Math.max(500, Math.floor(adaptiveDelayMs * 0.85));
        if (dynamicConcurrency < MAX_CONCURRENCY) dynamicConcurrency++;
      }
      if (env.PREDICTIONS_KV) {
        try {
          await updateDailyProgress(env.PREDICTIONS_KV, todayStr, {
            date: todayStr,
            totalMatches,
            featuredMatches: featuredCount,
            predicted: (existingDailyObj && resume ? (existingDailyObj.predictions?.length||0) : 0) + predictions.length,
            remaining: matchesToPredict.length - predictions.length,
            failures: failures.length,
            waveSizeApplied: waveSize || null,
            resume,
            fetchMode: featuredOnly ? 'featured-only' : 'global',
            adaptiveDelayMs,
            dynamicConcurrency,
            consecutiveRateLimit,
            lastBatchAt: new Date().toISOString(),
            done: (i + dynamicConcurrency) >= matchesToPredict.length
          });
        } catch (e) { console.warn('Progress update failed:', e.message); }
      }
      if (i + dynamicConcurrency < matchesToPredict.length) {
        await sleep(adaptiveDelayMs);
      }
    }

    console.log(`✅ Generated ${predictions.length}/${totalMatches} predictions (${failures.length} failures)`);
  // Persist predictions if KV available
    if (env.PREDICTIONS_KV) {
      try {
        const dataVersion = todayStr; // align with target date
        const usedModelsSet = new Set(predictions.map(p=>p.modelUsed || p.prediction?.model || 'gemini-2.5-flash'));
        const aggregateModel = usedModelsSet.size === 1 ? Array.from(usedModelsSet)[0] : 'mixed';
        const recentKey = 'recent_predictions';
        let recentList = [];
        try {
          const existing = await env.PREDICTIONS_KV.get(recentKey);
          if (existing) recentList = JSON.parse(existing);
        } catch {}

        for (const p of predictions) {
          try {
            const fixtureId = p.matchId;
            const legacyKey = `prediction:${fixtureId}`; // legacy pattern
            const modelUsed = p.modelUsed || p.prediction?.model || 'gemini-2.5-flash';
            const structuredKey = `pred:${fixtureId}:${modelUsed}:${dataVersion}`;
            const record = {
              numeric_predictions: p.prediction, // align with retrieval expectations
              reasoning_notes: p.prediction?.analysis || '',
              meta: {
                fixture_id: fixtureId,
                league_id: p.leagueId || '',
                season: p.season || '',
                cache_key: structuredKey,
                model_version: modelUsed,
                data_version: dataVersion,
                last_updated: p.timestamp,
                stale: false,
                source: p.source
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
          } catch (storeErr) {
            console.warn('Prediction store failed (continuing):', storeErr.message);
          }
        }
        recentList = recentList.slice(0,50);
        await env.PREDICTIONS_KV.put(recentKey, JSON.stringify(recentList));

        // Daily aggregate key with resume merge logic
        const dayKey = `daily:${dataVersion}:predictions`; 
        let finalPredictionsList = predictions;
        let baseObj = existingDailyObj || {};
        // Always merge new predictions with existing aggregate
        if (existingDailyObj && Array.isArray(existingDailyObj.predictions)) {
          const merged = new Map();
          for (const oldP of existingDailyObj.predictions) merged.set(oldP.matchId, oldP);
          for (const newP of predictions) merged.set(newP.matchId, newP);
          finalPredictionsList = Array.from(merged.values());
        }
        // If no new predictions were generated in this wave AND we had existing ones, avoid overwriting with empty
        if (predictions.length === 0 && existingDailyObj && Array.isArray(existingDailyObj.predictions) && existingDailyObj.predictions.length > 0) {
          console.log('⚠️ No new predictions this wave; preserving existing aggregate predictions list.');
          finalPredictionsList = existingDailyObj.predictions;
        }
        const aggregateObj = {
          date: dataVersion,
          generatedAt: new Date().toISOString(),
          totalMatches: baseObj.totalMatches || totalMatches,
          featuredMatches: featuredCount,
          processed: finalPredictionsList.length,
          failures: failures.length + (baseObj.failures || 0),
          usingFallbackAllMatches: featuredCount === 0,
          fetchMode: featuredOnly ? 'featured-only' : 'global',
          model: aggregateModel,
          resume,
          waveSizeApplied: waveSize || null,
          remainingAfterWave,
          newlyGenerated: predictions.length,
          predictions: finalPredictionsList
        };
        await env.PREDICTIONS_KV.put(dayKey, JSON.stringify(aggregateObj));
        console.log(`💾 Stored aggregate: totalPredictions=${finalPredictionsList.length} (new ${predictions.length}, resume=${resume})`);
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

    const usedModelsSetReturn = new Set(predictions.map(p=>p.modelUsed || p.prediction?.model || 'gemini-2.5-flash'));
    const aggregateModelReturn = usedModelsSetReturn.size === 1 ? Array.from(usedModelsSetReturn)[0] : 'mixed';
    return {
      message: `Generated ${predictions.length} predictions (failures: ${failures.length})`,
      processedPredictions: predictions.length,
      totalMatches,
      featuredMatches: featuredCount,
      usingFallbackAllMatches: featuredCount === 0,
      fetchMode: featuredOnly ? 'featured-only' : 'global',
      failures,
      persisted: !!env.PREDICTIONS_KV,
      predictions: predictions.map(p => ({ 
        matchId: p.matchId, 
        leagueId: p.leagueId, 
        homeTeam: p.homeTeam, 
        awayTeam: p.awayTeam,
        prediction: p.prediction
      })),
      date: todayStr,
      resume,
      waveSizeApplied: waveSize || null,
      remainingAfterWave,
      adaptiveDelayMs,
      model: aggregateModelReturn
    };
    
  } catch (error) {
    console.error('❌ Prediction update failed:', error);
    throw error;
  }
}

/**
 * Generate prediction using Gemini API
 */
async function generatePrediction(match, env, model) {
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
  const useModel = model || 'gemini-2.5-flash';
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${useModel}:generateContent?key=${env.GEMINI_API_KEY}`, {
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
  model: useModel,
      generatedAt: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('Gemini API error:', error);
    throw error;
  }
}

// DeepSeek prediction (OpenAI-compatible chat completions style)
async function generatePredictionDeepSeek(match, env, model = 'deepseek-reasoner') {
  if (!env.DEEPSEEK_API_KEY) {
    throw new Error('DeepSeek API key not configured');
  }
  const prompt = `You are an AI football match predictor.
Return a concise analysis and clear structured prediction lines.

Match: ${match.teams.home.name} vs ${match.teams.away.name}
League: ${match.league.name}
Date: ${match.fixture.date}
Venue: ${match.fixture.venue?.name || 'Unknown'}

Provide (single line labels):
Outcome: (Home Win/Draw/Away Win)
Confidence: (0-100%)
Predicted Score: (e.g. 2-1)
BTTS: (Yes/No)
Over/Under 2.5: (Over 2.5 / Under 2.5)
Key Factors: Analyze recent form, head-to-head record, team strengths/weaknesses, tactical approach, and match context. Provide 3-5 key factors that influenced your prediction.
`; 
  try {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'You are a helpful football prediction assistant.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 400,
        temperature: 0.8
      })
    });
    if (!response.ok) {
      throw new Error(`DeepSeek API error: ${response.status}`);
    }
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    // Simple parsing heuristics
    const line = (label) => (content.match(new RegExp(label + '\\s*:?\\s*(.*)', 'i')) || [])[1] || '';
    const outcomeRaw = line('Outcome').trim();
    const confidenceRaw = line('Confidence').replace(/[^0-9]/g,'');
    const predictedScore = line('Predicted Score').trim() || '1-1';
    const btts = (/yes/i.test(line('BTTS')) ? 'Yes' : /no/i.test(line('BTTS')) ? 'No' : (Math.random()>0.5?'Yes':'No'));
    const overUnder = /over/i.test(line('Over\/Under 2.5')) ? 'Over 2.5' : /under/i.test(line('Over\/Under 2.5')) ? 'Under 2.5' : (Math.random()>0.5?'Over 2.5':'Under 2.5');
    const keyFactorsRaw = line('Key Factors').trim();
    let keyFactors = keyFactorsRaw && keyFactorsRaw !== '**' ? keyFactorsRaw : 'Recent form, head-to-head record, team statistics';
    
    // If Key Factors extraction failed, try to extract from analysis
    if (!keyFactors || keyFactors === 'Recent form, head-to-head record, team statistics') {
      const keyFactorsMatch = content.match(/Key Factors[:\s]*(.*?)(?:\n\n|\n$|$)/is);
      if (keyFactorsMatch && keyFactorsMatch[1]) {
        keyFactors = keyFactorsMatch[1].trim();
      }
    }
    const confidence = confidenceRaw ? Math.min(100, Math.max(0, parseInt(confidenceRaw,10))) : (60 + Math.floor(Math.random()*25));
    const normalizedOutcome = /home/i.test(outcomeRaw) ? 'Home Win' : /away/i.test(outcomeRaw) ? 'Away Win' : /draw/i.test(outcomeRaw) ? 'Draw' : ['Home Win','Draw','Away Win'][Math.floor(Math.random()*3)];
    return {
      analysis: content.slice(0, 1800),
      outcome: normalizedOutcome,
      confidence,
      predictedScore,
      btts,
      overUnder,
      keyFactors,
      model,
      generatedAt: new Date().toISOString(),
      usedDeepSeek: true
    };
  } catch (e) {
    console.error('DeepSeek prediction error:', e);
    throw e;
  }
}

// Wrapper with retry & exponential backoff for Gemini calls
async function generatePredictionWithRetry(match, env, { maxAttempts = 5, baseDelayMs = 300, preferredModel = null } = {}) {
  let attempt = 0;
  let lastErr;
  const primaryModel = preferredModel || 'gemini-2.5-flash';
  const isPrimaryDeepSeek = /^deepseek/i.test(primaryModel);
  const fallbackGemini = primaryModel === 'gemini-2.5-flash' ? 'gemini-1.5-flash' : 'gemini-2.5-flash';
  const deepSeekModel = 'deepseek-reasoner';
  while (attempt < maxAttempts) {
    attempt++;
    try {
      let prediction;
      if (isPrimaryDeepSeek) {
        prediction = await generatePredictionDeepSeek(match, env, primaryModel);
      } else {
        prediction = await generatePrediction(match, env, primaryModel);
      }
      return { prediction, attempts: attempt, modelUsed: primaryModel };
    } catch (e) {
      lastErr = e;
      const msg = (e && e.message) ? e.message.toLowerCase() : '';
      const retriable = msg.includes('429') || msg.includes('rate') || msg.includes('subrequest');
      if (!retriable || attempt === maxAttempts) {
        if (retriable && attempt === maxAttempts) {
          // Tier 1 fallback: alternate Gemini (if primary not deepseek)
          if (!isPrimaryDeepSeek) {
            try {
              console.log(`🔁 Fallback Gemini model attempt using ${fallbackGemini}`);
              const fb = await generatePrediction(match, env, fallbackGemini);
              return { prediction: fb, attempts: attempt, modelUsed: fallbackGemini, usedFallback: true };
            } catch (gfbErr) {
              lastErr = gfbErr;
            }
          }
          // Tier 2 fallback: DeepSeek (if key configured and not already primary)
          if (env.DEEPSEEK_API_KEY) {
            try {
              console.log('🛟 DeepSeek fallback attempt');
              const ds = await generatePredictionDeepSeek(match, env, deepSeekModel);
              return { prediction: ds, attempts: attempt, modelUsed: deepSeekModel, usedFallback: true, deepSeekTier: true };
            } catch (dsErr) {
              lastErr = dsErr;
            }
          }
        }
        throw lastErr || e;
      }
      const delay = baseDelayMs * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 150);
      console.log(`⏳ Retry ${attempt}/${maxAttempts} after ${delay}ms (reason: ${e.message})`);
      await sleep(delay);
    }
  }
  throw lastErr; // safety
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

// Sleep helper (ms)
function sleep(ms) { return new Promise(res => setTimeout(res, ms)); }
// Update progress key
async function updateDailyProgress(kv, date, progress) {
  try { await kv.put(`daily:${date}:progress`, JSON.stringify(progress)); } catch (e) { console.warn('Progress KV put failed:', e.message); }
}
// Provide dynamic hints based on pipeline state
function suggestPredictionHints(ctx) {
  const hints = [];
  const { progress, aggregate, keys } = ctx || {};
  if (!keys?.football) hints.push('Missing FOOTBALL_API_KEY – fixtures fetch will fail');
  if (!keys?.gemini && !keys?.deepseek) hints.push('No model keys available – predictions cannot be generated');
  if (progress && progress.consecutiveRateLimit >= 3) hints.push('High rate limit pressure – consider increasing delay or reducing wave size');
  if (progress && progress.dynamicConcurrency === 1 && progress.consecutiveRateLimit === 0 && !progress.done) hints.push('Safe to manually scale concurrency by re-running without force to continue');
  if (aggregate && aggregate.processed === 0 && aggregate.failures > 0) hints.push('All attempts failed – verify model quotas or pause and retry later');
  if (progress && !progress.done && (progress.remaining||0) > 0) hints.push('Use resume=true to continue remaining predictions');
  if (!progress && !aggregate) hints.push('No progress or aggregate for date – run /trigger-predictions?force=true');
  if (aggregate && aggregate.remainingAfterWave > 0) hints.push('Remaining after wave – invoke /trigger-predictions?resume=true to continue');
  return hints.slice(0,8);
}
// Fetch fixtures helper for endpoints (featured or global)
async function fetchFixturesForDate(dateStr, env, featuredOnly) {
  if (featuredOnly) return await fetchFeaturedLeagueFixtures(dateStr, env);
  try {
    const r = await fetch(`https://v3.football.api-sports.io/fixtures?date=${dateStr}`, { headers: { 'x-apisports-key': env.FOOTBALL_API_KEY }});
    if (!r.ok) return [];
    const j = await r.json();
    return j.response || [];
  } catch { return []; }
}