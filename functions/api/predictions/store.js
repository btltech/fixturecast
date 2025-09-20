// Cloudflare Pages Function for storing prediction integrity data
export async function onRequest(context) {
  const { request, env } = context;
  
  // Set CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
  };

  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return new Response(null, { 
      status: 200, 
      headers: corsHeaders 
    });
  }

  // Health check: /api/predictions/store?health=true
  try {
    const url = new URL(request.url);
    if (url.searchParams.get('health') === 'true') {
      return new Response(JSON.stringify({
        ok: true,
        kvBound: !!env.PREDICTIONS_KV,
        hasApiKey: !!env.PREDICTION_API_KEY,
        message: env.PREDICTIONS_KV ? 'KV is bound' : 'KV binding missing: bind PREDICTIONS_KV in Pages → Settings → Functions'
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
  } catch {}

  // Validate API key for security
  const apiKey = request.headers.get('X-API-Key');
  const validApiKey = env.PREDICTION_API_KEY || 'fixturecast_secure_key_2024';
  
  if (apiKey !== validApiKey) {
    return new Response(JSON.stringify({ 
      error: 'Unauthorized',
      message: 'Invalid API key' 
    }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Guard: ensure KV is bound
  if (!env.PREDICTIONS_KV) {
    return new Response(JSON.stringify({
      error: 'KV binding missing',
      message: 'Bind KV namespace as PREDICTIONS_KV in Cloudflare Pages → Settings → Functions',
      howTo: 'Create KV namespace (Workers & Pages → KV), then bind it with variable name PREDICTIONS_KV',
      doc: '/CLOUDFLARE_PREDICTION_SETUP.md'
    }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  try {
    const url = new URL(request.url);
    const operation = url.searchParams.get('operation'); // store, retrieve, verify

    switch (request.method) {
      case 'POST':
        return await handleStorePrediction(request, env, corsHeaders);
      
      case 'PUT':
        return await handleVerifyPrediction(request, env, corsHeaders);
      
      case 'GET':
        return await handleRetrievePredictions(request, env, corsHeaders);
      
      default:
        return new Response(JSON.stringify({ 
          error: 'Method not allowed' 
        }), {
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
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

// Store new prediction
async function handleStorePrediction(request, env, corsHeaders) {
  const data = await request.json();
  
  // Validate required fields
  if (!data.matchId || !data.prediction || !data.homeTeam || !data.awayTeam) {
    return new Response(JSON.stringify({ 
      error: 'Missing required fields',
      required: ['matchId', 'prediction', 'homeTeam', 'awayTeam']
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Create prediction record with integrity hash
  const predictionRecord = {
    id: `pred_${data.matchId}_${Date.now()}`,
    matchId: data.matchId,
    homeTeam: data.homeTeam,
    awayTeam: data.awayTeam,
    league: data.league,
    matchDate: data.matchDate,
    prediction: data.prediction,
    predictionTime: new Date().toISOString(),
    verified: false,
    clientFingerprint: data.clientFingerprint || null,
    // Create integrity hash to prevent tampering
    integrityHash: await createIntegrityHash(data)
  };

  // Store in Cloudflare KV
  const kvKey = `prediction:${data.matchId}`;
  await env.PREDICTIONS_KV.put(kvKey, JSON.stringify(predictionRecord), {
    metadata: {
      matchDate: data.matchDate,
      league: data.league,
      created: predictionRecord.predictionTime
    }
  });

  // Also store in date-based index for retrieval
  const dateKey = new Date(data.matchDate).toISOString().split('T')[0];
  const dailyIndexKey = `daily:${dateKey}`;
  
  let dailyIndex = [];
  try {
    const existing = await env.PREDICTIONS_KV.get(dailyIndexKey);
    if (existing) {
      dailyIndex = JSON.parse(existing);
    }
  } catch (e) {}
  
  dailyIndex.push({
    matchId: data.matchId,
    predictionId: predictionRecord.id,
    homeTeam: data.homeTeam,
    awayTeam: data.awayTeam,
    league: data.league
  });
  
  await env.PREDICTIONS_KV.put(dailyIndexKey, JSON.stringify(dailyIndex));

  console.log(`✅ Prediction stored: ${predictionRecord.id} for ${data.homeTeam} vs ${data.awayTeam}`);

  return new Response(JSON.stringify({ 
    success: true,
    predictionId: predictionRecord.id,
    message: 'Prediction stored successfully',
    integrityHash: predictionRecord.integrityHash
  }), {
    status: 201,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// Verify prediction with actual result
async function handleVerifyPrediction(request, env, corsHeaders) {
  const data = await request.json();
  
  if (!data.matchId || !data.actualResult) {
    return new Response(JSON.stringify({ 
      error: 'Missing required fields',
      required: ['matchId', 'actualResult']
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Retrieve original prediction
  const kvKey = `prediction:${data.matchId}`;
  const predictionData = await env.PREDICTIONS_KV.get(kvKey);
  
  if (!predictionData) {
    return new Response(JSON.stringify({ 
      error: 'Prediction not found',
      matchId: data.matchId
    }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const prediction = JSON.parse(predictionData);
  
  if (prediction.verified) {
    return new Response(JSON.stringify({ 
      error: 'Prediction already verified',
      verifiedAt: prediction.verifiedAt
    }), {
      status: 409,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Calculate accuracy
  const accuracy = calculatePredictionAccuracy(prediction.prediction, data.actualResult);
  
  // Update prediction with verification
  prediction.verified = true;
  prediction.verifiedAt = new Date().toISOString();
  prediction.actualResult = data.actualResult;
  prediction.accuracy = accuracy;
  prediction.verificationSource = data.source || 'api-sports';

  // Store updated prediction
  await env.PREDICTIONS_KV.put(kvKey, JSON.stringify(prediction));

  // Store in accuracy index for fast retrieval
  const accuracyKey = `accuracy:${prediction.id}`;
  const accuracyRecord = {
    id: prediction.id,
    matchId: data.matchId,
    homeTeam: prediction.homeTeam,
    awayTeam: prediction.awayTeam,
    league: prediction.league,
    predictionDate: prediction.predictionTime,
    matchDate: prediction.matchDate,
    accuracy,
    actualResult: data.actualResult,
    verifiedAt: prediction.verifiedAt
  };
  
  await env.PREDICTIONS_KV.put(accuracyKey, JSON.stringify(accuracyRecord));

  console.log(`✅ Prediction verified: ${prediction.id} - Outcome: ${accuracy.outcome ? 'Correct' : 'Incorrect'}`);

  return new Response(JSON.stringify({ 
    success: true,
    predictionId: prediction.id,
    accuracy,
    message: 'Prediction verified successfully'
  }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// Retrieve predictions
async function handleRetrievePredictions(request, env, corsHeaders) {
  const url = new URL(request.url);
  const matchId = url.searchParams.get('matchId');
  const date = url.searchParams.get('date');
  const stats = url.searchParams.get('stats') === 'true';

  if (matchId) {
    // Get specific prediction
    const kvKey = `prediction:${matchId}`;
    const predictionData = await env.PREDICTIONS_KV.get(kvKey);
    
    if (!predictionData) {
      return new Response(JSON.stringify({ 
        error: 'Prediction not found' 
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(predictionData, {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  if (date) {
    // Get predictions for specific date
    const dailyIndexKey = `daily:${date}`;
    const dailyIndex = await env.PREDICTIONS_KV.get(dailyIndexKey);
    
    if (!dailyIndex) {
      return new Response(JSON.stringify({ 
        predictions: [],
        date: date
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const predictions = [];
    const indexData = JSON.parse(dailyIndex);
    
    for (const item of indexData) {
      const kvKey = `prediction:${item.matchId}`;
      const predictionData = await env.PREDICTIONS_KV.get(kvKey);
      if (predictionData) {
        predictions.push(JSON.parse(predictionData));
      }
    }

    return new Response(JSON.stringify({ 
      predictions,
      date: date,
      count: predictions.length
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  if (stats) {
    // Get accuracy statistics
    const accuracyStats = await calculateAccuracyStats(env);
    
    return new Response(JSON.stringify(accuracyStats), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  return new Response(JSON.stringify({ 
    error: 'Invalid request',
    message: 'Specify matchId, date, or stats parameter'
  }), {
    status: 400,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// Helper functions
async function createIntegrityHash(data) {
  const content = JSON.stringify({
    matchId: data.matchId,
    homeTeam: data.homeTeam,
    awayTeam: data.awayTeam,
    matchDate: data.matchDate,
    prediction: data.prediction
  });
  
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function calculatePredictionAccuracy(prediction, actualResult) {
  const { homeScore, awayScore } = actualResult;
  const totalGoals = homeScore + awayScore;

  // Determine actual outcome
  const actualOutcome = homeScore > awayScore ? 'home' : homeScore < awayScore ? 'away' : 'draw';
  
  // Determine predicted outcome
  const predictedOutcome = 
    prediction.homeWinProbability > prediction.drawProbability && 
    prediction.homeWinProbability > prediction.awayWinProbability ? 'home' :
    prediction.awayWinProbability > prediction.drawProbability ? 'away' : 'draw';

  return {
    outcome: actualOutcome === predictedOutcome,
    scoreline: prediction.predictedScoreline === `${homeScore}-${awayScore}`,
    btts: prediction.btts ? (
      (homeScore > 0 && awayScore > 0) ? 
        prediction.btts.yesProbability > prediction.btts.noProbability :
        prediction.btts.noProbability > prediction.btts.yesProbability
    ) : false,
    goalLine: prediction.goalLine ? (
      totalGoals > prediction.goalLine.line ? 
        prediction.goalLine.overProbability > prediction.goalLine.underProbability :
        prediction.goalLine.underProbability > prediction.goalLine.overProbability
    ) : false,
    cleanSheet: prediction.cleanSheet ? (
      homeScore === 0 ? prediction.cleanSheet.awayTeam > 50 :
      awayScore === 0 ? prediction.cleanSheet.homeTeam > 50 : false
    ) : false
  };
}

async function calculateAccuracyStats(env) {
  // This would need to iterate through accuracy records
  // For now, return basic structure
  return {
    totalPredictions: 0,
    verifiedPredictions: 0,
    overallAccuracy: 0,
    outcomeAccuracy: 0,
    scorelineAccuracy: 0,
    bttsAccuracy: 0,
    goalLineAccuracy: 0,
    lastUpdated: new Date().toISOString()
  };
}
