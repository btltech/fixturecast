export async function onRequest(context) {
  const { request, env } = context;

  // Resolve secret (must be set as a Secret in Pages Runtime)
  const apiKey = env.PREDICTION_API_KEY || env.VITE_PREDICTION_API_KEY || 'fixturecast_secure_key_2024';

  // Build upstream URL to the secure store endpoint
  const url = new URL(request.url);
  const upstream = new URL('/api/predictions/store', url.origin);
  url.searchParams.forEach((v, k) => upstream.searchParams.set(k, v));

  // Clone request with injected headers
  const init = {
    method: request.method,
    headers: new Headers(request.headers),
  };

  // Ensure JSON content type and inject server-side API key
  init.headers.set('Content-Type', 'application/json');
  init.headers.set('X-API-Key', apiKey);

  if (request.method === 'POST' || request.method === 'PUT') {
    init.body = await request.clone().text();
  }

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders() });
  }

  try {
    const resp = await fetch(upstream.toString(), init);
    const headers = new Headers(resp.headers);
    for (const [k, v] of Object.entries(corsHeaders())) headers.set(k, v);
    return new Response(await resp.text(), { status: resp.status, headers });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: e.message || String(e) }), {
      status: 500,
      headers: { ...corsHeaders(), 'Content-Type': 'application/json' }
    });
  }
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
  };
}
