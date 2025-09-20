import React from 'react';
import { LiveMatch, MatchEvent } from '../types';
import TeamLogo from './TeamLogo';
import { getMatchStatusText, getMatchStatusColor, formatMatchTime, getRecentEvents } from '../services/liveMatchService';

interface EnhancedLiveMatchProps {
  match: LiveMatch;
  onSelectMatch?: (match: LiveMatch) => void;
  showEvents?: boolean;
  compact?: boolean;
  viewMode?: 'standard' | 'compact';
}

const EnhancedLiveMatch: React.FC<EnhancedLiveMatchProps> = ({ 
  match, 
  onSelectMatch, 
  showEvents = true, 
  compact = false,
  viewMode = 'standard'
}) => {
  const { homeTeam, awayTeam, homeScore, awayScore, status, minute, period, events } = match;
  const isLive = status === 'LIVE';
  const isHalfTime = status === 'HT';
  const isFinished = status === 'FT';
  const isUpcoming = !isLive && !isHalfTime && !isFinished;
  const recentEvents = getRecentEvents(match, 3);

  // Get border color based on status
  const getBorderColor = () => {
    if (isLive) return 'border-green-500 shadow-green-500/20';
    if (isFinished) return 'border-gray-500';
    if (isUpcoming) return 'border-yellow-500 shadow-yellow-500/20';
    return 'border-gray-600';
  };

  // Get status badge styling
  const getStatusBadge = () => {
    if (isLive) {
      return (
        <div className="absolute top-3 right-3 flex items-center space-x-2 bg-green-600 text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
          <span>LIVE</span>
        </div>
      );
    }
    if (isHalfTime) {
      return (
        <div className="absolute top-3 right-3 bg-yellow-600 text-white px-3 py-1 rounded-full text-sm font-bold">
          HT
        </div>
      );
    }
    if (isFinished) {
      return (
        <div className="absolute top-3 right-3 bg-gray-600 text-white px-3 py-1 rounded-full text-sm font-bold">
          FT
        </div>
      );
    }
    return null;
  };

  const getEventIcon = (event: MatchEvent) => {
    switch (event.type) {
      case 'goal':
        return '⚽';
      case 'card':
        return event.detail?.includes('red') ? '🟥' : '🟨';
      case 'substitution':
        return '🔄';
      case 'var':
        return '📺';
      default:
        return '•';
    }
  };

  const getEventColor = (event: MatchEvent) => {
    switch (event.type) {
      case 'goal':
        return 'text-green-400';
      case 'card':
        return event.detail?.includes('red') ? 'text-red-400' : 'text-yellow-400';
      case 'substitution':
        return 'text-blue-400';
      case 'var':
        return 'text-purple-400';
      default:
        return 'text-gray-400';
    }
  };

  // Compact list view
  if (viewMode === 'compact') {
    return (
      <div 
        className={`relative bg-gray-800 rounded-lg p-3 border-l-4 transition-all duration-200 ${getBorderColor()} ${
          onSelectMatch ? 'cursor-pointer hover:bg-gray-750 hover:shadow-md' : ''
        }`}
        onClick={() => onSelectMatch?.(match)}
      >
        <div className="flex items-center justify-between">
          {/* Teams */}
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <div className="flex flex-col space-y-1">
              <div className="flex items-center space-x-2">
                <TeamLogo teamName={homeTeam} size="small" showJerseyColors={true} />
                <span className="text-sm font-medium text-white truncate">{homeTeam}</span>
              </div>
              <div className="flex items-center space-x-2">
                <TeamLogo teamName={awayTeam} size="small" showJerseyColors={true} />
                <span className="text-sm font-medium text-white truncate">{awayTeam}</span>
              </div>
            </div>
          </div>
          
          {/* Score and Time */}
          <div className="text-center mx-4">
            <div className="text-lg font-bold text-white">
              {homeScore} - {awayScore}
            </div>
            <div className={`text-xs ${getMatchStatusColor(status)}`}>
              {formatMatchTime(match)}
            </div>
            {isLive && minute && (
              <div className="text-xs text-green-400 font-semibold">
                {minute}'
              </div>
            )}
          </div>

          {/* Status Badge (smaller for compact) */}
          <div className="flex items-center">
            {isLive && (
              <div className="flex items-center space-x-1 bg-green-600 text-white px-2 py-1 rounded text-xs font-bold">
                <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                <span>LIVE</span>
              </div>
            )}
            {isHalfTime && (
              <div className="bg-yellow-600 text-white px-2 py-1 rounded text-xs font-bold">HT</div>
            )}
            {isFinished && (
              <div className="bg-gray-600 text-white px-2 py-1 rounded text-xs font-bold">FT</div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Standard card view
  return (
    <div 
      className={`relative bg-gray-800 rounded-xl p-3 sm:p-4 lg:p-6 shadow-lg border-2 transition-all duration-300 ${getBorderColor()} ${
        onSelectMatch ? 'cursor-pointer hover:bg-gray-750 hover:shadow-xl hover:scale-[1.02]' : ''
      }`}
      onClick={() => onSelectMatch?.(match)}
    >
      {/* Status Badge */}
      {getStatusBadge()}

      {/* Teams and Score */}
      <div className="flex flex-col sm:flex-row items-center justify-between mb-4 pt-2 space-y-4 sm:space-y-0">
        {/* Home Team */}
        <div className="flex items-center space-x-2 sm:space-x-4 flex-1 w-full sm:w-auto">
          <TeamLogo teamName={homeTeam} size="medium" showJerseyColors={true} />
          <div className="min-w-0 flex-1">
            <div className="text-sm sm:text-lg lg:text-xl font-bold text-white truncate">{homeTeam}</div>
            {isLive && (
              <div className="text-xs sm:text-sm text-green-400 font-semibold">
                {minute ? `${minute}' ${period || ''}` : 'LIVE'}
              </div>
            )}
          </div>
        </div>
        
        {/* Score */}
        <div className="text-center mx-2 sm:mx-4 lg:mx-6 flex-shrink-0">
          <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-1">
            {homeScore} - {awayScore}
          </div>
          {!isLive && !isHalfTime && (
            <div className={`text-xs sm:text-sm ${getMatchStatusColor(status)}`}>
              {formatMatchTime(match)}
            </div>
          )}
        </div>
        
        {/* Away Team */}
        <div className="flex items-center space-x-2 sm:space-x-4 flex-1 justify-end w-full sm:w-auto">
          <div className="text-right min-w-0 flex-1">
            <div className="text-sm sm:text-lg lg:text-xl font-bold text-white truncate">{awayTeam}</div>
            {isLive && (
              <div className="text-xs sm:text-sm text-green-400 font-semibold">
                {status}
              </div>
            )}
          </div>
          <TeamLogo teamName={awayTeam} size="medium" showJerseyColors={true} />
        </div>
      </div>

      {/* Recent Events */}
      {showEvents && recentEvents.length > 0 && (
        <div className="border-t border-gray-700 pt-4">
          <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center">
            <span className="mr-2">📋</span>
            Recent Events
          </h4>
          <div className="space-y-2">
            {recentEvents.map((event, index) => (
              <div key={event.id || index} className="flex items-center space-x-3 text-sm">
                <span className="text-gray-500 font-mono w-8">{event.minute}'</span>
                <span className={`${getEventColor(event)} text-lg`}>{getEventIcon(event)}</span>
                <span className="text-gray-300 flex-1">{event.description}</span>
                <span className="text-xs text-gray-500">{event.team}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Match Stats or Additional Info */}
      {(isLive || isHalfTime) && (
        <div className="border-t border-gray-700 pt-4 mt-4">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-4">
              {events && events.length > 0 && (
                <span className="text-gray-400">
                  📊 {events.length} event{events.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            <div className="flex items-center space-x-2 text-gray-400">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Live</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedLiveMatch;
