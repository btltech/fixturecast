// Cloudflare Pages middleware for canonical URL enforcement
export async function onRequest(context) {
  const { request, next } = context;
  const url = new URL(request.url);
  
  // Get the hostname
  const hostname = url.hostname;
  
  // Define your preferred canonical host (www or apex)
  const preferredHost = 'www'; // Change to 'apex' if you prefer apex domain
  
  // Check if we need to redirect
  let shouldRedirect = false;
  let redirectUrl = null;
  
  if (preferredHost === 'www' && !hostname.startsWith('www.')) {
    // Redirect apex to www
    shouldRedirect = true;
    redirectUrl = `https://www.${hostname}${url.pathname}${url.search}`;
  } else if (preferredHost === 'apex' && hostname.startsWith('www.')) {
    // Redirect www to apex
    shouldRedirect = true;
    redirectUrl = `https://${hostname.substring(4)}${url.pathname}${url.search}`;
  }
  
  // Perform redirect if needed
  if (shouldRedirect && redirectUrl) {
    return new Response(null, {
      status: 301,
      headers: {
        'Location': redirectUrl,
        'Cache-Control': 'public, max-age=31536000'
      }
    });
  }
  
  // Add security headers
  const response = await next();
  
  // Add canonical URL header
  const canonicalUrl = `https://${preferredHost === 'www' ? 'www.' : ''}${hostname.replace('www.', '')}${url.pathname}`;
  
  response.headers.set('Link', `<${canonicalUrl}>; rel="canonical"`);
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  return response;
}
