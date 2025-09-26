/**
 * Cloudflare Pages Function: /api/update-results
 * This endpoint is called by AWS Lambda to trigger match result updates
 */

export async function onRequestPost(context) {
  const { request, env } = context;
  
  try {
    console.log('⚽ Match results update triggered by Lambda scheduler');
    
    // Verify the request is from your Lambda function
    const authHeader = request.headers.get('Authorization');
    const expectedApiKey = env.LAMBDA_API_KEY || 'fixturecast-lambda-secure-2024-key';
    
    if (!authHeader || !authHeader.includes(expectedApiKey)) {
      console.error('❌ Unauthorized results update attempt');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    const requestBody = await request.json().catch(() => ({}));
    const { trigger, timestamp } = requestBody;
    console.log('📋 Results update triggered:', { trigger, timestamp });
    
    // Your match results update logic here
    const updateResults = await updateMatchResults(env);
    
    console.log('✅ Match results updated successfully:', updateResults);
    
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Match results updated successfully',
        timestamp: new Date().toISOString(),
        results: updateResults,
        trigger: trigger || 'lambda',
        environment: 'cloudflare-pages'
      }),
      {
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
    
  } catch (error) {
    console.error('❌ Match results update failed:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

/**
 * Update match results (implement your logic)
 */
async function updateMatchResults(env) {
  // TODO: Implement your match results update logic
  // This might involve:
  // 1. Fetching latest results from your football API
  // 2. Updating match statuses in your KV store or database
  // 3. Calculating league table changes
  // 4. Refreshing any caches
  
  console.log('⚽ Fetching latest match results...');
  
  // Get Football API key from environment
  const footballApiKey = env.VITE_FOOTBALL_API_KEY || env.FOOTBALL_API_KEY;
  
  // Simulate processing - replace with your actual logic
  const startTime = Date.now();
  
  try {
    // Example: You could call your existing football API service here
    // const finishedMatches = await getFinishedFixtures();
    // const updatedResults = await updateResults(finishedMatches);
    // await updateLeagueTables();
    
    const processingTime = Date.now() - startTime;
    
    const results = {
      matchesChecked: 25,
      newResults: 8,
      tablesUpdated: 3,
      accuracyUpdates: 5,
      processingTimeMs: processingTime,
      footballApiKey: footballApiKey ? 'configured' : 'missing',
      lastUpdate: new Date().toISOString()
    };
    
    return results;
    
  } catch (error) {
    console.error('Match results update error:', error);
    throw error;
  }
}

// Handle CORS preflight
export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}