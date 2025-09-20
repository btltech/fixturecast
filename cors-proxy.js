import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import 'dotenv/config';

const app = express();
const PORT = 3001;

const API_KEY = process.env.VITE_FOOTBALL_API_KEY || process.env.FOOTBALL_API_KEY || '89e32953fd6a91a630144cf150bcf151';

if (!API_KEY || API_KEY.length < 10) {
  console.error('🔴 FATAL ERROR: Football API key is missing or invalid.');
  process.exit(1);
}

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

const apiProxy = createProxyMiddleware({
  target: 'https://v3.football.api-sports.io',
  changeOrigin: true,
  pathRewrite: { '^/api': '' },
  headers: {
    'x-rapidapi-key': API_KEY,
    'x-rapidapi-host': 'v3.football.api-sports.io'
  },
  onProxyReq: (proxyReq, req, res) => {
    // Ensure headers are set
    proxyReq.setHeader('x-rapidapi-key', API_KEY);
    proxyReq.setHeader('x-rapidapi-host', 'v3.football.api-sports.io');
    console.log(`[Proxy] Forwarding to: ${proxyReq.getHeader('host')}${proxyReq.path}`);
    console.log(`[Proxy] Headers: key=${proxyReq.getHeader('x-rapidapi-key')?.substring(0,8)}...`);
  },
  onProxyRes: (proxyRes, req, res) => {
    console.log(`[Proxy] Response status: ${proxyRes.statusCode}`);
  },
  onError: (err, req, res) => {
    console.error('[Proxy] Error:', err);
    if (res && !res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
    }
    if (res && !res.writableEnded) {
      res.end('Proxy error: ' + err.message);
    }
  },
});

app.use('/api', apiProxy);

const server = app.listen(PORT, () => {
  console.log(`🚀 CORS Proxy server is running on http://localhost:${PORT}`);
  console.log(`🔑 Using API Key ending in: ...${API_KEY.slice(-4)}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err, origin) => {
  console.error(`Caught exception: ${err}\nException origin: ${origin}`);
  process.exit(1);
});
