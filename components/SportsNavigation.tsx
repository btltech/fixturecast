import React, { useState, useEffect, useRef } from 'react';
import { League } from '../types';
import { useAppContext } from '../contexts/AppContext';
import LeagueLogo from './LeagueLogo';
import TeamLogo from './TeamLogo';
import MobileFilterPanel from './MobileFilterPanel';

interface SportsNavigationProps {
  onNavigate: (view: string, options?: any) => void;
  currentView: string;
  onFilterChange?: (filters: NavigationFilters) => void;
  className?: string;
}

interface NavigationFilters {
  sport: string;
  league: League | 'all';
  team: string;
  searchQuery: string;
  favoritesOnly: boolean;
}

interface Sport {
  id: string;
  name: string;
  icon: string;
  leagues: League[];
}

const SportsNavigation: React.FC<SportsNavigationProps> = ({
  onNavigate,
  currentView,
  onFilterChange,
  className = ''
}) => {
  const { fixtures, teams, favoriteTeams } = useAppContext();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<NavigationFilters>({
    sport: 'football',
    league: 'all',
    team: '',
    searchQuery: '',
    favoritesOnly: false
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const dropdownRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // Sports configuration
  const sports: Sport[] = [
    {
      id: 'football',
      name: 'Football',
      icon: '⚽',
      leagues: [
        League.PremierLeague,
        League.LaLiga,
        League.SerieA,
        League.Bundesliga,
        League.Ligue1,
        League.ChampionsLeague,
        League.EuropaLeague,
        League.ConferenceLeague
      ]
    },
    {
      id: 'basketball',
      name: 'Basketball',
      icon: '🏀',
      leagues: [] // Add basketball leagues when available
    },
    {
      id: 'tennis',
      name: 'Tennis',
      icon: '🎾',
      leagues: [] // Add tennis leagues when available
    }
  ];

  // Get available leagues for current sport
  const availableLeagues = sports.find(sport => sport.id === filters.sport)?.leagues || [];
  const filteredLeagues = availableLeagues.filter(league => 
    fixtures.some(fixture => fixture.league === league)
  );

  // Get available teams for current league
  const availableTeams = filters.league === 'all' 
    ? Object.keys(teams).filter(team => 
        fixtures.some(fixture => 
          fixture.homeTeam === team || fixture.awayTeam === team
        )
      )
    : Object.keys(teams).filter(team =>
        fixtures.some(fixture => 
          fixture.league === filters.league && 
          (fixture.homeTeam === team || fixture.awayTeam === team)
        )
      );

  // Filter teams by search query
  const filteredTeams = availableTeams.filter(team =>
    team.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle filter changes
  const handleFilterChange = (newFilters: Partial<NavigationFilters>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    onFilterChange?.(updatedFilters);
  };

  // Handle sport change
  const handleSportChange = (sportId: string) => {
    const sport = sports.find(s => s.id === sportId);
    if (sport) {
      handleFilterChange({
        sport: sportId,
        league: 'all',
        team: '',
        searchQuery: ''
      });
    }
    setActiveDropdown(null);
  };

  // Handle league change
  const handleLeagueChange = (league: League | 'all') => {
    handleFilterChange({
      league,
      team: ''
    });
    setActiveDropdown(null);
  };

  // Handle team selection
  const handleTeamSelect = (team: string) => {
    handleFilterChange({ team });
    setActiveDropdown(null);
    onNavigate('team', { teamName: team });
  };

  // Handle search
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    handleFilterChange({ searchQuery: query });
  };

  // Handle favorites toggle
  const handleFavoritesToggle = () => {
    handleFilterChange({ favoritesOnly: !filters.favoritesOnly });
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      Object.values(dropdownRefs.current).forEach(ref => {
        if (ref && !ref.contains(event.target as Node)) {
          setActiveDropdown(null);
        }
      });
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when opened
  useEffect(() => {
    if (isSearchOpen && searchRef.current) {
      searchRef.current.focus();
    }
  }, [isSearchOpen]);

  // Close mobile menu when view changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [currentView]);

  return (
    <nav className={`bg-gray-900 border-b border-gray-700 sticky top-0 z-50 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Brand */}
          <div className="flex items-center space-x-4">
            <button
              onClick={() => onNavigate('dashboard')}
              className="flex items-center space-x-2 text-white hover:text-blue-400 transition-colors"
            >
              <span className="text-2xl">⚽</span>
              <span className="font-bold text-xl">FixtureCast</span>
            </button>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-1">
            {/* Sport Filter */}
            <div className="relative" ref={el => dropdownRefs.current.sport = el}>
              <button
                onClick={() => setActiveDropdown(activeDropdown === 'sport' ? null : 'sport')}
                className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
              >
                <span>{sports.find(s => s.id === filters.sport)?.icon}</span>
                <span>{sports.find(s => s.id === filters.sport)?.name}</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {activeDropdown === 'sport' && (
                <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                  {sports.map(sport => (
                    <button
                      key={sport.id}
                      onClick={() => handleSportChange(sport.id)}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center space-x-2 ${
                        filters.sport === sport.id ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                      }`}
                    >
                      <span>{sport.icon}</span>
                      <span>{sport.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* League Filter */}
            <div className="relative" ref={el => dropdownRefs.current.league = el}>
              <button
                onClick={() => setActiveDropdown(activeDropdown === 'league' ? null : 'league')}
                className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
              >
                <LeagueLogo leagueName={filters.league === 'all' ? 'All Leagues' : filters.league} size="small" />
                <span>{filters.league === 'all' ? 'All Leagues' : filters.league}</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {activeDropdown === 'league' && (
                <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 max-h-80 overflow-y-auto">
                  <button
                    onClick={() => handleLeagueChange('all')}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center space-x-2 ${
                      filters.league === 'all' ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                    }`}
                  >
                    <span className="w-4 h-4"></span>
                    <span>All Leagues</span>
                  </button>
                  {filteredLeagues.map(league => (
                    <button
                      key={league}
                      onClick={() => handleLeagueChange(league)}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center space-x-2 ${
                        filters.league === league ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                      }`}
                    >
                      <LeagueLogo leagueName={league} size="small" />
                      <span>{league}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Team Filter */}
            <div className="relative" ref={el => dropdownRefs.current.team = el}>
              <button
                onClick={() => setActiveDropdown(activeDropdown === 'team' ? null : 'team')}
                className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
              >
                <TeamLogo teamName={filters.team || 'All Teams'} size="small" />
                <span>{filters.team || 'All Teams'}</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {activeDropdown === 'team' && (
                <div className="absolute top-full left-0 mt-1 w-80 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 max-h-80 overflow-y-auto">
                  {/* Search within teams */}
                  <div className="px-4 py-2 border-b border-gray-200">
                    <input
                      type="text"
                      placeholder="Search teams..."
                      value={searchQuery}
                      onChange={(e) => handleSearch(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  {/* Favorites toggle */}
                  <button
                    onClick={handleFavoritesToggle}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center space-x-2 ${
                      filters.favoritesOnly ? 'bg-yellow-50 text-yellow-700' : 'text-gray-700'
                    }`}
                  >
                    <span>⭐</span>
                    <span>{filters.favoritesOnly ? 'Show Favorites Only' : 'Show All Teams'}</span>
                  </button>

                  {/* Team list */}
                  {(filters.favoritesOnly ? favoriteTeams : filteredTeams).map(team => (
                    <button
                      key={team}
                      onClick={() => handleTeamSelect(team)}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center space-x-2 ${
                        filters.team === team ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                      }`}
                    >
                      <TeamLogo teamName={team} size="small" />
                      <span>{team}</span>
                      {favoriteTeams.includes(team) && <span className="text-yellow-500">⭐</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Search Bar */}
          <div className="hidden md:flex items-center space-x-4">
            <div className="relative">
              <button
                onClick={() => setIsSearchOpen(!isSearchOpen)}
                className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <span>Search</span>
              </button>

              {isSearchOpen && (
                <div className="absolute top-full right-0 mt-1 w-80 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-50">
                  <input
                    ref={searchRef}
                    type="text"
                    placeholder="Search matches, teams, leagues..."
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        setIsSearchOpen(false);
                      }
                    }}
                  />
                  <div className="mt-2 text-xs text-gray-500">
                    Press Enter to search, Escape to close
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="lg:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-gray-300 hover:text-white p-2"
              title="Toggle mobile menu"
              aria-label="Toggle mobile menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-700 py-4">
            <div className="space-y-4">
              {/* Mobile Search */}
              <div className="px-4">
                <input
                  type="text"
                  placeholder="Search matches, teams, leagues..."
                  className="w-full px-3 py-2 text-sm bg-gray-800 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Mobile Sport Filter */}
              <div className="px-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">Sport</label>
                <select
                  value={filters.sport}
                  onChange={(e) => handleSportChange(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-gray-800 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  title="Select sport"
                  aria-label="Select sport"
                >
                  {sports.map(sport => (
                    <option key={sport.id} value={sport.id}>
                      {sport.icon} {sport.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Mobile League Filter */}
              <div className="px-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">League</label>
                <select
                  value={filters.league}
                  onChange={(e) => handleLeagueChange(e.target.value as League | 'all')}
                  className="w-full px-3 py-2 text-sm bg-gray-800 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  title="Select league"
                  aria-label="Select league"
                >
                  <option value="all">All Leagues</option>
                  {filteredLeagues.map(league => (
                    <option key={league} value={league}>{league}</option>
                  ))}
                </select>
              </div>

              {/* Mobile Team Filter */}
              <div className="px-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">Team</label>
                <select
                  value={filters.team}
                  onChange={(e) => handleTeamSelect(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-gray-800 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  title="Select team"
                  aria-label="Select team"
                >
                  <option value="">All Teams</option>
                  {filteredTeams.map(team => (
                    <option key={team} value={team}>{team}</option>
                  ))}
                </select>
              </div>

              {/* Mobile Favorites Toggle */}
              <div className="px-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={filters.favoritesOnly}
                    onChange={handleFavoritesToggle}
                    className="rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-300">Show favorites only</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Mobile Filter Panel */}
        <MobileFilterPanel
          isOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
          onFilterChange={onFilterChange}
          currentFilters={filters}
          fixtures={fixtures}
          teams={teams}
          favoriteTeams={favoriteTeams}
        />
      </div>
    </nav>
  );
};

export default SportsNavigation;
