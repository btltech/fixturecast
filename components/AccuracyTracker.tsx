import React from 'react';
import { AccuracyStats } from '../types';
import PlaceholderChart from './PlaceholderChart';

interface AccuracyTrackerProps {
  stats: AccuracyStats;
  className?: string;
}

const AccuracyTracker: React.FC<AccuracyTrackerProps> = ({ stats, className = '' }) => {
  if (stats.totalPredictions === 0) {
    return (
      <PlaceholderChart 
        title="🎯 Prediction Accuracy Track Record"
        description="Building track record with each prediction... Every prediction is tracked and verified against actual results to ensure transparency"
        type="accuracy"
        className={className}
      />
    );
  }

  const getAccuracyColor = (percentage: number) => {
    if (percentage >= 70) return 'text-green-400';
    if (percentage >= 50) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getAccuracyBarColor = (percentage: number) => {
    if (percentage >= 70) return 'bg-green-500';
    if (percentage >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className={`bg-gray-800 rounded-lg p-4 ${className}`}>
      <h3 className="text-lg font-semibold text-blue-400 mb-4">🎯 Prediction Accuracy Track Record</h3>
      
      {/* Overall Stats */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-center">
          <div className={`text-2xl font-bold ${getAccuracyColor(stats.overallAccuracy)}`}>
            {stats.overallAccuracy}%
          </div>
          <div className="text-sm text-gray-400">Overall</div>
          <div className="text-xs text-gray-500">
            {stats.correctOutcomes}/{stats.totalPredictions} correct
          </div>
        </div>
        
        <div className="text-center">
          <div className={`text-2xl font-bold ${getAccuracyColor(stats.recentAccuracy.last10)}`}>
            {stats.recentAccuracy.last10}%
          </div>
          <div className="text-sm text-gray-400">Last 10</div>
          <div className="text-xs text-gray-500">Recent form</div>
        </div>
      </div>

      {/* Accuracy Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-sm text-gray-400 mb-1">
          <span>Overall Accuracy</span>
          <span>{stats.overallAccuracy}%</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div 
            className={`h-2 rounded-full ${getAccuracyBarColor(stats.overallAccuracy)}`}
            style={{ width: `${Math.min(stats.overallAccuracy, 100)}%` }} // eslint-disable-line react/forbid-dom-props
          ></div>
        </div>
      </div>

      {/* Detailed Breakdown */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-gray-300 mb-2">Prediction Types</h4>
        
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-400">Outcomes:</span>
            <span className={getAccuracyColor(getAccuracyPercentage(stats.correctOutcomes, stats.totalPredictions))}>
              {getAccuracyPercentage(stats.correctOutcomes, stats.totalPredictions)}%
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-gray-400">Scorelines:</span>
            <span className={getAccuracyColor(getAccuracyPercentage(stats.correctScorelines, stats.totalPredictions))}>
              {getAccuracyPercentage(stats.correctScorelines, stats.totalPredictions)}%
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-gray-400">BTTS:</span>
            <span className={getAccuracyColor(getAccuracyPercentage(stats.correctBtts, stats.totalPredictions))}>
              {getAccuracyPercentage(stats.correctBtts, stats.totalPredictions)}%
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-gray-400">Goal Line:</span>
            <span className={getAccuracyColor(getAccuracyPercentage(stats.correctGoalLine, stats.totalPredictions))}>
              {getAccuracyPercentage(stats.correctGoalLine, stats.totalPredictions)}%
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-gray-400">Score Range:</span>
            <span className={getAccuracyColor(getAccuracyPercentage(stats.correctScoreRange, stats.totalPredictions))}>
              {getAccuracyPercentage(stats.correctScoreRange, stats.totalPredictions)}%
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-gray-400">Clean Sheets:</span>
            <span className={getAccuracyColor(getAccuracyPercentage(stats.correctCleanSheet, stats.totalPredictions))}>
              {getAccuracyPercentage(stats.correctCleanSheet, stats.totalPredictions)}%
            </span>
          </div>
        </div>
      </div>

      {/* Recent Performance */}
      <div className="mt-4 pt-3 border-t border-gray-700">
        <h4 className="text-sm font-semibold text-gray-300 mb-2">Recent Performance</h4>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="text-center">
            <div className={`font-bold ${getAccuracyColor(stats.recentAccuracy.last10)}`}>
              {stats.recentAccuracy.last10}%
            </div>
            <div className="text-gray-500">Last 10</div>
          </div>
          <div className="text-center">
            <div className={`font-bold ${getAccuracyColor(stats.recentAccuracy.last20)}`}>
              {stats.recentAccuracy.last20}%
            </div>
            <div className="text-gray-500">Last 20</div>
          </div>
          <div className="text-center">
            <div className={`font-bold ${getAccuracyColor(stats.recentAccuracy.last50)}`}>
              {stats.recentAccuracy.last50}%
            </div>
            <div className="text-gray-500">Last 50</div>
          </div>
        </div>
      </div>
    </div>
  );
};

const getAccuracyPercentage = (correct: number, total: number): number => {
  return total > 0 ? Math.round((correct / total) * 100) : 0;
};

export default AccuracyTracker;
