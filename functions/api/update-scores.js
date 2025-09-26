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
    // Calculate detailed accuracy metrics
    const prediction = predictionData.prediction;
    let accuracyDetails = {};
    
    // Parse prediction text for detailed analysis
    const predictionText = prediction.analysis || '';
    const predictedOutcome = prediction.outcome?.toLowerCase();
    const actualOutcome = matchResult.winner;
    
    // 1. Winner Prediction Accuracy
    const winnerCorrect = (
      (predictedOutcome === 'home win' && actualOutcome === 'home') ||
      (predictedOutcome === 'away win' && actualOutcome === 'away') ||
      (predictedOutcome === 'draw' && actualOutcome === 'draw')
    );
    
    // 2. Scoreline Prediction (extract from text)
    const scoreRegex = /(\d+)-(\d+)/;
    const scoreMatch = predictionText.match(scoreRegex);
    let scorelineCorrect = false;
    if (scoreMatch) {
      const [, predHome, predAway] = scoreMatch;
      scorelineCorrect = (
        parseInt(predHome) === matchResult.homeScore && 
        parseInt(predAway) === matchResult.awayScore
      );
    }
    
    // 3. Both Teams to Score (BTTS)
    const bttsRegex = /both teams.*score.*yes|btts.*yes|both.*score/i;
    const noBttsRegex = /both teams.*score.*no|btts.*no|clean sheet/i;
    let bttsPredicted = null;
    let bttsCorrect = false;
    
    if (bttsRegex.test(predictionText)) {
      bttsPredicted = true;
    } else if (noBttsRegex.test(predictionText)) {
      bttsPredicted = false;
    }
    
    if (bttsPredicted !== null) {
      const actualBtts = matchResult.homeScore > 0 && matchResult.awayScore > 0;
      bttsCorrect = bttsPredicted === actualBtts;
    }
    
    // 4. Goal Line Predictions (Over/Under)
    const overRegex = /over (\d+\.?\d*)|(\d+\.?\d*)\+ goals/i;
    const underRegex = /under (\d+\.?\d*)|below (\d+\.?\d*)/i;
    let goalLinePredicted = null;
    let goalLineCorrect = false;
    
    const overMatch = predictionText.match(overRegex);
    const underMatch = predictionText.match(underRegex);
    const totalGoals = matchResult.homeScore + matchResult.awayScore;
    
    if (overMatch) {
      const line = parseFloat(overMatch[1] || overMatch[2]);
      goalLinePredicted = `Over ${line}`;
      goalLineCorrect = totalGoals > line;
    } else if (underMatch) {
      const line = parseFloat(underMatch[1] || underMatch[2]);
      goalLinePredicted = `Under ${line}`;
      goalLineCorrect = totalGoals < line;
    }
    
    accuracyDetails = {
      // Basic outcome
      predicted: predictedOutcome,
      actual: actualOutcome,
      correct: winnerCorrect,
      confidence: prediction.confidence || 0,
      homeScore: matchResult.homeScore,
      awayScore: matchResult.awayScore,
      
      // Detailed categories
      categories: {
        winner: { predicted: predictedOutcome, correct: winnerCorrect },
        scoreline: { 
          predicted: scoreMatch ? `${scoreMatch[1]}-${scoreMatch[2]}` : null, 
          correct: scorelineCorrect 
        },
        btts: { predicted: bttsPredicted, correct: bttsCorrect },
        goalLine: { predicted: goalLinePredicted, correct: goalLineCorrect }
      }
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
    
    // Category tracking
    const categories = {
      winner: { total: 0, correct: 0 },
      scoreline: { total: 0, correct: 0 },
      btts: { total: 0, correct: 0 },
      goalLine: { total: 0, correct: 0 }
    };
    
    // Recent performance tracking
    const allPredictions = [];
    
    for (const key of keys) {
      const accuracyData = await env.PREDICTIONS_KV.get(key.name);
      if (accuracyData) {
        const data = JSON.parse(accuracyData);
        totalPredictions++;
        
        // Store for recent performance calculation
        allPredictions.push({
          correct: data.accuracy.correct,
          timestamp: data.timestamp,
          categories: data.accuracy.categories
        });
        
        if (data.accuracy.correct) {
          correctPredictions++;
        }
        
        totalConfidence += data.accuracy.confidence || 0;
        
        // Category accuracy tracking
        if (data.accuracy.categories) {
          const cats = data.accuracy.categories;
          
          // Winner predictions
          if (cats.winner?.predicted) {
            categories.winner.total++;
            if (cats.winner.correct) categories.winner.correct++;
          }
          
          // Scoreline predictions  
          if (cats.scoreline?.predicted) {
            categories.scoreline.total++;
            if (cats.scoreline.correct) categories.scoreline.correct++;
          }
          
          // BTTS predictions
          if (cats.btts?.predicted !== null) {
            categories.btts.total++;
            if (cats.btts.correct) categories.btts.correct++;
          }
          
          // Goal line predictions
          if (cats.goalLine?.predicted) {
            categories.goalLine.total++;
            if (cats.goalLine.correct) categories.goalLine.correct++;
          }
        }
        
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
    
    // Sort predictions by timestamp (newest first) for recent performance
    allPredictions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    // Calculate recent performance by count
    const calculateRecentAccuracy = (count) => {
      if (allPredictions.length < count) count = allPredictions.length;
      if (count === 0) return 0;
      
      const recent = allPredictions.slice(0, count);
      const correct = recent.filter(p => p.correct).length;
      return (correct / count) * 100;
    };
    
    // Calculate performance by time period (days)
    const calculateTimeBasedAccuracy = (days) => {
      const cutoffDate = new Date(Date.now() - (days * 24 * 60 * 60 * 1000));
      const recentByTime = allPredictions.filter(p => 
        new Date(p.matchDate) > cutoffDate
      );
      
      if (recentByTime.length === 0) return 0;
      const correct = recentByTime.filter(p => p.correct).length;
      return (correct / recentByTime.length) * 100;
    };
    
    const overallStats = {
      // Basic stats
      totalPredictions,
      correctPredictions,
      accuracy: totalPredictions > 0 ? (correctPredictions / totalPredictions) * 100 : 0,
      averageConfidence: totalPredictions > 0 ? totalConfidence / totalPredictions : 0,
      
      // Category accuracy
      categoryAccuracy: {
        winner: categories.winner.total > 0 ? (categories.winner.correct / categories.winner.total) * 100 : 0,
        scoreline: categories.scoreline.total > 0 ? (categories.scoreline.correct / categories.scoreline.total) * 100 : 0,
        btts: categories.btts.total > 0 ? (categories.btts.correct / categories.btts.total) * 100 : 0,
        goalLine: categories.goalLine.total > 0 ? (categories.goalLine.correct / categories.goalLine.total) * 100 : 0
      },
      
      // Recent performance (by count)
      recentPerformance: {
        last10: calculateRecentAccuracy(10),
        last20: calculateRecentAccuracy(20),
        last50: calculateRecentAccuracy(50)
      },
      
      // Time-based performance (by days)
      timeBasedPerformance: {
        last7Days: calculateTimeBasedAccuracy(7),
        last30Days: calculateTimeBasedAccuracy(30),
        last90Days: calculateTimeBasedAccuracy(90)
      },
      
      // League breakdown
      leagueStats: Object.entries(leagueStats).map(([league, stats]) => ({
        league,
        accuracy: (stats.correct / stats.total) * 100,
        total: stats.total,
        correct: stats.correct
      })),
      
      // Metadata
      lastUpdated: new Date().toISOString(),
      totalCategories: {
        winner: categories.winner.total,
        scoreline: categories.scoreline.total,
        btts: categories.btts.total,
        goalLine: categories.goalLine.total
      }
    };
    
    await env.PREDICTIONS_KV.put('overall_accuracy_stats', JSON.stringify(overallStats));
    
    console.log(`📈 Overall accuracy: ${overallStats.accuracy.toFixed(1)}% (${correctPredictions}/${totalPredictions})`);
    
  } catch (error) {
    console.error('Error updating overall accuracy stats:', error);
  }
}