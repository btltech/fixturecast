import React, { useState, useMemo, useCallback } from 'react';
import { Match, League } from '../types';
import { useAppContext } from '../contexts/AppContext';
import CalendarGrid from './CalendarGrid';
import CalendarListView from './CalendarListView';
import ViewTransition from './ViewTransition';
import { onDemandPredictionService } from '../services/onDemandPredictionService';

interface CalendarViewProps {
  fixtures: Match[];
  onSelectMatch: (match: Match) => void;
  onSelectTeam: (teamName: string) => void;
  onSelectPrediction?: (prediction: any) => void;
  className?: string;
}

type CalendarMode = 'week' | 'month';
type ViewMode = 'list' | 'calendar';

const CalendarView: React.FC<CalendarViewProps> = ({
  fixtures,
  onSelectMatch,
  onSelectTeam,
  onSelectPrediction,
  className = ''
}) => {
  const { getPrediction } = useAppContext();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarMode, setCalendarMode] = useState<CalendarMode>('week');
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [generatingPredictions, setGeneratingPredictions] = useState<Set<string>>(new Set());

  // Handle prediction generation
  const handlePredictionGenerate = useCallback(async (matchId: string, generate: () => Promise<void>) => {
    try {
      setGeneratingPredictions(prev => new Set(prev).add(matchId));
      await generate();
    } catch (error) {
      console.error('Failed to generate prediction:', error);
    } finally {
      setGeneratingPredictions(prev => {
        const newSet = new Set(prev);
        newSet.delete(matchId);
        return newSet;
      });
    }
  }, []);

  // Navigation functions
  const navigatePrevious = useCallback(() => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (calendarMode === 'week') {
        newDate.setDate(prev.getDate() - 7);
      } else {
        newDate.setMonth(prev.getMonth() - 1);
      }
      return newDate;
    });
  }, [calendarMode]);

  const navigateNext = useCallback(() => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (calendarMode === 'week') {
        newDate.setDate(prev.getDate() + 7);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  }, [calendarMode]);

  const navigateToToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  // Format date for display
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <div className={`calendar-view ${className}`}>
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between mb-6 space-y-4 sm:space-y-0">
        {/* View Toggle */}
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-300">View:</span>
          <div className="flex bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                viewMode === 'calendar' 
                  ? 'bg-blue-600 text-white' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              📅 Calendar
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                viewMode === 'list' 
                  ? 'bg-blue-600 text-white' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              📋 List
            </button>
          </div>
        </div>

        {/* Calendar Mode Toggle */}
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-300">Period:</span>
          <div className="flex bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setCalendarMode('week')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                calendarMode === 'week' 
                  ? 'bg-blue-600 text-white' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setCalendarMode('month')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                calendarMode === 'month' 
                  ? 'bg-blue-600 text-white' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Month
            </button>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center space-x-2">
          <button
            onClick={navigatePrevious}
            className="p-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            title="Previous"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={navigateToToday}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
          >
            Today
          </button>
          <button
            onClick={navigateNext}
            className="p-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            title="Next"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Current Period Display */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white">
          {calendarMode === 'week' 
            ? `Week of ${formatDate(currentDate)}`
            : currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
          }
        </h2>
      </div>

      {/* Calendar Grid View */}
      <ViewTransition
        isVisible={viewMode === 'calendar'}
        transitionType="fade"
        duration={300}
      >
        <CalendarGrid
          fixtures={fixtures}
          currentDate={currentDate}
          calendarMode={calendarMode}
          onSelectMatch={onSelectMatch}
          onSelectTeam={onSelectTeam}
          onSelectPrediction={onSelectPrediction}
          selectedDate={selectedDate}
          onDateSelect={setSelectedDate}
          generatingPredictions={generatingPredictions}
          onPredictionGenerate={handlePredictionGenerate}
        />
      </ViewTransition>

      {/* List View */}
      <ViewTransition
        isVisible={viewMode === 'list'}
        transitionType="fade"
        duration={300}
      >
        <CalendarListView
          fixtures={fixtures}
          currentDate={currentDate}
          calendarMode={calendarMode}
          onSelectMatch={onSelectMatch}
          onSelectTeam={onSelectTeam}
          onSelectPrediction={onSelectPrediction}
          generatingPredictions={generatingPredictions}
          onPredictionGenerate={handlePredictionGenerate}
        />
      </ViewTransition>
    </div>
  );
};

export default CalendarView;
