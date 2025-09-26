/**
 * Cloudflare Scheduled Worker - Automated Prediction Updates
 * This runs automatically on Cloudflare's edge network
 * 
 * Deploy this separately to Cloudflare without affecting your git repository
 */

export default {
  async scheduled(event, env, ctx) {
    console.log('🤖 Cloudflare Cron: Starting automated prediction update');
    
    const startTime = Date.now();
    let processedPredictions = 0;
    let errors = [];

    try {
      // Get today's matches from Football API
      const matches = await getTodaysMatches(env);
      console.log(`Found ${matches.length} matches to process`);

      // Process matches in batches
      const batchSize = 5;
      for (let i = 0; i < matches.length; i += batchSize) {
        const batch = matches.slice(i, i + batchSize);
        
        const batchResults = await Promise.allSettled(
          batch.map(match => generateAndStorePrediction(match, env))
        );

        batchResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            processedPredictions++;
          } else {
            errors.push({
              matchId: batch[index].id,
              error: result.reason?.message || 'Unknown error'
            });
          }
        });

        // Rate limiting - wait between batches
        if (i + batchSize < matches.length) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      // Store execution log in KV
      const executionResult = {
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime,
        processedPredictions,
        totalMatches: matches.length,
        errors: errors.length,
        errorDetails: errors.slice(0, 5) // Limit stored errors
      };

      await env.PREDICTIONS_KV.put(
        `execution_log_${Date.now()}`, 
        JSON.stringify(executionResult),
        { expirationTtl: 7 * 24 * 60 * 60 } // 7 days
      );

      console.log(`✅ Cron completed: ${processedPredictions} predictions, ${errors.length} errors`);
      
      return new Response(JSON.stringify({
        success: true,
        processedPredictions,
        totalMatches: matches.length,
        errors: errors.length,
        duration: Date.now() - startTime
      }), {
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('❌ Cron execution failed:', error);
      
      // Store error log
      await env.PREDICTIONS_KV.put(
        `error_log_${Date.now()}`, 
        JSON.stringify({
          timestamp: new Date().toISOString(),
          error: error.message,
          stack: error.stack
        }),
        { expirationTtl: 7 * 24 * 60 * 60 }
      );

      return new Response(JSON.stringify({
        success: false,
        error: error.message
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
};

/**
 * Get today's matches from Football API
 */
async function getTodaysMatches(env) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const leagues = [39, 140, 78, 135, 61]; // Premier League, La Liga, Bundesliga, Serie A, Ligue 1
    
    const allMatches = [];
    
    for (const league of leagues) {
      try {
        const response = await fetch(`https://v3.football.api-sports.io/fixtures?league=${league}&date=${today}`, {
          headers: {
            'X-RapidAPI-Key': env.FOOTBALL_API_KEY,
            'X-RapidAPI-Host': 'v3.football.api-sports.io'
          }
        });

        if (response.ok) {
          const data = await response.json();
          const matches = data.response?.map(fixture => ({
            id: fixture.fixture.id,
            homeTeam: fixture.teams.home.name,
            awayTeam: fixture.teams.away.name,
            league: fixture.league.name,
            date: fixture.fixture.date,
            status: fixture.fixture.status.short
          })) || [];
          
          allMatches.push(...matches.filter(m => ['NS', 'TBD'].includes(m.status))); // Only upcoming matches
        }
        
        // Rate limit between API calls
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`Error fetching league ${league}:`, error);
      }
    }

    return allMatches;
    
  } catch (error) {
    console.error('Error in getTodaysMatches:', error);
    return [];
  }
}

/**
 * Generate prediction using Gemini and store in KV
 */
async function generateAndStorePrediction(match, env) {
  try {
    console.log(`🔮 Generating prediction for ${match.homeTeam} vs ${match.awayTeam}`);
    
    // Generate prediction using Gemini
    const prediction = await callGeminiAPI(match, env);
    
    // Store in KV
    const predictionData = {
      matchId: match.id,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      league: match.league,
      matchDate: match.date,
      prediction,
      timestamp: new Date().toISOString(),
      automated: true
    };

    await env.PREDICTIONS_KV.put(
      `prediction_${match.id}`,
      JSON.stringify(predictionData),
      { expirationTtl: 30 * 24 * 60 * 60 } // 30 days
    );

    // Also store in recent predictions list
    const recentKey = 'recent_predictions';
    let recentList = [];
    
    try {
      const existing = await env.PREDICTIONS_KV.get(recentKey);
      if (existing) {
        recentList = JSON.parse(existing);
      }
    } catch (e) {
      console.warn('Could not load recent predictions list');
    }

    recentList.unshift({
      matchId: match.id,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      timestamp: new Date().toISOString()
    });

    // Keep only last 50 predictions
    recentList = recentList.slice(0, 50);
    
    await env.PREDICTIONS_KV.put(recentKey, JSON.stringify(recentList));
    
    console.log(`✅ Stored prediction for match ${match.id}`);
    return predictionData;
    
  } catch (error) {
    console.error(`❌ Error generating prediction for match ${match.id}:`, error);
    throw error;
  }
}

/**
 * Call Gemini API for prediction
 */
async function callGeminiAPI(match, env) {
  const prompt = `Analyze this football match and provide a detailed prediction:

Match: ${match.homeTeam} vs ${match.awayTeam}
League: ${match.league}
Date: ${match.date}

Please provide:
1. Match outcome prediction (Home Win, Draw, Away Win)
2. Confidence level (1-100)
3. Predicted score
4. Key factors analysis
5. Both teams to score prediction

Format your response as a structured analysis.`;

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${env.GEMINI_API_KEY}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1000
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  const prediction = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No prediction generated';
  
  return {
    analysis: prediction,
    model: 'gemini-pro',
    confidence: extractConfidence(prediction),
    outcome: extractOutcome(prediction),
    generatedAt: new Date().toISOString()
  };
}

/**
 * Extract confidence from prediction text
 */
function extractConfidence(text) {
  const match = text.match(/confidence[:\s]*(\d+)/i);
  return match ? parseInt(match[1]) : 75; // Default confidence
}

/**
 * Extract outcome from prediction text
 */
function extractOutcome(text) {
  const lowerText = text.toLowerCase();
  if (lowerText.includes('home win') || lowerText.includes('home team')) return 'Home Win';
  if (lowerText.includes('away win') || lowerText.includes('away team')) return 'Away Win';
  if (lowerText.includes('draw') || lowerText.includes('tie')) return 'Draw';
  return 'Unknown';
}