# 🚀 Cloudflare Pages Deployment Fix

## ❌ **Issue Fixed**
Cloudflare Pages doesn't support `triggers` in wrangler.toml - that's for Workers only.

## ✅ **Current Status**
- ✅ Manual trigger API endpoint: `/api/update-predictions`
- ✅ Works with your existing Cloudflare KV storage
- ✅ Uses Gemini Flash for predictions
- ✅ Ready for manual or external automation

## 🔧 **How to Trigger Predictions**

### Option 1: Manual Trigger (Immediate)
```bash
curl -X POST https://fixturecast.pages.dev/api/update-predictions \
  -H "Authorization: Bearer YOUR_PREDICTION_API_KEY" \
  -H "Content-Type: application/json"
```

### Option 2: External Cron Service
Use any external cron service to hit your API endpoint:

**GitHub Actions (Recommended)**
```yaml
# .github/workflows/predictions.yml
name: Auto Update Predictions
on:
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours
jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Predictions
        run: |
          curl -X POST https://fixturecast.pages.dev/api/update-predictions \
            -H "Authorization: Bearer ${{ secrets.PREDICTION_API_KEY }}" \
            -H "Content-Type: application/json"
```

**Uptime Robot, Cronhooks.io, or similar services**
- Set URL: `https://fixturecast.pages.dev/api/update-predictions`
- Method: POST
- Headers: `Authorization: Bearer YOUR_API_KEY`
- Schedule: Every 6 hours

## 📋 **Environment Variables Needed**

Set these in Cloudflare Pages Dashboard → Settings → Environment Variables:

```
GEMINI_API_KEY = your-actual-gemini-key
FOOTBALL_API_KEY = your-actual-football-api-key  
PREDICTION_API_KEY = your-chosen-api-key-for-triggers
```

## 🎯 **Next Steps**

1. **Deploy will now succeed** (wrangler.toml fixed)
2. **Set environment variables** in Cloudflare dashboard
3. **Test manual trigger** to generate initial predictions
4. **Set up external cron** for automation (optional)

Your site will work immediately with manual triggers, and you can add automation later! 🚀