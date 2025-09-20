import React from 'react';
import { Prediction, AccuracyStats } from '../types';
import ConfidenceIndicator from './ConfidenceIndicator';
import { getConfidenceColor, getConfidenceBgColor } from '../services/confidenceService';

interface ConfidenceOverviewProps {
  predictions: Prediction[];
  accuracyStats: AccuracyStats;
  className?: string;
}

const ConfidenceOverview: React.FC<ConfidenceOverviewProps> = ({
  predictions,
  accuracyStats,
  className = ''
}) => {
  if (predictions.length === 0) {
    return (
      <div className={`bg-gray-800 rounded-lg p-4 ${className}`}>
        <h3 className="text-lg font-semibold text-blue-400 mb-3">📊 Prediction Confidence Analysis</h3>
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-blue-600/20 rounded-full flex items-center justify-center">
              <span className="text-blue-400 text-lg">🎯</span>
            </div>
          </div>
          <div>
            <p className="text-gray-300 font-medium">Ready to track confidence levels</p>
            <p className="text-gray-500 text-sm">Confidence metrics will appear after first predictions</p>
          </div>
        </div>
      </div>
    );
  }

  // Calculate confidence distribution
  const confidenceDistribution = predictions.reduce((acc, prediction) => {
    if (prediction.confidencePercentage) {
      if (prediction.confidencePercentage >= 75) acc.high++;
      else if (prediction.confidencePercentage >= 60) acc.medium++;
      else acc.low++;
    }
    return acc;
  }, { high: 0, medium: 0, low: 0 });

  const totalPredictions = predictions.length;
  const highPercentage = Math.round((confidenceDistribution.high / totalPredictions) * 100);
  const mediumPercentage = Math.round((confidenceDistribution.medium / totalPredictions) * 100);
  const lowPercentage = Math.round((confidenceDistribution.low / totalPredictions) * 100);

  // Get average confidence
  const averageConfidence = Math.round(
    predictions.reduce((sum, p) => sum + (p.confidencePercentage || 0), 0) / totalPredictions
  );

  return (
    <div className={`bg-gray-800 rounded-lg p-4 ${className}`}>
      <h3 className="text-lg font-semibold text-blue-400 mb-4">🔮 Prediction Confidence Analysis</h3>
      
      {/* Average Confidence */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-300">Average Confidence</span>
          <span className={`font-bold ${getConfidenceColor(averageConfidence)}`}>
            {averageConfidence}%
          </span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div 
            className={`h-2 rounded-full ${getConfidenceBgColor(averageConfidence)}`}
            style={{ width: `${Math.min(averageConfidence, 100)}%` }} // eslint-disable-line react/forbid-dom-props
          ></div>
        </div>
      </div>

      {/* Confidence Distribution */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-gray-300">Confidence Distribution</h4>
        
        <div className="space-y-2">
          {/* High Confidence */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-300">High (75%+)</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-green-400 font-semibold">
                {confidenceDistribution.high}
              </span>
              <span className="text-xs text-gray-500">({highPercentage}%)</span>
            </div>
          </div>
          
          {/* Medium Confidence */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <span className="text-sm text-gray-300">Medium (60-74%)</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-yellow-400 font-semibold">
                {confidenceDistribution.medium}
              </span>
              <span className="text-xs text-gray-500">({mediumPercentage}%)</span>
            </div>
          </div>
          
          {/* Low Confidence */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span className="text-sm text-gray-300">Low (&lt;60%)</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-red-400 font-semibold">
                {confidenceDistribution.low}
              </span>
              <span className="text-xs text-gray-500">({lowPercentage}%)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Historical Accuracy Context */}
      <div className="mt-4 pt-3 border-t border-gray-700">
        <div className="text-xs text-blue-300 font-semibold">
          ✅ Track Record: {accuracyStats.totalPredictions} verified predictions with {accuracyStats.overallAccuracy}% accuracy
        </div>
        {accuracyStats.recentAccuracy.last10 > 0 && (
          <div className="text-xs text-green-300 mt-1">
            📈 Recent performance: {accuracyStats.recentAccuracy.last10}% success rate (last 10 predictions)
          </div>
        )}
        <div className="text-xs text-gray-400 mt-1">
          💎 All predictions are independently verified for complete transparency
        </div>
      </div>
    </div>
  );
};

export default ConfidenceOverview;
