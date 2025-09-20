import React, { useState, useEffect } from 'react';
import { errorTrackingService } from '../services/errorTrackingService';
import { coreWebVitalsService } from '../services/coreWebVitalsService';

interface ErrorStats {
  sessionId: string;
  breadcrumbCount: number;
  queuedErrors: number;
  rateLimitCount: number;
  isEnabled: boolean;
}

interface PerformanceMetrics {
  lcp: number;
  fid: number;
  cls: number;
  fcp: number;
  ttfb: number;
}

interface DailyErrorSummary {
  date: string;
  totalErrors: number;
  errorsByCategory: Record<string, number>;
  errorsBySeverity: Record<string, number>;
  topErrors: Record<string, number>;
}

const MonitoringDashboard: React.FC = () => {
  const [errorStats, setErrorStats] = useState<ErrorStats | null>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null);
  const [dailySummary, setDailySummary] = useState<DailyErrorSummary | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<'errors' | 'performance' | 'summary'>('errors');

  useEffect(() => {
    // Show monitoring dashboard only in development or with debug flag
    const shouldShow = process.env.NODE_ENV === 'development' || 
                      localStorage.getItem('showMonitoring') === 'true';
    setIsVisible(shouldShow);

    if (shouldShow) {
      loadData();
      const interval = setInterval(loadData, 5000); // Update every 5 seconds
      return () => clearInterval(interval);
    }
  }, []);

  const loadData = async () => {
    // Load error stats
    const stats = errorTrackingService.getErrorStats();
    setErrorStats(stats);

    // Load performance metrics
    const metrics = await coreWebVitalsService.getLatestMetrics();
    setPerformanceMetrics(metrics);

    // Load daily summary
    try {
      const response = await fetch('/api/errors/stats');
      if (response.ok) {
        const summary = await response.json();
        setDailySummary(summary);
      }
    } catch (error) {
      console.warn('Failed to load daily summary:', error);
    }
  };

  const handleToggleTracking = () => {
    if (errorStats) {
      errorTrackingService.setEnabled(!errorStats.isEnabled);
      loadData();
    }
  };

  const handleClearData = () => {
    errorTrackingService.clearData();
    loadData();
  };

  const handleFlushErrors = async () => {
    await errorTrackingService.flush();
    loadData();
  };

  const handleTestError = () => {
    // Generate a test error
    try {
      throw new Error('Test error for monitoring dashboard');
    } catch (error) {
      errorTrackingService.captureError(error as Error, {
        category: 'javascript',
        severity: 'low',
        context: { action: 'test-error' },
        tags: ['test', 'monitoring'],
      });
    }
  };

  const getPerformanceScore = (metric: keyof PerformanceMetrics, value: number): string => {
    const thresholds = {
      lcp: { good: 2500, poor: 4000 },
      fid: { good: 100, poor: 300 },
      cls: { good: 0.1, poor: 0.25 },
      fcp: { good: 1800, poor: 3000 },
      ttfb: { good: 800, poor: 1800 },
    };

    const threshold = thresholds[metric];
    if (value <= threshold.good) return 'good';
    if (value <= threshold.poor) return 'needs-improvement';
    return 'poor';
  };

  const getScoreColor = (score: string): string => {
    switch (score) {
      case 'good': return 'text-green-600';
      case 'needs-improvement': return 'text-yellow-600';
      case 'poor': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-gray-900 text-white border border-gray-700 rounded-lg shadow-2xl w-96 max-h-96 overflow-hidden">
        {/* Header */}
        <div className="bg-gray-800 px-4 py-2 border-b border-gray-700 flex justify-between items-center">
          <h3 className="font-semibold text-sm">Monitoring Dashboard</h3>
          <button
            onClick={() => setIsVisible(false)}
            className="text-gray-400 hover:text-white"
            aria-label="Close monitoring dashboard"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700">
          {(['errors', 'performance', 'summary'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 px-3 py-2 text-xs font-medium capitalize transition-colors ${
                activeTab === tab
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-80">
          {activeTab === 'errors' && errorStats && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-gray-400">Session:</span>
                  <div className="font-mono text-xs truncate">
                    {errorStats.sessionId.slice(-8)}
                  </div>
                </div>
                <div>
                  <span className="text-gray-400">Status:</span>
                  <div className={errorStats.isEnabled ? 'text-green-400' : 'text-red-400'}>
                    {errorStats.isEnabled ? 'Enabled' : 'Disabled'}
                  </div>
                </div>
                <div>
                  <span className="text-gray-400">Breadcrumbs:</span>
                  <div>{errorStats.breadcrumbCount}</div>
                </div>
                <div>
                  <span className="text-gray-400">Queued:</span>
                  <div>{errorStats.queuedErrors}</div>
                </div>
              </div>

              <div className="space-y-2">
                <button
                  onClick={handleToggleTracking}
                  className={`w-full px-3 py-1 text-xs rounded ${
                    errorStats.isEnabled
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-green-600 hover:bg-green-700'
                  } transition-colors`}
                >
                  {errorStats.isEnabled ? 'Disable Tracking' : 'Enable Tracking'}
                </button>
                
                <div className="flex gap-2">
                  <button
                    onClick={handleClearData}
                    className="flex-1 px-3 py-1 text-xs bg-gray-600 hover:bg-gray-700 rounded transition-colors"
                  >
                    Clear Data
                  </button>
                  <button
                    onClick={handleFlushErrors}
                    className="flex-1 px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 rounded transition-colors"
                  >
                    Flush Errors
                  </button>
                </div>
                
                <button
                  onClick={handleTestError}
                  className="w-full px-3 py-1 text-xs bg-orange-600 hover:bg-orange-700 rounded transition-colors"
                >
                  Test Error
                </button>
              </div>
            </div>
          )}

          {activeTab === 'performance' && performanceMetrics && (
            <div className="space-y-3">
              <div className="text-xs space-y-2">
                {Object.entries(performanceMetrics).map(([key, value]) => {
                  const score = getPerformanceScore(key as keyof PerformanceMetrics, value);
                  return (
                    <div key={key} className="flex justify-between items-center">
                      <span className="text-gray-400 uppercase">{key}:</span>
                      <div className="flex items-center gap-1">
                        <span className={getScoreColor(score)}>
                          {typeof value === 'number' ? value.toFixed(1) : value}
                          {key === 'cls' ? '' : 'ms'}
                        </span>
                        <div className={`w-2 h-2 rounded-full ${
                          score === 'good' ? 'bg-green-400' :
                          score === 'needs-improvement' ? 'bg-yellow-400' : 'bg-red-400'
                        }`} />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="text-xs text-gray-400">
                <div>• Good: Green</div>
                <div>• Needs Improvement: Yellow</div>
                <div>• Poor: Red</div>
              </div>
            </div>
          )}

          {activeTab === 'summary' && dailySummary && (
            <div className="space-y-3">
              <div className="text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Errors:</span>
                  <span>{dailySummary.totalErrors}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Date:</span>
                  <span>{dailySummary.date}</span>
                </div>
              </div>

              {Object.keys(dailySummary.errorsByCategory).length > 0 && (
                <div>
                  <div className="text-xs text-gray-400 mb-1">By Category:</div>
                  <div className="text-xs space-y-1">
                    {Object.entries(dailySummary.errorsByCategory).map(([category, count]) => (
                      <div key={category} className="flex justify-between">
                        <span className="capitalize">{category}:</span>
                        <span>{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {Object.keys(dailySummary.errorsBySeverity).length > 0 && (
                <div>
                  <div className="text-xs text-gray-400 mb-1">By Severity:</div>
                  <div className="text-xs space-y-1">
                    {Object.entries(dailySummary.errorsBySeverity).map(([severity, count]) => (
                      <div key={severity} className="flex justify-between">
                        <span className={`capitalize ${
                          severity === 'critical' ? 'text-red-400' :
                          severity === 'high' ? 'text-orange-400' :
                          severity === 'medium' ? 'text-yellow-400' : 'text-green-400'
                        }`}>
                          {severity}:
                        </span>
                        <span>{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MonitoringDashboard;
