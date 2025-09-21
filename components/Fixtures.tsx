
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Match, League, Prediction, View } from '../types';
import { isSameLondonDay } from '../utils/timezone';
import MatchCard from './MatchCard';
import { useAppContext } from '../contexts/AppContext';
import MatchCardSkeleton from './MatchCardSkeleton';
import CleanFixturesList from './CleanFixturesList';
import SmartFixturesList from './SmartFixturesList';
import OptimizedFixturesList from './OptimizedFixturesList';
import FixturesAnchor from './FixturesAnchor';
import CompactFixtureCard from './CompactFixtureCard';
import TimeFocusedFixtureList from './TimeFocusedFixtureList';
import CompactSingleLineList from './CompactSingleLineList';
import EnhancedFixtureCard from './EnhancedFixtureCard';
import CalendarView from './CalendarView';
import FixturesListSkeleton from './FixturesListSkeleton';

interface FixturesProps {
  onSelectMatch: (match: Match) => void;
  onSelectTeam: (teamName: string) => void;
  onSelectPrediction?: (prediction: any) => void;
  selectedLeagueFilter?: League | 'all';
  onNavigate?: (view: any) => void;
  todayOnly?: boolean;
}

const BATCH_SIZE = 1;

const Fixtures: React.FC<FixturesProps> = ({ onSelectMatch, onSelectTeam, onSelectPrediction, selectedLeagueFilter, onNavigate, todayOnly = false }) => {
  // Add error handling for AppContext
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  
  // Reset error state when props change
  useEffect(() => {
    setHasError(false);
    setErrorMessage('');
  }, [onSelectMatch, onSelectTeam, selectedLeagueFilter, todayOnly]);
  
  // Access AppContext with proper error handling
  let context;
  let fixtures: Match[] = [];
  let getPrediction: (matchId: string) => Prediction | null = () => null;
  let fetchPrediction: (match: Match) => Promise<Prediction> = async () => ({} as Prediction);
  
  try {
    context = useAppContext();
    fixtures = context.fixtures || [];
    getPrediction = context.getPrediction || (() => null);
    fetchPrediction = context.fetchPrediction || (async () => ({} as Prediction));
  } catch (error) {
    console.error('Error accessing AppContext:', error);
    console.error('Mobile device info:', {
      userAgent: navigator.userAgent,
      isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      }
    });
    setHasError(true);
    setErrorMessage('Failed to load app data');
  }
  
  const [selectedLeague, setSelectedLeague] = useState<League | 'all'>('all');
  
  // Debug logging for fixtures data
  useEffect(() => {
    console.log('🔍 Fixtures component - fixtures updated:', {
      fixturesLength: fixtures.length,
      fixturesArray: fixtures,
      sampleFixtures: fixtures.slice(0, 3),
      selectedLeague: selectedLeague,
      filteredMatchesLength: filteredMatches?.length || 0,
      userAgent: navigator.userAgent,
      isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      }
    });
  }, [fixtures]);
  // Sync selected league with external filter when provided
  useEffect(() => {
    if (selectedLeagueFilter && selectedLeagueFilter !== selectedLeague) {
      setSelectedLeague(selectedLeagueFilter);
    }
  }, [selectedLeagueFilter]);

  const [isBatchFetching, setIsBatchFetching] = useState(false);
  const viewMode = 'enhanced'; // Fixed to enhanced view
  const [isLoading, setIsLoading] = useState(false);
  const [loadingError, setLoadingError] = useState<string | null>(null);

  // Show loading state when fixtures are empty or loading
  const showSkeleton = isLoading || (fixtures.length === 0 && !hasError);


  const filteredMatches = useMemo(() => {
    const excluded = new Set<League>([]);
    let base = fixtures.filter(m => !excluded.has(m.league));
    if (todayOnly) {
      const now = new Date();
      base = base.filter(m => isSameLondonDay(new Date(m.date), now));
    }
    
    if (selectedLeague === 'all') {
      return base;
    }
    return base.filter(match => match.league === selectedLeague);
  }, [fixtures, selectedLeague, todayOnly]);




  // (Lazy load removed per scope; fixtures are loaded at startup for all featured leagues)
  
  const processBatch = useCallback(async (matchesToFetch: Match[]) => {
      if (matchesToFetch.length === 0) {
          setIsBatchFetching(false);
          return;
      }
      
      const currentBatch = matchesToFetch.slice(0, BATCH_SIZE);
      const remainingMatches = matchesToFetch.slice(BATCH_SIZE);

      // Sequentially fetch predictions within the batch to avoid rate limiting
      for (const match of currentBatch) {
        try {
          await fetchPrediction(match);
        } catch (error) {
          console.error(`Failed to fetch prediction for match ${match.id}:`, error);
          // Continue with next match instead of stopping the entire batch
        }
      }
      
      // Use requestAnimationFrame to allow UI to update before next batch
      requestAnimationFrame(() => {
          processBatch(remainingMatches);
      });

  }, [fetchPrediction]);

  // Disable auto prediction fetching to avoid UI freezes; predictions load on demand per match
  useEffect(() => {
    setIsBatchFetching(false);
  }, [filteredMatches]);

  // Group matches by league - ONLY SHOW LEAGUES WITH TODAY'S GAMES, prioritize by league importance
  const groupedMatches = useMemo(() => {
    const today = new Date();
    
    // Define featured leagues with priority (most important first)
    const FEATURED_LEAGUES_PRIORITY = [
      // UEFA Competitions (Highest Priority)
      'UEFA Champions League',
      'UEFA Europa League', 
      'UEFA Europa Conference League',
      // Top 5 Leagues (Major Domestic)
      'Premier League',
      'La Liga',
      'Serie A', 
      'Bundesliga',
      'Ligue 1',
      // Championship
      'EFL Championship',
      // Other Major European
      'Eredivisie',
      'Primeira Liga',
      'Scottish Premiership',
      'Turkish Süper Lig',
      'Belgian Pro League',
      // International
      'Liga MX',
      'Major League Soccer',
      'Brasileirão Série A',
      'Argentine Liga Profesional'
    ];

    // Get only TODAY'S matches from filtered matches
    const todaysMatches: Match[] = [];

    filteredMatches.forEach(match => {
      const matchDate = new Date(match.date);
      if (isSameLondonDay(matchDate, today)) {
        todaysMatches.push(match);
      }
    });

    const groups: { [key: string]: Match[] } = {};

    // Only group TODAY's matches by league - don't show leagues without today's games
    todaysMatches.forEach(match => {
      // Only show featured leagues + championship
      if (FEATURED_LEAGUES_PRIORITY.includes(match.league)) {
        const leagueName = `🔥 TODAY - ${match.league}`;
        if (!groups[leagueName]) {
          groups[leagueName] = [];
        }
        groups[leagueName].push(match);
      }
    });

    // Sort within each league group by date/time
    Object.keys(groups).forEach(league => {
      groups[league].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    });

    // Sort league groups by priority (most important leagues first)
    const sortedEntries = Object.entries(groups).sort(([a], [b]) => {
      const aLeague = a.replace('🔥 TODAY - ', '');
      const bLeague = b.replace('🔥 TODAY - ', '');
      
      const aIndex = FEATURED_LEAGUES_PRIORITY.indexOf(aLeague);
      const bIndex = FEATURED_LEAGUES_PRIORITY.indexOf(bLeague);

      // If both leagues are in priority list, sort by priority
      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex;
      }

      // If only one is in priority list, prioritize it
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;

      // If neither is in priority list, sort alphabetically
      return aLeague.localeCompare(bLeague);
    });

    return Object.fromEntries(sortedEntries);
  }, [filteredMatches]);


  // Handle error state
  if (hasError) {
    return (
      <section className="bg-gray-800 rounded-xl p-6 shadow-2xl border border-gray-700 mx-4 sm:mx-0">
        <div className="text-center">
          <div className="text-red-400 text-2xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-white mb-2">Something went wrong</h2>
          <p className="text-gray-300 px-4">{errorMessage || 'Failed to load fixtures'}</p>
          <p className="text-sm text-gray-400 px-4 mt-2">Please try refreshing the page</p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm sm:text-base"
            >
              🔄 Refresh Page
            </button>
            <button
              onClick={() => {
                setHasError(false);
                setErrorMessage('');
              }}
              className="px-6 py-3 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors font-medium text-sm sm:text-base"
            >
              ↻ Try Again
            </button>
          </div>
          <div className="mt-6 text-xs text-gray-400 px-4">
            <p>Device: {/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? 'Mobile' : 'Desktop'}</p>
            <p>Viewport: {window.innerWidth}x{window.innerHeight}</p>
          </div>
        </div>
      </section>
    );
  }

  const renderContent = () => {
    const totalFixtures = Object.values(groupedMatches).flat().length;

    if (totalFixtures === 0) {
        return (
            <section className="bg-gray-800 rounded-xl p-6 shadow-2xl border border-gray-700 mx-4 sm:mx-0">
                <div className="text-center py-8">
                    <div className="text-6xl mb-4">⚽</div>
                    <h3 className="text-xl font-bold text-white mb-2">No upcoming fixtures</h3>
                    <p className="text-gray-300 px-4 mb-2">No fixtures found for {selectedLeague === 'all' ? 'any league' : selectedLeague}.</p>
                    <p className="text-sm text-gray-400 px-4">Please check another league or try again later.</p>
                </div>
            </section>
        );
    }

    return (
        <div className="space-y-6 sm:space-y-8">
            {Object.entries(groupedMatches).map(([leagueName, matches]) => (
                <section key={leagueName} className="bg-gray-800 rounded-xl p-4 sm:p-6 shadow-2xl border border-gray-700 mx-4 sm:mx-0">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center space-x-3">
                            <div className="text-blue-400 text-xl">🏆</div>
                            <h2 className="text-lg sm:text-xl font-bold text-white">
                                {leagueName}
                            </h2>
                        </div>
                        <div className="text-sm text-gray-300 bg-gray-700 px-3 py-1 rounded-full">
                            {matches.length} {matches.length === 1 ? 'fixture' : 'fixtures'}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                        {matches.map((match) => {
                            const prediction = getPrediction(match.id);
                            if (isBatchFetching && !prediction) {
                                return <MatchCardSkeleton key={match.id} />;
                            }
                            return (
                                <EnhancedFixtureCard
                                    key={match.id}
                                    match={match}
                                    prediction={prediction}
                                    onClick={() => onSelectMatch(match)}
                                    onSelectTeam={onSelectTeam}
                                    onSelectPrediction={onSelectPrediction}
                                    showPrediction={true}
                                    className="bg-gray-700 border-gray-600 hover:bg-gray-600"
                                />
                            );
                        })}
                    </div>
                </section>
            ))}
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 space-y-6 sm:space-y-8 lg:space-y-12">


      {/* Champions League Section - if present */}
      {groupedMatches[League.ChampionsLeague] && groupedMatches[League.ChampionsLeague].length > 0 && (
        <section className="bg-gray-800 rounded-xl p-4 sm:p-6 shadow-2xl border border-gray-700 mx-4 sm:mx-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-white">🏆 UEFA Champions League</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {groupedMatches[League.ChampionsLeague]
              .slice(0, 6)
              .map((match) => {
                const prediction = getPrediction(match.id);
                return (
                  <EnhancedFixtureCard
                    key={match.id}
                    match={match}
                    prediction={prediction}
                    onClick={() => onSelectMatch(match)}
                    onSelectTeam={onSelectTeam}
                    onSelectPrediction={onSelectPrediction}
                    showStatusBadge={true}
                    statusVariant="detailed"
                  />
                );
              })}
          </div>
        </section>
      )}

      {/* Render Different Views */}
      {showSkeleton ? (
        <FixturesAnchor anchorId="fixtures" priority={true}>
          <FixturesListSkeleton
            count={8}
            variant={viewMode}
            showHeader={false}
            showViewToggle={false}
          />
        </FixturesAnchor>
      ) : viewMode === 'compact' ? (
        <FixturesAnchor anchorId="fixtures" priority={true}>
          <div className="space-y-6 sm:space-y-8">
            {Object.entries(groupedMatches).map(([leagueName, matches]) => (
              <section key={leagueName} className="bg-gray-800 rounded-xl p-4 sm:p-6 shadow-2xl border border-gray-700 mx-4 sm:mx-0">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <div className="text-blue-400 text-xl">🏆</div>
                    <h2 className="text-lg sm:text-xl font-bold text-white">
                      {leagueName}
                    </h2>
                  </div>
                  <div className="text-sm text-gray-300 bg-gray-700 px-3 py-1 rounded-full">
                    {matches.length} {matches.length === 1 ? 'fixture' : 'fixtures'}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {matches.map((match) => {
                    const prediction = getPrediction(match.id);
                    return (
                      <EnhancedFixtureCard
                        key={match.id}
                        match={match}
                        prediction={prediction}
                        onClick={() => onSelectMatch(match)}
                        onSelectTeam={onSelectTeam}
                        onSelectPrediction={onSelectPrediction}
                        showPrediction={true}
                      />
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </FixturesAnchor>
      ) : viewMode === 'time-focused' ? (
        <FixturesAnchor anchorId="fixtures" priority={true}>
          <div className="space-y-6 sm:space-y-8">
            {Object.entries(groupedMatches).map(([leagueName, matches]) => (
              <section key={leagueName} className="bg-gray-800 rounded-xl p-4 sm:p-6 shadow-2xl border border-gray-700 mx-4 sm:mx-0">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <div className="text-blue-400 text-xl">🏆</div>
                    <h2 className="text-lg sm:text-xl font-bold text-white">
                      {leagueName}
                    </h2>
                  </div>
                  <div className="text-sm text-gray-300 bg-gray-700 px-3 py-1 rounded-full">
                    {matches.length} {matches.length === 1 ? 'fixture' : 'fixtures'}
                  </div>
                </div>
                <TimeFocusedFixtureList
                  fixtures={matches}
                  onSelectMatch={onSelectMatch}
                  onSelectTeam={onSelectTeam}
                  onSelectPrediction={onSelectPrediction}
                />
              </section>
            ))}
          </div>
        </FixturesAnchor>
      ) : viewMode === 'single-line' ? (
        <FixturesAnchor anchorId="fixtures" priority={true}>
          <div className="space-y-6 sm:space-y-8">
            {Object.entries(groupedMatches).map(([leagueName, matches]) => (
              <section key={leagueName} className="bg-gray-800 rounded-xl p-4 sm:p-6 shadow-2xl border border-gray-700 mx-4 sm:mx-0">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <div className="text-blue-400 text-xl">🏆</div>
                    <h2 className="text-lg sm:text-xl font-bold text-white">
                      {leagueName}
                    </h2>
                  </div>
                  <div className="text-sm text-gray-300 bg-gray-700 px-3 py-1 rounded-full">
                    {matches.length} {matches.length === 1 ? 'fixture' : 'fixtures'}
                  </div>
                </div>
                <CompactSingleLineList
                  fixtures={matches}
                  onSelectMatch={onSelectMatch}
                  onSelectTeam={onSelectTeam}
                  onSelectPrediction={onSelectPrediction}
                />
              </section>
            ))}
          </div>
        </FixturesAnchor>
      ) : viewMode === 'calendar' ? (
        <FixturesAnchor anchorId="fixtures" priority={true}>
          <div className="space-y-6 sm:space-y-8">
            {Object.entries(groupedMatches).map(([leagueName, matches]) => (
              <section key={leagueName} className="bg-gray-800 rounded-xl p-4 sm:p-6 shadow-2xl border border-gray-700 mx-4 sm:mx-0">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <div className="text-blue-400 text-xl">🏆</div>
                    <h2 className="text-lg sm:text-xl font-bold text-white">
                      {leagueName}
                    </h2>
                  </div>
                  <div className="text-sm text-gray-300 bg-gray-700 px-3 py-1 rounded-full">
                    {matches.length} {matches.length === 1 ? 'fixture' : 'fixtures'}
                  </div>
                </div>
                <CalendarView
                  fixtures={matches}
                  onSelectMatch={onSelectMatch}
                  onSelectTeam={onSelectTeam}
                  onSelectPrediction={onSelectPrediction}
                />
              </section>
            ))}
          </div>
        </FixturesAnchor>
      ) : viewMode === 'enhanced' ? (
        <FixturesAnchor anchorId="fixtures" priority={true}>
          <div className="space-y-6 sm:space-y-8">
            {Object.entries(groupedMatches).map(([leagueName, matches]) => (
              <section key={leagueName} className="bg-gray-800 rounded-xl p-4 sm:p-6 shadow-2xl border border-gray-700 mx-4 sm:mx-0">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <div className="text-blue-400 text-xl">🏆</div>
                    <h2 className="text-lg sm:text-xl font-bold text-white">
                      {leagueName}
                    </h2>
                  </div>
                  <div className="text-sm text-gray-300 bg-gray-700 px-3 py-1 rounded-full">
                    {matches.length} {matches.length === 1 ? 'fixture' : 'fixtures'}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {matches.map((match) => {
                    const prediction = getPrediction(match.id);
                    return (
                      <EnhancedFixtureCard
                        key={match.id}
                        match={match}
                        prediction={prediction}
                        onClick={() => onSelectMatch(match)}
                        onSelectTeam={onSelectTeam}
                        onSelectPrediction={onSelectPrediction}
                        showStatusBadge={true}
                        statusVariant="detailed"
                      />
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </FixturesAnchor>
      ) : viewMode === 'original' ? (
        <FixturesAnchor anchorId="fixtures" priority={true}>
          <div className="space-y-6 sm:space-y-8">
            {Object.entries(groupedMatches).map(([leagueName, matches]) => (
              <section key={leagueName} className="bg-gray-800 rounded-xl p-4 sm:p-6 shadow-2xl border border-gray-700 mx-4 sm:mx-0">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <div className="text-blue-400 text-xl">🏆</div>
                    <h2 className="text-lg sm:text-xl font-bold text-white">
                      {leagueName}
                    </h2>
                  </div>
                  <div className="text-sm text-gray-300 bg-gray-700 px-3 py-1 rounded-full">
                    {matches.length} {matches.length === 1 ? 'fixture' : 'fixtures'}
                  </div>
                </div>

                {/* Render original match cards for this league */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 px-4 sm:px-0">
                  {matches.map((match) => {
                    const prediction = getPrediction(match.id);
                    if (isBatchFetching && !prediction) {
                      return <MatchCardSkeleton key={match.id} />;
                    }
                    return (
                      <MatchCard
                        key={match.id}
                        match={match}
                        onSelectMatch={onSelectMatch}
                        onSelectTeam={onSelectTeam}
                      />
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </FixturesAnchor>
      ) : null}
    </div>
  );
};

export default Fixtures;

