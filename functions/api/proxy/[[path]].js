// Cloudflare Pages Function for CORS proxy
export async function onRequest(context) {
  const { request, env } = context;
  
  // Set CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return new Response(null, { 
      status: 200, 
      headers: corsHeaders 
    });
  }

  try {
    // Extract the API endpoint from the URL
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/');
    const apiPath = '/' + pathSegments.slice(3).join('/'); // Remove /api/proxy
    
    // Get API key from environment with fallback
    const API_KEY = env.FOOTBALL_API_KEY || '89e32953fd6a91a630144cf150bcf151';
    
    // Validate API key
    if (!API_KEY || API_KEY.length < 10) {
      console.error('[Cloudflare] Invalid or missing API key');
      return new Response(JSON.stringify({ 
        error: 'API configuration error', 
        message: 'Invalid API key' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Build the target API URL
    const apiUrl = new URL(`https://v3.football.api-sports.io${apiPath}`);
    
    // Copy query parameters
    for (const [key, value] of url.searchParams) {
      apiUrl.searchParams.append(key, value);
    }

    console.log(`[Cloudflare] ✅ Proxying to: ${apiUrl.toString()}`);
    console.log(`[Cloudflare] 🔑 Using API key: ${API_KEY.substring(0, 8)}...`);

    // Make the API request with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    const response = await fetch(apiUrl.toString(), {
      method: request.method,
      headers: {
        'x-rapidapi-key': API_KEY,
        'x-rapidapi-host': 'v3.football.api-sports.io',
        'Accept': 'application/json',
        'User-Agent': 'FixtureCast/1.0 (Cloudflare Pages)'
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Cloudflare] ❌ API request failed: ${response.status} ${response.statusText}`, errorText);
      
      return new Response(JSON.stringify({ 
        error: 'API request failed', 
        status: response.status,
        message: response.statusText,
        details: errorText
      }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const data = await response.json();
    
    console.log(`[Cloudflare] ✅ Success: ${response.status}, Results: ${data.results || 0}`);
    
    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300' // 5 minute cache
      }
    });

  } catch (error) {
    console.error('[Cloudflare] ❌ Proxy error:', error);
    
    return new Response(JSON.stringify({ 
      error: 'Proxy request failed', 
      message: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
}
