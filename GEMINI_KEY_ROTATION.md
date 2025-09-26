# Gemini API Key Rotation & Hardening Guide

This doc shows how to safely rotate your Gemini API key and (optionally) move it off the public client bundle.

---
## 1. Revoke Old Key
1. Go to Google AI Studio (or Google Cloud console for Generative Language / Gemini).  
2. Locate the existing key you used (`VITE_GEMINI_API_KEY`).  
3. Revoke/disable it. (Do this only after the new key is wired and tested OR during a brief maintenance window.)

## 2. Create New Key
1. Generate a new Gemini API key.  
2. Copy it somewhere **temporarily** (password manager preferred).  

---
## 3. Decide Where the Key Lives
| Option | Effort | Security | Notes |
| ------ | ------ | -------- | ----- |
| A. (Deprecated) Keep using `VITE_GEMINI_API_KEY` | Easiest | Lowest (exposed to users) | Deprecated: key no longer read by client; use server secret `GEMINI_API_KEY` via proxy. |
| B. Proxy through Cloudflare Worker | Medium | High | Recommended. Store key as Worker secret and call Worker endpoint from client. |
| C. Add a lightweight Node edge API (if hosting elsewhere) | Medium | High | Similar concept; not needed since you already have a Worker. |

**Recommended**: Move to Worker (Option B) soon to prevent further 429s due to scraped keys.

---
## 4. If Staying Temporary on Client (Option A)
Add/replace in `.env` (NOT committed):
```
VITE_GEMINI_API_KEY=NEW_KEY_VALUE_HERE
VITE_GEMINI_RPM=3            # tune to actual plan
VITE_GEMINI_DAILY=300        # daily cap
VITE_GEMINI_MIN_INTERVAL_MS=22000
```
Then:
```
# restart dev
npm run dev
```
Validate in browser console:
```
Gemini usage snapshot: getGeminiApiUsage()
```
(You should see `isConfigured: true` and calls increment.)

---
## 5. Migrating to Worker (Option B)
### 5.1 Add Secret to Worker
From project root (or `worker-cron/` directory if separate `wrangler.toml`):
```
cd worker-cron
npx wrangler secret put GEMINI_API_KEY
# paste new key
```
Confirm:
```
npx wrangler secret list
```

### 5.2 Add a Prediction Proxy Route (Example)
In `worker-cron/worker.js` (pseudo snippet you can integrate):
```js
if (url.pathname === '/predict') {
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);
  const body = await request.json(); // { prompt, schema? }
  const key = env.GEMINI_API_KEY; // secret
  const apiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await apiRes.json();
  return jsonResponse(data, apiRes.status);
}
```

### 5.3 Update Client `geminiService.ts`
Instead of calling Gemini directly, replace the `ai.models.generateContent(...)` section when running in browser with:
```ts
const response = await fetch('/predict', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.7, maxOutputTokens: 1500, topP: 0.8 } })
});
```
Deprecated note: client implementation now removed direct Gemini calls; only server `GEMINI_API_KEY` is used.

### 5.4 Remove Exposed Key
1. Ensure `VITE_GEMINI_API_KEY` is absent from `.env` (it will be ignored if present).  
2. Clear your build artifacts:
```
rm -rf dist
npm run build
```
3. Inspect built JS in `dist/assets`—the key string should NOT appear:
```
grep -R "YOUR_OLD_KEY_FRAGMENT" dist || echo "Not found ✅"
```

---
## 6. Post-Rotation Checks
| Check | Command / Action | Expected |
| ----- | ---------------- | -------- |
| Client still compiling | `npm run dev` | No missing env errors |
| Rate limit stable | Generate multiple predictions spaced apart | No 429 bursts |
| Key not exposed | `grep` built bundle | No matches |
| Worker responding | `curl https://<worker-domain>/predict -X POST ...` | 200 or model JSON |

---
## 7. Handling 429 After Rotation
If still seeing 429:
1. Increase `VITE_GEMINI_MIN_INTERVAL_MS` (e.g. 30000).  
2. Lower RPM (e.g. 2).  
3. Cache predictions for the same match ID (avoid duplicate rapid calls).  
4. Batch nightly or scheduled predictions through Worker instead of user-triggered spikes.

---
## 8. Optional Hardening Enhancements
| Enhancement | Benefit |
| ----------- | ------- |
| Add server-side cache (KV) keyed by fixture ID | Avoid duplicate paid calls |
| Add SHA hash of request body for de-dupe window | Prevent spam variations |
| Log usage metrics to Analytics / KV | Visibility on quota consumption |
| Implement circuit breaker on consecutive 429 | Protect quota and UX |

---
## 9. Rollback Plan
If Worker proxy fails: fix server endpoint / secret; do not reintroduce `VITE_GEMINI_API_KEY` (pattern deprecated).

---
## 10. Quick Verification Script
Run once after deploy (adjust path if needed):
```bash
curl -s -X POST "https://<your-worker-domain>/predict" \
  -H 'Content-Type: application/json' \
  -d '{"contents":[{"parts":[{"text":"Say: Rotation Success"}]}]}' | head
```
Should show JSON with Gemini response.

---
Need me to wire the Worker proxy automatically? Just ask: "migrate gemini to worker" and I’ll implement the route + client adaptation.
