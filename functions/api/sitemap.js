// Sitemap API endpoint for Cloudflare Pages
export async function onRequest(context) {
  const { request } = context;
  
  try {
    // Import the sitemap generator
    const { sitemapGenerator } = await import('../../utils/sitemapGenerator.ts');
    
    // Get matches data (you might want to fetch this from your API)
    const matches = []; // This would be populated with actual match data
    
    // Generate sitemap
    const sitemap = sitemapGenerator.generateSitemap(matches);
    
    return new Response(sitemap, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600'
      }
    });
  } catch (error) {
    console.error('Error generating sitemap:', error);
    
    return new Response('Error generating sitemap', {
      status: 500,
      headers: {
        'Content-Type': 'text/plain'
      }
    });
  }
}
