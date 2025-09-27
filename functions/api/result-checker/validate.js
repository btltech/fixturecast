/**
 * Cloudflare Worker for storing prediction validation results
 * Handles validation data storage and retrieval
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const method = request.method;

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Handle preflight requests
    if (method === 'OPTIONS') {
      return new Response(null, { status: 200, headers: corsHeaders });
    }

    try {
      if (method === 'POST') {
        return await handleStoreValidation(request, env, corsHeaders);
      } else if (method === 'GET') {
        return await handleGetValidations(request, env, corsHeaders);
      } else {
        return new Response('Method not allowed', { 
          status: 405, 
          headers: corsHeaders 
        });
      }
    } catch (error) {
      console.error('Result checker API error:', error);
      return new Response(JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }
  }
};

/**
 * Store prediction validation result
 */
async function handleStoreValidation(request, env, corsHeaders) {
  try {
    const validation = await request.json();
    
    // Validate required fields
    if (!validation.matchId || !validation.prediction || !validation.actualResult) {
      return new Response(JSON.stringify({ 
        error: 'Missing required fields: matchId, prediction, actualResult' 
      }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Generate validation key
    const validationKey = `validation:${validation.matchId}:${Date.now()}`;
    
    // Store validation result
    await env.FIXTURECAST_KV.put(validationKey, JSON.stringify(validation), {
      expirationTtl: 365 * 24 * 60 * 60, // 1 year
      metadata: {
        matchId: validation.matchId,
        date: new Date().toISOString().split('T')[0],
        accuracy: validation.confidence
      }
    });

    // Update daily accuracy stats
    await updateDailyAccuracyStats(env, validation);

    return new Response(JSON.stringify({ 
      success: true, 
      validationKey,
      message: 'Validation stored successfully' 
    }), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    console.error('Store validation error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to store validation',
      details: error.message 
    }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
}

/**
 * Get validation results
 */
async function handleGetValidations(request, env, corsHeaders) {
  try {
    const url = new URL(request.url);
    const date = url.searchParams.get('date');
    const matchId = url.searchParams.get('matchId');
    const limit = parseInt(url.searchParams.get('limit') || '50');

    let validations = [];

    if (matchId) {
      // Get validation for specific match
      const validationKey = `validation:${matchId}`;
      const validation = await env.FIXTURECAST_KV.get(validationKey);
      if (validation) {
        validations = [JSON.parse(validation)];
      }
    } else if (date) {
      // Get validations for specific date
      const { keys } = await env.FIXTURECAST_KV.list({
        prefix: 'validation:',
        limit: 1000
      });

      const dateValidations = [];
      for (const key of keys) {
        if (key.metadata && key.metadata.date === date) {
          const validation = await env.FIXTURECAST_KV.get(key.name);
          if (validation) {
            dateValidations.push(JSON.parse(validation));
          }
        }
      }
      validations = dateValidations.slice(0, limit);
    } else {
      // Get recent validations
      const { keys } = await env.FIXTURECAST_KV.list({
        prefix: 'validation:',
        limit: limit
      });

      for (const key of keys) {
        const validation = await env.FIXTURECAST_KV.get(key.name);
        if (validation) {
          validations.push(JSON.parse(validation));
        }
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      validations,
      count: validations.length 
    }), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    console.error('Get validations error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to get validations',
      details: error.message 
    }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
}

/**
 * Update daily accuracy statistics
 */
async function updateDailyAccuracyStats(env, validation) {
  try {
    const date = new Date().toISOString().split('T')[0];
    const statsKey = `daily_stats:${date}`;
    
    // Get existing stats
    let stats = await env.FIXTURECAST_KV.get(statsKey);
    if (stats) {
      stats = JSON.parse(stats);
    } else {
      stats = {
        date,
        totalMatches: 0,
        validatedMatches: 0,
        overallAccuracy: 0,
        categoryAccuracy: {
          winner: 0,
          scoreline: 0,
          btts: 0,
          goalLine: 0,
          htft: 0,
          cleanSheet: 0,
          corners: 0
        },
        topPerformers: [],
        improvementAreas: []
      };
    }

    // Update stats
    stats.totalMatches++;
    stats.validatedMatches++;
    
    // Update overall accuracy
    const totalAccuracy = stats.overallAccuracy * (stats.validatedMatches - 1);
    stats.overallAccuracy = (totalAccuracy + validation.confidence) / stats.validatedMatches;

    // Update category accuracy
    Object.keys(stats.categoryAccuracy).forEach(category => {
      if (validation.accuracy[category] !== undefined) {
        const categoryStats = stats.categoryAccuracy[category];
        const newAccuracy = categoryStats + (validation.accuracy[category] ? 1 : 0);
        stats.categoryAccuracy[category] = newAccuracy;
      }
    });

    // Store updated stats
    await env.FIXTURECAST_KV.put(statsKey, JSON.stringify(stats), {
      expirationTtl: 365 * 24 * 60 * 60 // 1 year
    });

  } catch (error) {
    console.error('Update daily stats error:', error);
  }
}

