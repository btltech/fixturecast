/**
 * Cloudflare Worker - Cron Triggers for FixtureCast
 * 
 * This Worker runs on schedule and calls your Pages API endpoints
 * Deploy this as a separate Worker with cron triggers enabled
 */

export default {
  // Handle scheduled events (cron triggers)
  async scheduled(event, env, ctx) {
    console.log(`🕐 Cron trigger fired: ${event.cron}`);
    
    try {
      // Determine which function to call based on schedule
      if (event.cron === '0 */6 * * *') {
        // Every 6 hours: Generate predictions
        await triggerPredictionUpdate(env);
      } else if (event.cron === '15 * * * *') {
        // Every hour: Update scores and accuracy
        await triggerScoreUpdate(env);
      }
      
      console.log('✅ Cron job completed successfully');
      
    } catch (error) {
      console.error('❌ Cron job failed:', error);
      
      // Optional: Send alert to a monitoring service
      if (env.ERROR_WEBHOOK_URL) {
        await sendErrorAlert(error, event.cron, env);
      }
    }
  },

  // Handle HTTP requests (for manual testing)
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    if (url.pathname === '/trigger-predictions') {
      await triggerPredictionUpdate(env);
      return new Response('Predictions triggered', { status: 200 });
    }
    
    if (url.pathname === '/trigger-scores') {
      await triggerScoreUpdate(env);
      return new Response('Score update triggered', { status: 200 });
    }
    
    return new Response(`FixtureCast Cron Worker
    
Available endpoints:
- /trigger-predictions (manual prediction update)
- /trigger-scores (manual score update)

Automated schedules:
- Predictions: Every 6 hours (0 */6 * * *)
- Score updates: Every hour (15 * * * *)
    `, { 
      headers: { 'Content-Type': 'text/plain' }
    });
  }
};

/**
 * Trigger prediction generation on FixtureCast Pages
 */
async function triggerPredictionUpdate(env) {
  console.log('🤖 Triggering prediction update...');
  
  try {
    const response = await fetch(`${env.FIXTURECAST_DOMAIN}/api/update-predictions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.PREDICTION_API_KEY}`,
        'Content-Type': 'application/json',
        'User-Agent': 'FixtureCast-Worker-Cron/1.0'
      }
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log(`✅ Predictions updated: ${result.processedPredictions || 0} matches processed`);
    } else {
      throw new Error(`Prediction API error: ${response.status} - ${result.error}`);
    }
    
    return result;
    
  } catch (error) {
    console.error('❌ Prediction update failed:', error);
    throw error;
  }
}

/**
 * Trigger score updates for accuracy tracking
 */
async function triggerScoreUpdate(env) {
  console.log('📊 Triggering score update...');
  
  try {
    const response = await fetch(`${env.FIXTURECAST_DOMAIN}/api/update-scores`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.PREDICTION_API_KEY}`,
        'Content-Type': 'application/json',
        'User-Agent': 'FixtureCast-Worker-Cron/1.0'
      }
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log(`✅ Scores updated: ${result.updatedMatches || 0} matches, ${result.accuracyUpdates || 0} accuracy calculations`);
    } else {
      throw new Error(`Score API error: ${response.status} - ${result.error}`);
    }
    
    return result;
    
  } catch (error) {
    console.error('❌ Score update failed:', error);
    throw error;
  }
}

/**
 * Send error alert to monitoring service (optional)
 */
async function sendErrorAlert(error, cronSchedule, env) {
  if (!env.ERROR_WEBHOOK_URL) return;
  
  try {
    await fetch(env.ERROR_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service: 'FixtureCast Cron Worker',
        error: error.message,
        schedule: cronSchedule,
        timestamp: new Date().toISOString(),
        stack: error.stack
      })
    });
  } catch (alertError) {
    console.error('Failed to send error alert:', alertError);
  }
}