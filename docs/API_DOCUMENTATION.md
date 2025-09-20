# FixtureCast API Documentation

## Overview

FixtureCast is a comprehensive football prediction application that provides AI-powered match predictions, team data, fixture schedules, and performance analytics. This documentation covers all available APIs, services, and integration points.

## Table of Contents

1. [Authentication](#authentication)
2. [Core Services](#core-services)
3. [API Endpoints](#api-endpoints)
4. [Data Models](#data-models)
5. [Error Handling](#error-handling)
6. [Rate Limiting](#rate-limiting)
7. [WebSocket API](#websocket-api)
8. [Webhooks](#webhooks)

## Authentication

### API Keys

The application uses multiple API keys for different services:

```typescript
interface APIKeys {
  VITE_GEMINI_API_KEY: string;      // Google Gemini AI
  VITE_FOOTBALL_API_KEY: string;    // API-Sports.io
  VITE_PREDICTION_API_KEY: string;  // Cloud prediction storage
  VITE_SEARCH_CONSOLE_API_KEY?: string; // Google Search Console
  VITE_PAGESPEED_API_KEY?: string;  // PageSpeed Insights
}
```

### Environment Configuration

```bash
# Production
VITE_GEMINI_API_KEY=your_gemini_api_key
VITE_FOOTBALL_API_KEY=your_football_api_key
VITE_PREDICTION_API_KEY=your_prediction_api_key

# Optional Analytics
VITE_SEARCH_CONSOLE_API_KEY=your_search_console_key
VITE_PAGESPEED_API_KEY=your_pagespeed_key

# Debug (Development only)
VITE_DEBUG_UI=true
```

## Core Services

### 1. Football API Service

Handles all football data retrieval from API-Sports.io.

#### Methods

##### `getFixtures(league: League, date?: string): Promise<Match[]>`

Retrieves fixtures for a specific league and date.

```typescript
// Example usage
import { getFixtures } from './services/footballApiService';
import { League } from './types';

const fixtures = await getFixtures(League.PremierLeague, '2024-01-15');
```

**Parameters:**
- `league`: League enum value
- `date`: Optional ISO date string (YYYY-MM-DD)

**Returns:** Array of Match objects

##### `getTeamsByLeague(league: League): Promise<Record<number, Team>>`

Retrieves all teams for a specific league.

```typescript
const teams = await getTeamsByLeague(League.PremierLeague);
```

**Returns:** Object mapping team IDs to Team objects

##### `getLeagueTable(league: League): Promise<LeagueTableRow[]>`

Gets the current league standings.

```typescript
const table = await getLeagueTable(League.PremierLeague);
```

**Returns:** Array of league table entries

##### `getLiveMatches(): Promise<LiveMatch[]>`

Retrieves currently live matches.

```typescript
const liveMatches = await getLiveMatches();
```

**Returns:** Array of LiveMatch objects with real-time data

### 2. Gemini AI Service

Provides AI-powered match predictions using Google's Gemini model.

#### Methods

##### `generateMatchPrediction(context: PredictionContext): Promise<Prediction>`

Generates a comprehensive match prediction.

```typescript
import { generateMatchPrediction } from './services/geminiService';

const context = {
  match: matchData,
  homeTeam: homeTeamData,
  awayTeam: awayTeamData,
  homeTeamForm: ['W', 'W', 'D', 'L', 'W'],
  awayTeamForm: ['L', 'W', 'W', 'D', 'L'],
  headToHead: previousMatches,
  leagueTable: currentStandings,
  injuryReports: injuryData,
  weatherConditions: weatherData
};

const prediction = await generateMatchPrediction(context);
```

**Parameters:**
- `context`: PredictionContext object with comprehensive match data

**Returns:** Prediction object with probabilities, scoreline, and analysis

### 3. News Service

Aggregates football news from multiple RSS sources.

#### Methods

##### `fetchAllNews(): Promise<NewsItem[]>`

Fetches news from all configured sources.

```typescript
import { fetchAllNews } from './services/newsService';

const news = await fetchAllNews();
```

**Returns:** Array of NewsItem objects from multiple sources

**Supported Sources:**
- BBC Sport
- Sky Sports
- ESPN
- NBC Sports
- BeIN Sports
- Goal.com
- Football365
- talkSPORT
- GiveMeSport
- The False 9

### 4. Accuracy Service

Tracks and calculates prediction accuracy metrics.

#### Methods

##### `storeDailyPrediction(prediction: PredictionRecord): Promise<void>`

Stores a prediction for accuracy tracking.

```typescript
await storeDailyPrediction({
  matchId: match.id,
  homeTeam: match.homeTeam,
  awayTeam: match.awayTeam,
  league: match.league,
  matchDate: match.date,
  prediction: predictionData,
  predictionTime: new Date().toISOString()
});
```

##### `calculateAccuracy(): Promise<AccuracyStats>`

Calculates overall prediction accuracy statistics.

```typescript
const stats = await calculateAccuracy();
// Returns: { total, correct, accuracy, byConfidence, byLeague }
```

### 5. Performance Monitoring Service

Tracks Core Web Vitals and performance metrics.

#### Methods

##### `trackVitals(): void`

Initializes Core Web Vitals tracking.

```typescript
import { coreWebVitalsService } from './services/coreWebVitalsService';

coreWebVitalsService.trackVitals();
```

##### `reportMetric(metric: PerformanceMetric): void`

Reports a custom performance metric.

```typescript
coreWebVitalsService.reportMetric({
  name: 'prediction_generation_time',
  value: 1250,
  timestamp: Date.now()
});
```

## API Endpoints

### Cloud Functions (Cloudflare Pages)

#### POST `/api/predictions/store`

Stores prediction data in Cloudflare KV for integrity verification.

**Request Body:**
```typescript
{
  predictionId: string;
  matchId: string;
  prediction: Prediction;
  timestamp: number;
  integrityHash: string;
}
```

**Response:**
```typescript
{
  success: boolean;
  predictionId: string;
  verified: boolean;
}
```

#### GET `/api/predictions/{predictionId}`

Retrieves a stored prediction.

**Response:**
```typescript
{
  prediction: Prediction;
  metadata: {
    timestamp: number;
    verified: boolean;
    integrityHash: string;
  }
}
```

#### POST `/api/core-web-vitals`

Receives Core Web Vitals metrics.

**Request Body:**
```typescript
{
  url: string;
  lcp: number;
  fid: number;
  cls: number;
  fcp: number;
  ttfb: number;
  timestamp: number;
}
```

## Data Models

### Match

```typescript
interface Match {
  id: string;
  homeTeam: { name: string } | string;
  awayTeam: { name: string } | string;
  homeTeamId: number;
  awayTeamId: number;
  league: League | { name: string };
  date: string; // ISO 8601 format
  venue?: string;
  status?: 'NS' | 'LIVE' | 'HT' | 'FT' | 'CANC' | 'POSTP' | 'SUSP' | 'TBD';
}
```

### LiveMatch

```typescript
interface LiveMatch extends Match {
  status: 'NS' | 'LIVE' | 'HT' | 'FT' | 'CANC' | 'POSTP' | 'SUSP' | 'TBD';
  homeScore: number;
  awayScore: number;
  homeScoreHT?: number;
  awayScoreHT?: number;
  minute?: number;
  period?: '1H' | '2H' | 'ET' | 'PEN';
  venue?: string;
  referee?: string;
  events?: MatchEvent[];
  lastUpdated: string;
}
```

### Prediction

```typescript
interface Prediction {
  homeWinProbability: number;
  drawProbability: number;
  awayWinProbability: number;
  predictedScoreline: string;
  confidence: ConfidenceLevel;
  keyFactors: KeyFactor[];
  goalLine: GoalLinePrediction;
  btts?: BTTSPrediction;
  htft?: HTFTPrediction;
  scoreRange?: ScoreRangePrediction;
  confidencePercentage?: number; // 0-100
  confidenceReason?: string;
}
```

### Team

```typescript
interface Team {
  id?: number;
  logo: string;
  shortName: string;
  jerseyColors: {
    primary: string;
    secondary: string;
  };
  country?: string;
  league?: League | string;
  founded?: number;
  venue?: string;
}
```

### NewsItem

```typescript
interface NewsItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  source: NewsSource;
}
```

## Error Handling

### Error Types

```typescript
interface APIError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
}
```

### Common Error Codes

- `RATE_LIMIT_EXCEEDED`: API rate limit reached
- `INVALID_API_KEY`: Authentication failed
- `MATCH_NOT_FOUND`: Requested match doesn't exist
- `PREDICTION_FAILED`: AI prediction generation failed
- `NETWORK_ERROR`: Network connectivity issue
- `VALIDATION_ERROR`: Invalid input parameters

### Error Response Format

```typescript
{
  error: {
    code: "RATE_LIMIT_EXCEEDED",
    message: "API rate limit exceeded. Try again in 60 seconds.",
    details: {
      limit: 100,
      remaining: 0,
      resetTime: "2024-01-15T16:00:00Z"
    },
    timestamp: "2024-01-15T15:30:45Z"
  }
}
```

## Rate Limiting

### API-Sports.io Limits

- **Free Tier**: 100 requests/day
- **Basic Plan**: 1,000 requests/day
- **Pro Plan**: 10,000 requests/day

### Gemini AI Limits

- **Free Tier**: 15 requests/minute, 1,500 requests/day
- **Paid Tier**: Variable based on plan

### Best Practices

1. **Cache Responses**: Store API responses locally
2. **Batch Requests**: Combine multiple data points
3. **Priority Queuing**: Prioritize user-facing requests
4. **Graceful Degradation**: Use cached data when limits reached

```typescript
// Example caching implementation
const cacheService = {
  get: (key: string) => localStorage.getItem(key),
  set: (key: string, value: any, ttl: number) => {
    const item = {
      value,
      expiry: Date.now() + ttl
    };
    localStorage.setItem(key, JSON.stringify(item));
  }
};
```

## WebSocket API

### Live Match Updates

Connect to receive real-time match updates:

```typescript
const ws = new WebSocket('wss://api.fixturecast.com/live');

ws.onmessage = (event) => {
  const update = JSON.parse(event.data);
  if (update.type === 'MATCH_UPDATE') {
    handleMatchUpdate(update.data);
  }
};
```

### Message Types

```typescript
interface WebSocketMessage {
  type: 'MATCH_UPDATE' | 'GOAL' | 'CARD' | 'SUBSTITUTION' | 'FULL_TIME';
  matchId: string;
  data: any;
  timestamp: string;
}
```

## Webhooks

### Prediction Completion

Receive notifications when predictions are completed:

```typescript
// Webhook endpoint: POST /webhooks/prediction-completed
{
  predictionId: string;
  matchId: string;
  status: 'completed' | 'failed';
  prediction?: Prediction;
  error?: string;
  timestamp: string;
}
```

### Match Result

Get notified when match results are available:

```typescript
// Webhook endpoint: POST /webhooks/match-result
{
  matchId: string;
  result: {
    homeScore: number;
    awayScore: number;
    status: 'FT' | 'AET' | 'PEN';
  };
  timestamp: string;
}
```

## SDK Usage Examples

### TypeScript/JavaScript

```typescript
import { FixtureCastSDK } from '@fixturecast/sdk';

const sdk = new FixtureCastSDK({
  apiKey: 'your-api-key',
  environment: 'production'
});

// Get today's fixtures
const fixtures = await sdk.fixtures.getToday();

// Generate prediction
const prediction = await sdk.predictions.generate(matchId);

// Subscribe to live updates
sdk.live.subscribe(matchId, (update) => {
  console.log('Match update:', update);
});
```

### React Hook

```typescript
import { useFixtureCast } from '@fixturecast/react';

function MatchPredictor({ matchId }: { matchId: string }) {
  const { prediction, loading, error } = useFixtureCast({
    matchId,
    autoRefresh: true
  });

  if (loading) return <div>Loading prediction...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h3>Prediction: {prediction.predictedScoreline}</h3>
      <p>Confidence: {prediction.confidencePercentage}%</p>
    </div>
  );
}
```

## Testing API

### Test Endpoints

```bash
# Development
https://fixturecast-dev.pages.dev/api

# Staging  
https://fixturecast-staging.pages.dev/api

# Production
https://fixturecast.com/api
```

### Mock Data

Test with sample data:

```typescript
// Mock match for testing
const mockMatch = {
  id: 'test-001',
  homeTeam: 'Test FC',
  awayTeam: 'Example United',
  homeTeamId: 1,
  awayTeamId: 2,
  league: 'Test League',
  date: '2024-01-15T15:00:00Z'
};
```

## Support

### Documentation

- **API Reference**: [https://docs.fixturecast.com](https://docs.fixturecast.com)
- **SDK Documentation**: [https://sdk.fixturecast.com](https://sdk.fixturecast.com)
- **Tutorials**: [https://learn.fixturecast.com](https://learn.fixturecast.com)

### Community

- **GitHub**: [https://github.com/fixturecast/api](https://github.com/fixturecast/api)
- **Discord**: [https://discord.gg/fixturecast](https://discord.gg/fixturecast)
- **Stack Overflow**: Tag with `fixturecast`

### Contact

- **Technical Support**: api-support@fixturecast.com
- **Business Inquiries**: partnerships@fixturecast.com
- **Security Issues**: security@fixturecast.com

---

Last updated: September 19, 2025  
API Version: 1.0.0
