# Core Web Vitals Monitoring Setup Guide

This guide explains how to set up comprehensive Core Web Vitals monitoring at the 75th percentile with ongoing regression detection.

## 🎯 Overview

The Core Web Vitals monitoring system tracks:
- **LCP** (Largest Contentful Paint) - Loading performance
- **FID** (First Input Delay) - Interactivity
- **CLS** (Cumulative Layout Shift) - Visual stability
- **FCP** (First Contentful Paint) - Loading performance
- **TTFB** (Time to First Byte) - Server response time

## 🔧 Setup Instructions

### 1. Environment Variables

Create a `.env` file in your project root:

```bash
# Google Search Console API
VITE_SEARCH_CONSOLE_API_KEY=your_search_console_api_key_here
VITE_SITE_URL=https://your-domain.com
VITE_PROPERTY_ID=your_property_id_here

# Google PageSpeed Insights API
VITE_PAGESPEED_API_KEY=your_pagespeed_api_key_here
VITE_PAGESPEED_BASE_URL=https://www.googleapis.com/pagespeedonline/v5

# Google Analytics 4 (optional)
VITE_GA4_MEASUREMENT_ID=your_ga4_measurement_id_here

# Performance Monitoring
VITE_PERFORMANCE_MONITORING=true
VITE_CORE_WEB_VITALS_ENABLED=true

# Debug flags
VITE_DEBUG_PERFORMANCE=false
VITE_DEBUG_CORE_WEB_VITALS=false
```

### 2. Google Search Console Setup

1. **Enable Search Console API:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing
   - Enable the "Search Console API"
   - Create credentials (API key)

