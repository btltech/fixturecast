import React, { useState } from 'react';
import { Prediction, AccuracyStats } from '../types';
import { calculatePredictionConfidence, getConfidenceColor, getConfidenceBgColor, formatConfidenceDisplay } from '../services/confidenceService';

interface ConfidenceIndicatorProps {
  prediction: Prediction;
  accuracyStats: AccuracyStats;
  matchContext?: {
    league: string;
    isRivalry?: boolean;
    isPrimeTime?: boolean;
    hasRecentForm?: boolean;
    hasHeadToHead?: boolean;
  };
  size?: 'small' | 'medium' | 'large';
  showPercentage?: boolean;
  showTooltip?: boolean;
  className?: string;
}

const ConfidenceIndicator: React.FC<ConfidenceIndicatorProps> = ({
  prediction,
  accuracyStats,
  matchContext,
  size = 'medium',
  showPercentage = true,
  showTooltip = true,
  className = ''
}) => {
  const [showTooltipState, setShowTooltipState] = useState(false);
  
  const confidenceAnalysis = calculatePredictionConfidence(prediction, accuracyStats, matchContext);
  const { percentage, level, color, reason } = confidenceAnalysis;
  
  const sizeClasses = {
    small: 'text-xs px-2 py-1',
    medium: 'text-sm px-3 py-1.5',
    large: 'text-base px-4 py-2'
  };
  
  const iconSizeClasses = {
    small: 'w-2 h-2',
    medium: 'w-3 h-3',
    large: 'w-4 h-4'
  };
  
  const getConfidenceIcon = () => {
    if (percentage >= 75) return '🟢';
    if (percentage >= 60) return '🟡';
    return '🔴';
  };
  
  const getConfidenceLabel = () => {
    if (percentage >= 75) return 'High';
    if (percentage >= 60) return 'Medium';
    return 'Low';
  };
  
  return (
    <div className={`relative inline-block ${className}`}>
      <div
        className={`
          inline-flex items-center space-x-1 rounded-full border-2 transition-all duration-200
          ${sizeClasses[size]}
          ${getConfidenceBgColor(percentage)}/20
          ${getConfidenceColor(percentage)}
          border-current
          ${showTooltip ? 'cursor-help hover:scale-105' : ''}
        `}
        onMouseEnter={() => showTooltip && setShowTooltipState(true)}
        onMouseLeave={() => showTooltip && setShowTooltipState(false)}
      >
        <span className={iconSizeClasses[size]}>{getConfidenceIcon()}</span>
        <span className="font-semibold">{getConfidenceLabel()}</span>
        {showPercentage && (
          <span className="font-bold">{percentage}%</span>
        )}
      </div>
      
      {/* Tooltip */}
      {showTooltip && showTooltipState && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-50">
          <div className="bg-gray-900 text-white text-sm rounded-lg p-3 shadow-xl border border-gray-700 max-w-xs">
            <div className="font-semibold mb-1">
              {formatConfidenceDisplay(percentage)}
            </div>
            <div className="text-gray-300 text-xs leading-relaxed">
              {reason}
            </div>
            <div className="mt-2 pt-2 border-t border-gray-700 text-xs text-gray-400">
              Confidence based on historical prediction accuracy
            </div>
            {/* Tooltip arrow */}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2">
              <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConfidenceIndicator;
