import React, { useMemo } from 'react';
import { Match, League } from '../types';
import { useAppContext } from '../contexts/AppContext';
import LeagueLogo from './LeagueLogo';
import TeamLogo from './TeamLogo';
import MatchStatusIndicator from './MatchStatusIndicator';
import { onDemandPredictionService } from '../services/onDemandPredictionService';
import { getHomeTeamName, getAwayTeamName, getMatchLeagueName } from '../utils/matchUtils';

interface CalendarListViewProps {
  fixtures: Match[];
  currentDate: Date;
  calendarMode: 'week' | 'month';
  onSelectMatch: (match: Match) => void;
  onSelectTeam: (teamName: string) => void;
  onSelectPrediction?: (prediction: any) => void;
  generatingPredictions: Set<string>;
  onPredictionGenerate: (matchId: string, generate: () => Promise<void>) => void;
  className?: string;
}

const CalendarListView: React.FC<CalendarListViewProps> = ({
  fixtures,
  currentDate,
  calendarMode,
  onSelectMatch,
  onSelectTeam,
  onSelectPrediction,
  generatingPredictions,
  onPredictionGenerate,
  className = ''
}) => {
  const { getPrediction } = useAppContext();

  // Group fixtures by date within the current period
  const fixturesByDate = useMemo(() => {
    const { start, end } = getViewDates(currentDate, calendarMode);
    const groups: { [key: string]: Match[] } = {};
    
    fixtures.forEach(match => {
      const matchDate = new Date(match.date);
      if (matchDate >= start && matchDate <= end) {
        const dateKey = matchDate.toISOString().split('T')[0];
        if (!groups[dateKey]) {
          groups[dateKey] = [];
        }
        groups[dateKey].push(match);
      }
    });

    // Sort matches within each date
    Object.keys(groups).forEach(date => {
      groups[date].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    });

    return groups;
  }, [fixtures, currentDate, calendarMode]);

  // Get start and end dates for current view
  const getViewDates = (date: Date, mode: 'week' | 'month') => {
    if (mode === 'week') {
      const start = new Date(date);
      start.setDate(date.getDate() - date.getDay());
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return { start, end };
    } else {
      const start = new Date(date.getFullYear(), date.getMonth(), 1);
      const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      return { start, end };
    }
  };

  // Handle prediction generation
  const handlePredictionClick = async (match: Match) => {
    const existingPrediction = getPrediction(match.id);
    
    if (existingPrediction && onSelectPrediction) {
      onSelectPrediction(existingPrediction);
    } else if (onSelectPrediction) {
      await onPredictionGenerate(match.id, async () => {
        const generatedPrediction = await onDemandPredictionService.generateMatchPrediction(match);
        onSelectPrediction(generatedPrediction);
      });
    } else {
      onSelectMatch(match);
    }
  };

  // Format time for display
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    }
  };

  return (
    <div className={`calendar-list-view ${className}`}>
      {Object.entries(fixturesByDate)
        .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
        .map(([dateKey, matches]) => (
          <div key={dateKey} className="mb-6">
            {/* Date Header */}
            <div className="sticky top-0 z-10 bg-gray-900 py-3 mb-4 rounded-lg">
              <h3 className="text-xl font-bold text-white">
                {formatDate(dateKey)}
                <span className="ml-3 text-sm font-normal text-gray-400">
                  ({matches.length} match{matches.length !== 1 ? 'es' : ''})
                </span>
              </h3>
            </div>

            {/* Matches Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {matches.map(match => (
                <div
                  key={match.id}
                  className="bg-gray-800 rounded-lg p-4 cursor-pointer hover:bg-gray-700 transition-all duration-200 hover:scale-105 hover:shadow-lg border border-gray-700 hover:border-gray-600"
                  onClick={() => handlePredictionClick(match)}
                >
                  {/* Match Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-300">
                        {formatTime(new Date(match.date))}
                      </span>
                      <MatchStatusIndicator 
                        match={match} 
                        size="small" 
                        showIcon={true} 
                        showText={true} 
                      />
                    </div>
                    {generatingPredictions.has(match.id) && (
                      <div className="flex items-center space-x-1">
                        <div className="animate-spin rounded-full h-3 w-3 border-b border-blue-500"></div>
                        <span className="text-xs text-blue-400">Generating...</span>
                      </div>
                    )}
                  </div>

                  {/* Teams */}
                  <div className="space-y-3 mb-4">
                    <div className="flex items-center space-x-3">
                      <TeamLogo teamName={getHomeTeamName(match)} size="small" />
                      <span className="text-sm font-semibold text-white truncate">
                        {getHomeTeamName(match)}
                      </span>
                    </div>
                    <div className="flex items-center justify-center">
                      <span className="text-gray-400 text-sm font-medium">vs</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <TeamLogo teamName={getAwayTeamName(match)} size="small" />
                      <span className="text-sm font-semibold text-white truncate">
                        {getAwayTeamName(match)}
                      </span>
                    </div>
                  </div>

                  {/* League */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <LeagueLogo league={match.league as League} size="small" />
                      <span className="text-xs text-gray-400">{getMatchLeagueName(match)}</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(match.date).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </div>
                  </div>

                  {/* Hover Effect Indicator */}
                  <div className="mt-3 text-center">
                    <span className="text-xs text-gray-500">
                      Click for prediction
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Empty State for Date */}
            {matches.length === 0 && (
              <div className="text-center py-8 bg-gray-800 rounded-lg">
                <div className="text-gray-400 text-lg mb-2">📅</div>
                <p className="text-gray-500">No matches scheduled</p>
              </div>
            )}
          </div>
        ))}

      {/* Empty State for Period */}
      {Object.keys(fixturesByDate).length === 0 && (
        <div className="text-center py-12 bg-gray-800 rounded-lg">
          <div className="text-gray-400 text-4xl mb-4">📅</div>
          <h3 className="text-lg font-semibold text-white mb-2">No Matches Found</h3>
          <p className="text-gray-500">
            No matches scheduled for this {calendarMode === 'week' ? 'week' : 'month'}
          </p>
        </div>
      )}
    </div>
  );
};

export default CalendarListView;
