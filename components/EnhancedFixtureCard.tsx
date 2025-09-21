import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Match, League, Team } from '../types';
import { LONDON_TIMEZONE } from '../utils/timezone';
import { getHomeTeamName, getAwayTeamName, getMatchLeagueName } from '../utils/matchUtils';
import TeamLogo from './TeamLogo';
import LeagueLogo from './LeagueLogo';
import MatchStatusIndicator from './MatchStatusIndicator';
import { useAppContext } from '../contexts/AppContext';

interface EnhancedFixtureCardProps {
  match: Match;
  onClick: () => void;
  showPrediction?: boolean;
  className?: string;
  prediction?: any;
  onSelectPrediction?: (prediction: any) => void;
  onSelectTeam?: (teamName: string) => void;
  onSelectMatch?: (match: Match) => void;
  showStatusBadge?: boolean;
  statusVariant?: string;
}

const EnhancedFixtureCard: React.FC<EnhancedFixtureCardProps> = ({
  match,
  onClick,
  showPrediction = false,
  className = '',
  prediction,
  onSelectPrediction,
  onSelectTeam,
  onSelectMatch,
  showStatusBadge,
  statusVariant
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const navigate = useNavigate();
  const { teams } = useAppContext();

  // Get team data for expanded view
  const homeTeamData = teams[getHomeTeamName(match)];
  const awayTeamData = teams[getAwayTeamName(match)];

  // Format time for display
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: LONDON_TIMEZONE
    });
  };

  // Format date for display
  const formatDate = (date: Date) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString('en-GB', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });
    }
  };

  // Handle card click - toggle expansion
  const handleCardClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  // Handle prediction navigation
  const handlePredictionClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Navigate to prediction page with matchId parameter
    navigate(`/prediction/${match.id}`, { state: { prediction, match } });
  };

  // Get team form display
  const getTeamForm = (teamData: Team | undefined) => {
    if (!teamData?.recentForm) return 'No recent form data';
    return teamData.recentForm.map((result, index) => (
      <span
        key={index}
        className={`inline-block w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center mx-0.5 ${
          result === 'W' ? 'bg-green-600 text-white' :
          result === 'D' ? 'bg-yellow-600 text-white' :
          'bg-red-600 text-white'
        }`}
      >
        {result}
      </span>
    ));
  };

  // Get key players (first 3 from squad if available)
  const getKeyPlayers = (teamData: Team | undefined) => {
    if (!teamData?.squad) return [];
    return teamData.squad
      .filter(player => ['Forward', 'Midfielder'].includes(player.position))
      .slice(0, 3);
  };


  return (
    <div
      className={`enhanced-fixture-card bg-gray-800 rounded-xl shadow-sm border border-gray-700 p-4 cursor-pointer transition-all duration-200 hover:shadow-md hover:bg-gray-700 ${className} ${
        isExpanded ? 'ring-2 ring-blue-500/50' : ''
      }`}
      onClick={handleCardClick}
    >
      {/* Match Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <LeagueLogo league={match.league as League} size="small" />
          <span className="text-sm font-medium text-gray-300 leading-tight">
            {getMatchLeagueName(match)}
          </span>
        </div>
        <div className="flex items-center">
          <MatchStatusIndicator match={match} size="small" showIcon={true} showText={false} />
        </div>
      </div>

      {/* Teams Section */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3 flex-1">
          {/* Home Team */}
          <div className="flex flex-col items-center space-y-1">
            <TeamLogo teamName={getHomeTeamName(match)} size="medium" />
            <span className="text-sm font-semibold text-white text-center leading-tight max-w-24 truncate">
              {getHomeTeamName(match)}
            </span>
          </div>

          {/* VS */}
          <div className="flex flex-col items-center px-2">
            <div className="text-lg font-bold text-blue-400 mb-1">VS</div>
            <div className="w-8 h-px bg-blue-400"></div>
          </div>

          {/* Away Team */}
          <div className="flex flex-col items-center space-y-1">
            <TeamLogo teamName={getAwayTeamName(match)} size="medium" />
            <span className="text-sm font-semibold text-white text-center leading-tight max-w-24 truncate">
              {getAwayTeamName(match)}
            </span>
          </div>
        </div>
      </div>

      {/* Match Details and Actions */}
      <div className="flex items-center justify-between">
        {/* Date and Time */}
        <div className="flex flex-col">
          <span className="text-sm font-medium text-white leading-tight">
            {formatDate(new Date(match.date))}
          </span>
          <span className="text-sm text-gray-300 leading-tight">
            {formatTime(new Date(match.date))}
          </span>
        </div>

        {/* Main Action Button */}
        <button
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors text-sm"
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
        >
          {showPrediction ? 'Predict' : 'Details'}
        </button>
      </div>

      {/* Venue (if available) */}
      {match.venue && (
          <div className="mt-3 pt-3 border-t border-gray-700">
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-sm text-gray-300 truncate">
                {match.venue}
              </span>
            </div>
          </div>
      )}

      {/* Expanded Content */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-gray-600 animate-in slide-in-from-top-2 duration-300">
          {/* Match Details Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <div className="text-blue-400">📅</div>
              <span className="text-sm font-medium text-gray-300">
                {formatDate(new Date(match.date))} • {formatTime(new Date(match.date))}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="text-blue-400">📍</div>
              <span className="text-sm text-gray-300">{match.venue || 'Venue TBD'}</span>
            </div>
          </div>

          {/* Teams Detailed Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* Home Team */}
            <div className="bg-gray-700/50 rounded-lg p-3">
              <div className="flex items-center space-x-2 mb-2">
                <TeamLogo teamName={getHomeTeamName(match)} size="small" />
                <span className="font-semibold text-white text-sm">{getHomeTeamName(match)}</span>
              </div>

              <div className="space-y-2">
                <div>
                  <span className="text-xs text-gray-400 uppercase">Recent Form</span>
                  <div className="flex mt-1">
                    {homeTeamData ? getTeamForm(homeTeamData) : (
                      <span className="text-xs text-gray-500">Loading...</span>
                    )}
                  </div>
                </div>

                {homeTeamData && getKeyPlayers(homeTeamData).length > 0 && (
                  <div>
                    <span className="text-xs text-gray-400 uppercase">Key Players</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {getKeyPlayers(homeTeamData).map((player, index) => (
                        <span key={index} className="text-xs bg-blue-600/20 text-blue-300 px-2 py-1 rounded">
                          {player.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Away Team */}
            <div className="bg-gray-700/50 rounded-lg p-3">
              <div className="flex items-center space-x-2 mb-2">
                <TeamLogo teamName={getAwayTeamName(match)} size="small" />
                <span className="font-semibold text-white text-sm">{getAwayTeamName(match)}</span>
              </div>

              <div className="space-y-2">
                <div>
                  <span className="text-xs text-gray-400 uppercase">Recent Form</span>
                  <div className="flex mt-1">
                    {awayTeamData ? getTeamForm(awayTeamData) : (
                      <span className="text-xs text-gray-500">Loading...</span>
                    )}
                  </div>
                </div>

                {awayTeamData && getKeyPlayers(awayTeamData).length > 0 && (
                  <div>
                    <span className="text-xs text-gray-400 uppercase">Key Players</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {getKeyPlayers(awayTeamData).map((player, index) => (
                        <span key={index} className="text-xs bg-blue-600/20 text-blue-300 px-2 py-1 rounded">
                          {player.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Prediction CTA */}
          <div className="flex justify-center">
            <button
              onClick={handlePredictionClick}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center space-x-2"
            >
              <span>🎯 View Prediction</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default EnhancedFixtureCard;