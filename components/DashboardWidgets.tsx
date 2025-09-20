import React, { useState, useEffect } from 'react';
import { Match, Prediction, PastPrediction } from '../types';
import { useAppContext } from '../contexts/AppContext';
import TeamLogo from './TeamLogo';
import LeagueLogo from './LeagueLogo';
import MatchStatusIndicator from './MatchStatusIndicator';

interface DashboardWidgetProps {
  title: string;
  children: React.ReactNode;
  isExpanded?: boolean;
  onToggle?: () => void;
  className?: string;
}

export const DashboardWidget: React.FC<DashboardWidgetProps> = ({
  title,
  children,
  isExpanded = true,
  onToggle,
  className = ''
}) => {
  return (
    <div className={`bg-gray-800 rounded-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">{title}</h2>
        {onToggle && (
          <button
            onClick={onToggle}
            className="text-gray-400 hover:text-white transition-colors"
            title={`Toggle ${title.toLowerCase()} widget`}
            aria-label={`Toggle ${title.toLowerCase()} widget`}
          >
            <svg className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        )}
      </div>
      {isExpanded && children}
    </div>
  );
};

interface RecentPredictionsWidgetProps {
  onSelectPrediction?: (prediction: any) => void;
  className?: string;
}

export const RecentPredictionsWidget: React.FC<RecentPredictionsWidgetProps> = ({
  onSelectPrediction,
  className = ''
}) => {
  const { pastPredictions, getPrediction } = useAppContext();
  const [recentPredictions, setRecentPredictions] = useState<PastPrediction[]>([]);

  useEffect(() => {
    // Get recent predictions from the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recent = pastPredictions
      .filter(prediction => new Date(prediction.predictionTime) >= sevenDaysAgo)
      .sort((a, b) => new Date(b.predictionTime).getTime() - new Date(a.predictionTime).getTime())
      .slice(0, 5);
    
    setRecentPredictions(recent);
  }, [pastPredictions]);

  if (recentPredictions.length === 0) {
    return (
      <DashboardWidget title="Recent Predictions" className={className}>
        <div className="text-center py-8">
          <div className="text-gray-400 text-4xl mb-4">🎯</div>
          <p className="text-gray-500">No recent predictions</p>
        </div>
      </DashboardWidget>
    );
  }

  return (
    <DashboardWidget title="Recent Predictions" className={className}>
      <div className="space-y-3">
        {recentPredictions.map((prediction, index) => (
          <div
            key={index}
            className="bg-gray-700 rounded-lg p-3 cursor-pointer hover:bg-gray-600 transition-colors"
            onClick={() => onSelectPrediction?.(prediction)}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-300">
                {new Date(prediction.predictionTime).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
              <span className={`text-xs px-2 py-1 rounded-full ${
                prediction.confidence === 'High' ? 'bg-green-600 text-green-100' :
                prediction.confidence === 'Medium' ? 'bg-yellow-600 text-yellow-100' :
                'bg-red-600 text-red-100'
              }`}>
                {prediction.confidence}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <TeamLogo teamName={prediction.homeTeam} size="small" />
              <span className="text-sm text-white">{prediction.homeTeam}</span>
              <span className="text-gray-400">vs</span>
              <span className="text-sm text-white">{prediction.awayTeam}</span>
              <TeamLogo teamName={prediction.awayTeam} size="small" />
            </div>
            <div className="flex items-center justify-between mt-2">
              <LeagueLogo league={prediction.league} size="small" />
              <span className="text-xs text-gray-400">
                {prediction.predictedScoreline}
              </span>
            </div>
          </div>
        ))}
      </div>
    </DashboardWidget>
  );
};

interface LiveMatchesWidgetProps {
  onSelectMatch: (match: Match) => void;
  className?: string;
}

export const LiveMatchesWidget: React.FC<LiveMatchesWidgetProps> = ({
  onSelectMatch,
  className = ''
}) => {
  const { liveMatches } = useAppContext();

  if (liveMatches.length === 0) {
    return (
      <DashboardWidget title="Live Matches" className={className}>
        <div className="text-center py-8">
          <div className="text-gray-400 text-4xl mb-4">🔴</div>
          <p className="text-gray-500">No live matches</p>
        </div>
      </DashboardWidget>
    );
  }

  return (
    <DashboardWidget title="Live Matches" className={className}>
      <div className="space-y-3">
        {liveMatches.slice(0, 5).map(match => (
          <div
            key={match.id}
            className="bg-gray-700 rounded-lg p-3 cursor-pointer hover:bg-gray-600 transition-colors"
            onClick={() => onSelectMatch(match)}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-300">
                {match.minute ? `${match.minute}'` : 'Live'}
              </span>
              <MatchStatusIndicator match={match} size="small" showIcon={true} showText={true} />
            </div>
            <div className="flex items-center space-x-2">
              <TeamLogo teamName={match.homeTeam} size="small" />
              <span className="text-sm text-white">{match.homeTeam}</span>
              <span className="text-gray-400">vs</span>
              <span className="text-sm text-white">{match.awayTeam}</span>
              <TeamLogo teamName={match.awayTeam} size="small" />
            </div>
            <div className="flex items-center justify-between mt-2">
              <LeagueLogo league={match.league} size="small" />
              <span className="text-xs text-gray-400">
                {match.homeScore} - {match.awayScore}
              </span>
            </div>
          </div>
        ))}
      </div>
    </DashboardWidget>
  );
};

