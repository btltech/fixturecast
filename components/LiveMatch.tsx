import React from 'react';
import type { LiveMatch, MatchEvent } from '../types';
import TeamLogo from './TeamLogo';
import { getMatchStatusText, getMatchStatusColor, formatMatchTime, getRecentEvents } from '../services/liveMatchService';

interface LiveMatchProps {
  match: LiveMatch;
  onSelectMatch?: (match: LiveMatch) => void;
  showEvents?: boolean;
  compact?: boolean;
}

const LiveMatch: React.FC<LiveMatchProps> = ({ 
  match, 
  onSelectMatch, 
  showEvents = true, 
  compact = false 
}) => {
  const { homeTeam, awayTeam, homeScore, awayScore, status, minute, period, events } = match;
  const isLive = status === 'LIVE' || status === 'HT';
  const recentEvents = getRecentEvents(match, 3);

  const getEventIcon = (event: MatchEvent) => {
    switch (event.type) {
      case 'goal':
        return '⚽';
      case 'card':
        return '🟨';
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
        return 'text-yellow-400';
      case 'substitution':
        return 'text-blue-400';
      case 'var':
        return 'text-purple-400';
      default:
        return 'text-gray-400';
    }
  };

  if (compact) {
    return (
      <div 
        className={`bg-gray-800 rounded-lg p-3 border-l-4 ${
          isLive ? 'border-red-500' : 'border-gray-600'
        } ${onSelectMatch ? 'cursor-pointer hover:bg-gray-750' : ''}`}
        onClick={() => onSelectMatch?.(match)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 flex-1">
            <TeamLogo teamName={homeTeam} size="small" showJerseyColors={true} />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white truncate">{homeTeam}</div>
              <div className="text-sm font-medium text-white truncate">{awayTeam}</div>
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-lg font-bold text-white">
              {homeScore} - {awayScore}
            </div>
            <div className={`text-xs ${getMatchStatusColor(status)}`}>
              {formatMatchTime(match)}
            </div>
            {isLive && (
              <div className="text-xs text-green-400 font-semibold mt-1">
                {minute ? `${minute}' ${period || ''}` : 'LIVE'}
              </div>
            )}
          </div>
          
          <TeamLogo teamName={awayTeam} size="small" showJerseyColors={true} />
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`bg-gray-800 rounded-xl p-4 shadow-lg border ${
        isLive ? 'border-red-500/50 shadow-red-500/20' : 'border-gray-700'
      } ${onSelectMatch ? 'cursor-pointer hover:bg-gray-750' : ''}`}
      onClick={() => onSelectMatch?.(match)}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          {isLive && (
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-green-400">LIVE</span>
            </div>
          )}
        </div>
        <div className={`text-sm font-semibold ${getMatchStatusColor(status)}`}>
          {formatMatchTime(match)}
        </div>
      </div>

      {/* Teams and Score */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3 flex-1">
          <TeamLogo teamName={homeTeam} size="medium" showJerseyColors={true} />
          <div className="text-lg font-bold text-white">{homeTeam}</div>
        </div>
        
        <div className="text-center mx-4">
          <div className="text-3xl font-bold text-white">
            {homeScore} - {awayScore}
          </div>
          {isLive && (
            <div className="text-sm text-green-400 mt-1 font-semibold">
              {minute ? `${minute}' ${period || ''}` : 'LIVE'}
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-3 flex-1 justify-end">
          <div className="text-lg font-bold text-white text-right">{awayTeam}</div>
          <TeamLogo teamName={awayTeam} size="medium" showJerseyColors={true} />
        </div>
      </div>

      {/* Recent Events */}
      {showEvents && recentEvents.length > 0 && (
        <div className="border-t border-gray-700 pt-3">
          <h4 className="text-sm font-semibold text-gray-300 mb-2">Recent Events</h4>
          <div className="space-y-1">
            {recentEvents.map((event) => (
              <div key={event.id} className="flex items-center space-x-2 text-sm">
                <span className="text-gray-500">{event.minute}'</span>
                <span className={getEventColor(event)}>{getEventIcon(event)}</span>
                <span className="text-gray-300 flex-1">{event.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Live indicator */}
      {isLive && (
        <div className="mt-3 pt-3 border-t border-gray-700">
          <div className="flex items-center justify-center space-x-2 text-xs text-red-400">
            <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></div>
            <span>Live updates every 30 seconds</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveMatch;
