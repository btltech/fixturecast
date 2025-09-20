import React, { useState, useMemo } from 'react';
import { Match, League } from '../types';
import { useAppContext } from '../contexts/AppContext';
import TimeFocusedFixtureCard from './TimeFocusedFixtureCard';

interface TimeFocusedFixtureListProps {
  fixtures: Match[];
  onSelectMatch: (match: Match) => void;
  onSelectTeam: (teamName: string) => void;
  onSelectPrediction?: (prediction: any) => void;
  className?: string;
}

const TimeFocusedFixtureList: React.FC<TimeFocusedFixtureListProps> = ({
  fixtures,
  onSelectMatch,
  onSelectTeam,
  onSelectPrediction,
  className = ''
}) => {
  const { getPrediction } = useAppContext();
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Check for dark mode preference
  React.useEffect(() => {
    const checkDarkMode = () => {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDarkMode(prefersDark);
    };

    checkDarkMode();
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', checkDarkMode);

    return () => mediaQuery.removeEventListener('change', checkDarkMode);
  }, []);

  // Group fixtures by date with time focus
  const fixturesByDate = useMemo(() => {
    const groups: { [key: string]: Match[] } = {};
    
    fixtures.forEach(match => {
      const date = new Date(match.date);
      const dateKey = date.toDateString();
      
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(match);
    });

    // Sort matches within each date by time
    Object.keys(groups).forEach(dateKey => {
      groups[dateKey].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    });

    return groups;
  }, [fixtures]);

  // Format date header with emphasis on time
  const formatDateHeader = (dateString: string): { day: string; date: string; isToday: boolean; isTomorrow: boolean } => {
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const isTomorrow = date.toDateString() === new Date(now.getTime() + 24 * 60 * 60 * 1000).toDateString();
    
    const day = date.toLocaleDateString('en-US', { weekday: 'long' });
    const dateStr = date.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
    
    return { day, date: dateStr, isToday, isTomorrow };
  };

  // Sort dates chronologically
  const sortedDates = useMemo(() => {
    return Object.keys(fixturesByDate).sort((a, b) => {
      return new Date(a).getTime() - new Date(b).getTime();
    });
  }, [fixturesByDate]);

  if (fixtures.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <div className="text-gray-500 dark:text-gray-400">
          <svg className="mx-auto h-12 w-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-lg font-semibold">No fixtures found</p>
          <p className="text-sm">Try adjusting your filters or check back later</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {sortedDates.map(dateKey => {
        const dateFixtures = fixturesByDate[dateKey];
        const dateInfo = formatDateHeader(dateKey);
        
        return (
          <div key={dateKey} className="space-y-4">
            {/* Date Header - Prominent and Bold */}
            <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 py-3 border-b-2 border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <h2 className={`text-2xl font-black text-gray-900 dark:text-white leading-tight ${
                    dateInfo.isToday ? 'text-blue-600 dark:text-blue-400' : 
                    dateInfo.isTomorrow ? 'text-green-600 dark:text-green-400' : ''
                  }`}>
                    {dateInfo.isToday ? 'TODAY' : 
                     dateInfo.isTomorrow ? 'TOMORROW' : 
                     dateInfo.day}
                  </h2>
                  <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 mt-1">
                    {dateInfo.date}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-gray-500 dark:text-gray-400">
                    {dateFixtures.length} {dateFixtures.length === 1 ? 'match' : 'matches'}
                  </span>
                </div>
              </div>
            </div>

            {/* Fixtures Grid - Responsive */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {dateFixtures.map((match) => {
                const prediction = getPrediction(match.id);
                return (
                  <TimeFocusedFixtureCard
                    key={match.id}
                    match={match}
                    prediction={prediction}
                    onSelectMatch={onSelectMatch}
                    onSelectTeam={onSelectTeam}
                    onSelectPrediction={onSelectPrediction}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TimeFocusedFixtureList;
