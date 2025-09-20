import React from 'react';
import { Match } from '../types';
import { formatTime, formatDate } from '../utils/dateUtils';
import TeamLogo from './TeamLogo';
import LeagueLogo from './LeagueLogo';
import MatchStatusIndicator from './MatchStatusIndicator';

interface MobileOptimizedFixtureCardProps {
  match: Match;
  prediction?: any;
  onSelectMatch: (match: Match) => void;
  onSelectTeam: (teamName: string) => void;
  compact?: boolean;
}

const MobileOptimizedFixtureCard: React.FC<MobileOptimizedFixtureCardProps> = ({
  match,
  prediction,
  onSelectMatch,
  onSelectTeam,
  compact = false
}) => {
  const matchDate = new Date(match.date);
  const isLive = match.status === 'LIVE' || match.status === 'HT';
  
  return (
    <div 
      className={`
        bg-gray-800/50 rounded-xl border border-gray-700/50 p-3 mb-3 
        active:bg-gray-700/50 transition-all duration-150 touch-manipulation
        ${isLive ? 'ring-2 ring-red-500/50 animate-pulse' : ''}
      `}
      onClick={() => onSelectMatch(match)}
    >
      {/* Header with league and time */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <LeagueLogo league={match.league} size="small" />
          <span className="text-xs text-gray-400 font-medium">
            {match.league}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          {isLive && (
            <span className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-full animate-pulse">
              LIVE
            </span>
          )}
          <span className="text-xs text-gray-400">
            {formatTime(matchDate)}
          </span>
        </div>
      </div>

      {/* Teams */}
      <div className="flex items-center justify-between">
        {/* Home Team */}
        <div 
          className="flex items-center space-x-3 flex-1 touch-target-medium"
          onClick={(e) => {
            e.stopPropagation();
            onSelectTeam(match.homeTeam);
          }}
        >
          <TeamLogo teamName={match.homeTeam} size="medium" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">
              {match.homeTeam}
            </p>
            {match.homeScore !== undefined && (
              <p className="text-lg font-bold text-blue-400">
                {match.homeScore}
              </p>
            )}
          </div>
        </div>

        {/* VS / Score */}
        <div className="flex items-center justify-center px-4">
          {match.status === 'NS' ? (
            <span className="text-xs text-gray-500 font-medium">VS</span>
          ) : (
            <div className="text-center">
              <MatchStatusIndicator 
                status={match.status || 'NS'} 
                variant="mobile"
              />
              {match.date && (
                <p className="text-xs text-gray-500 mt-1">
                  {formatDate(matchDate)}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Away Team */}
        <div 
          className="flex items-center space-x-3 flex-1 justify-end touch-target-medium"
          onClick={(e) => {
            e.stopPropagation();
            onSelectTeam(match.awayTeam);
          }}
        >
          <div className="flex-1 min-w-0 text-right">
            <p className="text-sm font-semibold text-white truncate">
              {match.awayTeam}
            </p>
            {match.awayScore !== undefined && (
              <p className="text-lg font-bold text-blue-400">
                {match.awayScore}
              </p>
            )}
          </div>
          <TeamLogo teamName={match.awayTeam} size="medium" />
        </div>
      </div>

      {/* Prediction Preview */}
      {prediction && (
        <div className="mt-3 pt-3 border-t border-gray-700/50">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">Prediction</span>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-green-400 font-medium">
                {prediction.predictedResult || 'Available'}
              </span>
              <span className="text-xs text-gray-500">
                {prediction.confidence || '85%'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileOptimizedFixtureCard;
