import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Match, League, Prediction } from '../types';
import { useAppContext } from '../contexts/AppContext';
import LeagueLogo from './LeagueLogo';
import TeamLogo from './TeamLogo';
import ProbabilityBar from './ProbabilityBar';
import { notificationService } from '../services/notificationService';
import { schemaService } from '../services/schemaService';
import StructuredMatchCard from './StructuredMatchCard';

interface VirtualizedFixturesListProps {
  onSelectMatch: (match: Match) => void;
  onSelectTeam: (teamName: string) => void;
  todayOnly?: boolean;
  className?: string;
}

interface VirtualItem {
  index: number;
  type: 'header' | 'match';
  data: any;
  height: number;
}

const ITEM_HEIGHT = 80; // Height of each match item
const HEADER_HEIGHT = 60; // Height of date/league headers
const CONTAINER_HEIGHT = 600; // Visible container height
const OVERSCAN = 5; // Number of items to render outside visible area

const VirtualizedFixturesList: React.FC<VirtualizedFixturesListProps> = ({
  onSelectMatch,
  onSelectTeam,
  todayOnly = false,
  className = ''
}) => {
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Get context data
  let context;
  let fixtures: Match[] = [];
  let getPrediction: (matchId: string) => Prediction | null = () => null;

  try {
    context = useAppContext();
    fixtures = context.fixtures || [];
    getPrediction = context.getPrediction || (() => null);
  } catch (error) {
    console.error('Error accessing AppContext:', error);
    setHasError(true);
    setErrorMessage('Failed to load app data');
  }

  // Filter and sort fixtures
  const filteredFixtures = useMemo(() => {
    try {
      let filtered = [...fixtures];

      if (todayOnly) {
        const today = new Date().toISOString().split('T')[0];
        filtered = filtered.filter(match => {
          const matchDate = new Date(match.date).toISOString().split('T')[0];
          return matchDate === today;
        });
      }

      return filtered.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    } catch (error) {
      console.error('Error filtering fixtures:', error);
      return [];
    }
  }, [fixtures, todayOnly]);

  // Group fixtures by date
  const fixturesByDate = useMemo(() => {
    try {
      const groups: { [date: string]: Match[] } = {};

      filteredFixtures.forEach(match => {
        const date = new Date(match.date).toISOString().split('T')[0];
        if (!groups[date]) {
          groups[date] = [];
        }
        groups[date].push(match);
      });

      return groups;
    } catch (error) {
      console.error('Error grouping fixtures by date:', error);
      return {};
    }
  }, [filteredFixtures]);

  // Create virtual items
  const virtualItems = useMemo(() => {
    const items: VirtualItem[] = [];
    let index = 0;

    Object.entries(fixturesByDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([date, matches]) => {
        // Add date header
        items.push({
          index: index++,
          type: 'header',
          data: { date, matchCount: matches.length },
          height: HEADER_HEIGHT
        });

        // Add match items
        matches.forEach(match => {
          items.push({
            index: index++,
            type: 'match',
            data: match,
            height: ITEM_HEIGHT
          });
        });
      });

    return items;
  }, [fixturesByDate]);

  // Virtualization state
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate visible range
  const visibleRange = useMemo(() => {
    const start = Math.floor(scrollTop / ITEM_HEIGHT);
    const end = Math.min(
      start + Math.ceil(CONTAINER_HEIGHT / ITEM_HEIGHT) + OVERSCAN,
      virtualItems.length
    );
    
    return { start: Math.max(0, start - OVERSCAN), end };
  }, [scrollTop, virtualItems.length]);

  // Get visible items
  const visibleItems = useMemo(() => {
    return virtualItems.slice(visibleRange.start, visibleRange.end);
  }, [virtualItems, visibleRange]);

  // Calculate total height
  const totalHeight = useMemo(() => {
    return virtualItems.reduce((sum, item) => sum + item.height, 0);
  }, [virtualItems]);

  // Handle scroll
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    setScrollTop(target.scrollTop);
  }, []);

  // Render date header
  const renderDateHeader = (date: string, matchCount: number) => {
    const formatDate = (dateString: string) => {
      const date = new Date(dateString);
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const isToday = date.toDateString() === today.toDateString();
      const isTomorrow = date.toDateString() === tomorrow.toDateString();

      if (isToday) return 'Today';
      if (isTomorrow) return 'Tomorrow';

      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric'
      });
    };

    return (
      <div className="date-header">
        <h3 className="text-lg font-semibold text-gray-900">
          {formatDate(date)}
        </h3>
        <p className="text-sm text-gray-500">
          {matchCount} match{matchCount !== 1 ? 'es' : ''}
        </p>
      </div>
    );
  };

  // Render match item
  const renderMatchItem = (match: Match) => {
    const prediction = getPrediction(match.id);
    
    return (
      <StructuredMatchCard
        key={match.id}
        match={match}
        className="match-item cursor-pointer"
      >
        <div 
          className="match-content"
          onClick={() => onSelectMatch(match)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onSelectMatch(match);
            }
          }}
          aria-label={`View match details for ${match.homeTeam} vs ${match.awayTeam}`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 flex-1 min-w-0">
              <TeamLogo teamName={match.homeTeam} size="small" />
              <span className="font-medium text-gray-900 truncate">{match.homeTeam}</span>
            </div>

            <div className="flex flex-col items-center space-y-1 mx-2 flex-shrink-0">
              <div className="text-sm text-gray-500 font-medium">VS</div>
            </div>

            <div className="flex items-center space-x-2 flex-1 min-w-0 justify-end">
              <span className="font-medium text-gray-900 truncate text-right">{match.awayTeam}</span>
              <TeamLogo teamName={match.awayTeam} size="small" />
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
            <span className="flex items-center space-x-1">
              <LeagueLogo leagueName={match.league} size="small" />
              <span>{match.league}</span>
            </span>
            <span>{new Date(match.date).toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true
            })}</span>
          </div>

          {prediction && (
            <div className="mt-2 p-2 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-blue-800">AI Prediction</span>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  prediction.confidence === 'High' ? 'bg-green-100 text-green-800' :
                  prediction.confidence === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {prediction.confidence}
                </span>
              </div>
              <p className="text-sm text-blue-700">{prediction.prediction}</p>
              <ProbabilityBar prediction={prediction} />
            </div>
          )}
        </div>
      </StructuredMatchCard>
    );
  };

  // Handle error state
  if (hasError) {
    return (
      <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
        <div className="text-gray-400 text-lg mb-2">⚠️</div>
        <p className="text-gray-500">{errorMessage || 'Failed to load fixtures'}</p>
        <p className="text-sm text-gray-400">Please try refreshing the page</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Refresh Page
        </button>
      </div>
    );
  }

  return (
    <div className={`virtualized-fixtures-list ${className}`} id="fixtures-list">
      {/* Virtual Container */}
      <div
        ref={containerRef}
        className="virtual-container"
        style={{
          height: CONTAINER_HEIGHT,
          overflow: 'auto',
          position: 'relative'
        }}
        onScroll={handleScroll}
      >
        {/* Virtual Spacer */}
        <div
          style={{
            height: totalHeight,
            position: 'relative'
          }}
        >
          {/* Visible Items */}
          {visibleItems.map((item, index) => {
            const style: React.CSSProperties = {
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: item.height,
              transform: `translateY(${item.index * item.height}px)`
            };

            return (
              <div key={`${item.type}-${item.index}`} style={style}>
                {item.type === 'header' ? (
                  renderDateHeader(item.data.date, item.data.matchCount)
                ) : (
                  renderMatchItem(item.data)
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Debug Info */}
      {process.env.NODE_ENV === 'development' && (
        <div className="debug-info mt-4 p-4 bg-gray-100 rounded-lg text-sm">
          <p>Total items: {virtualItems.length}</p>
          <p>Visible range: {visibleRange.start} - {visibleRange.end}</p>
          <p>Scroll top: {Math.round(scrollTop)}</p>
          <p>Total height: {totalHeight}px</p>
        </div>
      )}
    </div>
  );
};

export default VirtualizedFixturesList;
