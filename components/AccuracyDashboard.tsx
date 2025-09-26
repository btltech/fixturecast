/**
 * Accuracy Dashboard Component
 * Displays prediction accuracy metrics and validation results
 */

import React, { useEffect, useState } from 'react';
import LoadingSpinner from './LoadingSpinner';
import { fetchDailyAccuracy, fetchAccuracyTrend } from '../services/accuracyService';

interface AccuracyDashboardProps {
  className?: string;
}

export const AccuracyDashboard: React.FC<AccuracyDashboardProps> = ({ className = '' }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [daily, setDaily] = useState<any | null>(null);
  const [trend, setTrend] = useState<any[]>([]);

  const safeAccuracyStats = daily ? {
    totalPredictions: daily.processed || 0,
    correctOutcomes: daily.correctOutcome || 0,
    correctScorelines: daily.correctScore || 0,
    correctBtts: daily.correctBtts || 0,
    overallAccuracy: daily.overallAccuracyPct || 0
  } : { totalPredictions:0, correctOutcomes:0, correctScorelines:0, correctBtts:0, overallAccuracy:0 };

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setIsLoading(true);
        const d = await fetchDailyAccuracy();
        const tr = await fetchAccuracyTrend(7);
        if (!cancelled) {
          setDaily(d);
          setTrend(tr);
        }
      } catch (e) {
        if (!cancelled) setError('Failed to load accuracy data');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    load();
    const interval = setInterval(load, 15 * 60 * 1000); // refresh every 15 minutes
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  // Format time
  const formatTime = (timestamp: number) => {
    if (timestamp === 0) return 'Never';
    return new Date(timestamp).toLocaleTimeString();
  };

  // Format percentage
  const formatPercentage = (value: number) => {
    const numValue = Number(value) || 0;
    return `${numValue.toFixed(1)}%`;
  };

  // Get accuracy color
  const getAccuracyColor = (accuracy: number) => {
    const numAccuracy = Number(accuracy) || 0;
    if (numAccuracy >= 80) return 'text-green-400';
    if (numAccuracy >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  // Get accuracy badge color
  const getAccuracyBadgeColor = (accuracy: number) => {
    const numAccuracy = Number(accuracy) || 0;
    if (numAccuracy >= 80) return 'bg-green-500/20 text-green-400 border-green-500/30';
    if (numAccuracy >= 60) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    return 'bg-red-500/20 text-red-400 border-red-500/30';
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className={`bg-gray-900 rounded-lg p-6 ${className}`}>
        <div className="flex flex-col items-center justify-center py-12">
          <LoadingSpinner />
          <p className="mt-4 text-gray-300">Checking results...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className={`bg-gray-900 rounded-lg p-6 ${className}`}>
        <div className="flex flex-col items-center justify-center py-12">
          <div className="text-red-400 text-6xl mb-4">⚠️</div>
          <h3 className="text-xl font-semibold text-white mb-2">Error Loading Data</h3>
          <p className="text-gray-300 mb-6 text-center max-w-md">{error}</p>
          <button
            onClick={() => setError(null)}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gray-900 rounded-lg p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Prediction Accuracy</h2>
          <p className="text-gray-400 mt-1">Track and analyze prediction performance</p>
        </div>
        
        <div className="text-sm text-gray-400">Data auto-refreshes every 15 min</div>
      </div>

      {/* Status Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Data Date (UTC)</p>
              <p className="text-lg font-semibold text-white">{daily?.date || '—'}</p>
            </div>
            <div className="w-3 h-3 rounded-full bg-gray-400" />
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Overall Accuracy</p>
              <p className="text-lg font-semibold text-white">{safeAccuracyStats.overallAccuracy.toFixed(1)}%</p>
            </div>
            <div className="w-3 h-3 rounded-full bg-green-400" />
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Total Predictions</p>
              <p className="text-lg font-semibold text-white">{safeAccuracyStats.totalPredictions}</p>
            </div>
            <div className="w-3 h-3 rounded-full bg-purple-400" />
          </div>
        </div>
      </div>


      {/* Current Accuracy Stats */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-4">
          Current Accuracy Statistics
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-800 rounded-lg p-4">
            <p className="text-sm text-gray-400">Total Predictions</p>
            <p className="text-2xl font-bold text-white">{safeAccuracyStats.totalPredictions}</p>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-4">
            <p className="text-sm text-gray-400">Correct Outcomes</p>
            <p className="text-2xl font-bold text-white">{safeAccuracyStats.correctOutcomes}</p>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-4">
            <p className="text-sm text-gray-400">Overall Accuracy</p>
            <p className={`text-2xl font-bold ${getAccuracyColor(safeAccuracyStats.overallAccuracy)}`}>
              {formatPercentage(safeAccuracyStats.overallAccuracy)}
            </p>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-4">
              <p className="text-sm text-gray-400">BTTS Correct</p>
              <p className="text-2xl font-bold text-white">{safeAccuracyStats.correctBtts}</p>
          </div>
        </div>

        {/* League Breakdown */}
        {daily?.leagueBreakdown && daily.leagueBreakdown.length > 0 && (
          <div className="mb-6">
            <h4 className="text-lg font-semibold text-white mb-4">Top Leagues (by overall accuracy)</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-gray-400 text-left">
                    <th className="py-2 pr-4">League</th>
                    <th className="py-2 pr-4">Matches</th>
                    <th className="py-2 pr-4">Outcome %</th>
                    <th className="py-2 pr-4">Score %</th>
                    <th className="py-2 pr-4">BTTS %</th>
                    <th className="py-2 pr-4">Overall %</th>
                  </tr>
                </thead>
                <tbody>
                  {daily.leagueBreakdown.slice(0,10).map((l:any) => (
                    <tr key={l.leagueId} className="border-t border-gray-700">
                      <td className="py-2 pr-4 text-white whitespace-nowrap">{l.league}</td>
                      <td className="py-2 pr-4">{l.processed}</td>
                      <td className="py-2 pr-4">{l.outcomeAccuracyPct.toFixed(0)}%</td>
                      <td className="py-2 pr-4">{l.exactScoreAccuracyPct.toFixed(0)}%</td>
                      <td className="py-2 pr-4">{l.bttsAccuracyPct.toFixed(0)}%</td>
                      <td className="py-2 pr-4 font-semibold">{l.overallAccuracyPct.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Removed legacy recent performance section (worker does not supply last10/20/50 yet) */}
      </div>

      {/* Trend */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold text-white mb-4">7-Day Trend</h3>
        <div className="bg-gray-800 rounded-lg p-4 overflow-x-auto">
          {trend.length === 0 && <p className="text-gray-400 text-sm">No trend data yet.</p>}
          {trend.length > 0 && (
            <div className="flex space-x-6">
              {trend.map(p => (
                <div key={p.date} className="text-center">
                  <div className="text-xs text-gray-400 mb-1">{p.date}</div>
                  <div className="text-sm font-semibold text-white">{p.overallAccuracyPct === null ? '—' : p.overallAccuracyPct.toFixed(1)+'%'}</div>
                  <div className="text-[10px] text-gray-500">{p.processed} matches</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AccuracyDashboard;
