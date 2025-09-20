import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Match, League, Prediction } from '../types';
import { useAppContext } from '../contexts/AppContext';
import VirtualizedFixturesList from './VirtualizedFixturesList';
import PaginatedFixturesList from './PaginatedFixturesList';

interface SmartFixturesListProps {
  onSelectMatch: (match: Match) => void;
  onSelectTeam: (teamName: string) => void;
  todayOnly?: boolean;
  className?: string;
  virtualizationThreshold?: number;
  paginationThreshold?: number;
}

type ListMode = 'virtualized' | 'paginated' | 'simple';

const SmartFixturesList: React.FC<SmartFixturesListProps> = ({
  onSelectMatch,
  onSelectTeam,
  todayOnly = false,
  className = '',
  virtualizationThreshold = 100,
  paginationThreshold = 50
}) => {
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [listMode, setListMode] = useState<ListMode>('simple');
  const [userPreference, setUserPreference] = useState<ListMode | null>(null);

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

  // Filter fixtures
  const filteredFixtures = useMemo(() => {
    try {
      let filtered = [...fixtures];

      if (todayOnly) {
        // Use the correct current date: September 20, 2025
        const today = '2025-09-20';
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

  // Determine optimal list mode
  const determineListMode = useCallback((fixtureCount: number): ListMode => {
    // Check user preference first
    if (userPreference) {
      return userPreference;
    }

    // Auto-determine based on data size
    if (fixtureCount >= virtualizationThreshold) {
      return 'virtualized';
    } else if (fixtureCount >= paginationThreshold) {
      return 'paginated';
    } else {
      return 'simple';
    }
  }, [userPreference, virtualizationThreshold, paginationThreshold]);

  // Update list mode when data changes
  useEffect(() => {
    const newMode = determineListMode(filteredFixtures.length);
    setListMode(newMode);
    
    console.log(`SmartFixturesList: ${filteredFixtures.length} fixtures, using ${newMode} mode`);
  }, [filteredFixtures.length, determineListMode]);

  // Handle mode change
  const handleModeChange = useCallback((mode: ListMode) => {
    setListMode(mode);
    setUserPreference(mode);
    
    // Save preference to localStorage
    try {
      localStorage.setItem('fixturecast_list_mode', mode);
    } catch (error) {
      console.warn('Failed to save list mode preference:', error);
    }
  }, []);

  // Load user preference on mount
  useEffect(() => {
    try {
      const savedMode = localStorage.getItem('fixturecast_list_mode') as ListMode;
      if (savedMode && ['virtualized', 'paginated', 'simple'].includes(savedMode)) {
        setUserPreference(savedMode);
      }
    } catch (error) {
      console.warn('Failed to load list mode preference:', error);
    }
  }, []);

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

  // Render mode selector
  const renderModeSelector = () => {
    if (filteredFixtures.length < paginationThreshold) {
      return null; // No need for mode selector with small datasets
    }

    return (
      <div className="mb-4 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-900">Display Mode</h3>
            <p className="text-xs text-gray-600">
              {filteredFixtures.length} fixtures • {listMode} mode
            </p>
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={() => handleModeChange('simple')}
              className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                listMode === 'simple'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Simple
            </button>
            <button
              onClick={() => handleModeChange('paginated')}
              className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                listMode === 'paginated'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Paginated
            </button>
            <button
              onClick={() => handleModeChange('virtualized')}
              className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                listMode === 'virtualized'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Virtualized
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Render appropriate list component
  const renderListComponent = () => {
    const commonProps = {
      onSelectMatch,
      onSelectTeam,
      todayOnly,
      className
    };

    switch (listMode) {
      case 'virtualized':
        return <VirtualizedFixturesList {...commonProps} />;
      case 'paginated':
        return <PaginatedFixturesList {...commonProps} />;
      case 'simple':
      default:
        // Use the original CleanFixturesList for simple mode
        return (
          <CleanFixturesList
            onSelectMatch={onSelectMatch}
            onSelectTeam={onSelectTeam}
            todayOnly={todayOnly}
            className={className}
          />
        );
    }
  };

  return (
    <div className={`smart-fixtures-list ${className}`} id="fixtures-list">
      {/* Mode Selector */}
      {renderModeSelector()}
      
      {/* List Component */}
      {renderListComponent()}
      
      {/* Performance Info */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-4 p-4 bg-blue-50 rounded-lg text-sm">
          <h4 className="font-medium text-blue-900 mb-2">Performance Info</h4>
          <div className="space-y-1 text-blue-800">
            <p>Total fixtures: {filteredFixtures.length}</p>
            <p>Current mode: {listMode}</p>
            <p>User preference: {userPreference || 'auto'}</p>
            <p>Virtualization threshold: {virtualizationThreshold}</p>
            <p>Pagination threshold: {paginationThreshold}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SmartFixturesList;
