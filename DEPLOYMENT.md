# FixtureCast Deployment Guide

## Deploying to Vercel (Recommended)

### Prerequisites
- GitHub account
- Vercel account (free tier available)
- Football API key from API-Sports.io

### Step 1: Push to GitHub
```bash
git add .
git commit -m "feat: Add Vercel deployment configuration"
git push origin main
```

### Step 2: Deploy to Vercel
1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click "New Project"
3. Import your FixtureCast repository
4. Configure environment variables:
   - `FOOTBALL_API_KEY`: Your API-Sports.io API key
5. Click "Deploy"

### Step 3: Access Your App
Your app will be available at `https://your-project-name.vercel.app`

## Environment Variables

### Required Variables:
- `FOOTBALL_API_KEY`: Your API key from API-Sports.io

### Optional Variables:
- `VITE_PROXY_URL`: Custom proxy URL (defaults to local development proxy)

## Architecture

### Development:
- Frontend: Vite dev server (localhost:5173)
- API Proxy: Express.js server (localhost:3001)

### Production (Vercel):
- Frontend: Static files served by Vercel CDN
- API Proxy: Vercel serverless function (`/api/proxy`)

## Features
- ✅ Automatic HTTPS
- ✅ Global CDN
- ✅ Serverless API functions
- ✅ Environment variable management
- ✅ Automatic deployments on git push
- ✅ Mobile responsive
- ✅ Progressive Web App capabilities

## Monitoring
- Check deployment status at Vercel dashboard
- View logs in Vercel Functions tab
- Monitor API usage in console logs
