import React, { useState, useEffect } from 'react';
import { coreWebVitalsService } from '../services/coreWebVitalsService';

interface PerformanceDashboardProps {
  className?: string;
}

interface PerformanceMetrics {
  lcp: number;
  fid: number;
  cls: number;
  fcp: number;
  ttfb: number;
  score: 'good' | 'needs-improvement' | 'poor';
  recommendations: string[];
}

const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({ className = '' }) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const loadMetrics = () => {
      try {
        const report = coreWebVitalsService.getMetricsReport();
        setMetrics({
          lcp: report.metrics.lcp,
          fid: report.metrics.fid,
          cls: report.metrics.cls,
          fcp: report.metrics.fcp,
          ttfb: report.metrics.ttfb,
          score: report.score,
          recommendations: report.recommendations
        });
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to load performance metrics:', error);
        setIsLoading(false);
      }
    };

    loadMetrics();
    
    // Refresh metrics every 30 seconds
    const interval = setInterval(loadMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  const getScoreColor = (score: string) => {
    switch (score) {
      case 'good': return 'text-green-500';
      case 'needs-improvement': return 'text-yellow-500';
      case 'poor': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getScoreIcon = (score: string) => {
    switch (score) {
      case 'good': return '✅';
      case 'needs-improvement': return '⚠️';
      case 'poor': return '❌';
      default: return '❓';
    }
  };

  const formatMetric = (value: number, unit: string = 'ms') => {
    if (value === 0) return 'N/A';
    return `${Math.round(value)}${unit}`;
  };

  const getMetricStatus = (metric: string, value: number) => {
    const thresholds = {
      lcp: { good: 2500, needsImprovement: 4000 },
      fid: { good: 100, needsImprovement: 300 },
      cls: { good: 0.1, needsImprovement: 0.25 },
      fcp: { good: 1800, needsImprovement: 3000 },
      ttfb: { good: 800, needsImprovement: 1800 }
    };

    const threshold = thresholds[metric as keyof typeof thresholds];
    if (!threshold) return 'unknown';

    if (value <= threshold.good) return 'good';
    if (value <= threshold.needsImprovement) return 'needs-improvement';
    return 'poor';
  };

  if (isLoading) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading performance metrics...</span>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
        <div className="text-center text-gray-500">
          <p>No performance metrics available</p>
          <p className="text-sm mt-2">Metrics will appear as users interact with the site</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Core Web Vitals</h3>
          <p className="text-sm text-gray-600">Real-time performance monitoring</p>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`text-2xl ${getScoreColor(metrics.score)}`}>
            {getScoreIcon(metrics.score)}
          </span>
          <span className={`text-sm font-medium ${getScoreColor(metrics.score)}`}>
            {metrics.score.replace('-', ' ').toUpperCase()}
          </span>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {/* LCP */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">LCP</span>
            <span className={`text-xs px-2 py-1 rounded-full ${
              getMetricStatus('lcp', metrics.lcp) === 'good' ? 'bg-green-100 text-green-800' :
              getMetricStatus('lcp', metrics.lcp) === 'needs-improvement' ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }`}>
              {getMetricStatus('lcp', metrics.lcp)}
            </span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {formatMetric(metrics.lcp)}
          </div>
          <div className="text-xs text-gray-500">Largest Contentful Paint</div>
        </div>

        {/* FID */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">FID</span>
            <span className={`text-xs px-2 py-1 rounded-full ${
              getMetricStatus('fid', metrics.fid) === 'good' ? 'bg-green-100 text-green-800' :
              getMetricStatus('fid', metrics.fid) === 'needs-improvement' ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }`}>
              {getMetricStatus('fid', metrics.fid)}
            </span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {formatMetric(metrics.fid)}
          </div>
          <div className="text-xs text-gray-500">First Input Delay</div>
        </div>

        {/* CLS */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">CLS</span>
            <span className={`text-xs px-2 py-1 rounded-full ${
              getMetricStatus('cls', metrics.cls) === 'good' ? 'bg-green-100 text-green-800' :
              getMetricStatus('cls', metrics.cls) === 'needs-improvement' ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }`}>
              {getMetricStatus('cls', metrics.cls)}
            </span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {formatMetric(metrics.cls, '')}
          </div>
          <div className="text-xs text-gray-500">Cumulative Layout Shift</div>
        </div>

        {/* FCP */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">FCP</span>
            <span className={`text-xs px-2 py-1 rounded-full ${
              getMetricStatus('fcp', metrics.fcp) === 'good' ? 'bg-green-100 text-green-800' :
              getMetricStatus('fcp', metrics.fcp) === 'needs-improvement' ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }`}>
              {getMetricStatus('fcp', metrics.fcp)}
            </span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {formatMetric(metrics.fcp)}
          </div>
          <div className="text-xs text-gray-500">First Contentful Paint</div>
        </div>

        {/* TTFB */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">TTFB</span>
            <span className={`text-xs px-2 py-1 rounded-full ${
              getMetricStatus('ttfb', metrics.ttfb) === 'good' ? 'bg-green-100 text-green-800' :
              getMetricStatus('ttfb', metrics.ttfb) === 'needs-improvement' ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }`}>
              {getMetricStatus('ttfb', metrics.ttfb)}
            </span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {formatMetric(metrics.ttfb)}
          </div>
          <div className="text-xs text-gray-500">Time to First Byte</div>
        </div>
      </div>

      {/* Recommendations */}
      {metrics.recommendations.length > 0 && (
        <div className="mb-6">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center justify-between w-full p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <span className="font-medium text-blue-900">
              Performance Recommendations ({metrics.recommendations.length})
            </span>
            <svg
              className={`w-5 h-5 text-blue-600 transition-transform ${showDetails ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showDetails && (
            <div className="mt-4 space-y-3">
              {metrics.recommendations.map((recommendation, index) => (
                <div key={index} className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-start">
                    <span className="text-yellow-600 mr-3">💡</span>
                    <p className="text-sm text-yellow-800">{recommendation}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <div className="text-xs text-gray-500">
          Last updated: {new Date().toLocaleTimeString()}
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => {
              const data = coreWebVitalsService.exportMetrics();
              const blob = new Blob([data], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `core-web-vitals-${Date.now()}.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
          >
            Export Data
          </button>
          <button
            onClick={() => {
              coreWebVitalsService.clearOldMetrics();
              window.location.reload();
            }}
            className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
};

export default PerformanceDashboard;
