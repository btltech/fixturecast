import React from 'react';
import { Match } from '../types';
import MatchStatusIndicator, { MatchStatus } from './MatchStatusIndicator';

interface EnhancedMatchStatusIndicatorProps {
  match: Match;
  size?: 'small' | 'medium' | 'large';
  showIcon?: boolean;
  showText?: boolean;
  showTime?: boolean;
  showScore?: boolean;
  className?: string;
}

const EnhancedMatchStatusIndicator: React.FC<EnhancedMatchStatusIndicatorProps> = ({
  match,
  size = 'medium',
  showIcon = true,
  showText = true,
  showTime = true,
  showScore = true,
  className = ''
}) => {
  // Get match time information
  const getMatchTimeInfo = () => {
    const now = new Date();
    const matchDate = new Date(match.date);
    const diffInHours = (matchDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    const diffInMinutes = (matchDate.getTime() - now.getTime()) / (1000 * 60);

    const time = matchDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    const date = matchDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });

    let timeStatus = '';
    if (diffInHours < -2) {
      timeStatus = 'Finished';
    } else if (diffInHours < 0) {
      timeStatus = 'Live';
    } else if (diffInHours < 2) {
      timeStatus = 'Starting Soon';
    } else {
      timeStatus = 'Upcoming';
    }

    return { time, date, timeStatus, diffInHours, diffInMinutes };
  };

  // Get match score if available
  const getMatchScore = () => {
    if (match.homeScore !== undefined && match.awayScore !== undefined) {
      return `${match.homeScore}-${match.awayScore}`;
    }
    return null;
  };

  const timeInfo = getMatchTimeInfo();
  const score = getMatchScore();

  // Size variants
  const sizeClasses = {
    small: {
      container: 'px-2 py-1 text-xs',
      icon: 'text-xs',
      text: 'text-xs font-medium',
      time: 'text-xs',
      score: 'text-xs font-bold'
    },
    medium: {
      container: 'px-3 py-1.5 text-sm',
      icon: 'text-sm',
      text: 'text-sm font-semibold',
      time: 'text-sm',
      score: 'text-sm font-bold'
    },
    large: {
      container: 'px-4 py-2 text-base',
      icon: 'text-base',
      text: 'text-base font-bold',
      time: 'text-base',
      score: 'text-base font-bold'
    }
  };

  const currentSize = sizeClasses[size];

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {/* Main Status Indicator */}
      <MatchStatusIndicator
        match={match}
        size={size}
        showIcon={showIcon}
        showText={showText}
      />

      {/* Time Information */}
      {showTime && (
        <div className={`${currentSize.time} text-gray-600 dark:text-gray-400`}>
          {timeInfo.time}
        </div>
      )}

      {/* Score Information */}
      {showScore && score && (
        <div className={`${currentSize.score} text-gray-900 dark:text-white`}>
          {score}
        </div>
      )}

      {/* Live Match Indicator */}
      {timeInfo.diffInHours >= -2 && timeInfo.diffInHours <= 0 && (
        <div className="flex items-center space-x-1">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
          <span className={`${currentSize.text} text-red-600 dark:text-red-400`}>
            LIVE
          </span>
        </div>
      )}

      {/* Starting Soon Indicator */}
      {timeInfo.diffInHours > 0 && timeInfo.diffInHours <= 2 && (
        <div className="flex items-center space-x-1">
          <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
          <span className={`${currentSize.text} text-orange-600 dark:text-orange-400`}>
            SOON
          </span>
        </div>
      )}
    </div>
  );
};

export default EnhancedMatchStatusIndicator;
