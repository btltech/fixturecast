import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Match, League, Prediction } from '../types';
import { useAppContext } from '../contexts/AppContext';
import LeagueLogo from './LeagueLogo';
import TeamLogo from './TeamLogo';
import ProbabilityBar from './ProbabilityBar';
import { notificationService } from '../services/notificationService';
import { schemaService } from '../services/schemaService';
import StructuredMatchCard from './StructuredMatchCard';

interface PaginatedFixturesListProps {
  onSelectMatch: (match: Match) => void;
  onSelectTeam: (teamName: string) => void;
  todayOnly?: boolean;
  className?: string;
  itemsPerPage?: number;
}

const PaginatedFixturesList: React.FC<PaginatedFixturesListProps> = ({
  onSelectMatch,
  onSelectTeam,
  todayOnly = false,
  className = '',
  itemsPerPage = 20
}) => {
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedLeague, setSelectedLeague] = useState<League | 'all'>('all');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [teamSearch, setTeamSearch] = useState<string>('');

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
        const today = new Date().toISOString().split('T')[0];
        filtered = filtered.filter(match => {
          const matchDate = new Date(match.date).toISOString().split('T')[0];
          return matchDate === today;
        });
      }

      if (selectedLeague !== 'all') {
        filtered = filtered.filter(match => match.league === selectedLeague);
      }

      if (selectedDate) {
        filtered = filtered.filter(match => {
          const matchDate = new Date(match.date).toISOString().split('T')[0];
          return matchDate === selectedDate;
        });
      }

      if (teamSearch.trim()) {
        const searchTerm = teamSearch.toLowerCase().trim();
        filtered = filtered.filter(match =>
          match.homeTeam.toLowerCase().includes(searchTerm) ||
          match.awayTeam.toLowerCase().includes(searchTerm)
        );
      }

      return filtered.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    } catch (error) {
      console.error('Error filtering fixtures:', error);
      return [];
    }
  }, [fixtures, todayOnly, selectedLeague, selectedDate, teamSearch]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredFixtures.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentFixtures = filteredFixtures.slice(startIndex, endIndex);

  // Available leagues and dates
  const availableLeagues = useMemo(() => {
    const leagues = new Set<League>();
    fixtures.forEach(match => leagues.add(match.league));
    return Array.from(leagues).sort();
  }, [fixtures]);

  const availableDates = useMemo(() => {
    const dates = new Set<string>();
    fixtures.forEach(match => {
      const date = new Date(match.date).toISOString().split('T')[0];
      dates.add(date);
    });
    return Array.from(dates).sort();
  }, [fixtures]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedLeague, selectedDate, teamSearch]);

  // Handle page change
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    // Scroll to top of fixtures list
    const fixturesList = document.getElementById('fixtures-list');
    if (fixturesList) {
      fixturesList.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  // Handle league change
  const handleLeagueChange = useCallback((league: League | 'all') => {
    setSelectedLeague(league);
  }, []);

  // Handle date change
  const handleDateChange = useCallback((date: string) => {
    setSelectedDate(date);
  }, []);

  // Handle team search
  const handleTeamSearch = useCallback((search: string) => {
    setTeamSearch(search);
  }, []);

  // Format date for display
  const formatDate = useCallback((dateString: string) => {
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
  }, []);

  // Handle team follow
  const handleFollowTeam = useCallback(async (teamName: string) => {
    try {
      await notificationService.followTeam(teamName);
      console.log(`Now following ${teamName} for notifications`);
    } catch (error) {
      console.error('Error following team:', error);
    }
  }, []);

  // Handle league follow
  const handleFollowLeague = useCallback(async (leagueName: string) => {
    try {
      await notificationService.followLeague(leagueName);
      console.log(`Now following ${leagueName} for notifications`);
    } catch (error) {
      console.error('Error following league:', error);
    }
  }, []);

  // Render match item
  const renderMatchItem = (match: Match) => {
    const prediction = getPrediction(match.id);
    
    return (
      <StructuredMatchCard
        key={match.id}
        match={match}
        className="bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all duration-300 cursor-pointer"
      >
        <div 
          className="p-4"
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
            <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between mb-2">
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

          {/* Follow Buttons */}
          <div className="mt-3 flex space-x-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleFollowTeam(match.homeTeam);
              }}
              className="flex-1 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center space-x-1"
            >
              <span>🔔</span>
              <span>Follow {match.homeTeam}</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleFollowTeam(match.awayTeam);
              }}
              className="flex-1 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center space-x-1"
            >
              <span>🔔</span>
              <span>Follow {match.awayTeam}</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleFollowLeague(match.league);
              }}
              className="px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors flex items-center justify-center space-x-1"
            >
              <span>🏆</span>
              <span>Follow League</span>
            </button>
          </div>
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
    <div className={`paginated-fixtures-list ${className}`} id="fixtures-list">
      {/* Filter Controls */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* League Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              League
            </label>
            <select
              value={selectedLeague}
              onChange={(e) => handleLeagueChange(e.target.value as League | 'all')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              title="Select league to filter matches"
            >
              <option value="all">All Leagues</option>
              {availableLeagues.map(league => (
                <option key={league} value={league}>
                  {league}
                </option>
              ))}
            </select>
          </div>

          {/* Date Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date
            </label>
            <select
              value={selectedDate}
              onChange={(e) => handleDateChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              title="Select date to filter matches"
            >
              <option value="">All Dates</option>
              {availableDates.map(date => (
                <option key={date} value={date}>
                  {formatDate(date)}
                </option>
              ))}
            </select>
          </div>

          {/* Team Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Team Search
            </label>
            <input
              type="text"
              value={teamSearch}
              onChange={(e) => handleTeamSearch(e.target.value)}
              placeholder="Search teams..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Results Count */}
          <div className="flex items-end">
            <div className="text-sm text-gray-600">
              {filteredFixtures.length} matches found
            </div>
          </div>
        </div>
      </div>

      {/* Fixtures List */}
      {currentFixtures.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <div className="text-gray-400 text-lg mb-2">⚽</div>
          <p className="text-gray-500">No fixtures found</p>
          <p className="text-sm text-gray-400">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="space-y-4">
          {currentFixtures.map(renderMatchItem)}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing {startIndex + 1} to {Math.min(endIndex, filteredFixtures.length)} of {filteredFixtures.length} matches
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            
            <div className="flex items-center space-x-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = i + 1;
                const isActive = page === currentPage;
                
                return (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
            </div>
            
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaginatedFixturesList;
