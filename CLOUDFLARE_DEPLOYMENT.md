# FixtureCast - Cloudflare Pages Deployment Guide

## Prerequisites
- Cloudflare account (free tier available)
- GitHub repository with your code
- Football API key from API-Sports.io

## Deployment Steps

### Step 1: Push Latest Code
```bash
git add .
git commit -m "feat: Add Cloudflare Pages configuration"
git push origin main
```

### Step 2: Deploy to Cloudflare Pages

1. **Login to Cloudflare Dashboard**
   - Go to [dash.cloudflare.com](https://dash.cloudflare.com)
   - Navigate to "Pages" in the sidebar

2. **Create New Project**
   - Click "Create a project"
   - Select "Connect to Git"
   - Choose GitHub and authorize Cloudflare
   - Select your `fixturecast` repository

3. **Configure Build Settings**
   - **Framework preset**: `Vite`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Root directory**: `/` (leave empty)

4. **Environment Variables**
   - Add environment variable:
     - **Name**: `FOOTBALL_API_KEY`
     - **Value**: `89e32953fd6a91a630144cf150bcf151`

5. **Deploy**
   - Click "Save and Deploy"
   - Wait for deployment to complete (usually 2-3 minutes)

### Step 3: Custom Domain (Optional)

1. **Add Custom Domain**
   - In your Pages project, go to "Custom domains"
   - Click "Set up a custom domain"
   - Enter your domain (e.g., `fixturecast.yourdomain.com`)

2. **DNS Configuration**
   - Add a CNAME record in your domain's DNS:
     - **Name**: `fixturecast` (or your subdomain)
     - **Target**: `your-project.pages.dev`

## Architecture

### Production (Cloudflare):
- **Frontend**: Static files served by Cloudflare Global CDN
- **API Proxy**: Cloudflare Pages Functions at `/api/proxy/*`
- **Domain**: Your custom domain or `*.pages.dev`

### Features:
- ✅ Global CDN with 200+ edge locations
- ✅ Automatic HTTPS with SSL certificates
- ✅ DDoS protection and Web Application Firewall
- ✅ Analytics and performance monitoring
- ✅ Automatic deployments on git push
- ✅ Preview deployments for pull requests
- ✅ Edge computing with Workers/Functions

## Performance Benefits

- **Ultra-fast loading**: Content served from nearest edge location
- **99.9% uptime**: Enterprise-grade reliability
- **Automatic scaling**: Handles traffic spikes seamlessly
- **Mobile optimized**: Perfect performance on all devices

## Monitoring & Analytics

1. **Analytics Dashboard**
   - View page views, unique visitors, and bandwidth usage
   - Monitor performance metrics and Core Web Vitals

2. **Function Logs**
   - Check API proxy function logs in "Functions" tab
   - Monitor API usage and error rates

3. **Real User Monitoring**
   - Track actual user experience metrics
   - Identify performance bottlenecks

## Troubleshooting

### Common Issues:

1. **Build Fails**
   - Check build logs in Cloudflare dashboard
   - Ensure all dependencies are in package.json
   - Verify build command is correct

2. **API Calls Fail**
   - Verify `FOOTBALL_API_KEY` environment variable is set
   - Check function logs for errors
   - Ensure API quota hasn't been exceeded

3. **Custom Domain Not Working**
   - Verify DNS records are properly configured
   - Wait for DNS propagation (up to 24 hours)
   - Check SSL certificate status

## Cost Estimation

**Cloudflare Pages (Free Tier):**
- 500 builds per month
- Unlimited requests
- Unlimited bandwidth
- 100 custom domains
- 1 concurrent build

**Upgrade when needed:**
- Pro plan: $20/month for advanced features
- Business plan: $200/month for enterprise features

Your FixtureCast app will likely stay within the free tier limits for most use cases!
