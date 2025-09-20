/**
 * PageSpeed Insights Integration Service
 * Integrates with Google PageSpeed Insights API for performance analysis
 * Provides detailed performance recommendations and monitoring
 */

interface PageSpeedConfig {
  apiKey: string;
  baseUrl: string;
}

interface PageSpeedMetrics {
  performanceScore: number;
  lcp: number;
  fid: number;
  cls: number;
  fcp: number;
  ttfb: number;
  speedIndex: number;
  totalBlockingTime: number;
  cumulativeLayoutShift: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  firstInputDelay: number;
}

interface PageSpeedReport {
  url: string;
  metrics: PageSpeedMetrics;
  recommendations: string[];
  timestamp: string;
  device: 'mobile' | 'desktop';
  strategy: 'mobile' | 'desktop';
}

interface PageSpeedRecommendation {
  id: string;
  title: string;
  description: string;
  score: number;
  impact: 'high' | 'medium' | 'low';
  category: string;
}

class PageSpeedService {
  private config: PageSpeedConfig | null = null;
  private isInitialized = false;

  constructor() {
    this.initialize();
  }

  /**
   * Initialize PageSpeed service
   */
  private async initialize(): Promise<void> {
    try {
      const apiKey = (import.meta as any).env.VITE_PAGESPEED_API_KEY;
      const baseUrl = (import.meta as any).env.VITE_PAGESPEED_BASE_URL || 'https://www.googleapis.com/pagespeedonline/v5';

      if (apiKey) {
        this.config = {
          apiKey,
          baseUrl
        };
        this.isInitialized = true;
        console.log('🚀 PageSpeed Insights service initialized');
      } else {
        console.warn('PageSpeed Insights API key missing. Some features may not work.');
      }
    } catch (error) {
      console.error('Failed to initialize PageSpeed service:', error);
    }
  }

  /**
   * Analyze page performance
   */
  public async analyzePage(url: string, strategy: 'mobile' | 'desktop' = 'mobile'): Promise<PageSpeedReport> {
    if (!this.isInitialized || !this.config) {
      throw new Error('PageSpeed service not initialized');
    }

    try {
      const response = await fetch(
        `${this.config.baseUrl}/runPagespeed?url=${encodeURIComponent(url)}&strategy=${strategy}&key=${this.config.apiKey}`
      );

      if (!response.ok) {
        throw new Error(`PageSpeed API error: ${response.status}`);
      }

      const data = await response.json();
      return this.parsePageSpeedData(data, url, strategy);
    } catch (error) {
      console.error('Failed to analyze page performance:', error);
      throw error;
    }
  }

  /**
   * Parse PageSpeed Insights data
   */
  private parsePageSpeedData(data: any, url: string, strategy: 'mobile' | 'desktop'): PageSpeedReport {
    const lighthouse = data.lighthouseResult;
    const audits = lighthouse.audits;
    const categories = lighthouse.categories;

    const metrics: PageSpeedMetrics = {
      performanceScore: Math.round(categories.performance.score * 100),
      lcp: audits['largest-contentful-paint']?.numericValue || 0,
      fid: audits['max-potential-fid']?.numericValue || 0,
      cls: audits['cumulative-layout-shift']?.numericValue || 0,
      fcp: audits['first-contentful-paint']?.numericValue || 0,
      ttfb: audits['server-response-time']?.numericValue || 0,
      speedIndex: audits['speed-index']?.numericValue || 0,
      totalBlockingTime: audits['total-blocking-time']?.numericValue || 0,
      cumulativeLayoutShift: audits['cumulative-layout-shift']?.numericValue || 0,
      firstContentfulPaint: audits['first-contentful-paint']?.numericValue || 0,
      largestContentfulPaint: audits['largest-contentful-paint']?.numericValue || 0,
      firstInputDelay: audits['max-potential-fid']?.numericValue || 0
    };

    const recommendations = this.extractRecommendations(audits);

    return {
      url,
      metrics,
      recommendations,
      timestamp: new Date().toISOString(),
      device: strategy,
      strategy
    };
  }

  /**
   * Extract performance recommendations
   */
  private extractRecommendations(audits: any): string[] {
    const recommendations: string[] = [];

    // High impact recommendations
    Object.entries(audits).forEach(([key, audit]: [string, any]) => {
      if (audit.score !== null && audit.score < 0.9 && audit.details) {
        const impact = this.getImpactLevel(audit.score);
        if (impact === 'high' || impact === 'medium') {
          recommendations.push(`${audit.title}: ${audit.description}`);
        }
      }
    });

    return recommendations;
  }

