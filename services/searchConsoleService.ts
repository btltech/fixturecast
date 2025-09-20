/**
 * Search Console Integration Service
 * Integrates with Google Search Console Core Web Vitals report
 * Provides ongoing monitoring and regression detection
 */

interface SearchConsoleConfig {
  apiKey: string;
  siteUrl: string;
  propertyId: string;
}

interface SearchConsoleMetrics {
  lcp: {
    good: number;
    needsImprovement: number;
    poor: number;
  };
  fid: {
    good: number;
    needsImprovement: number;
    poor: number;
  };
  cls: {
    good: number;
    needsImprovement: number;
    poor: number;
  };
  fcp: {
    good: number;
    needsImprovement: number;
    poor: number;
  };
  ttfb: {
    good: number;
    needsImprovement: number;
    poor: number;
  };
}

interface SearchConsoleReport {
  url: string;
  metrics: SearchConsoleMetrics;
  timestamp: string;
  device: 'mobile' | 'desktop';
  country: string;
}

class SearchConsoleService {
  private config: SearchConsoleConfig | null = null;
  private isInitialized = false;

  constructor() {
    this.initialize();
  }

  /**
   * Initialize Search Console service
   */
  private async initialize(): Promise<void> {
    try {
      // Load configuration from environment variables
      const apiKey = (import.meta as any).env.VITE_SEARCH_CONSOLE_API_KEY;
      const siteUrl = (import.meta as any).env.VITE_SITE_URL || window.location.origin;
      const propertyId = (import.meta as any).env.VITE_PROPERTY_ID;

      if (apiKey && siteUrl && propertyId) {
        this.config = {
          apiKey,
          siteUrl,
          propertyId
        };
        this.isInitialized = true;
        console.log('🔍 Search Console service initialized');
      } else {
        console.warn('Search Console configuration missing. Some features may not work.');
      }
    } catch (error) {
      console.error('Failed to initialize Search Console service:', error);
    }
  }

