/**
 * Error Tracking Service
 * Provides comprehensive error tracking, reporting, and user feedback
 */

export interface ErrorReport {
  id: string;
  message: string;
  stack?: string;
  timestamp: number;
  url: string;
  userAgent: string;
  userId?: string;
  sessionId: string;
  context: {
    component?: string;
    action?: string;
    matchId?: string;
    teamId?: string;
    predictionId?: string;
  };
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'javascript' | 'network' | 'api' | 'performance' | 'user';
  tags: string[];
  breadcrumbs: Breadcrumb[];
  deviceInfo: DeviceInfo;
  performanceMetrics?: PerformanceMetrics;
}

export interface Breadcrumb {
  timestamp: number;
  category: string;
  message: string;
  level: 'info' | 'warning' | 'error';
  data?: Record<string, any>;
}

export interface DeviceInfo {
  platform: string;
  browser: string;
  browserVersion: string;
  screenResolution: string;
  viewport: string;
  connectionType?: string;
  memoryInfo?: {
    totalHeap: number;
    usedHeap: number;
    heapLimit: number;
  };
}

export interface PerformanceMetrics {
  loadTime: number;
  renderTime: number;
  memoryUsage: number;
  networkLatency: number;
}

export class ErrorTrackingService {
  private breadcrumbs: Breadcrumb[] = [];
  private sessionId: string;
  private maxBreadcrumbs = 100;
  private reportingEndpoint: string;
  private isEnabled: boolean;
  private errorQueue: ErrorReport[] = [];
  private rateLimitCount = 0;
  private rateLimitWindow = 60000; // 1 minute
  private maxErrorsPerWindow = 10;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.reportingEndpoint = this.getReportingEndpoint();
    this.isEnabled = this.shouldEnableTracking();
    
