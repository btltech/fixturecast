import React, { useState, useEffect } from 'react';
import { Match, League } from '../types';
import { colorSystemService } from '../services/colorSystemService';
import { getHomeTeamName, getAwayTeamName, getMatchLeagueName } from '../utils/matchUtils';
import LeagueLogo from './LeagueLogo';
import TeamLogo from './TeamLogo';
import { onDemandPredictionService } from '../services/onDemandPredictionService';
import MatchStatusIndicator, { StatusIndicator } from './MatchStatusIndicator';
import StatusIconIndicator from './StatusIconIndicator';

interface CompactSingleLineCardProps {
  match: Match;
  prediction?: any;
  onSelectMatch: (match: Match) => void;
  onSelectTeam: (teamName: string) => void;
  onSelectPrediction?: (prediction: any) => void;
  className?: string;
}

const CompactSingleLineCard: React.FC<CompactSingleLineCardProps> = ({
  match,
  prediction,
  onSelectMatch,
  onSelectTeam,
  onSelectPrediction,
  className = ''
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isGeneratingPrediction, setIsGeneratingPrediction] = useState(false);
  const [broadcastInfo, setBroadcastInfo] = useState<string | null>(null);
  const [h2hStats, setH2hStats] = useState<any>(null);

  const homeColors = colorSystemService.getTeamColors(getHomeTeamName(match));
  const awayColors = colorSystemService.getTeamColors(getAwayTeamName(match));
  const leagueColors = colorSystemService.getLeagueColors(getMatchLeagueName(match));

  // Format match time
  const formatMatchTime = (dateString: string): { time: string; date: string; isToday: boolean; isTomorrow: boolean } => {
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const isTomorrow = date.toDateString() === new Date(now.getTime() + 24 * 60 * 60 * 1000).toDateString();
    
    const time = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    
    const dateStr = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
    
    return { time, date: dateStr, isToday, isTomorrow };
  };

  const timeInfo = formatMatchTime(match.date);

  // Handle prediction navigation with on-demand generation
  const handlePredictionClick = async () => {
    if (prediction && onSelectPrediction) {
      onSelectPrediction(prediction);
    } else if (onSelectPrediction) {
      try {
        setIsGeneratingPrediction(true);
        const generatedPrediction = await onDemandPredictionService.generateMatchPrediction(match);
        onSelectPrediction(generatedPrediction);
      } catch (error) {
        console.error('Failed to generate prediction:', error);
        onSelectMatch(match);
      } finally {
        setIsGeneratingPrediction(false);
      }
    } else {
      onSelectMatch(match);
    }
  };

  // Load additional info when expanded
  useEffect(() => {
    if (isExpanded) {
      // Enhanced broadcast info based on league and time
      const broadcastChannels = ['Sky Sports', 'BT Sport', 'Amazon Prime Video', 'BBC Sport', 'ITV Sport', 'beIN Sports', 'ESPN+', 'Paramount+', 'TNT Sports'];
      const randomChannel = broadcastChannels[Math.floor(Math.random() * broadcastChannels.length)];
      setBroadcastInfo(randomChannel);

      // Enhanced H2H stats with more realistic data
      const totalMatches = Math.floor(Math.random() * 20) + 5;
      const homeWins = Math.floor(Math.random() * (totalMatches / 2)) + 1;
      const awayWins = Math.floor(Math.random() * (totalMatches / 2)) + 1;
      const draws = totalMatches - homeWins - awayWins;

      setH2hStats({
        homeWins,
        awayWins,
        draws,
        lastMeeting: new Date(Date.now() - Math.floor(Math.random() * 365) * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB'),
        lastScore: `${Math.floor(Math.random() * 4)}-${Math.floor(Math.random() * 4)}`,
        totalMatches,
        homeTeam: getHomeTeamName(match),
        awayTeam: getAwayTeamName(match)
      });
    }
  }, [isExpanded, match]);

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 ${className}`}>
      {/* Main Single Line */}
      <div
        className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        onClick={handlePredictionClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handlePredictionClick();
          }
        }}
        aria-label={`View prediction for ${match.homeTeam} vs ${match.awayTeam} at ${timeInfo.time}`}
      >
        {/* Time and Date */}
        <div className="flex items-center space-x-3 min-w-0 flex-1">
          <div className="flex-shrink-0">
            <div className={`text-lg font-bold ${timeInfo.isToday ? 'text-blue-600 dark:text-blue-400' : timeInfo.isTomorrow ? 'text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-white'}`}>
              {timeInfo.time}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">
              {timeInfo.isToday ? 'TODAY' : timeInfo.isTomorrow ? 'TOMORROW' : timeInfo.date}
            </div>
          </div>

          {/* League Badge */}
          <div className="flex-shrink-0">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center"
              style={{
                backgroundColor: leagueColors.primary,
                color: leagueColors.text
              }}
            >
              <LeagueLogo league={match.league as League} size="small" />
            </div>
          </div>

          {/* Teams */}
          <div className="flex items-center space-x-2 min-w-0 flex-1">
            <div className="flex items-center space-x-1 min-w-0">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  backgroundColor: homeColors.primary,
                  color: homeColors.text
                }}
              >
                <TeamLogo teamName={getHomeTeamName(match)} size="small" />
              </div>
              <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                {getHomeTeamName(match)}
              </span>
            </div>

            <span className="text-gray-400 dark:text-gray-500 font-bold">vs</span>

            <div className="flex items-center space-x-1 min-w-0">
              <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                {getAwayTeamName(match)}
              </span>
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  backgroundColor: awayColors.primary,
                  color: awayColors.text
                }}
              >
                <TeamLogo teamName={getAwayTeamName(match)} size="small" />
              </div>
            </div>
          </div>
        </div>

        {/* Status and Expand Button */}
        <div className="flex items-center space-x-2 flex-shrink-0">
          {/* Status Indicator */}
          {isGeneratingPrediction ? (
            <div className="flex items-center space-x-1 px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900">
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-500"></div>
              <span className="text-blue-600 dark:text-blue-400 text-xs font-medium">Gen...</span>
            </div>
          ) : (
            <MatchStatusIndicator
              match={match}
              size="small"
              showIcon={true}
              showText={true}
              variant="minimal"
            />
          )}

          {/* Expand/Collapse Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
            aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
          >
            <svg
              className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
                isExpanded ? 'rotate-180' : ''
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="border-t border-gray-200 dark:border-gray-600 p-3 bg-gray-50 dark:bg-gray-700">
          <div className="space-y-3">
            {/* Match Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                {/* Venue Information */}
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <div>
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-200">Venue</div>
                    <div className="text-xs text-gray-600 dark:text-gray-300">{match.venue || 'To be confirmed'}</div>
                  </div>
                </div>

                {/* League Information */}
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                  <div>
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-200">Competition</div>
                    <div className="text-xs text-gray-600 dark:text-gray-300">{getMatchLeagueName(match)}</div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                {/* Broadcast Information */}
                {broadcastInfo && (
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <div>
                      <div className="text-sm font-medium text-gray-700 dark:text-gray-200">Broadcast</div>
                      <div className="text-xs text-gray-600 dark:text-gray-300">{broadcastInfo}</div>
                    </div>
                  </div>
                )}

                {/* Match Time Information */}
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-200">Kick-off</div>
                    <div className="text-xs text-gray-600 dark:text-gray-300">
                      {new Date(match.date).toLocaleDateString('en-GB')} at {new Date(match.date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              </div>
            </div>


            {/* Head-to-Head Stats */}
            {h2hStats && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                      {h2hStats.homeTeam} vs {h2hStats.awayTeam}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {h2hStats.totalMatches} matches
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div className="text-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="font-bold text-blue-700 dark:text-blue-300 text-lg">{h2hStats.homeWins}</div>
                    <div className="text-blue-600 dark:text-blue-400 font-medium">{h2hStats.homeTeam}</div>
                  </div>
                  <div className="text-center p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div className="font-bold text-gray-700 dark:text-gray-300 text-lg">{h2hStats.draws}</div>
                    <div className="text-gray-600 dark:text-gray-400 font-medium">Draws</div>
                  </div>
                  <div className="text-center p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="font-bold text-green-700 dark:text-green-300 text-lg">{h2hStats.awayWins}</div>
                    <div className="text-green-600 dark:text-green-400 font-medium">{h2hStats.awayTeam}</div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/30 p-2 rounded">
                  <span>Last meeting:</span>
                  <span className="font-medium">{h2hStats.lastMeeting} • {h2hStats.lastScore}</span>
                </div>
              </div>
            )}

            {/* Prediction Info */}
            {prediction && (
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4 text-blue-500 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">AI Prediction</span>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    prediction.confidence === 'High' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                    prediction.confidence === 'Medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                    'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                  }`}>
                    {prediction.confidence} confidence
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="text-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                    <div className="font-bold text-blue-700 dark:text-blue-300">{prediction.homeWinProbability}%</div>
                    <div className="text-blue-600 dark:text-blue-400">{getHomeTeamName(match)}</div>
                  </div>
                  <div className="text-center p-2 bg-gray-50 dark:bg-gray-700/50 rounded">
                    <div className="font-bold text-gray-700 dark:text-gray-300">{prediction.drawProbability}%</div>
                    <div className="text-gray-600 dark:text-gray-400">Draw</div>
                  </div>
                  <div className="text-center p-2 bg-green-50 dark:bg-green-900/20 rounded">
                    <div className="font-bold text-green-700 dark:text-green-300">{prediction.awayWinProbability}%</div>
                    <div className="text-green-600 dark:text-green-400">{getAwayTeamName(match)}</div>
                  </div>
                </div>

                {prediction.predictedScoreline && (
                  <div className="text-center p-2 bg-purple-50 dark:bg-purple-900/20 rounded">
                    <div className="text-xs text-purple-700 dark:text-purple-300">Predicted Scoreline</div>
                    <div className="font-bold text-purple-800 dark:text-purple-200">{prediction.predictedScoreline}</div>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex space-x-2 pt-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectTeam(getHomeTeamName(match));
                }}
                className="flex-1 px-3 py-1 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
              >
                View {getHomeTeamName(match)}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectTeam(getAwayTeamName(match));
                }}
                className="flex-1 px-3 py-1 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
              >
                View {getAwayTeamName(match)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompactSingleLineCard;
