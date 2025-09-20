/**
 * Core Web Vitals Monitoring Service
 * Tracks LCP, FID, CLS, and other performance metrics at the 75th percentile
 * Integrates with Search Console and PageSpeed Insights for ongoing monitoring
 */

interface CoreWebVitalsMetrics {
  lcp: number; // Largest Contentful Paint
  fid: number; // First Input Delay
  cls: number; // Cumulative Layout Shift
  fcp: number; // First Contentful Paint
  ttfb: number; // Time to First Byte
  timestamp: number;
  url: string;
  userAgent: string;
  connectionType?: string;
  deviceMemory?: number;
}

interface PerformanceThresholds {
  lcp: { good: number; needsImprovement: number; poor: number };
  fid: { good: number; needsImprovement: number; poor: number };
  cls: { good: number; needsImprovement: number; poor: number };
  fcp: { good: number; needsImprovement: number; poor: number };
  ttfb: { good: number; needsImprovement: number; poor: number };
}

interface CoreWebVitalsReport {
  metrics: CoreWebVitalsMetrics;
  score: 'good' | 'needs-improvement' | 'poor';
  recommendations: string[];
  percentile75: {
    lcp: number;
    fid: number;
    cls: number;
    fcp: number;
    ttfb: number;
  };
}

class CoreWebVitalsService {
  private metrics: CoreWebVitalsMetrics[] = [];
  private thresholds: PerformanceThresholds;
  private isMonitoring = false;
  private reportEndpoint = '/api/core-web-vitals';
  private searchConsoleEndpoint = '/api/search-console';
  private pagespeedEndpoint = '/api/pagespeed';

  constructor() {
    this.thresholds = {
      lcp: { good: 2500, needsImprovement: 4000, poor: 4000 },
      fid: { good: 100, needsImprovement: 300, poor: 300 },
      cls: { good: 0.1, needsImprovement: 0.25, poor: 0.25 },
      fcp: { good: 1800, needsImprovement: 3000, poor: 3000 },
      ttfb: { good: 800, needsImprovement: 1800, poor: 1800 }
    };
  }

  /**
   * Initialize Core Web Vitals monitoring
   */
  public initialize(): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.setupPerformanceObservers();
    this.setupRealUserMonitoring();
    this.setupRegressionDetection();
    