    if (this.isEnabled) {
      this.initializeGlobalErrorHandlers();
      this.initializeUnhandledRejectionHandler();
      this.initializeNetworkErrorTracking();
      this.startPerformanceMonitoring();
    }
  }

  /**
   * Initialize global error handlers
   */
  private initializeGlobalErrorHandlers(): void {
    window.addEventListener('error', (event) => {
      this.captureError(event.error || new Error(event.message), {
        category: 'javascript',
        severity: 'high',
        context: {
          component: this.extractComponentFromStack(event.error?.stack),
        },
        tags: ['global-error'],
      });
    });
  }

  /**
   * Handle unhandled promise rejections
   */
  private initializeUnhandledRejectionHandler(): void {
    window.addEventListener('unhandledrejection', (event) => {
      this.captureError(
        new Error(`Unhandled Promise Rejection: ${event.reason}`),
        {
          category: 'javascript',
          severity: 'high',
          context: {
            action: 'promise-rejection',
          },
          tags: ['unhandled-rejection'],
        }
      );
    });
  }

  /**
   * Track network errors
   */
  private initializeNetworkErrorTracking(): void {
    // Override fetch to track network errors
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);
        
        if (!response.ok) {
          this.captureError(
            new Error(`Network Error: ${response.status} ${response.statusText}`),
            {
              category: 'network',
              severity: this.getNetworkErrorSeverity(response.status),
              context: {
                action: 'fetch-request',
              },
              tags: ['network-error', `status-${response.status}`],
            }
          );
        }
        
        return response;
      } catch (error) {
        this.captureError(error as Error, {
          category: 'network',
          severity: 'high',
          context: {
            action: 'fetch-request',
          },
          tags: ['network-failure'],
        });
        throw error;
      }
    };
  }

  /**
   * Start performance monitoring
   */
  private startPerformanceMonitoring(): void {
    // Monitor Core Web Vitals
    this.observePerformanceEntries();
    
    // Monitor memory usage
    setInterval(() => {
      this.checkMemoryUsage();
    }, 30000); // Every 30 seconds
  }

  /**
   * Observe performance entries
   */
  private observePerformanceEntries(): void {
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            if (entry.name === 'largest-contentful-paint') {
              this.addBreadcrumb({
                category: 'performance',
                message: `LCP: ${entry.startTime.toFixed(2)}ms`,
                level: entry.startTime > 2500 ? 'warning' : 'info',
                data: { metric: 'lcp', value: entry.startTime },
              });
            }
          });
        });

        observer.observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift'] });
      } catch (error) {
        console.warn('Performance Observer not supported:', error);
      }
    }
  }

  /**
   * Check memory usage and report if high
   */
  private checkMemoryUsage(): void {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      const usedHeap = memory.usedJSHeapSize;
      const totalHeap = memory.totalJSHeapSize;
      const heapLimit = memory.jsHeapSizeLimit;
      
      const usagePercent = (usedHeap / heapLimit) * 100;
      
      if (usagePercent > 80) {
        this.captureError(
          new Error('High memory usage detected'),
          {
            category: 'performance',
            severity: usagePercent > 95 ? 'critical' : 'high',
            context: {
              action: 'memory-check',
            },
            tags: ['memory-warning'],
            performanceMetrics: {
              loadTime: 0,
              renderTime: 0,
              memoryUsage: usedHeap,
              networkLatency: 0,
            },
          }
        );
      }
    }
  }

  /**
   * Capture and report an error
   */
  public captureError(error: Error, options: {
    category: ErrorReport['category'];
    severity: ErrorReport['severity'];
    context?: Partial<ErrorReport['context']>;
    tags?: string[];
    performanceMetrics?: PerformanceMetrics;
  }): void {
    if (!this.isEnabled || this.isRateLimited()) {
      return;
    }

    const errorReport: ErrorReport = {
      id: this.generateErrorId(),
      message: error.message,
      stack: error.stack,
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      sessionId: this.sessionId,
      context: options.context || {},
      severity: options.severity,
      category: options.category,
      tags: options.tags || [],
      breadcrumbs: [...this.breadcrumbs],
      deviceInfo: this.getDeviceInfo(),
      performanceMetrics: options.performanceMetrics,
    };

    // Add to queue for batch sending
    this.errorQueue.push(errorReport);
    
    // Send immediately for critical errors
    if (options.severity === 'critical') {
      this.sendErrorReports();
    } else {
      // Batch send after a delay
      setTimeout(() => this.sendErrorReports(), 1000);
    }

    // Add error to breadcrumbs
    this.addBreadcrumb({
      category: 'error',
      message: error.message,
      level: 'error',
      data: {
        severity: options.severity,
        category: options.category,
      },
    });

    // Log to console in development
    if (this.isDevelopment()) {
      console.error('Error captured:', errorReport);
    }
  }

  /**
   * Add a breadcrumb for context tracking
   */
  public addBreadcrumb(breadcrumb: Omit<Breadcrumb, 'timestamp'>): void {
    this.breadcrumbs.push({
      ...breadcrumb,
      timestamp: Date.now(),
    });

    // Keep only the last N breadcrumbs
    if (this.breadcrumbs.length > this.maxBreadcrumbs) {
      this.breadcrumbs = this.breadcrumbs.slice(-this.maxBreadcrumbs);
    }
  }

  /**
   * Capture user action for context
   */
  public captureUserAction(action: string, data?: Record<string, any>): void {
    this.addBreadcrumb({
      category: 'user',
      message: `User action: ${action}`,
      level: 'info',
      data,
    });
  }

  /**
   * Capture API call for context
   */
  public captureApiCall(url: string, method: string, status?: number, duration?: number): void {
    this.addBreadcrumb({
      category: 'api',
      message: `${method} ${url}`,
      level: status && status >= 400 ? 'warning' : 'info',
      data: {
        method,
        url,
        status,
        duration,
      },
    });
  }

  /**
   * Send error reports to the backend
   */
  private async sendErrorReports(): Promise<void> {
    if (this.errorQueue.length === 0) {
      return;
    }

    const reports = [...this.errorQueue];
    this.errorQueue = [];

    try {
      const response = await fetch(this.reportingEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          errors: reports,
          timestamp: Date.now(),
        }),
      });

      if (!response.ok) {
        // Re-queue errors if sending failed
        this.errorQueue.push(...reports);
      }
    } catch (error) {
      // Re-queue errors if sending failed
      this.errorQueue.push(...reports);
      console.warn('Failed to send error reports:', error);
    }
  }

  /**
   * Check if rate limited
   */
  private isRateLimited(): boolean {
    const now = Date.now();
    
    // Reset counter if window expired
    if (now - this.rateLimitWindow > this.rateLimitWindow) {
      this.rateLimitCount = 0;
    }
    
    if (this.rateLimitCount >= this.maxErrorsPerWindow) {
      return true;
    }
    
    this.rateLimitCount++;
    return false;
  }

  /**
   * Get device information
   */
  private getDeviceInfo(): DeviceInfo {
    const deviceInfo: DeviceInfo = {
      platform: navigator.platform,
      browser: this.getBrowserName(),
      browserVersion: this.getBrowserVersion(),
      screenResolution: `${screen.width}x${screen.height}`,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
    };

    // Add connection info if available
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      deviceInfo.connectionType = connection.effectiveType;
    }

    // Add memory info if available
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      deviceInfo.memoryInfo = {
        totalHeap: memory.totalJSHeapSize,
        usedHeap: memory.usedJSHeapSize,
        heapLimit: memory.jsHeapSizeLimit,
      };
    }

    return deviceInfo;
  }

  /**
   * Extract component name from stack trace
   */
  private extractComponentFromStack(stack?: string): string | undefined {
    if (!stack) return undefined;
    
    // Look for React component names in stack
    const componentMatch = stack.match(/at (\w+)\s+\(/);
    return componentMatch ? componentMatch[1] : undefined;
  }

  /**
   * Get network error severity based on status code
   */
  private getNetworkErrorSeverity(status: number): ErrorReport['severity'] {
    if (status >= 500) return 'high';
    if (status >= 400) return 'medium';
    return 'low';
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique error ID
   */
  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get reporting endpoint based on environment
   */
  private getReportingEndpoint(): string {
    if (this.isDevelopment()) {
      return '/api/errors'; // Local development
    }
    return 'https://api.fixturecast.com/errors'; // Production
  }

  /**
   * Check if tracking should be enabled
   */
  private shouldEnableTracking(): boolean {
    // Disable in development by default, enable with flag
    if (this.isDevelopment()) {
      return localStorage.getItem('enableErrorTracking') === 'true';
    }
    
    // Enable in production unless user opts out
    return localStorage.getItem('disableErrorTracking') !== 'true';
  }

  /**
   * Check if in development mode
   */
  private isDevelopment(): boolean {
    return process.env.NODE_ENV === 'development' || 
           window.location.hostname === 'localhost';
  }

  /**
   * Get browser name
   */
  private getBrowserName(): string {
    const userAgent = navigator.userAgent;
    
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    
    return 'Unknown';
  }

  /**
   * Get browser version
   */
  private getBrowserVersion(): string {
    const userAgent = navigator.userAgent;
    const match = userAgent.match(/(Chrome|Firefox|Safari|Edge)\/(\d+\.\d+)/);
    
    return match ? match[2] : 'Unknown';
  }

  /**
   * Get current error statistics
   */
  public getErrorStats(): {
    sessionId: string;
    breadcrumbCount: number;
    queuedErrors: number;
    rateLimitCount: number;
    isEnabled: boolean;
  } {
    return {
      sessionId: this.sessionId,
      breadcrumbCount: this.breadcrumbs.length,
      queuedErrors: this.errorQueue.length,
      rateLimitCount: this.rateLimitCount,
      isEnabled: this.isEnabled,
    };
  }

  /**
   * Enable/disable error tracking
   */
  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    localStorage.setItem(
      enabled ? 'enableErrorTracking' : 'disableErrorTracking',
      'true'
    );
  }

  /**
   * Clear error queue and breadcrumbs
   */
  public clearData(): void {
    this.errorQueue = [];
    this.breadcrumbs = [];
    this.rateLimitCount = 0;
  }

  /**
   * Force send any queued errors
   */
  public async flush(): Promise<void> {
    if (this.errorQueue.length > 0) {
      await this.sendErrorReports();
    }
  }
}

// Global instance
export const errorTrackingService = new ErrorTrackingService();

// Utility functions for common error scenarios
export const trackError = {
  api: (error: Error, url: string, method: string) => {
    errorTrackingService.captureError(error, {
      category: 'api',
      severity: 'medium',
      context: { action: 'api-call' },
      tags: ['api-error', method.toLowerCase()],
    });
  },

  prediction: (error: Error, matchId: string) => {
    errorTrackingService.captureError(error, {
      category: 'api',
      severity: 'high',
      context: { action: 'prediction-generation', matchId },
      tags: ['prediction-error'],
    });
  },

  component: (error: Error, componentName: string) => {
    errorTrackingService.captureError(error, {
      category: 'javascript',
      severity: 'medium',
      context: { component: componentName },
      tags: ['component-error'],
    });
  },

  user: (error: Error, action: string) => {
    errorTrackingService.captureError(error, {
      category: 'user',
      severity: 'low',
      context: { action },
      tags: ['user-action-error'],
    });
  },
};

// Initialize on import
if (typeof window !== 'undefined') {
  // Send any queued errors before page unload
  window.addEventListener('beforeunload', () => {
    errorTrackingService.flush();
  });
}