  /**
   * Get impact level from score
   */
  private getImpactLevel(score: number): 'high' | 'medium' | 'low' {
    if (score < 0.5) return 'high';
    if (score < 0.8) return 'medium';
    return 'low';
  }

  /**
   * Monitor multiple pages
   */
  public async monitorPages(urls: string[], strategy: 'mobile' | 'desktop' = 'mobile'): Promise<PageSpeedReport[]> {
    const reports: PageSpeedReport[] = [];

    for (const url of urls) {
      try {
        const report = await this.analyzePage(url, strategy);
        reports.push(report);
        
        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Failed to analyze ${url}:`, error);
      }
    }

    return reports;
  }

  /**
   * Get performance trends
   */
  public async getPerformanceTrends(url: string, days: number = 30): Promise<any> {
    if (!this.isInitialized || !this.config) {
      throw new Error('PageSpeed service not initialized');
    }

    try {
      // This would typically use the PageSpeed Insights API with historical data
      // For now, we'll return current analysis
      const report = await this.analyzePage(url);
      return {
        url,
        current: report,
        trends: {
          performanceScore: [report.metrics.performanceScore],
          lcp: [report.metrics.lcp],
          fid: [report.metrics.fid],
          cls: [report.metrics.cls]
        }
      };
    } catch (error) {
      console.error('Failed to get performance trends:', error);
      throw error;
    }
  }

  /**
   * Compare performance between mobile and desktop
   */
  public async compareMobileDesktop(url: string): Promise<{
    mobile: PageSpeedReport;
    desktop: PageSpeedReport;
    comparison: {
      performanceScore: { mobile: number; desktop: number; difference: number };
      lcp: { mobile: number; desktop: number; difference: number };
      fid: { mobile: number; desktop: number; difference: number };
      cls: { mobile: number; desktop: number; difference: number };
    };
  }> {
    const [mobileReport, desktopReport] = await Promise.all([
      this.analyzePage(url, 'mobile'),
      this.analyzePage(url, 'desktop')
    ]);

    const comparison = {
      performanceScore: {
        mobile: mobileReport.metrics.performanceScore,
        desktop: desktopReport.metrics.performanceScore,
        difference: desktopReport.metrics.performanceScore - mobileReport.metrics.performanceScore
      },
      lcp: {
        mobile: mobileReport.metrics.lcp,
        desktop: desktopReport.metrics.lcp,
        difference: desktopReport.metrics.lcp - mobileReport.metrics.lcp
      },
      fid: {
        mobile: mobileReport.metrics.fid,
        desktop: desktopReport.metrics.fid,
        difference: desktopReport.metrics.fid - mobileReport.metrics.fid
      },
      cls: {
        mobile: mobileReport.metrics.cls,
        desktop: desktopReport.metrics.cls,
        difference: desktopReport.metrics.cls - mobileReport.metrics.cls
      }
    };

    return {
      mobile: mobileReport,
      desktop: desktopReport,
      comparison
    };
  }

  /**
   * Get detailed recommendations
   */
  public async getDetailedRecommendations(url: string, strategy: 'mobile' | 'desktop' = 'mobile'): Promise<PageSpeedRecommendation[]> {
    try {
      const report = await this.analyzePage(url, strategy);
      return report.recommendations.map((rec, index) => ({
        id: `rec-${index}`,
        title: rec.split(':')[0] || 'Performance Issue',
        description: rec.split(':')[1] || rec,
        score: 0.5, // Default score
        impact: 'medium' as const,
        category: 'performance'
      }));
    } catch (error) {
      console.error('Failed to get detailed recommendations:', error);
      return [];
    }
  }

  /**
   * Send data to PageSpeed Insights
   */
  public async sendData(metrics: any): Promise<void> {
    if (!this.isInitialized || !this.config) {
      console.warn('PageSpeed service not initialized. Skipping data send.');
      return;
    }

    try {
      // This would typically send data to PageSpeed Insights
      // For now, we'll log the data that would be sent
      console.log('Sending data to PageSpeed Insights:', {
        metrics,
        timestamp: new Date().toISOString(),
        baseUrl: this.config.baseUrl
      });
    } catch (error) {
      console.error('Failed to send data to PageSpeed Insights:', error);
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
  public getConfigStatus(): { initialized: boolean; hasApiKey: boolean; hasBaseUrl: boolean } {
    return {
      initialized: this.isInitialized,
      hasApiKey: !!this.config?.apiKey,
      hasBaseUrl: !!this.config?.baseUrl
    };
  }
}

// Create singleton instance
export const pageSpeedService = new PageSpeedService();
