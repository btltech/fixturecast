/**
 * Core Web Vitals Configuration
 * Environment variables and settings for performance monitoring
 */

export const coreWebVitalsConfig = {
  // Search Console Configuration
  searchConsole: {
    apiKey: (import.meta as any).env.VITE_SEARCH_CONSOLE_API_KEY || '',
    siteUrl: (import.meta as any).env.VITE_SITE_URL || window.location.origin,
    propertyId: (import.meta as any).env.VITE_PROPERTY_ID || '',
    enabled: !!(import.meta as any).env.VITE_SEARCH_CONSOLE_API_KEY
  },

  // PageSpeed Insights Configuration
  pageSpeed: {
    apiKey: (import.meta as any).env.VITE_PAGESPEED_API_KEY || '',
    baseUrl: (import.meta as any).env.VITE_PAGESPEED_BASE_URL || 'https://www.googleapis.com/pagespeedonline/v5',
    enabled: !!(import.meta as any).env.VITE_PAGESPEED_API_KEY
  },

  // Google Analytics 4 Configuration
  analytics: {
    measurementId: (import.meta as any).env.VITE_GA4_MEASUREMENT_ID || '',
    enabled: !!(import.meta as any).env.VITE_GA4_MEASUREMENT_ID
  },

  // Performance Monitoring Settings
  monitoring: {
    enabled: (import.meta as any).env.VITE_PERFORMANCE_MONITORING !== 'false',
    coreWebVitalsEnabled: (import.meta as any).env.VITE_CORE_WEB_VITALS_ENABLED !== 'false',
    debugMode: (import.meta as any).env.VITE_DEBUG_PERFORMANCE === 'true',
    debugCoreWebVitals: (import.meta as any).env.VITE_DEBUG_CORE_WEB_VITALS === 'true'
  },

  // Performance Thresholds (75th percentile)
  thresholds: {
    lcp: { good: 2500, needsImprovement: 4000, poor: 4000 },
    fid: { good: 100, needsImprovement: 300, poor: 300 },
    cls: { good: 0.1, needsImprovement: 0.25, poor: 0.25 },
    fcp: { good: 1800, needsImprovement: 3000, poor: 3000 },
    ttfb: { good: 800, needsImprovement: 1800, poor: 1800 }
  },

  // Monitoring Intervals
  intervals: {
    regressionCheck: 30000, // 30 seconds
    metricsRefresh: 30000, // 30 seconds
    dataCleanup: 24 * 60 * 60 * 1000 // 24 hours
  },

  // API Endpoints
  endpoints: {
    coreWebVitals: '/api/core-web-vitals',
    searchConsole: '/api/search-console',
    pageSpeed: '/api/pagespeed',
    regressions: '/api/performance-regressions'
  }
};

export default coreWebVitalsConfig;
