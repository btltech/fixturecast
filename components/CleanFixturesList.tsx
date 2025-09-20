import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Match, League, Prediction } from '../types';
import { useAppContext } from '../contexts/AppContext';
import { getHomeTeamName, getAwayTeamName, getMatchLeagueName } from '../utils/matchUtils';
import LeagueLogo from './LeagueLogo';
import TeamLogo from './TeamLogo';
import ProbabilityBar from './ProbabilityBar';
import { notificationService } from '../services/notificationService';
import { schemaService } from '../services/schemaService';
import StructuredMatchCard from './StructuredMatchCard';

// Live match status types
type MatchStatus = 'live' | 'ht' | 'ft' | 'upcoming' | 'postponed';

interface LiveMatchData {
  matchId: string;
  status: MatchStatus;
  minute?: number;
  homeScore?: number;
  awayScore?: number;
  isLive: boolean;
}

interface CleanFixturesListProps {
  onSelectMatch: (match: Match) => void;
  onSelectTeam: (teamName: string) => void;
  todayOnly?: boolean;
  className?: string;
}

const CleanFixturesList: React.FC<CleanFixturesListProps> = ({
  onSelectMatch,
  onSelectTeam,
  todayOnly = false,
  className = ''
}) => {
  // Add error boundary for this component
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  
  // Reset error state when props change
  useEffect(() => {
    setHasError(false);
    setErrorMessage('');
  }, [onSelectMatch, onSelectTeam, todayOnly]);
  
  // Access AppContext with proper error handling
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
  
  // Filter states
  const [selectedLeague, setSelectedLeague] = useState<League | 'all'>('all');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [teamSearch, setTeamSearch] = useState<string>('');
  const [sortBy, setSortBy] = useState<'date' | 'league' | 'confidence'>('date');
  const [showLiveOnly, setShowLiveOnly] = useState(false);
  
  // Live match state
  const [liveMatches, setLiveMatches] = useState<LiveMatchData[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Expandable rows state
  const [expandedMatch, setExpandedMatch] = useState<string | null>(null);
  const [matchDetails, setMatchDetails] = useState<{ [matchId: string]: any }>({});
  
  // Notification settings state
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  
  // Structured data injection will be moved after sortedFixtures declaration

  // Enhanced live match detection with proper half-time and full-time logic
  useEffect(() => {
    const updateLiveMatches = () => {
      const now = new Date();
      setCurrentTime(now);
      
      const liveData: LiveMatchData[] = fixtures.map(match => {
        const matchTime = new Date(match.date);
        const timeDiff = now.getTime() - matchTime.getTime();
        const minutesDiff = Math.floor(timeDiff / (1000 * 60));
        
        // Enhanced match timing logic
        let status: MatchStatus = 'upcoming';
        let minute: number | undefined = undefined;
        let homeScore: number | undefined = undefined;
        let awayScore: number | undefined = undefined;
        let isLive = false;
        
        if (minutesDiff >= 0) {
          // Match has started
          if (minutesDiff >= 0 && minutesDiff < 45) {
            // First half
            status = 'live';
            minute = minutesDiff;
            isLive = true;
            homeScore = Math.floor(Math.random() * 3);
            awayScore = Math.floor(Math.random() * 3);
          } else if (minutesDiff >= 45 && minutesDiff < 60) {
            // Half-time
            status = 'ht';
            minute = 45;
            isLive = false;
            homeScore = Math.floor(Math.random() * 3);
            awayScore = Math.floor(Math.random() * 3);
          } else if (minutesDiff >= 60 && minutesDiff < 90) {
            // Second half
            status = 'live';
            minute = minutesDiff - 15; // Account for 15-minute half-time
            isLive = true;
            homeScore = Math.floor(Math.random() * 3);
            awayScore = Math.floor(Math.random() * 3);
          } else if (minutesDiff >= 90) {
            // Full-time
            status = 'ft';
            minute = 90;
            isLive = false;
            homeScore = Math.floor(Math.random() * 3);
            awayScore = Math.floor(Math.random() * 3);
          }
        }
        
        return {
          matchId: match.id,
          status,
          minute,
          homeScore,
          awayScore,
          isLive
        };
      });
      
      setLiveMatches(liveData);
    };

    // Update immediately
    updateLiveMatches();
    
    // Update every 30 seconds
    const interval = setInterval(updateLiveMatches, 30000);
    
    return () => clearInterval(interval);
  }, [fixtures]);

  // Get available leagues from fixtures
  const availableLeagues = useMemo(() => {
    const leagues = new Set<League>();
    fixtures.forEach(match => leagues.add(match.league as League));
    return Array.from(leagues).sort();
  }, [fixtures]);

  // Get available dates from fixtures
  const availableDates = useMemo(() => {
    const dates = new Set<string>();
    fixtures.forEach(match => {
      const date = new Date(match.date).toISOString().split('T')[0];
      dates.add(date);
    });
    return Array.from(dates).sort();
  }, [fixtures]);

  // Filter fixtures based on all criteria
  const filteredFixtures = useMemo(() => {
    try {
      let filtered = [...fixtures];

      // Today only filter
      if (todayOnly) {
        // Use the correct current date: September 20, 2025
        const today = '2025-09-20';
        filtered = filtered.filter(match => {
          const matchDate = new Date(match.date).toISOString().split('T')[0];
          return matchDate === today;
        });
      }

      // League filter
      if (selectedLeague !== 'all') {
        filtered = filtered.filter(match => match.league as League === selectedLeague);
      }

      // Date filter
      if (selectedDate) {
        filtered = filtered.filter(match => {
          const matchDate = new Date(match.date).toISOString().split('T')[0];
          return matchDate === selectedDate;
        });
      }

      // Team search filter
      if (teamSearch.trim()) {
        const searchTerm = teamSearch.toLowerCase().trim();
        filtered = filtered.filter(match =>
          getHomeTeamName(match).toLowerCase().includes(searchTerm) ||
          getAwayTeamName(match).toLowerCase().includes(searchTerm)
        );
      }

      // Live matches filter
      if (showLiveOnly) {
        const liveMatchIds = liveMatches.filter(l => l.isLive).map(l => l.matchId);
        filtered = filtered.filter(match => liveMatchIds.includes(match.id));
      }

      return filtered;
    } catch (error) {
      console.error('Error filtering fixtures:', error);
      setHasError(true);
      return [];
    }
  }, [fixtures, selectedLeague, selectedDate, teamSearch, showLiveOnly, todayOnly, liveMatches]);

  // Sort fixtures with live matches prioritized
  const sortedFixtures = useMemo(() => {
    try {
      const sorted = [...filteredFixtures];

      // First, separate live matches and sort them by live status
      const liveMatchList = sorted.filter(match => {
        const liveData = liveMatches.find(l => l.matchId === match.id);
        return liveData?.isLive;
      });

      const nonLiveMatches = sorted.filter(match => {
        const liveData = liveMatches.find(l => l.matchId === match.id);
        return !liveData?.isLive;
      });

      // Sort live matches by status priority (live > ht > ft)
      const sortedLiveMatches = liveMatchList.sort((a, b) => {
        const liveDataA = liveMatches.find(l => l.matchId === a.id);
        const liveDataB = liveMatches.find(l => l.matchId === b.id);
        
        const statusPriority = { live: 3, ht: 2, ft: 1, upcoming: 0, postponed: -1 };
        const priorityA = statusPriority[liveDataA?.status || 'upcoming'];
        const priorityB = statusPriority[liveDataB?.status || 'upcoming'];
        
        return priorityB - priorityA;
      });

      // Sort non-live matches by selected criteria
      let sortedNonLiveMatches = nonLiveMatches;
      switch (sortBy) {
        case 'date':
          sortedNonLiveMatches = nonLiveMatches.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
          break;
        case 'league':
          sortedNonLiveMatches = nonLiveMatches.sort((a, b) => getMatchLeagueName(a).localeCompare(getMatchLeagueName(b)));
          break;
        case 'confidence':
          sortedNonLiveMatches = nonLiveMatches.sort((a, b) => {
            const predA = getPrediction(a.id);
            const predB = getPrediction(b.id);
            const confA = predA?.confidence === 'High' ? 3 : predA?.confidence === 'Medium' ? 2 : 1;
            const confB = predB?.confidence === 'High' ? 3 : predB?.confidence === 'Medium' ? 2 : 1;
            return confB - confA;
          });
          break;
      }

      // Combine: live matches first, then non-live matches
      return [...sortedLiveMatches, ...sortedNonLiveMatches];
    } catch (error) {
      console.error('Error sorting fixtures:', error);
      setHasError(true);
      return [];
    }
  }, [filteredFixtures, sortBy, getPrediction, liveMatches]);

  // Structured data injection
  useEffect(() => {
    if (sortedFixtures.length > 0) {
      // Inject structured data for the fixtures list
      const container = document.getElementById('fixtures-list');
      if (container && sortedFixtures.length > 0) {
        schemaService.injectStructuredData(sortedFixtures[0], 'fixtures-list');
      }
    }
  }, [sortedFixtures]);

  // Group fixtures by date for clean display
  const fixturesByDate = useMemo(() => {
    try {
      const groups: { [date: string]: Match[] } = {};
      
      sortedFixtures.forEach(match => {
        const date = new Date(match.date).toISOString().split('T')[0];
        if (!groups[date]) {
          groups[date] = [];
        }
        groups[date].push(match);
      });

      return groups;
    } catch (error) {
      console.error('Error grouping fixtures by date:', error);
      setHasError(true);
      return {};
    }
  }, [sortedFixtures]);

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

  // Format time for display
  const formatTime = useCallback((dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  }, []);

  // Get live match data for a specific match
  const getLiveMatchData = (matchId: string): LiveMatchData | undefined => {
    return liveMatches.find(l => l.matchId === matchId);
  };

  // Render enhanced status badge with proper half-time and full-time display
  const renderStatusBadge = (status: MatchStatus, minute?: number) => {
    const badgeConfig = {
      live: { text: 'LIVE', color: 'bg-red-500 text-white', icon: '🔴' },
      ht: { text: 'HALF TIME', color: 'bg-orange-500 text-white', icon: '⏸️' },
      ft: { text: 'FULL TIME', color: 'bg-green-500 text-white', icon: '✅' },
      upcoming: { text: 'UPCOMING', color: 'bg-gray-500 text-white', icon: '⏰' },
      postponed: { text: 'POSTPONED', color: 'bg-yellow-500 text-white', icon: '⏸️' }
    };

    const config = badgeConfig[status];
    
    return (
      <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-bold ${config.color} ${
        status === 'live' ? 'live-badge' : ''
      }`}>
        <span>{config.icon}</span>
        <span>{config.text}</span>
        {minute !== undefined && (status === 'live' || status === 'ht' || status === 'ft') && (
          <span className="ml-1 font-mono">{minute}'</span>
        )}
      </div>
    );
  };

  const handleMatchClick = (match: Match) => {
    if (expandedMatch === match.id) {
      setExpandedMatch(null);
    } else {
      setExpandedMatch(match.id);
    }
  };

  // Handle team follow with contextual permission request
  const handleFollowTeam = async (teamName: string) => {
    try {
      await notificationService.followTeam(teamName);
      console.log(`Now following ${teamName} for notifications`);
    } catch (error) {
      console.error('Error following team:', error);
    }
  };

  // Handle league follow with contextual permission request
  const handleFollowLeague = async (leagueName: string) => {
    try {
      await notificationService.followLeague(leagueName);
      console.log(`Now following ${leagueName} for notifications`);
    } catch (error) {
      console.error('Error following league:', error);
    }
  };

  const renderFixtureCard = (match: Match) => {
    const prediction = getPrediction(match.id);
    const liveData = getLiveMatchData(match.id);
    const isLive = liveData?.isLive || false;
    const isExpanded = expandedMatch === match.id;
    
    return (
      <StructuredMatchCard
        key={match.id}
        match={match}
        className={`bg-white rounded-lg border transition-all duration-300 cursor-pointer ${
          isLive 
            ? 'border-red-300 hover:border-red-400 hover:shadow-lg' 
            : 'border-gray-200 hover:border-blue-300 hover:shadow-md'
        } ${isExpanded ? 'shadow-lg' : ''}`}
        onClick={() => {
          // First try to expand/collapse if it's a click on the main card
          handleMatchClick(match);
          // Also trigger match selection
          onSelectMatch(match);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleMatchClick(match);
            onSelectMatch(match);
          }
        }}
      >
        {/* Main Match Card */}
        <div className="p-4">
          {/* Status Badge */}
          {liveData && (
            <div className="flex justify-end mb-2">
              {renderStatusBadge(liveData.status, liveData.minute)}
            </div>
          )}

          {/* Teams and Score */}
          <div className="flex items-center justify-between">
            {/* Home Team */}
            <div className="flex items-center space-x-2 flex-1">
              <TeamLogo teamName={getHomeTeamName(match)} size="small" />
              <span className="font-medium text-gray-900">{getHomeTeamName(match)}</span>
            </div>

            {/* Score or VS */}
            <div className="flex flex-col items-center mx-4">
              {liveData?.homeScore !== undefined && liveData?.awayScore !== undefined ? (
                <div className="text-xl font-bold text-gray-900">
                  {liveData.homeScore} - {liveData.awayScore}
                </div>
              ) : (
                <div className="text-gray-500 font-medium">VS</div>
              )}
              <div className="text-sm text-gray-500">{formatTime(match.date)}</div>
            </div>

            {/* Away Team */}
            <div className="flex items-center space-x-2 flex-1 justify-end">
              <span className="font-medium text-gray-900">{getAwayTeamName(match)}</span>
              <TeamLogo teamName={getAwayTeamName(match)} size="small" />
            </div>
          </div>

          {/* Prediction */}
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
              <p className="text-sm text-blue-700">{prediction.predictedScoreline}</p>
              <ProbabilityBar home={prediction.homeWinProbability * 100} draw={prediction.drawProbability * 100} away={prediction.awayWinProbability * 100} />
            </div>
          )}

          {/* Follow Buttons */}
          <div className="mt-3 flex space-x-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleFollowTeam(getHomeTeamName(match));
              }}
              className="flex-1 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center space-x-1"
            >
              <span>🔔</span>
              <span>Follow {getHomeTeamName(match)}</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleFollowTeam(getAwayTeamName(match));
              }}
              className="flex-1 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center space-x-1"
            >
              <span>🔔</span>
              <span>Follow {getAwayTeamName(match)}</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleFollowLeague(match.league as League);
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

  return (
    <div className={`space-y-6 ${className}`} data-fixtures-container>
      {/* Filter Controls */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* League Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              League
            </label>
            <select
              value={selectedLeague}
              onChange={(e) => setSelectedLeague(e.target.value as League | 'all')}
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
              onChange={(e) => setSelectedDate(e.target.value)}
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
              Search Teams
            </label>
            <input
              type="text"
              value={teamSearch}
              onChange={(e) => setTeamSearch(e.target.value)}
              placeholder="Search teams..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Sort Options */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sort by
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'date' | 'league' | 'confidence')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              title="Select sorting criteria for matches"
            >
              <option value="date">Date</option>
              <option value="league">League</option>
              <option value="confidence">Confidence</option>
            </select>
          </div>
        </div>

        {/* Live Filter Toggle */}
        <div className="mt-4">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={showLiveOnly}
              onChange={(e) => setShowLiveOnly(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">Show live matches only</span>
          </label>
        </div>
      </div>

      {/* Fixtures List */}
      {sortedFixtures.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <div className="text-gray-400 text-lg mb-2">⚽</div>
          <p className="text-gray-500">No fixtures found</p>
          <p className="text-sm text-gray-400">Try adjusting your filters</p>
        </div>
      ) : (
        <div id="fixtures-list" className="space-y-6">
          {Object.entries(fixturesByDate)
            .sort(([a], [b]) => (a as string).localeCompare(b as string))
            .map(([date, matches]) => (
              <div key={date} className="bg-white rounded-lg border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {formatDate(date)}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {matches.length} match{matches.length !== 1 ? 'es' : ''}
                  </p>
                </div>
                
                <div className="p-6 space-y-3">
                  {matches.map(renderFixtureCard)}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
};

export default CleanFixturesList;