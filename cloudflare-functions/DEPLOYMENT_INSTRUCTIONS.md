# 🚀 Cloudflare Cron Setup Instructions

## 📋 What This Does
- **Automated predictions every 6 hours** using Cloudflare Cron
- **Stores predictions in your existing KV storage**  
- **Works with your live Cloudflare Pages site**
- **No changes to your git repository**

## 🛠️ Deployment Steps

### 1. Upload Files to Cloudflare (NOT Git)

**Option A: Cloudflare Dashboard**
1. Go to Cloudflare Pages → Your Project → Functions
2. Upload `scheduled.js` to `/functions/scheduled/`
3. Upload `update-predictions.js` to `/functions/api/`

**Option B: Wrangler CLI** 
```bash
# In the cloudflare-functions directory
npx wrangler pages deploy . --project-name fixturecast
```

### 2. Update wrangler.toml in Cloudflare

Replace your current `wrangler.toml` in Cloudflare Pages with:

```toml
name = "fixturecast"
compatibility_date = "2024-01-15"
pages_build_output_dir = "dist"

[triggers]
crons = [
  "0 */6 * * *",    # Every 6 hours
  "30 8 * * *",     # Daily at 8:30 AM UTC  
  "0 18 * * *"      # Daily at 6:00 PM UTC
]

[env.production]
[[env.production.kv_namespaces]]
binding = "PREDICTIONS_KV"
id = "f00e18bfc6a44f3d876bd4448003e1f5"
preview_id = "f00e18bfc6a44f3d876bd4448003e1f5"
```

### 3. Set Environment Variables

In Cloudflare Pages Dashboard → Settings → Environment Variables:

```
GEMINI_API_KEY = your-actual-gemini-key
FOOTBALL_API_KEY = your-actual-football-api-key  
PREDICTION_API_KEY = your-chosen-api-key-for-manual-triggers
```

### 4. Test Manual Trigger

```bash
curl -X POST https://fixturecast.pages.dev/api/update-predictions \
  -H "Authorization: Bearer your-prediction-api-key" \
  -H "Content-Type: application/json"
```

## ⏰ Cron Schedule

- **Every 6 hours**: `0 */6 * * *` (00:00, 06:00, 12:00, 18:00 UTC)
- **Daily morning**: `30 8 * * *` (08:30 UTC)  
- **Daily evening**: `0 18 * * *` (18:00 UTC)

## 📊 Monitoring

Check Cloudflare Pages → Functions → Logs to see:
- Cron execution logs
- Prediction generation status
- Any errors

## 🔄 How It Works

1. **Cloudflare Cron** triggers `scheduled.js` automatically
2. **Function fetches** today's matches from Football API
3. **Generates predictions** using Gemini API  
4. **Stores results** in your existing KV storage
5. **Your site loads** predictions from KV automatically

## 🎯 Result

- ✅ **Predictions auto-generate** every 6 hours
- ✅ **No manual intervention** needed
- ✅ **Works with existing site** code
- ✅ **No git repository changes**
- ✅ **Native Cloudflare integration**

Your live site will start showing fresh predictions within 6 hours of deployment! 🚀