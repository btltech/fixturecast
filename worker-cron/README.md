# 🚀 Cloudflare Worker Cron Setup

## 📋 **What This Does**

Creates a separate Cloudflare Worker that:
- ✅ **Runs cron triggers** (supported in Workers, not Pages)
- ✅ **Calls your Pages API** endpoints on schedule
- ✅ **Handles errors gracefully** with logging and alerts
- ✅ **Allows manual testing** via HTTP endpoints

## ⏰ **Cron Schedule**

- **Every hour** (15 minutes past): Update scores and accuracy
- **Predictions**: Manual trigger only (use `/trigger-predictions` endpoint)

## 🛠️ **Deployment Steps**

### 1. Install Wrangler CLI
```bash
npm install -g @cloudflare/wrangler
wrangler auth login
```

### 2. Deploy the Worker
```bash
cd worker-cron
wrangler deploy
```

### 3. Set Secrets
```bash
wrangler secret put PREDICTION_API_KEY
# Enter your API key when prompted

# Optional: Add error webhook for monitoring
wrangler secret put ERROR_WEBHOOK_URL
# Enter webhook URL (Discord, Slack, etc.)
```

### 4. Verify Deployment
```bash
# Check worker status
wrangler list

# View logs
wrangler tail
```

## 🧪 **Testing**

### Manual Triggers:
```bash
# Test prediction generation
curl https://fixturecast-cron-worker.your-subdomain.workers.dev/trigger-predictions

# Test score updates  
curl https://fixturecast-cron-worker.your-subdomain.workers.dev/trigger-scores
```

### Monitor Logs:
```bash
wrangler tail fixturecast-cron-worker
```

## 🎯 **Architecture**

```
Cloudflare Worker (Cron) → Cloudflare Pages (API) → KV Storage
     ↓                           ↓                      ↓
  Scheduled                  /api/update-*         Store Results
  Triggers                   Functions
```

## ⚙️ **Configuration**

### Environment Variables:
- `FIXTURECAST_DOMAIN`: Your Pages domain
- `PREDICTION_API_KEY`: API key for authentication

### Secrets:
- Set via `wrangler secret put PREDICTION_API_KEY`
- Same key used in your Pages environment variables

## 📊 **Expected Results**

Once deployed:
- ✅ **Scores auto-update** every hour
- ✅ **Predictions generate** only when manually triggered
- ✅ **Scores update** every hour for accuracy tracking
- ✅ **Your Pages API** gets called on schedule
- ✅ **No more manual intervention** needed

## 🔧 **Monitoring**

### Worker Logs:
```bash
wrangler tail fixturecast-cron-worker --format pretty
```

### Cloudflare Dashboard:
- Workers → fixturecast-cron-worker → Logs
- Analytics tab for execution metrics
- Cron Triggers tab to see schedule

Your FixtureCast will be fully automated with this Worker! 🎉