  /**
   * Get Core Web Vitals data from Search Console
   */
  public async getCoreWebVitalsData(): Promise<SearchConsoleReport[]> {
    if (!this.isInitialized || !this.config) {
      throw new Error('Search Console service not initialized');
    }

    try {
      const response = await fetch(
        `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(this.config.siteUrl)}/searchAnalytics/query`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            startDate: this.getDateString(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)), // 30 days ago
            endDate: this.getDateString(new Date()),
            dimensions: ['page', 'device', 'country'],
            rowLimit: 1000,
            dimensionFilterGroups: [{
              filters: [{
                dimension: 'searchAppearance',
                operator: 'equals',
                expression: 'coreWebVitals'
              }]
            }]
          })
        }
      );

      if (!response.ok) {
        throw new Error(`Search Console API error: ${response.status}`);
      }

      const data = await response.json();
      return this.parseSearchConsoleData(data);
    } catch (error) {
      console.error('Failed to fetch Search Console data:', error);
      throw error;
    }
  }

  /**
   * Parse Search Console data
   */
  private parseSearchConsoleData(data: any): SearchConsoleReport[] {
    if (!data.rows) return [];

    return data.rows.map((row: any) => ({
      url: row.keys[0] || '',
      metrics: {
        lcp: {
          good: row.lcpGood || 0,
          needsImprovement: row.lcpNeedsImprovement || 0,
          poor: row.lcpPoor || 0
        },
        fid: {
          good: row.fidGood || 0,
          needsImprovement: row.fidNeedsImprovement || 0,
          poor: row.fidPoor || 0
        },
        cls: {
          good: row.clsGood || 0,
          needsImprovement: row.clsNeedsImprovement || 0,
          poor: row.clsPoor || 0
        },
        fcp: {
          good: row.fcpGood || 0,
          needsImprovement: row.fcpNeedsImprovement || 0,
          poor: row.fcpPoor || 0
        },
        ttfb: {
          good: row.ttfbGood || 0,
          needsImprovement: row.ttfbNeedsImprovement || 0,
          poor: row.ttfbPoor || 0
        }
      },
      timestamp: new Date().toISOString(),
      device: row.keys[1] === 'mobile' ? 'mobile' : 'desktop',
      country: row.keys[2] || 'unknown'
    }));
  }

  /**
   * Get date string in YYYY-MM-DD format
   */
  private getDateString(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Send Core Web Vitals data to Search Console
   */
  public async sendCoreWebVitalsData(metrics: any): Promise<void> {
    if (!this.isInitialized || !this.config) {
      console.warn('Search Console service not initialized. Skipping data send.');
      return;
    }

    try {
      // This would typically use the Search Console API to submit data
      // For now, we'll log the data that would be sent
      console.log('Sending Core Web Vitals data to Search Console:', {
        siteUrl: this.config.siteUrl,
        metrics,
        timestamp: new Date().toISOString()
      });

      // In a real implementation, you would send this data to Search Console
      // using the appropriate API endpoint
    } catch (error) {
      console.error('Failed to send data to Search Console:', error);
    }
  }

  /**
   * Monitor for performance regressions
   */
  public async monitorRegressions(): Promise<void> {
    try {
      const reports = await this.getCoreWebVitalsData();
      const regressions = this.detectRegressions(reports);
      
      if (regressions.length > 0) {
        console.warn('🚨 Performance regressions detected in Search Console:', regressions);
        await this.reportRegressions(regressions);
      }
    } catch (error) {
      console.error('Failed to monitor regressions:', error);
    }
  }

  /**
   * Detect performance regressions
   */
  private detectRegressions(reports: SearchConsoleReport[]): string[] {
    const regressions: string[] = [];

    reports.forEach(report => {
      Object.entries(report.metrics).forEach(([metric, values]) => {
        const total = values.good + values.needsImprovement + values.poor;
        if (total > 0) {
          const poorPercentage = (values.poor / total) * 100;
          const needsImprovementPercentage = (values.needsImprovement / total) * 100;
          
          if (poorPercentage > 25) {
            regressions.push(`${metric.toUpperCase()} regression on ${report.url}: ${poorPercentage.toFixed(1)}% poor`);
          } else if (needsImprovementPercentage > 50) {
            regressions.push(`${metric.toUpperCase()} needs improvement on ${report.url}: ${needsImprovementPercentage.toFixed(1)}% needs improvement`);
          }
        }
      });
    });

    return regressions;
  }

  /**
   * Report regressions
   */
  private async reportRegressions(regressions: string[]): Promise<void> {
    try {
      // Send regression report to monitoring service
      await fetch('/api/performance-regressions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          source: 'search-console',
          regressions,
          timestamp: new Date().toISOString(),
          siteUrl: this.config?.siteUrl
        })
      });
    } catch (error) {
      console.error('Failed to report regressions:', error);
    }
  }

  /**
   * Get performance trends
   */
  public async getPerformanceTrends(days: number = 30): Promise<any> {
    if (!this.isInitialized || !this.config) {
      throw new Error('Search Console service not initialized');
    }

    try {
      const response = await fetch(
        `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(this.config.siteUrl)}/searchAnalytics/query`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            startDate: this.getDateString(new Date(Date.now() - days * 24 * 60 * 60 * 1000)),
            endDate: this.getDateString(new Date()),
            dimensions: ['date'],
            rowLimit: days
          })
        }
      );

      if (!response.ok) {
        throw new Error(`Search Console API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to fetch performance trends:', error);
      throw error;
    }
  }

  /**
   * Check if service is initialized
   */
  public isReady(): boolean {
    return this.isInitialized && this.config !== null;
  }

  /**
   * Get configuration status
   */
  public getConfigStatus(): { initialized: boolean; hasApiKey: boolean; hasSiteUrl: boolean; hasPropertyId: boolean } {
    return {
      initialized: this.isInitialized,
      hasApiKey: !!this.config?.apiKey,
      hasSiteUrl: !!this.config?.siteUrl,
      hasPropertyId: !!this.config?.propertyId
    };
  }
}

// Create singleton instance
export const searchConsoleService = new SearchConsoleService();