interface QuickActionsWidgetProps {
  onNotificationToggle: () => void;
  onCalendarSync: () => void;
  onReminderToggle: () => void;
  notificationsEnabled: boolean;
  calendarSyncEnabled: boolean;
  remindersEnabled: boolean;
  className?: string;
}

export const QuickActionsWidget: React.FC<QuickActionsWidgetProps> = ({
  onNotificationToggle,
  onCalendarSync,
  onReminderToggle,
  notificationsEnabled,
  calendarSyncEnabled,
  remindersEnabled,
  className = ''
}) => {
  return (
    <DashboardWidget title="Quick Actions" className={className}>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button
          onClick={onNotificationToggle}
          className={`flex flex-col items-center space-y-2 p-4 rounded-lg transition-colors ${
            notificationsEnabled 
              ? 'bg-green-600 hover:bg-green-700 text-white' 
              : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
          }`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4.5 19.5L9 15l4.5 4.5L9 24l-4.5-4.5z" />
          </svg>
          <span className="text-sm font-medium">Notifications</span>
          <span className="text-xs opacity-75">
            {notificationsEnabled ? 'On' : 'Off'}
          </span>
        </button>

        <button
          onClick={onCalendarSync}
          className={`flex flex-col items-center space-y-2 p-4 rounded-lg transition-colors ${
            calendarSyncEnabled 
              ? 'bg-blue-600 hover:bg-blue-700 text-white' 
              : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
          }`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-sm font-medium">Calendar</span>
          <span className="text-xs opacity-75">
            {calendarSyncEnabled ? 'Synced' : 'Sync'}
          </span>
        </button>

        <button
          onClick={onReminderToggle}
          className={`flex flex-col items-center space-y-2 p-4 rounded-lg transition-colors ${
            remindersEnabled 
              ? 'bg-yellow-600 hover:bg-yellow-700 text-white' 
              : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
          }`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm font-medium">Reminders</span>
          <span className="text-xs opacity-75">
            {remindersEnabled ? 'On' : 'Off'}
          </span>
        </button>
      </div>
    </DashboardWidget>
  );
};

interface StatsWidgetProps {
  className?: string;
}

export const StatsWidget: React.FC<StatsWidgetProps> = ({ className = '' }) => {
  const { accuracyStats } = useAppContext();

  return (
    <DashboardWidget title="Your Stats" className={className}>
      <div className="grid grid-cols-2 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-400">
            {accuracyStats.totalPredictions}
          </div>
          <div className="text-sm text-gray-400">Total Predictions</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-400">
            {Math.round(accuracyStats.overallAccuracy)}%
          </div>
          <div className="text-sm text-gray-400">Accuracy</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-yellow-400">
            {accuracyStats.correctOutcomes}
          </div>
          <div className="text-sm text-gray-400">Correct Outcomes</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-400">
            {accuracyStats.correctScorelines}
          </div>
          <div className="text-sm text-gray-400">Correct Scores</div>
        </div>
      </div>
    </DashboardWidget>
  );
};
