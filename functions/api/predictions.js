// Cloudflare Pages Function: GET /api/predictions - Fetch stored predictions
export async function onRequest(context) {
  const { request, env } = context;
  
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Resolve KV binding
  const resolveKv = (envObj) => {
    if (envObj.PREDICTIONS_KV) return { kv: envObj.PREDICTIONS_KV, name: 'PREDICTIONS_KV' };
    for (const [key, value] of Object.entries(envObj)) {
      if (value && typeof value.get === 'function' && typeof value.put === 'function') {
        return { kv: value, name: key };
      }
    }
    return { kv: null, name: null };
  };

  const { kv } = resolveKv(env);
  if (!kv) {
    return new Response(JSON.stringify({
      error: 'KV binding missing',
      message: 'Bind KV namespace as PREDICTIONS_KV in Cloudflare Pages Settings'
    }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  try {
    const url = new URL(request.url);
    const matchId = url.searchParams.get('matchId');
    const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0]; // Default to today
    const league = url.searchParams.get('league');

    // Get specific match prediction
    if (matchId) {
      const kvKey = `prediction:${matchId}`;
      const predictionData = await kv.get(kvKey);
      
      if (!predictionData) {
        return new Response(JSON.stringify({ 
          prediction: null,
          message: 'Prediction not found for this match'
        }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const prediction = JSON.parse(predictionData);
      return new Response(JSON.stringify({ 
        prediction,
        cached: true,
        source: 'stored'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get predictions by date (and optionally league)
    const dailyIndexKey = `daily:${date}`;
    const dailyIndexData = await kv.get(dailyIndexKey);
    
    if (!dailyIndexData) {
      return new Response(JSON.stringify({ 
        predictions: [],
        date: date,
        count: 0,
        message: 'No predictions found for this date'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const indexData = JSON.parse(dailyIndexData);
    let filteredIndex = indexData;

    // Filter by league if specified
    if (league) {
      filteredIndex = indexData.filter(item => 
        item.league && item.league.toLowerCase().includes(league.toLowerCase())
      );
    }

    // Fetch full prediction data for each match
    const predictions = [];
    for (const item of filteredIndex) {
      const kvKey = `prediction:${item.matchId}`;
      const predictionData = await kv.get(kvKey);
      if (predictionData) {
        predictions.push(JSON.parse(predictionData));
      }
    }

    return new Response(JSON.stringify({ 
      predictions,
      date: date,
      league: league || 'all',
      count: predictions.length,
      cached: true,
      source: 'stored'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[Predictions API] Error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}