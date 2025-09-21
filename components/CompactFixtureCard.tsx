import React from 'react';
import { LONDON_TIMEZONE } from '../utils/timezone';
import { Match, League } from '../types';
import { colorSystemService } from '../services/colorSystemService';
import { getHomeTeamName, getAwayTeamName, getMatchLeagueName } from '../utils/matchUtils';
import LeagueLogo from './LeagueLogo';
import TeamLogo from './TeamLogo';
import ProbabilityBar from './ProbabilityBar';
import { onDemandPredictionService } from '../services/onDemandPredictionService';

interface CompactFixtureCardProps {
  match: Match;
  prediction?: any;
  onSelectMatch: (match: Match) => void;
  onSelectTeam: (teamName: string) => void;
  onSelectPrediction?: (prediction: any) => void;
  className?: string;
}

const CompactFixtureCard: React.FC<CompactFixtureCardProps> = ({
  match,
  prediction,
  onSelectMatch,
  onSelectTeam,
  onSelectPrediction,
  className = ''
}) => {
  const homeColors = colorSystemService.getTeamColors(getHomeTeamName(match));
  const awayColors = colorSystemService.getTeamColors(getAwayTeamName(match));
  const leagueColors = colorSystemService.getLeagueColors(getMatchLeagueName(match));

  // Format match time
  const formatMatchTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (date.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 0) {
      return 'FT';
    } else if (diffInHours < 2) {
      return 'LIVE';
    } else if (diffInHours < 24) {
      return date.toLocaleTimeString('en-GB', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false,
        timeZone: LONDON_TIMEZONE
      });
    } else {
      return date.toLocaleDateString('en-GB', {
        month: 'short',
        day: 'numeric'
      });
    }
  };

  // Get match status
  const getMatchStatus = (): { status: string; color: string; bgColor: string } => {
    const now = new Date();
    const matchDate = new Date(match.date);
    const diffInHours = (matchDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (diffInHours < -2) {
      return { status: 'FT', color: '#6B7280', bgColor: '#F3F4F6' };
    } else if (diffInHours < 0) {
      return { status: 'LIVE', color: '#DC2626', bgColor: '#FEE2E2' };
    } else if (diffInHours < 2) {
      return { status: 'SOON', color: '#D97706', bgColor: '#FEF3C7' };
    } else {
      return { status: 'UP', color: '#059669', bgColor: '#D1FAE5' };
    }
  };

  const matchStatus = getMatchStatus();

  // Handle prediction navigation with on-demand generation
  const handlePredictionClick = async () => {
    if (prediction && onSelectPrediction) {
      // Use existing prediction
      onSelectPrediction(prediction);
    } else if (onSelectPrediction) {
      // Generate prediction on-demand
      try {
        const generatedPrediction = await onDemandPredictionService.generateMatchPrediction(match);
        onSelectPrediction(generatedPrediction);
      } catch (error) {
        console.error('Failed to generate prediction:', error);
        // Fallback to match detail if prediction generation fails
        onSelectMatch(match);
      }
    } else {
      // If no prediction handler, navigate to match detail
      onSelectMatch(match);
    }
  };

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer ${className}`}
      onClick={handlePredictionClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handlePredictionClick();
        }
      }}
      aria-label={`View prediction for ${match.homeTeam} vs ${match.awayTeam}`}
    >
      {/* Header with League and Status */}
      <div className="flex items-center justify-between p-3 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center space-x-2">
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center"
            style={{
              backgroundColor: leagueColors.primary,
              color: leagueColors.text
            }}
          >
            <LeagueLogo league={match.league as League} size="small" />
          </div>
          <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
            {getMatchLeagueName(match)}
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          <span
            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
            style={{
              backgroundColor: matchStatus.bgColor,
              color: matchStatus.color
            }}
          >
            {matchStatus.status}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {formatMatchTime(match.date)}
          </span>
        </div>
      </div>

      {/* Teams */}
      <div className="p-4">
        <div className="flex items-center justify-between">
          {/* Home Team */}
          <div className="flex items-center space-x-3 flex-1">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center shadow-sm"
              style={{
                backgroundColor: homeColors.primary,
                color: homeColors.text
              }}
            >
              <TeamLogo teamName={getHomeTeamName(match)} size="small" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-gray-900 dark:text-white text-sm truncate">
                {getHomeTeamName(match)}
              </h4>
            </div>
          </div>

          {/* VS */}
          <div className="flex items-center justify-center mx-4">
            <span className="text-lg font-bold text-gray-400 dark:text-gray-500">
              VS
            </span>
          </div>

          {/* Away Team */}
          <div className="flex items-center space-x-3 flex-1 justify-end">
            <div className="flex-1 text-right min-w-0">
              <h4 className="font-semibold text-gray-900 dark:text-white text-sm truncate">
                {getAwayTeamName(match)}
              </h4>
            </div>
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center shadow-sm"
              style={{
                backgroundColor: awayColors.primary,
                color: awayColors.text
              }}
            >
              <TeamLogo teamName={getAwayTeamName(match)} size="small" />
            </div>
          </div>
        </div>

        {/* Prediction */}
        {prediction && (
          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                AI Prediction
              </span>
              <span className={`text-xs px-2 py-1 rounded-full ${
                prediction.confidence === 'High' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                prediction.confidence === 'Medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
              }`}>
                {prediction.confidence}
              </span>
            </div>
            
            <p className="text-xs text-gray-700 dark:text-gray-300 mb-2 line-clamp-2">
              {prediction.prediction}
            </p>
            
                <ProbabilityBar 
                  home={prediction.homeWinProbability * 100}
                  draw={prediction.drawProbability * 100}
                  away={prediction.awayWinProbability * 100}
                />
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between p-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSelectTeam(getHomeTeamName(match));
          }}
          className="flex-1 text-xs font-medium text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        >
          View {getHomeTeamName(match)}
        </button>

        <div className="w-px h-4 bg-gray-300 dark:bg-gray-600"></div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onSelectTeam(getAwayTeamName(match));
          }}
          className="flex-1 text-xs font-medium text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        >
          View {getAwayTeamName(match)}
        </button>
      </div>
    </div>
  );
};

export default CompactFixtureCard;
