// GET /api/predictions/:fixture_id
// Cache-first read path with freshness meta. Does not generate.
export async function onRequest(context) {
  const { request, env, params } = context;
  const url = new URL(request.url);
  const fixtureId = params.fixture_id;

  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key'
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: cors });
  }

  try {
    const { kv } = resolveKv(env);
    if (!kv) {
      return json({ error: 'KV binding missing' }, 500, cors);
    }

    // Inputs
    const modelVersion = url.searchParams.get('model_version') || (env.MODEL_VERSION || '1.0.0');
    const dataVersion = url.searchParams.get('data_version') || inferDataVersion(url);
    const leagueId = url.searchParams.get('league_id') || undefined;
    const season = url.searchParams.get('season') || undefined;
    const fixtureTs = parseInt(url.searchParams.get('fixture_ts') || '0', 10) || undefined;
    const preKickoffTtlMin = parseInt(url.searchParams.get('pre_ttl') || env.PRE_KICKOFF_TTL_MIN || '90', 10);
    const maxStalenessMin = parseInt(url.searchParams.get('max_stale') || env.MAX_STALENESS_MIN || '1440', 10);

    const cacheKey = `pred:${fixtureId}:${modelVersion}:${dataVersion}`;

    // Try cache by strong key
    let record = await kv.get(cacheKey);
    if (!record) {
      // Fallback to legacy key by matchId
      const legacy = await kv.get(`prediction:${fixtureId}`);
      if (legacy) {
        const p = JSON.parse(legacy);
        record = JSON.stringify({
          numeric_predictions: p.prediction,
          reasoning_notes: p.prediction?.reasoning_notes || '',
          meta: {
            fixture_id: fixtureId,
            league_id: p.league || leagueId || '',
            season: season || '',
            cache_key: cacheKey,
            model_version: modelVersion,
            data_version: dataVersion,
            last_updated: p.predictionTime || new Date().toISOString(),
            stale: false,
            source: 'cache'
          }
        });
      }
    }

    if (record) {
      const payload = JSON.parse(record);
      // Freshness evaluation
      const stale = isStale(payload?.meta?.last_updated, fixtureTs, preKickoffTtlMin, maxStalenessMin);
      payload.meta = {
        ...payload.meta,
        cache_key: cacheKey,
        model_version: modelVersion,
        data_version: dataVersion,
        stale,
        source: 'cache'
      };
      return json(payload, 200, cors);
    }

    // Miss: return best-effort stub with stale=true (client should keep UI showing 'Updating…')
    const response = {
      numeric_predictions: null,
      reasoning_notes: '',
      meta: {
        fixture_id: fixtureId,
        league_id: leagueId || '',
        season: season || '',
        cache_key: cacheKey,
        model_version: modelVersion,
        data_version: dataVersion,
        last_updated: null,
        stale: true,
        source: 'cache'
      }
    };
    return json(response, 200, cors);
  } catch (e) {
    return json({ error: 'Internal error', message: e.message || String(e) }, 500, cors);
  }
}

function resolveKv(envObj) {
  if (envObj.PREDICTIONS_KV) return { kv: envObj.PREDICTIONS_KV, name: 'PREDICTIONS_KV' };
  for (const [key, value] of Object.entries(envObj)) {
    if (value && typeof value.get === 'function' && typeof value.put === 'function') {
      return { kv: value, name: key };
    }
  }
  return { kv: null, name: null };
}

function inferDataVersion(url) {
  const ts = url.searchParams.get('fixture_ts');
  return ts ? `ts_${ts}` : new Date().toISOString().slice(0, 10);
}

function isStale(lastUpdatedIso, fixtureTs, preKickoffTtlMin, maxStalenessMin) {
  try {
    const now = Date.now();
    const last = lastUpdatedIso ? Date.parse(lastUpdatedIso) : 0;
    const maxStaleMs = maxStalenessMin * 60 * 1000;
    if (!fixtureTs) {
      return !last || (now - last) > maxStaleMs;
    }
    const preKickoffTtlMs = preKickoffTtlMin * 60 * 1000;
    const kickoff = fixtureTs;
    // If now before kickoff, allow within TTL window from last update
    if (now < kickoff) {
      return !last || (now - last) > preKickoffTtlMs;
    }
    // After kickoff: lock; treat as stale if older than max staleness
    return !last || (now - last) > maxStaleMs;
  } catch {
    return true;
  }
}

function json(obj, status = 200, extra = {}) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...extra }
  });
}


