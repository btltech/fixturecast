/**
 * Cloudflare API Route - Score Updates for Accuracy Tracking
 * 
 * This updates match results and calculates prediction accuracy
 * Should run hourly to check for completed matches
 */

export async function onRequest(context) {
  const { request, env } = context;
  
  // Only allow POST requests
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  // Simple API key check
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.includes(env.PREDICTION_API_KEY)) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    console.log('🔄 Score update triggered for accuracy tracking');
    
    const startTime = Date.now();
    let updatedMatches = 0;
    let accuracyUpdates = 0;
    
    // Get recent predictions that might have completed matches
    const recentPredictions = await getRecentPredictions(env);
    console.log(`Checking ${recentPredictions.length} recent predictions for score updates`);

    // Check each prediction for completed match
    for (const predictionData of recentPredictions) {
      try {
        const matchResult = await getMatchResult(predictionData.matchId, env);
        
        if (matchResult && matchResult.status === 'FT') {
          // Match is finished, update accuracy
          await updatePredictionAccuracy(predictionData, matchResult, env);
          updatedMatches++;
          
          // Store match result
          await storeMatchResult(matchResult, env);
          accuracyUpdates++;
        }
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`Error processing prediction ${predictionData.matchId}:`, error);
      }
    }

    // Update overall accuracy stats
    await updateOverallAccuracyStats(env);

    const duration = Date.now() - startTime;
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Score updates completed',
      updatedMatches,
      accuracyUpdates,
      totalChecked: recentPredictions.length,
      duration
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Score update failed:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Get recent predictions from KV storage
 */
async function getRecentPredictions(env) {
  try {
    const recentList = await env.PREDICTIONS_KV.get('recent_predictions');
    if (!recentList) return [];
    
    const predictions = JSON.parse(recentList);
    
    // Get full prediction data for recent matches (last 48 hours)
    const cutoffTime = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const recentPredictions = [];
    
    for (const item of predictions) {
      if (new Date(item.timestamp) > cutoffTime) {
        const predictionData = await env.PREDICTIONS_KV.get(`prediction_${item.matchId}`);
        if (predictionData) {
          recentPredictions.push(JSON.parse(predictionData));
        }
      }
    }
    
    return recentPredictions;
    
  } catch (error) {
    console.error('Error getting recent predictions:', error);
    return [];
  }
}

/**
 * Get match result from Football API
 */