2. **Get Property ID:**
   - Go to [Google Search Console](https://search.google.com/search-console/)
   - Select your property
   - Copy the property ID from the URL

3. **Configure API Key:**
   - Add the API key to your `.env` file
   - Set the site URL to your domain

### 3. PageSpeed Insights Setup

1. **Get PageSpeed API Key:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Enable the "PageSpeed Insights API"
   - Create an API key

2. **Configure API Key:**
   - Add the API key to your `.env` file

### 4. Google Analytics 4 Setup (Optional)

1. **Create GA4 Property:**
   - Go to [Google Analytics](https://analytics.google.com/)
   - Create a new GA4 property
   - Get the Measurement ID

2. **Configure Measurement ID:**
   - Add the Measurement ID to your `.env` file

## 📊 Monitoring Features

### Real-time Performance Tracking

The system automatically tracks:
- **75th percentile metrics** for accurate performance assessment
- **Real user monitoring** with device and connection type detection
- **Automatic regression detection** with alerts
- **Performance trends** over time

### Dashboard Components

1. **Performance Dashboard:**
   - Real-time Core Web Vitals metrics
   - Performance score and recommendations
   - Export functionality for data analysis

2. **Search Console Integration:**
   - Historical performance data
   - Mobile vs desktop comparison
   - Country-specific metrics

3. **PageSpeed Insights Integration:**
   - Detailed performance analysis
   - Specific optimization recommendations
   - Mobile and desktop comparison

### Regression Detection

The system monitors for:
- **Performance regressions** in Core Web Vitals
- **Threshold violations** at the 75th percentile
- **Trend analysis** to identify degradation
- **Automatic alerts** for significant changes

## 🚀 Usage

### Automatic Monitoring

The monitoring starts automatically when the app loads:

```typescript
// Core Web Vitals monitoring is initialized automatically
coreWebVitalsService.initialize();

// Search Console monitoring (if configured)
if (searchConsoleService.isReady()) {
  searchConsoleService.monitorRegressions();
}

// PageSpeed Insights monitoring (if configured)
if (pageSpeedService.isReady()) {
  pageSpeedService.sendData({
    url: window.location.href,
    timestamp: Date.now()
  });
}
```

### Manual Performance Analysis

```typescript
// Get current performance report
const report = coreWebVitalsService.getMetricsReport();
console.log('Performance Score:', report.score);
console.log('Recommendations:', report.recommendations);

// Analyze specific page
const pageSpeedReport = await pageSpeedService.analyzePage('https://example.com');
console.log('PageSpeed Score:', pageSpeedReport.metrics.performanceScore);

// Get Search Console data
const searchConsoleData = await searchConsoleService.getCoreWebVitalsData();
console.log('Search Console Metrics:', searchConsoleData);
```

### Performance Dashboard

The Performance Dashboard component provides:
- **Real-time metrics** display
- **Performance recommendations** with expandable details
- **Export functionality** for data analysis
- **Refresh capability** for updated metrics

## 📈 Performance Thresholds

The system uses Google's recommended thresholds:

| Metric | Good | Needs Improvement | Poor |
|--------|------|-------------------|------|
| LCP | ≤ 2.5s | ≤ 4.0s | > 4.0s |
| FID | ≤ 100ms | ≤ 300ms | > 300ms |
| CLS | ≤ 0.1 | ≤ 0.25 | > 0.25 |
| FCP | ≤ 1.8s | ≤ 3.0s | > 3.0s |
| TTFB | ≤ 800ms | ≤ 1.8s | > 1.8s |

## 🔍 Monitoring at 75th Percentile

The system tracks the 75th percentile to ensure:
- **Real user experience** representation
- **Outlier protection** from extreme values
- **Google's recommended** percentile for Core Web Vitals
- **Accurate performance** assessment

## 🚨 Regression Detection

### Automatic Alerts

The system automatically detects:
- **Performance regressions** in any Core Web Vitals metric
- **Threshold violations** at the 75th percentile
- **Trend degradation** over time
- **Significant changes** in user experience

### Alert Configuration

```typescript
// Configure regression detection
coreWebVitalsService.setupRegressionDetection();

// Monitor specific thresholds
const regressions = coreWebVitalsService.detectPerformanceRegressions();
if (regressions.length > 0) {
  console.warn('Performance regressions detected:', regressions);
}
```

## 📊 Data Export and Analysis

### Export Performance Data

```typescript
// Export all metrics
const metricsData = coreWebVitalsService.exportMetrics();
console.log('Exported metrics:', metricsData);

// Get metrics for specific period
const startTime = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 days ago
const endTime = Date.now();
const periodMetrics = coreWebVitalsService.getMetricsForPeriod(startTime, endTime);
```

### Performance Trends

```typescript
// Get performance trends from Search Console
const trends = await searchConsoleService.getPerformanceTrends(30); // 30 days
console.log('Performance trends:', trends);

// Compare mobile vs desktop
const comparison = await pageSpeedService.compareMobileDesktop('https://example.com');
console.log('Mobile vs Desktop:', comparison.comparison);
```

## 🔧 Troubleshooting

### Common Issues

1. **API Keys Not Working:**
   - Verify API keys in Google Cloud Console
   - Check API quotas and billing
   - Ensure proper permissions

2. **No Metrics Collected:**
   - Check if monitoring is enabled
   - Verify browser support for Performance Observer
   - Check console for errors

3. **Regression Alerts Not Working:**
   - Verify Search Console configuration
   - Check API endpoints are accessible
   - Ensure proper error handling

### Debug Mode

Enable debug mode for troubleshooting:

```bash
VITE_DEBUG_PERFORMANCE=true
VITE_DEBUG_CORE_WEB_VITALS=true
```

This will provide detailed logging for:
- Performance metric collection
- API requests and responses
- Regression detection logic
- Error handling and recovery

## 📚 Additional Resources

- [Google Core Web Vitals](https://web.dev/vitals/)
- [Search Console API Documentation](https://developers.google.com/webmaster-tools/search-console-api)
- [PageSpeed Insights API](https://developers.google.com/speed/docs/insights/v5/get-started)
- [Google Analytics 4](https://developers.google.com/analytics/devguides/collection/ga4)

## 🎯 Best Practices

1. **Monitor Continuously:** Set up ongoing monitoring for all pages
2. **Track Trends:** Monitor performance trends over time
3. **Set Alerts:** Configure alerts for performance regressions
4. **Analyze Data:** Regularly review performance data and trends
5. **Optimize Based on Data:** Use collected data to guide optimization efforts

The Core Web Vitals monitoring system provides comprehensive performance tracking and regression detection to ensure optimal user experience across all devices and connection types.
