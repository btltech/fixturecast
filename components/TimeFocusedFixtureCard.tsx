import React from 'react';
import { Match } from '../types';
import { colorSystemService } from '../services/colorSystemService';
import LeagueLogo from './LeagueLogo';
import TeamLogo from './TeamLogo';
import ProbabilityBar from './ProbabilityBar';
import { onDemandPredictionService } from '../services/onDemandPredictionService';
import MatchStatusIndicator from './MatchStatusIndicator';
import StatusIconIndicator from './StatusIconIndicator';

interface TimeFocusedFixtureCardProps {
  match: Match;
  prediction?: any;
  onSelectMatch: (match: Match) => void;
  onSelectTeam: (teamName: string) => void;
  onSelectPrediction?: (prediction: any) => void;
  className?: string;
}

const TimeFocusedFixtureCard: React.FC<TimeFocusedFixtureCardProps> = ({
  match,
  prediction,
  onSelectMatch,
  onSelectTeam,
  onSelectPrediction,
  className = ''
}) => {
  const homeColors = colorSystemService.getTeamColors(match.homeTeam);
  const awayColors = colorSystemService.getTeamColors(match.awayTeam);
  const leagueColors = colorSystemService.getLeagueColors(match.league);

  // Format match time with emphasis on time
  const formatMatchTime = (dateString: string): { time: string; date: string; day: string } => {
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
    
    let dayStr = '';
    if (isToday) {
      dayStr = 'TODAY';
    } else if (isTomorrow) {
      dayStr = 'TOMORROW';
    } else {
      dayStr = date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
    }
    
    return { time, date: dateStr, day: dayStr };
  };

  const timeInfo = formatMatchTime(match.date);

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
      className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer overflow-hidden ${className}`}
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
      {/* Header with Time and Date - Most Prominent */}
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 px-4 py-3 border-b border-gray-200 dark:border-gray-600">
        <div className="flex items-center justify-between">
          {/* Time and Date - Most Prominent */}
          <div className="flex flex-col items-start">
            <div className="text-2xl font-black text-gray-900 dark:text-white leading-none">
              {timeInfo.time}
            </div>
            <div className="flex items-center space-x-2 mt-1">
              <span className="text-sm font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wide">
                {timeInfo.day}
              </span>
              <span className="text-gray-400 dark:text-gray-500">•</span>
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                {timeInfo.date}
              </span>
            </div>
          </div>

          {/* League Badge */}
          <div className="flex items-center space-x-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shadow-sm"
              style={{
                backgroundColor: leagueColors.primary,
                color: leagueColors.text
              }}
            >
              <LeagueLogo league={match.league} size="small" />
            </div>
            <span className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wide">
              {match.league}
            </span>
          </div>
        </div>
      </div>

      {/* Match Content */}
      <div className="p-4">
        {/* Teams Section */}
        <div className="flex items-center justify-between mb-4">
          {/* Home Team */}
          <div className="flex items-center space-x-3 flex-1">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center shadow-sm"
              style={{
                backgroundColor: homeColors.primary,
                color: homeColors.text
              }}
            >
              <TeamLogo teamName={match.homeTeam} size="small" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-gray-900 dark:text-white text-lg leading-tight">
                {match.homeTeam}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                Home
              </p>
            </div>
          </div>

          {/* VS / Score */}
          <div className="flex flex-col items-center mx-4">
            <div className="text-xl font-black text-gray-900 dark:text-white">
              VS
            </div>
            <div className="mt-1">
              <StatusIconIndicator match={match} size="small" />
            </div>
          </div>

          {/* Away Team */}
          <div className="flex items-center space-x-3 flex-1 justify-end">
            <div className="flex-1 text-right">
              <h3 className="font-bold text-gray-900 dark:text-white text-lg leading-tight">
                {match.awayTeam}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                Away
              </p>
            </div>
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center shadow-sm"
              style={{
                backgroundColor: awayColors.primary,
                color: awayColors.text
              }}
            >
              <TeamLogo teamName={match.awayTeam} size="small" />
            </div>
          </div>
        </div>

        {/* Prediction Section */}
        {prediction && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Prediction
              </span>
              <span
                className="px-2 py-1 rounded-full text-xs font-bold"
                style={{
                  backgroundColor: prediction.confidence > 70 ? '#D1FAE5' : prediction.confidence > 50 ? '#FEF3C7' : '#FEE2E2',
                  color: prediction.confidence > 70 ? '#059669' : prediction.confidence > 50 ? '#D97706' : '#DC2626'
                }}
              >
                {prediction.confidence}% confidence
              </span>
            </div>
            <ProbabilityBar
              homeWin={prediction.homeWin}
              draw={prediction.draw}
              awayWin={prediction.awayWin}
              homeTeam={match.homeTeam}
              awayTeam={match.awayTeam}
            />
          </div>
        )}

        {/* Status Badge */}
        <div className="flex justify-center mt-4">
          <MatchStatusIndicator
            match={match}
            size="medium"
            showIcon={true}
            showText={true}
          />
        </div>
      </div>
    </div>
  );
};

export default TimeFocusedFixtureCard;
