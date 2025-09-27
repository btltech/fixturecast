// Cloudflare Pages Function: Regenerate All Predictions
// This endpoint triggers the regeneration of all predictions for today's matches

export async function onRequest(context) {
  const { env } = context;

  try {
    console.log('🔄 Regenerating all predictions...');

    // Fetch today's matches
    const matches = await getTodaysMatches(env);
    if (!matches.length) {
      return new Response(
        JSON.stringify({ error: 'No matches found for today.' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    let regeneratedCount = 0;

    // Regenerate predictions for each match
    for (const match of matches) {
      try {
        await generateAndStorePrediction(match, env);
        regeneratedCount++;
        // Add a 5-second delay between requests
        await new Promise(resolve => setTimeout(resolve, 5000));
      } catch (error) {
        console.error(`❌ Failed to regenerate prediction for match ${match.id}:`, error);
      }
    }

    return new Response(
      JSON.stringify({ success: true, regenerated: regeneratedCount, total: matches.length }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Error in regenerating predictions:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// Helper function to fetch today's matches
async function getTodaysMatches(env) {
  const today = new Date().toISOString().split('T')[0];
  const response = await fetch(`https://v3.football.api-sports.io/fixtures?date=${today}`, {
    method: 'GET',
    headers: {
      'X-RapidAPI-Key': env.FOOTBALL_API_KEY,
      'X-RapidAPI-Host': 'v3.football.api-sports.io'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch matches: ${response.statusText}`);
  }

  const data = await response.json();
  return data.response.map(match => ({
    id: match.fixture.id,
    homeTeam: match.teams.home.name,
    awayTeam: match.teams.away.name,
    league: match.league.name,
    date: match.fixture.date
  }));
}

// Helper function to generate and store predictions
async function generateAndStorePrediction(match, env) {
  const prediction = await callGeminiAPI(match, env);

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
}

// Helper function to call the Gemini API
async function callGeminiAPI(match, env) {
  const prompt = `Analyze this football match and provide a detailed prediction:\n\nMatch: ${match.homeTeam} vs ${match.awayTeam}\nLeague: ${match.league}\nDate: ${match.date}\n\nPlease provide:\n1. Match outcome prediction (Home Win, Draw, Away Win)\n2. Confidence level (1-100)\n3. Predicted score\n4. Key factors analysis\n5. Both teams to score prediction\n\nFormat your response as a structured analysis.`;

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${env.GEMINI_API_KEY}`, {
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
    throw new Error(`Gemini API error: ${response.statusText}`);
  }

  const data = await response.json();
  return {
    analysis: data.candidates?.[0]?.content?.parts?.[0]?.text || 'No prediction generated',
    model: 'gemini-2.5-flash',
    confidence: extractConfidence(data),
    outcome: extractOutcome(data),
    generatedAt: new Date().toISOString()
  };
}

// Helper function to extract confidence from prediction text
function extractConfidence(data) {
  // Implement confidence extraction logic
  return 75; // Placeholder
}

// Helper function to extract outcome from prediction text
function extractOutcome(data) {
  // Implement outcome extraction logic
  return 'Draw'; // Placeholder
}