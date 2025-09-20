/**
 * Core Web Vitals API Endpoint
 * Handles Core Web Vitals data collection and reporting
 */

export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const data = await request.json();
    
    // Validate the data
    if (!data || typeof data !== 'object') {
      return new Response(JSON.stringify({ error: 'Invalid data format' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Store in KV storage for analysis
    const timestamp = Date.now();
    const key = `core-web-vitals:${timestamp}:${data.url || 'unknown'}`;
    
    await env.PERFORMANCE_KV.put(key, JSON.stringify({
      ...data,
      timestamp,
      receivedAt: new Date().toISOString()
    }));

    // Send to analytics services
    await Promise.allSettled([
      sendToGoogleAnalytics(data),
      sendToSearchConsole(data),
      sendToPageSpeedInsights(data)
    ]);

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Core Web Vitals data recorded',
      timestamp 
    }), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });

  } catch (error) {
    console.error('Core Web Vitals API error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function onRequestOptions(context) {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}

/**
 * Send data to Google Analytics
 */
async function sendToGoogleAnalytics(data) {
  try {
    // Implementation for Google Analytics 4
    // This would typically use the Measurement Protocol
    console.log('Sending to Google Analytics:', data);
  } catch (error) {
    console.error('Google Analytics error:', error);
  }
}

/**
 * Send data to Search Console
 */
async function sendToSearchConsole(data) {
  try {
    // Implementation for Search Console API
    // This would use the Search Console API to report Core Web Vitals
    console.log('Sending to Search Console:', data);
  } catch (error) {
    console.error('Search Console error:', error);
  }
}

/**
 * Send data to PageSpeed Insights
 */
async function sendToPageSpeedInsights(data) {
  try {
    // Implementation for PageSpeed Insights API
    // This would use the PageSpeed Insights API for additional analysis
    console.log('Sending to PageSpeed Insights:', data);
  } catch (error) {
    console.error('PageSpeed Insights error:', error);
  }
}