    console.log('🔍 Core Web Vitals monitoring initialized');
  }

  /**
   * Set up Performance Observer for Core Web Vitals
   */
  private setupPerformanceObservers(): void {
    // Largest Contentful Paint (LCP)
    if ('PerformanceObserver' in window) {
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1] as PerformanceEntry;
          this.recordMetric('lcp', lastEntry.startTime);
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      } catch (error) {
        console.warn('LCP observer not supported:', error);
      }

      // First Input Delay (FID)
      try {
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            this.recordMetric('fid', entry.processingStart - entry.startTime);
          });
        });
        fidObserver.observe({ entryTypes: ['first-input'] });
      } catch (error) {
        console.warn('FID observer not supported:', error);
      }

      // Cumulative Layout Shift (CLS)
      try {
        let clsValue = 0;
        const clsObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          });
          this.recordMetric('cls', clsValue);
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });
      } catch (error) {
        console.warn('CLS observer not supported:', error);
      }

      // First Contentful Paint (FCP)
      try {
        const fcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const fcpEntry = entries.find(entry => entry.name === 'first-contentful-paint');
          if (fcpEntry) {
            this.recordMetric('fcp', fcpEntry.startTime);
          }
        });
        fcpObserver.observe({ entryTypes: ['paint'] });
      } catch (error) {
        console.warn('FCP observer not supported:', error);
      }

      // Time to First Byte (TTFB)
      try {
        const navigationObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            if (entry.entryType === 'navigation') {
              this.recordMetric('ttfb', entry.responseStart - entry.requestStart);
            }
          });
        });
        navigationObserver.observe({ entryTypes: ['navigation'] });
      } catch (error) {
        console.warn('TTFB observer not supported:', error);
      }
    }
  }

  /**
   * Record a performance metric
   */
  private recordMetric(metric: keyof Omit<CoreWebVitalsMetrics, 'timestamp' | 'url' | 'userAgent' | 'connectionType' | 'deviceMemory'>, value: number): void {
    const metricData: CoreWebVitalsMetrics = {
      lcp: 0,
      fid: 0,
      cls: 0,
      fcp: 0,
      ttfb: 0,
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      connectionType: (navigator as any).connection?.effectiveType,
      deviceMemory: (navigator as any).deviceMemory
    };

    metricData[metric] = value;
    this.metrics.push(metricData);

    // Send to analytics if available
    this.sendToAnalytics(metricData);
  }

  /**
   * Set up real user monitoring
   */
  private setupRealUserMonitoring(): void {
    // Monitor page load performance
    window.addEventListener('load', () => {
      setTimeout(() => {
        this.capturePageLoadMetrics();
      }, 1000);
    });

    // Monitor route changes (for SPA)
    window.addEventListener('popstate', () => {
      setTimeout(() => {
        this.capturePageLoadMetrics();
      }, 500);
    });
  }

  /**
   * Capture page load metrics
   */
  private capturePageLoadMetrics(): void {
    if ('performance' in window) {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      if (navigation) {
        const metrics: Partial<CoreWebVitalsMetrics> = {
          timestamp: Date.now(),
          url: window.location.href,
          userAgent: navigator.userAgent,
          connectionType: (navigator as any).connection?.effectiveType,
          deviceMemory: (navigator as any).deviceMemory
        };

        // Capture additional metrics
        if (navigation.domContentLoadedEventEnd) {
          metrics.fcp = navigation.domContentLoadedEventEnd - navigation.fetchStart;
        }
        if (navigation.responseStart) {
          metrics.ttfb = navigation.responseStart - navigation.fetchStart;
        }

        this.metrics.push(metrics as CoreWebVitalsMetrics);
      }
    }
  }

  /**
   * Set up regression detection
   */
  private setupRegressionDetection(): void {
    // Check for performance regressions
    setInterval(() => {
      this.detectPerformanceRegressions();
    }, 30000); // Check every 30 seconds
  }

  /**
   * Detect performance regressions
   */
  private detectPerformanceRegressions(): void {
    if (this.metrics.length < 10) return; // Need minimum data points

    const recentMetrics = this.metrics.slice(-20); // Last 20 measurements
    const percentile75 = this.calculatePercentile75(recentMetrics);

    // Check against thresholds
    const regressions = this.identifyRegressions(percentile75);
    
    if (regressions.length > 0) {
      console.warn('🚨 Performance regressions detected:', regressions);
      this.reportRegressions(regressions);
    }
  }

  /**
   * Calculate 75th percentile metrics
   */
  private calculatePercentile75(metrics: CoreWebVitalsMetrics[]): CoreWebVitalsMetrics {
    const sorted = {
      lcp: metrics.map(m => m.lcp).sort((a, b) => a - b),
      fid: metrics.map(m => m.fid).sort((a, b) => a - b),
      cls: metrics.map(m => m.cls).sort((a, b) => a - b),
      fcp: metrics.map(m => m.fcp).sort((a, b) => a - b),
      ttfb: metrics.map(m => m.ttfb).sort((a, b) => a - b)
    };

    const percentile75Index = Math.floor(metrics.length * 0.75);

    return {
      lcp: sorted.lcp[percentile75Index] || 0,
      fid: sorted.fid[percentile75Index] || 0,
      cls: sorted.cls[percentile75Index] || 0,
      fcp: sorted.fcp[percentile75Index] || 0,
      ttfb: sorted.ttfb[percentile75Index] || 0,
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent
    };
  }

  /**
   * Identify performance regressions
   */
  private identifyRegressions(percentile75: CoreWebVitalsMetrics): string[] {
    const regressions: string[] = [];

    if (percentile75.lcp > this.thresholds.lcp.needsImprovement) {
      regressions.push(`LCP regression: ${percentile75.lcp}ms (threshold: ${this.thresholds.lcp.needsImprovement}ms)`);
    }
    if (percentile75.fid > this.thresholds.fid.needsImprovement) {
      regressions.push(`FID regression: ${percentile75.fid}ms (threshold: ${this.thresholds.fid.needsImprovement}ms)`);
    }
    if (percentile75.cls > this.thresholds.cls.needsImprovement) {
      regressions.push(`CLS regression: ${percentile75.cls} (threshold: ${this.thresholds.cls.needsImprovement})`);
    }
    if (percentile75.fcp > this.thresholds.fcp.needsImprovement) {
      regressions.push(`FCP regression: ${percentile75.fcp}ms (threshold: ${this.thresholds.fcp.needsImprovement}ms)`);
    }
    if (percentile75.ttfb > this.thresholds.ttfb.needsImprovement) {
      regressions.push(`TTFB regression: ${percentile75.ttfb}ms (threshold: ${this.thresholds.ttfb.needsImprovement}ms)`);
    }

    return regressions;
  }

  /**
   * Send metrics to analytics
   */
  private sendToAnalytics(metrics: CoreWebVitalsMetrics): void {
    // Send to Google Analytics 4
    if (typeof gtag !== 'undefined') {
      gtag('event', 'core_web_vitals', {
        lcp: metrics.lcp,
        fid: metrics.fid,
        cls: metrics.cls,
        fcp: metrics.fcp,
        ttfb: metrics.ttfb,
        url: metrics.url
      });
    }

    // Send to custom analytics endpoint
    this.sendToEndpoint(this.reportEndpoint, metrics);
  }

  /**
   * Send to Search Console
   */
  public async sendToSearchConsole(metrics: CoreWebVitalsMetrics): Promise<void> {
    try {
      await this.sendToEndpoint(this.searchConsoleEndpoint, {
        ...metrics,
        source: 'search-console',
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Failed to send to Search Console:', error);
    }
  }

  /**
   * Send to PageSpeed Insights
   */
  public async sendToPageSpeedInsights(metrics: CoreWebVitalsMetrics): Promise<void> {
    try {
      await this.sendToEndpoint(this.pagespeedEndpoint, {
        ...metrics,
        source: 'pagespeed-insights',
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Failed to send to PageSpeed Insights:', error);
    }
  }

  /**
   * Send data to endpoint
   */
  private async sendToEndpoint(endpoint: string, data: any): Promise<void> {
    try {
      await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });
    } catch (error) {
      console.warn('Failed to send metrics to endpoint:', error);
    }
  }

  /**
   * Report regressions
   */
  private reportRegressions(regressions: string[]): void {
    // Send regression report
    this.sendToEndpoint('/api/performance-regressions', {
      regressions,
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent
    });

    // Log to console for development
    if (process.env.NODE_ENV === 'development') {
      console.warn('Performance regressions detected:', regressions);
    }
  }

  /**
   * Get current metrics report
   */
  public getMetricsReport(): CoreWebVitalsReport {
    const percentile75 = this.calculatePercentile75(this.metrics);
    const score = this.calculateOverallScore(percentile75);
    const recommendations = this.generateRecommendations(percentile75);

    return {
      metrics: percentile75,
      score,
      recommendations,
      percentile75
    };
  }

  /**
   * Calculate overall performance score
   */
  private calculateOverallScore(metrics: CoreWebVitalsMetrics): 'good' | 'needs-improvement' | 'poor' {
    const scores = [
      this.getMetricScore('lcp', metrics.lcp),
      this.getMetricScore('fid', metrics.fid),
      this.getMetricScore('cls', metrics.cls),
      this.getMetricScore('fcp', metrics.fcp),
      this.getMetricScore('ttfb', metrics.ttfb)
    ];

    const poorCount = scores.filter(score => score === 'poor').length;
    const needsImprovementCount = scores.filter(score => score === 'needs-improvement').length;

    if (poorCount > 0) return 'poor';
    if (needsImprovementCount > 0) return 'needs-improvement';
    return 'good';
  }

  /**
   * Get score for individual metric
   */
  private getMetricScore(metric: keyof PerformanceThresholds, value: number): 'good' | 'needs-improvement' | 'poor' {
    const threshold = this.thresholds[metric];
    if (value <= threshold.good) return 'good';
    if (value <= threshold.needsImprovement) return 'needs-improvement';
    return 'poor';
  }

  /**
   * Generate performance recommendations
   */
  private generateRecommendations(metrics: CoreWebVitalsMetrics): string[] {
    const recommendations: string[] = [];

    if (metrics.lcp > this.thresholds.lcp.good) {
      recommendations.push('Optimize Largest Contentful Paint: Consider image optimization, preloading critical resources, and reducing server response times');
    }
    if (metrics.fid > this.thresholds.fid.good) {
      recommendations.push('Improve First Input Delay: Reduce JavaScript execution time, optimize third-party scripts, and use web workers');
    }
    if (metrics.cls > this.thresholds.cls.good) {
      recommendations.push('Reduce Cumulative Layout Shift: Add size attributes to images, avoid inserting content above existing content, and preload fonts');
    }
    if (metrics.fcp > this.thresholds.fcp.good) {
      recommendations.push('Optimize First Contentful Paint: Minimize render-blocking resources, optimize CSS delivery, and improve server response times');
    }
    if (metrics.ttfb > this.thresholds.ttfb.good) {
      recommendations.push('Improve Time to First Byte: Optimize server response times, use CDN, and implement caching strategies');
    }

    return recommendations;
  }

  /**
   * Get metrics for specific time period
   */
  public getMetricsForPeriod(startTime: number, endTime: number): CoreWebVitalsMetrics[] {
    return this.metrics.filter(metric => 
      metric.timestamp >= startTime && metric.timestamp <= endTime
    );
  }

  /**
   * Clear old metrics to prevent memory leaks
   */
  public clearOldMetrics(maxAge: number = 24 * 60 * 60 * 1000): void {
    const cutoff = Date.now() - maxAge;
    this.metrics = this.metrics.filter(metric => metric.timestamp > cutoff);
  }

  /**
   * Export metrics for analysis
   */
  public exportMetrics(): string {
    return JSON.stringify(this.metrics, null, 2);
  }
}

// Create singleton instance
export const coreWebVitalsService = new CoreWebVitalsService();

// Auto-initialize when module loads
if (typeof window !== 'undefined') {
  coreWebVitalsService.initialize();
}
