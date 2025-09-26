# 🤖 Complete Automation Setup

## 📅 **Cron Schedule Overview**

### 🔮 **Prediction Generation**
- **Frequency**: Every 6 hours (00:00, 06:00, 12:00, 18:00 UTC)
- **Function**: `/api/update-predictions`
- **Purpose**: Generate predictions for upcoming matches
- **Workflow**: `.github/workflows/predictions.yml`

### 📊 **Score Updates & Accuracy Tracking**  
- **Frequency**: Every hour (15 minutes past the hour)
- **Function**: `/api/update-scores`
- **Purpose**: Update match results and calculate prediction accuracy
- **Workflow**: `.github/workflows/score-updates.yml`

## 🛠️ **Setup Instructions**

### 1. GitHub Secrets Configuration
Go to your GitHub repository → Settings → Secrets and variables → Actions

Add this secret:
```
PREDICTION_API_KEY = your-chosen-api-key-here
```

### 2. Cloudflare Environment Variables
In Cloudflare Pages Dashboard → Settings → Environment Variables:
```
GEMINI_API_KEY = your-gemini-api-key
FOOTBALL_API_KEY = your-football-api-key  
PREDICTION_API_KEY = same-as-github-secret
```

### 3. Enable GitHub Actions
- ✅ Workflows are already configured
- ✅ Will start automatically once secrets are set
- ✅ Manual triggers available via GitHub Actions tab

## 📈 **What Each Automation Does**

### 🤖 **Prediction Generation (`predictions.yml`)**
1. Fetches upcoming matches from Football API
2. Generates predictions using Gemini Flash
3. Stores predictions in Cloudflare KV
4. Updates recent predictions list
5. Runs every 6 hours to keep content fresh

### 📊 **Score Updates (`score-updates.yml`)**
1. Checks recent predictions for completed matches
2. Fetches final scores from Football API
3. Calculates prediction accuracy (correct/incorrect)
4. Updates accuracy statistics
5. Stores results for accuracy dashboard
6. Runs hourly to catch completed matches quickly

## 🎯 **Expected Results**

### **Live Site Benefits:**
- ✅ **Fresh predictions** every 6 hours automatically
- ✅ **Real-time accuracy tracking** updated hourly
- ✅ **No more "Loading..." pages**
- ✅ **Comprehensive accuracy dashboard** with statistics

### **Performance Metrics:**
- **Prediction updates**: ~5-15 matches per run
- **Score checks**: ~20-50 recent predictions per hour
- **API usage**: Optimized with rate limiting
- **Storage**: Efficient KV usage with TTL expiration

## 🔧 **Manual Testing**

### Test Prediction Generation:
```bash
curl -X POST https://fixturecast.pages.dev/api/update-predictions \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### Test Score Updates:
```bash
curl -X POST https://fixturecast.pages.dev/api/update-scores \
  -H "Authorization: Bearer YOUR_API_KEY"
```

## 📊 **Monitoring**

### GitHub Actions:
- View workflow runs in GitHub Actions tab
- Check logs for success/failure status
- Manual triggers available for testing

### Cloudflare Pages:
- Functions logs in Cloudflare dashboard
- KV storage browser to see stored data
- Performance metrics in dashboard

## 🚀 **Activation Steps**

1. **Set GitHub secret** `PREDICTION_API_KEY`
2. **Set Cloudflare environment variables**
3. **Push to main branch** (triggers deployment)
4. **Wait for first cron cycle** (max 6 hours)
5. **Check your live site** for fresh predictions!

Your FixtureCast site will now be fully automated! 🎉⚽