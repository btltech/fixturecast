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
 * Generate and store prediction (same as in scheduled.js)
 */
async function generateAndStorePrediction(match, env) {
  // ... (same implementation as in scheduled.js)
  // Copy the exact same function from scheduled.js
}