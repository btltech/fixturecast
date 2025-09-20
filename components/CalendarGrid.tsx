import React, { useMemo } from 'react';
import { Match, League } from '../types';
import { useAppContext } from '../contexts/AppContext';
import LeagueLogo from './LeagueLogo';
import TeamLogo from './TeamLogo';
import MatchStatusIndicator from './MatchStatusIndicator';
import { onDemandPredictionService } from '../services/onDemandPredictionService';
import { getHomeTeamName, getAwayTeamName, getMatchLeagueName } from '../utils/matchUtils';

interface CalendarGridProps {
  fixtures: Match[];
  currentDate: Date;
  calendarMode: 'week' | 'month';
  onSelectMatch: (match: Match) => void;
  onSelectTeam: (teamName: string) => void;
  onSelectPrediction?: (prediction: any) => void;
  selectedDate?: Date | null;
  onDateSelect?: (date: Date) => void;
  generatingPredictions: Set<string>;
  onPredictionGenerate: (matchId: string, generate: () => Promise<void>) => void;
  className?: string;
}

interface CalendarCell {
  date: Date;
  matches: Match[];
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
}

const CalendarGrid: React.FC<CalendarGridProps> = ({
  fixtures,
  currentDate,
  calendarMode,
  onSelectMatch,
  onSelectTeam,
  onSelectPrediction,
  selectedDate,
  onDateSelect,
  generatingPredictions,
  onPredictionGenerate,
  className = ''
}) => {
  const { getPrediction } = useAppContext();

  // Generate calendar grid data
  const calendarGrid = useMemo((): CalendarCell[] => {
    const grid: CalendarCell[] = [];
    
    if (calendarMode === 'week') {
      // Weekly view - 7 days starting from Sunday
      const startDate = new Date(currentDate);
      startDate.setDate(currentDate.getDate() - currentDate.getDay());
      
      for (let i = 0; i < 7; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        const dateKey = date.toISOString().split('T')[0];
        const matches = fixtures.filter(match => {
          const matchDate = new Date(match.date);
          return matchDate.toISOString().split('T')[0] === dateKey;
        }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        const isToday = date.toDateString() === new Date().toDateString();
        const isSelected = selectedDate?.toDateString() === date.toDateString();
        
        grid.push({
          date,
          matches,
          isCurrentMonth: true,
          isToday,
          isSelected
        });
      }
    } else {
      // Monthly view - 6 weeks x 7 days
      const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const startDate = new Date(firstDay);
      startDate.setDate(firstDay.getDate() - firstDay.getDay());
      
      for (let week = 0; week < 6; week++) {
        for (let day = 0; day < 7; day++) {
          const date = new Date(startDate);
          date.setDate(startDate.getDate() + (week * 7) + day);
          const dateKey = date.toISOString().split('T')[0];
          const matches = fixtures.filter(match => {
            const matchDate = new Date(match.date);
            return matchDate.toISOString().split('T')[0] === dateKey;
          }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
          
          const isCurrentMonth = date.getMonth() === currentDate.getMonth();
          const isToday = date.toDateString() === new Date().toDateString();
          const isSelected = selectedDate?.toDateString() === date.toDateString();
          
          grid.push({
            date,
            matches,
            isCurrentMonth,
            isToday,
            isSelected
          });
        }
      }
    }
    
    return grid;
  }, [fixtures, currentDate, calendarMode, selectedDate]);

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

  // Get match display limit based on calendar mode
  const getMatchLimit = () => {
    return calendarMode === 'week' ? 3 : 2;
  };

  return (
    <div className={`calendar-grid ${className}`}>
      {/* Day Headers for Monthly View */}
      {calendarMode === 'month' && (
        <div className="grid grid-cols-7 gap-1 mb-4">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="p-3 text-center text-sm font-semibold text-gray-400 bg-gray-800 rounded-lg">
              {day}
            </div>
          ))}
        </div>
      )}

      {/* Calendar Grid */}
      <div className={`grid gap-2 ${
        calendarMode === 'week' 
          ? 'grid-cols-7' 
          : 'grid-cols-7'
      }`}>
        {calendarGrid.map((cell, index) => (
          <div
            key={index}
            className={`calendar-cell p-3 rounded-lg border-2 transition-all duration-200 hover:shadow-lg cursor-pointer ${
              cell.isCurrentMonth 
                ? 'bg-gray-800 border-gray-700 hover:border-gray-600' 
                : 'bg-gray-900 border-gray-800 opacity-60'
            } ${
              cell.isToday 
                ? 'ring-2 ring-blue-500 bg-blue-900/20 border-blue-500' 
                : ''
            } ${
              cell.isSelected
                ? 'ring-2 ring-green-500 bg-green-900/20 border-green-500'
                : ''
            }`}
            onClick={() => onDateSelect?.(cell.date)}
          >
            {/* Date Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex flex-col">
                <span className={`text-lg font-bold ${
                  cell.isToday ? 'text-blue-400' : 'text-white'
                }`}>
                  {cell.date.getDate()}
                </span>
                {calendarMode === 'week' && (
                  <span className="text-xs text-gray-400">
                    {cell.date.toLocaleDateString('en-US', { weekday: 'short' })}
                  </span>
                )}
              </div>
              {cell.matches.length > 0 && (
                <div className="flex items-center space-x-1">
                  <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded-full font-medium">
                    {cell.matches.length}
                  </span>
                </div>
              )}
            </div>

            {/* Matches */}
            <div className="space-y-2">
              {cell.matches.slice(0, getMatchLimit()).map(match => (
                <div
                  key={match.id}
                  className="bg-gray-700 rounded-lg p-2 cursor-pointer hover:bg-gray-600 transition-all duration-200 hover:scale-105"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePredictionClick(match);
                  }}
                >
                  {/* Match Time and Status */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-300 font-medium">
                      {formatTime(new Date(match.date))}
                    </span>
                    <MatchStatusIndicator 
                      match={match} 
                      size="small" 
                      showIcon={true} 
                      showText={false} 
                    />
                  </div>

                  {/* Teams */}
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <TeamLogo teamName={getHomeTeamName(match)} size="small" />
                      <span className="text-xs text-white truncate font-medium">
                        {getHomeTeamName(match)}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <TeamLogo teamName={getAwayTeamName(match)} size="small" />
                      <span className="text-xs text-white truncate font-medium">
                        {getAwayTeamName(match)}
                      </span>
                    </div>
                  </div>

                  {/* League and Status */}
                  <div className="flex items-center justify-between mt-2">
                    <LeagueLogo league={match.league as League} size="small" />
                    {generatingPredictions.has(match.id) && (
                      <div className="flex items-center space-x-1">
                        <div className="animate-spin rounded-full h-2 w-2 border-b border-blue-500"></div>
                        <span className="text-xs text-blue-400">Gen...</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Show More Indicator */}
              {cell.matches.length > getMatchLimit() && (
                <div className="text-center">
                  <div className="text-xs text-gray-400 bg-gray-600 rounded px-2 py-1">
                    +{cell.matches.length - getMatchLimit()} more
                  </div>
                </div>
              )}

              {/* Empty State */}
              {cell.matches.length === 0 && (
                <div className="text-center py-4">
                  <div className="text-gray-500 text-xs">No matches</div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CalendarGrid;