async function getMatchResult(matchId, env) {
  try {
    const response = await fetch(`https://v3.football.api-sports.io/fixtures?id=${matchId}`, {
      headers: {
        'X-RapidAPI-Key': env.FOOTBALL_API_KEY,
        'X-RapidAPI-Host': 'v3.football.api-sports.io'
      }
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const fixture = data.response?.[0];
    
    if (!fixture) return null;
    
    return {
      matchId: fixture.fixture.id,
      status: fixture.fixture.status.short,
      homeTeam: fixture.teams.home.name,
      awayTeam: fixture.teams.away.name,
      homeScore: fixture.goals.home,
      awayScore: fixture.goals.away,
      winner: fixture.teams.home.winner === true ? 'home' : 
              fixture.teams.away.winner === true ? 'away' : 'draw',
      date: fixture.fixture.date,
      league: fixture.league.name
    };
    
  } catch (error) {
    console.error(`Error fetching match ${matchId}:`, error);
    return null;
  }
}

/**
 * Update prediction accuracy based on match result
 */
async function updatePredictionAccuracy(predictionData, matchResult, env) {
  try {
    // Calculate accuracy
    const prediction = predictionData.prediction;
    let isCorrect = false;
    let accuracyDetails = {};
    
    // Check outcome prediction
    const predictedOutcome = prediction.outcome?.toLowerCase();
    const actualOutcome = matchResult.winner;
    
    if (
      (predictedOutcome === 'home win' && actualOutcome === 'home') ||
      (predictedOutcome === 'away win' && actualOutcome === 'away') ||
      (predictedOutcome === 'draw' && actualOutcome === 'draw')
    ) {
      isCorrect = true;
    }
    
    accuracyDetails = {
      predicted: predictedOutcome,
      actual: actualOutcome,
      correct: isCorrect,
      confidence: prediction.confidence || 0,
      homeScore: matchResult.homeScore,
      awayScore: matchResult.awayScore
    };
    
    // Store accuracy result
    const accuracyResult = {
      matchId: matchResult.matchId,
      predictionId: `prediction_${matchResult.matchId}`,
      homeTeam: matchResult.homeTeam,
      awayTeam: matchResult.awayTeam,
      league: matchResult.league,
      matchDate: matchResult.date,
      predictionTimestamp: predictionData.timestamp,
      result: matchResult,
      accuracy: accuracyDetails,
      timestamp: new Date().toISOString()
    };
    
    await env.PREDICTIONS_KV.put(
      `accuracy_${matchResult.matchId}`,
      JSON.stringify(accuracyResult),
      { expirationTtl: 90 * 24 * 60 * 60 } // 90 days
    );
    
    console.log(`📊 Accuracy updated for ${matchResult.homeTeam} vs ${matchResult.awayTeam}: ${isCorrect ? 'CORRECT' : 'INCORRECT'}`);
    
  } catch (error) {
    console.error('Error updating prediction accuracy:', error);
    throw error;
  }
}

/**
 * Store match result
 */
async function storeMatchResult(matchResult, env) {
  await env.PREDICTIONS_KV.put(
    `result_${matchResult.matchId}`,
    JSON.stringify(matchResult),
    { expirationTtl: 90 * 24 * 60 * 60 } // 90 days
  );
}

/**
 * Update overall accuracy statistics
 */
async function updateOverallAccuracyStats(env) {
  try {
    // Get all accuracy results
    const { keys } = await env.PREDICTIONS_KV.list({ prefix: 'accuracy_' });
    
    let totalPredictions = 0;
    let correctPredictions = 0;
    let totalConfidence = 0;
    const leagueStats = {};
    const dailyStats = {};
    
    for (const key of keys) {
      const accuracyData = await env.PREDICTIONS_KV.get(key.name);
      if (accuracyData) {
        const data = JSON.parse(accuracyData);
        totalPredictions++;
        
        if (data.accuracy.correct) {
          correctPredictions++;
        }
        
        totalConfidence += data.accuracy.confidence || 0;
        
        // League stats
        const league = data.league;
        if (!leagueStats[league]) {
          leagueStats[league] = { total: 0, correct: 0 };
        }
        leagueStats[league].total++;
        if (data.accuracy.correct) {
          leagueStats[league].correct++;
        }
        
        // Daily stats
        const date = new Date(data.matchDate).toISOString().split('T')[0];
        if (!dailyStats[date]) {
          dailyStats[date] = { total: 0, correct: 0 };
        }
        dailyStats[date].total++;
        if (data.accuracy.correct) {
          dailyStats[date].correct++;
        }
      }
    }
    
    const overallStats = {
      totalPredictions,
      correctPredictions,
      accuracy: totalPredictions > 0 ? (correctPredictions / totalPredictions) * 100 : 0,
      averageConfidence: totalPredictions > 0 ? totalConfidence / totalPredictions : 0,
      leagueStats: Object.entries(leagueStats).map(([league, stats]) => ({
        league,
        accuracy: (stats.correct / stats.total) * 100,
        total: stats.total,
        correct: stats.correct
      })),
      lastUpdated: new Date().toISOString()
    };
    
    await env.PREDICTIONS_KV.put('overall_accuracy_stats', JSON.stringify(overallStats));
    
    console.log(`📈 Overall accuracy: ${overallStats.accuracy.toFixed(1)}% (${correctPredictions}/${totalPredictions})`);
    
  } catch (error) {
    console.error('Error updating overall accuracy stats:', error);
  }
}