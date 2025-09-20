import React, { useState, useMemo } from 'react';
import { League } from '../types';
import { 
  LEAGUE_GROUPS, 
  LeagueSortOption, 
  sortLeagues, 
  filterLeaguesBySearch,
  getLeagueFlags 
} from '../utils/leagueUtils';
import LeagueLogo from './LeagueLogo';

interface LeagueFilterProps {
  leagues: (League | 'all')[];
  selectedLeague: League | 'all';
  onLeagueSelect: (league: League | 'all') => void;
  fixtureCount?: { [key in League]?: number };
  className?: string;
}

const LeagueFilter: React.FC<LeagueFilterProps> = ({
  leagues,
  selectedLeague,
  onLeagueSelect,
  fixtureCount = {},
  className = ''
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<LeagueSortOption>('region');
  const [isExpanded, setIsExpanded] = useState(false);
  const [showOnlyWithFixtures, setShowOnlyWithFixtures] = useState(false);

  const leagueFlags = getLeagueFlags();

  // Filter out 'all' for processing, add it back later
  const actualLeagues = leagues.filter((l): l is League => l !== 'all');

  // Apply search filter
  const searchFilteredLeagues = useMemo(() => {
    return filterLeaguesBySearch(actualLeagues, searchTerm);
  }, [actualLeagues, searchTerm]);

  // Apply fixture filter
  const fixtureFilteredLeagues = useMemo(() => {
    if (!showOnlyWithFixtures) return searchFilteredLeagues;
    return searchFilteredLeagues.filter(league => (fixtureCount[league] || 0) > 0);
  }, [searchFilteredLeagues, showOnlyWithFixtures, fixtureCount]);

  // Sort leagues
  const sortedLeagues = useMemo(() => {
    return sortLeagues(fixtureFilteredLeagues, sortBy, fixtureCount);
  }, [fixtureFilteredLeagues, sortBy, fixtureCount]);

  // Group leagues if sorting by region
  const groupedLeagues = useMemo(() => {
    if (sortBy !== 'region') {
      return [{ name: 'All Leagues', emoji: '⚽', leagues: sortedLeagues, priority: 1 }];
    }

    const groups = LEAGUE_GROUPS
      .map(group => ({
        ...group,
        leagues: group.leagues.filter(league => sortedLeagues.includes(league))
      }))
      .filter(group => group.leagues.length > 0)
      .sort((a, b) => a.priority - b.priority);

    return groups;
  }, [sortedLeagues, sortBy]);

  const totalFixtures = Object.values(fixtureCount).reduce((sum, count) => sum + (count || 0), 0);
  const leaguesWithFixtures = Object.values(fixtureCount).filter(count => (count || 0) > 0).length;

  const renderLeagueButton = (league: League | 'all') => {
    const isSelected = selectedLeague === league;
    const fixtures = league === 'all' ? totalFixtures : (fixtureCount[league as League] || 0);
    const hasFixtures = fixtures > 0;

    return (
      <button
        key={league}
        onClick={() => onLeagueSelect(league)}
        className={`group relative flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
          isSelected
            ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
            : hasFixtures 
              ? 'bg-gray-700/80 text-gray-200 hover:bg-gray-600/80 border border-green-500/20'
              : 'bg-gray-800/60 text-gray-400 hover:bg-gray-700/60 border border-gray-600/20'
        }`}
        title={`${league === 'all' ? 'All Leagues' : league} - ${fixtures} fixtures`}
      >
        {/* League Logo/Flag */}
        <div className="flex-shrink-0">
          {league === 'all' ? (
            <div className="w-4 h-4 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
              <span className="text-white text-xs font-bold">⚽</span>
            </div>
          ) : (
            <LeagueLogo league={league as League} size="small" />
          )}
        </div>

        {/* League Name */}
        <span className="truncate">
          {league === 'all' ? 'All Leagues' : league}
        </span>

        {/* Fixture Count */}
        {hasFixtures && (
          <span className={`text-xs px-1.5 py-0.5 rounded-full ${
            isSelected 
              ? 'bg-white/20 text-white' 
              : 'bg-green-500/20 text-green-400'
          }`}>
            {fixtures}
          </span>
        )}

        {/* Active Indicator */}
        {hasFixtures && !isSelected && (
          <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full" />
        )}
      </button>
    );
  };

  return (
    <div className={`bg-gray-800 rounded-xl border border-gray-700 ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-white">
            🏟️ League Filter
          </h3>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-400 hover:text-white transition-colors"
          >
            {isExpanded ? '🔼' : '🔽'}
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative mb-3">
          <input
            type="text"
            placeholder="Search leagues or countries..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-700 text-white placeholder-gray-400 rounded-lg px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="absolute right-3 top-2.5 text-gray-400">
            🔍
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between text-sm text-gray-400">
          <span>{leaguesWithFixtures} leagues with fixtures</span>
          <span>{totalFixtures} total fixtures</span>
        </div>
      </div>

      {/* Controls */}
      {isExpanded && (
        <div className="p-4 border-b border-gray-700 space-y-3">
          {/* Sort Options */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Sort by:
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as LeagueSortOption)}
              className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              title="Sort leagues by different criteria"
            >
              <option value="region">🌍 Region</option>
              <option value="popularity">⭐ Popularity</option>
              <option value="fixture-count">📊 Fixture Count</option>
              <option value="alphabetical">🔤 Alphabetical</option>
            </select>
          </div>

          {/* Filters */}
          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2 text-sm text-gray-300">
              <input
                type="checkbox"
                checked={showOnlyWithFixtures}
                onChange={(e) => setShowOnlyWithFixtures(e.target.checked)}
                className="rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
              />
              <span>Only leagues with fixtures</span>
            </label>
          </div>
        </div>
      )}

      {/* League Lists */}
      <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
        {/* All Leagues Button */}
        {renderLeagueButton('all')}

        {/* Grouped Leagues */}
        {groupedLeagues.map(group => (
          <div key={group.name}>
            {sortBy === 'region' && group.leagues.length > 0 && (
              <div className="flex items-center space-x-2 mb-2 text-sm font-semibold text-gray-300">
                <span>{group.emoji}</span>
                <span>{group.name}</span>
                <span className="text-xs text-gray-500">({group.leagues.length})</span>
              </div>
            )}
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {group.leagues.map(league => renderLeagueButton(league))}
            </div>
          </div>
        ))}

        {/* No Results */}
        {sortedLeagues.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            <div className="text-2xl mb-2">🔍</div>
            <p>No leagues found</p>
            <p className="text-sm">Try adjusting your search or filters</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LeagueFilter;
