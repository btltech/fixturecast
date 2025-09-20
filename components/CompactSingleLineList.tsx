import React, { useState, useMemo } from 'react';
import { Match, League } from '../types';
import { useAppContext } from '../contexts/AppContext';
import CompactSingleLineCard from './CompactSingleLineCard';

interface CompactSingleLineListProps {
  fixtures: Match[];
  onSelectMatch: (match: Match) => void;
  onSelectTeam: (teamName: string) => void;
  onSelectPrediction?: (prediction: any) => void;
  className?: string;
}

const CompactSingleLineList: React.FC<CompactSingleLineListProps> = ({
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

  // Group fixtures by date
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

  // Format date header
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
    <div className={`space-y-4 ${className}`}>
      {sortedDates.map(dateKey => {
        const dateFixtures = fixturesByDate[dateKey];
        const dateInfo = formatDateHeader(dateKey);
        
        return (
          <div key={dateKey} className="space-y-2">
            {/* Date Header */}
            <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 py-2 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <h3 className={`text-lg font-bold text-gray-900 dark:text-white ${
                    dateInfo.isToday ? 'text-blue-600 dark:text-blue-400' : 
                    dateInfo.isTomorrow ? 'text-green-600 dark:text-green-400' : ''
                  }`}>
                    {dateInfo.isToday ? 'TODAY' : 
                     dateInfo.isTomorrow ? 'TOMORROW' : 
                     dateInfo.day}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {dateInfo.date}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    {dateFixtures.length} {dateFixtures.length === 1 ? 'match' : 'matches'}
                  </span>
                </div>
              </div>
            </div>

            {/* Compact Single Line Cards */}
            <div className="space-y-1">
              {dateFixtures.map((match) => {
                const prediction = getPrediction(match.id);
                return (
                  <CompactSingleLineCard
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

export default CompactSingleLineList;
