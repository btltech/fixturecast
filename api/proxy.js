// Vercel serverless function for CORS proxy
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const API_KEY = process.env.FOOTBALL_API_KEY || '89e32953fd6a91a630144cf150bcf151';
  
  try {
    const { query } = req;
    const endpoint = req.url.replace('/api/proxy', '');
    
    const apiUrl = new URL(`https://v3.football.api-sports.io${endpoint}`);
    Object.entries(query).forEach(([key, value]) => {
      apiUrl.searchParams.append(key, value);
    });

    const response = await fetch(apiUrl.toString(), {
      headers: {
        'x-rapidapi-key': API_KEY,
        'x-rapidapi-host': 'v3.football.api-sports.io'
      }
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ error: 'Proxy request failed', message: error.message });
  }
}
