/**
 * Cloudflare API Route - Manual Prediction Trigger
 * 
 * This allows you to manually trigger prediction updates
 * without waiting for the cron schedule
 * 
 * Deploy to: functions/api/update-predictions.js
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
    console.log('🔄 Manual prediction update triggered');
    
    const startTime = Date.now();
    let processedPredictions = 0;
    
    // Get matches for today and tomorrow
    const matches = await getUpcomingMatches(env);
    console.log(`Processing ${matches.length} upcoming matches`);

    // Process matches
    for (const match of matches) {
      try {
        await generateAndStorePrediction(match, env);
        processedPredictions++;
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1500));
        
      } catch (error) {
        console.error(`Error processing match ${match.id}:`, error);
      }
    }

    const duration = Date.now() - startTime;
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Predictions updated successfully',
      processedPredictions,
      totalMatches: matches.length,
      duration
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Manual update failed:', error);
    
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
 * Get upcoming matches (today + next 2 days)
 */
async function getUpcomingMatches(env) {
  const matches = [];
  const leagues = [39, 140, 78, 135, 61];
  
  // Get matches for next 3 days
  for (let i = 0; i < 3; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];
    
    for (const league of leagues) {
      try {
        const response = await fetch(`https://v3.football.api-sports.io/fixtures?league=${league}&date=${dateStr}`, {
          headers: {
            'X-RapidAPI-Key': env.FOOTBALL_API_KEY,
            'X-RapidAPI-Host': 'v3.football.api-sports.io'
          }
        });

        if (response.ok) {
          const data = await response.json();
          const dayMatches = data.response?.map(fixture => ({
            id: fixture.fixture.id,
            homeTeam: fixture.teams.home.name,
            awayTeam: fixture.teams.away.name,
            league: fixture.league.name,
            date: fixture.fixture.date,
            status: fixture.fixture.status.short
          })) || [];
          
          matches.push(...dayMatches.filter(m => ['NS', 'TBD'].includes(m.status)));
        }
        
        // Rate limit
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`Error fetching league ${league} for ${dateStr}:`, error);
      }
    }
  }

  return matches;
}

/**
 * Generate and store prediction using Gemini
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