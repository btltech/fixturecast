# FixtureCast Cloud Prediction Integrity Setup

This guide explains how to set up the cloud-based prediction integrity system using Cloudflare Pages and KV storage.

## Overview

The cloud prediction integrity system provides:
- 🔒 **Tamper-proof storage** of predictions in Cloudflare KV
- 🛡️ **Integrity hashing** to prevent data manipulation
- ⚡ **Automatic verification** of predictions against match results
- 📊 **Audit trails** for complete transparency
- 🔄 **Backup redundancy** with local storage fallback

## Prerequisites

1. Cloudflare account with Pages and KV access
2. Existing FixtureCast deployment on Cloudflare Pages
3. API keys configured for football data

## Setup Steps

### 1. Create KV Namespace

In your Cloudflare dashboard:

1. Go to **Workers & Pages** → **KV**
2. Create a new namespace: `PREDICTIONS_KV`
3. Note the namespace ID

### 2. Configure Environment Variables

In your Cloudflare Pages project settings, add these environment variables:

```bash
# Prediction API security
PREDICTION_API_KEY=fixturecast_secure_key_2024_YOUR_RANDOM_STRING

# KV Namespace binding (set in Functions tab)
PREDICTIONS_KV=[Your KV Namespace ID]
```

### 3. Set KV Bindings

In Cloudflare Pages project:

1. Go to **Settings** → **Functions** 
2. Add KV namespace binding:
   - Variable name: `PREDICTIONS_KV`
   - KV namespace: Select your created namespace

### 4. Client Configuration

Add to your local `.env` file:

```bash
# Must match Cloudflare environment variable
VITE_PREDICTION_API_KEY=fixturecast_secure_key_2024_YOUR_RANDOM_STRING
```

### 5. Deploy and Test

1. Deploy your changes to Cloudflare Pages
2. Test the API endpoints:

```bash
# Test storing a prediction
curl -X POST https://your-app.pages.dev/api/predictions/store \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_api_key" \
  -d '{
    "matchId": "test123",
    "homeTeam": "Arsenal", 
    "awayTeam": "Chelsea",
    "league": "Premier League",
    "matchDate": "2024-01-15T15:00:00Z",
    "prediction": {
      "predictedScoreline": "2-1",
      "homeWinProbability": 65,
      "confidence": "High"
    }
  }'

# Test retrieving predictions
curl "https://your-app.pages.dev/api/predictions/store?date=2024-01-15" \
  -H "X-API-Key: your_api_key"

# Test verification
curl -X PUT https://your-app.pages.dev/api/predictions/store \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_api_key" \
  -d '{
    "matchId": "test123",
    "actualResult": {"homeScore": 2, "awayScore": 1}
  }'
```

## Data Structure

### Stored Predictions

```typescript
{
  id: "pred_12345_1705329600000",
  matchId: "12345",
  homeTeam: "Arsenal",
  awayTeam: "Chelsea", 
  league: "Premier League",
  matchDate: "2024-01-15T15:00:00Z",
  prediction: { /* full prediction object */ },
  predictionTime: "2024-01-15T10:30:00Z",
  verified: false,
  integrityHash: "a1b2c3d4...", // SHA-256 hash for tamper detection
  clientFingerprint: "abc123..." // Browser fingerprint
}
```

### Verification Records

```typescript
{
  // ... (all prediction fields)
  verified: true,
  verifiedAt: "2024-01-15T17:05:00Z",
  actualResult: { homeScore: 2, awayScore: 1 },
  accuracy: {
    outcome: true,
    scoreline: true,
    btts: true,
    goalLine: false,
    cleanSheet: false
  },
  verificationSource: "api-sports"
}
```

## API Endpoints

### Store Prediction
- **Method:** `POST /api/predictions/store`
- **Headers:** `X-API-Key: your_key`
- **Body:** Prediction data
- **Response:** `{ success: true, predictionId: "...", integrityHash: "..." }`

### Verify Prediction  
- **Method:** `PUT /api/predictions/store`
- **Headers:** `X-API-Key: your_key`
- **Body:** `{ matchId: "...", actualResult: {...} }`
- **Response:** `{ success: true, accuracy: {...} }`

### Retrieve Predictions
- **Method:** `GET /api/predictions/store?date=YYYY-MM-DD`
- **Headers:** `X-API-Key: your_key`
- **Response:** `{ predictions: [...], date: "...", count: N }`

### Get Statistics
- **Method:** `GET /api/predictions/store?stats=true`
- **Headers:** `X-API-Key: your_key`
- **Response:** Accuracy statistics

## Security Features

### Integrity Protection
- **SHA-256 hashing** of prediction content
- **Client fingerprinting** for source verification
- **Immutable storage** once predictions are made
- **API key authentication** for all operations

### Tamper Detection
- Predictions cannot be modified after storage
- Integrity hashes detect any data corruption
- Client fingerprints verify prediction source
- Timestamp validation ensures logical sequence

### Audit Trail
- Complete prediction lifecycle tracking
- Verification timestamps and sources
- Accuracy calculation transparency
- Storage and retrieval logging

## Migration from Local Storage

The system includes a sync function to migrate existing local predictions:

```javascript
// Migrate local predictions to cloud
const { synced, failed } = await cloudPredictionService.syncLocalToCloud();
console.log(`Migrated ${synced} predictions, ${failed} failed`);
```

## Monitoring and Maintenance

### KV Storage Limits
- Free tier: 100,000 reads/day, 1,000 writes/day
- Paid tier: Higher limits available
- Consider archiving old predictions

### Performance
- KV reads are fast globally (edge cache)
- Writes may take a few seconds to propagate
- Use local storage for immediate UI updates

### Backup Strategy
- Cloud storage is primary
- Local storage serves as backup
- Automatic fallback if cloud unavailable

## Troubleshooting

### Common Issues

1. **"API key not valid"**
   - Check environment variables match
   - Ensure KV binding is configured
   - Verify deployment has environment variables

2. **"Prediction not found"**
   - Check match ID formatting
   - Verify prediction was successfully stored
   - Check KV namespace binding

3. **"Cloud storage failed"**
   - Check API key configuration
   - Verify network connectivity
   - Check Cloudflare status page

### Debug Commands

```javascript
// Check local backup
console.log(localStorage.getItem('fixturecast_cloud_backup'));

// Test cloud connection
cloudPredictionService.getAccuracyStats()
  .then(stats => console.log('Cloud connected:', stats))
  .catch(err => console.error('Cloud error:', err));
```

## Data Privacy

- All prediction data is stored in your Cloudflare KV namespace
- No data is shared with third parties
- Client fingerprints are hashed for privacy
- You control all data retention policies

This cloud-based system ensures your prediction integrity claims are completely verifiable and tamper-proof! 🔒✅
