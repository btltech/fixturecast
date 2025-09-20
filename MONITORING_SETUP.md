# Monitoring and Error Tracking Setup Guide

## Overview

FixtureCast includes comprehensive monitoring and error tracking capabilities to ensure optimal performance and quick issue resolution. This guide covers the setup and configuration of all monitoring components.

## Table of Contents

1. [Error Tracking Setup](#error-tracking-setup)
2. [Performance Monitoring](#performance-monitoring)
3. [Cloudflare KV Configuration](#cloudflare-kv-configuration)
4. [Alerting Setup](#alerting-setup)
5. [Development Tools](#development-tools)
6. [Production Deployment](#production-deployment)

## Error Tracking Setup

### 1. Cloudflare KV Namespace

Create a KV namespace for error storage:

```bash
# Create the namespace
wrangler kv:namespace create "ERRORS_KV"

# For preview/development
wrangler kv:namespace create "ERRORS_KV" --preview
```

### 2. Update wrangler.toml

Add the KV namespace binding to your `wrangler.toml`:

```toml
[[env.production.kv_namespaces]]
binding = "ERRORS_KV"
id = "your-actual-kv-namespace-id"
preview_id = "your-preview-kv-namespace-id"
```

### 3. Environment Variables

Set up optional environment variables for advanced features:

```bash
# Slack webhook for critical error alerts (optional)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK

# Error tracking API key (optional, for external services)
ERROR_TRACKING_API_KEY=your_api_key
```

### 4. Error Service Configuration

The error tracking service is automatically initialized when the app loads. You can configure it with:

```typescript
import { errorTrackingService } from './services/errorTrackingService';

// Enable/disable tracking
errorTrackingService.setEnabled(true);

// Add custom context
errorTrackingService.addBreadcrumb({
  category: 'user',
  message: 'User logged in',
  level: 'info',
  data: { userId: 'user123' }
});

// Capture custom errors
errorTrackingService.captureError(error, {
  category: 'api',
  severity: 'high',
  context: { endpoint: '/api/predictions' },
  tags: ['api-error']
});
```

## Performance Monitoring

### 1. Core Web Vitals

Performance monitoring tracks:
- **LCP** (Largest Contentful Paint)
- **FID** (First Input Delay)
- **CLS** (Cumulative Layout Shift)
- **FCP** (First Contentful Paint)
- **TTFB** (Time to First Byte)

### 2. Custom Performance Metrics

Track custom metrics:

```typescript
import { coreWebVitalsService } from './services/coreWebVitalsService';

// Track custom timing
const startTime = performance.now();
// ... some operation
const endTime = performance.now();

coreWebVitalsService.reportMetric({
  name: 'custom_operation_time',
  value: endTime - startTime,
  timestamp: Date.now()
});
```

### 3. Bundle Performance

Monitor bundle loading and code splitting:

```typescript
import { bundleOptimizationService } from './services/bundleOptimizationService';

// Get bundle information
const bundleInfo = bundleOptimizationService.getBundleInfo();
console.log('Preloaded modules:', bundleInfo.preloadedModules);
```

## Cloudflare KV Configuration

### 1. Create Required Namespaces

```bash
# Error tracking
wrangler kv:namespace create "ERRORS_KV"

# Performance monitoring  
wrangler kv:namespace create "PERFORMANCE_KV"

# Prediction integrity (if not already created)
wrangler kv:namespace create "PREDICTIONS_KV"
```

### 2. Configure Bindings

Update your `wrangler.toml` with all namespace IDs:

```toml
name = "fixturecast"

[[env.production.kv_namespaces]]
binding = "ERRORS_KV"
id = "abc123def456"  # Replace with actual ID
preview_id = "abc123def456"

[[env.production.kv_namespaces]]
binding = "PERFORMANCE_KV"
id = "def456ghi789"  # Replace with actual ID
preview_id = "def456ghi789"

[[env.production.kv_namespaces]]
binding = "PREDICTIONS_KV"
id = "ghi789jkl012"  # Replace with actual ID
preview_id = "ghi789jkl012"
```

### 3. Set Retention Policies

Configure TTL (Time To Live) for different data types:

- **Errors**: 30 days
- **Performance Metrics**: 90 days
- **Daily Summaries**: 90 days
- **Critical Alerts**: 1 year

## Alerting Setup

### 1. Slack Integration

For critical error alerts, set up a Slack webhook:

1. Create a Slack app: https://api.slack.com/apps
2. Add incoming webhook
3. Set the webhook URL in environment variables:

```bash
wrangler secret put SLACK_WEBHOOK_URL
# Enter your webhook URL when prompted
```

### 2. Email Alerts (Optional)

For email alerts, integrate with a service like SendGrid:

```bash
wrangler secret put SENDGRID_API_KEY
wrangler secret put ALERT_EMAIL_TO
```

### 3. Custom Alert Rules

Configure alert thresholds in the error tracking service:

```typescript
// In services/errorTrackingService.ts
const ALERT_THRESHOLDS = {
  criticalErrors: 1,      // Alert on any critical error
  errorRate: 10,          // Alert if >10 errors per minute
  performanceDrop: 50,    // Alert if performance drops >50%
  memoryUsage: 80,        // Alert if memory usage >80%
};
```

## Development Tools

### 1. Monitoring Dashboard

Enable the monitoring dashboard in development:

```javascript
// In browser console or localStorage
localStorage.setItem('showMonitoring', 'true');
```

Or add to your `.env.local`:
```bash
VITE_DEBUG_UI=true
```

### 2. Testing Error Tracking

Test error tracking with the monitoring dashboard:

1. Open the app in development
2. Look for the monitoring dashboard in bottom-right corner
3. Click "Test Error" to generate a sample error
4. Check the "Errors" tab for statistics

### 3. Performance Testing

Monitor performance in development:

```typescript
// Enable detailed performance logging
localStorage.setItem('debugPerformance', 'true');

// Monitor bundle loading
bundleOptimizationService.monitorPerformance();
```

## Production Deployment

### 1. Environment Setup

Ensure all environment variables are set in Cloudflare:

```bash
# Deploy with monitoring enabled
wrangler pages deploy dist --env production

# Verify KV namespaces are accessible
wrangler kv:key list --namespace-id=your-errors-kv-id
```

### 2. Monitoring Verification

After deployment, verify monitoring is working:

1. **Error Tracking**: Check `/api/errors/stats` endpoint
2. **Performance**: Monitor Core Web Vitals in DevTools
3. **Alerts**: Test critical error alerts

### 3. Dashboard Access

Access monitoring data:

```bash
# View error statistics
curl https://your-domain.com/api/errors/stats

# Check recent errors (admin only)
curl https://your-domain.com/api/errors/recent
```

## API Endpoints

### Error Tracking

```http
POST /api/errors
Content-Type: application/json

{
  "errors": [
    {
      "id": "error_123",
      "message": "Error message",
      "stack": "Error stack trace",
      "timestamp": 1641234567890,
      "category": "javascript",
      "severity": "high"
    }
  ]
}
```

### Statistics

```http
GET /api/errors/stats
```

Returns:
```json
{
  "date": "2024-01-15",
  "totalErrors": 42,
  "errorsByCategory": {
    "javascript": 25,
    "network": 12,
    "api": 5
  },
  "errorsBySeverity": {
    "critical": 1,
    "high": 8,
    "medium": 18,
    "low": 15
  }
}
```

## Best Practices

### 1. Error Handling

```typescript
// Wrap async operations
try {
  const result = await apiCall();
  return result;
} catch (error) {
  errorTrackingService.captureError(error, {
    category: 'api',
    severity: 'medium',
    context: { endpoint: '/api/fixtures' },
    tags: ['api-failure']
  });
  throw error; // Re-throw for component handling
}
```

### 2. Performance Monitoring

```typescript
// Monitor component render times
const componentStartTime = performance.now();

// ... component logic

useEffect(() => {
  const renderTime = performance.now() - componentStartTime;
  if (renderTime > 100) { // Alert if render > 100ms
    errorTrackingService.captureError(
      new Error('Slow component render'),
      {
        category: 'performance',
        severity: 'low',
        context: { component: 'Dashboard', renderTime },
        tags: ['performance']
      }
    );
  }
}, []);
```

### 3. User Privacy

- Never log sensitive data (passwords, tokens, personal info)
- Anonymize user identifiers
- Respect DNT (Do Not Track) headers
- Provide opt-out mechanisms

```typescript
// Check for Do Not Track
if (navigator.doNotTrack === '1') {
  errorTrackingService.setEnabled(false);
}

// Respect user preferences
const userOptOut = localStorage.getItem('disableErrorTracking');
if (userOptOut === 'true') {
  errorTrackingService.setEnabled(false);
}
```

## Troubleshooting

### Common Issues

1. **KV Namespace Not Found**
   - Verify namespace ID in wrangler.toml
   - Check binding name matches code
   - Ensure namespace exists in Cloudflare dashboard

2. **Errors Not Being Stored**
   - Check browser console for network errors
   - Verify CORS headers are correct
   - Test API endpoint directly

3. **Performance Metrics Missing**
   - Ensure browser supports Performance Observer API
   - Check if running in secure context (HTTPS)
   - Verify service worker registration

4. **Alerts Not Working**
   - Check webhook URL is correct
   - Verify environment variables are set
   - Test webhook manually

### Debug Commands

```bash
# Test KV storage
wrangler kv:key put --namespace-id=your-errors-kv-id "test" "value"
wrangler kv:key get --namespace-id=your-errors-kv-id "test"

# View recent errors
wrangler kv:key list --namespace-id=your-errors-kv-id --prefix="error:"

# Check function logs
wrangler pages functions logs --project-name=fixturecast
```

## Security Considerations

1. **Rate Limiting**: Built-in rate limiting prevents spam
2. **Data Sanitization**: Automatic PII removal
3. **Access Control**: Admin-only endpoints require authentication
4. **Encryption**: All data stored encrypted in KV
5. **Retention**: Automatic cleanup after TTL expiry

---

Last updated: September 19, 2025
