import React, { createContext, useState, useCallback, useMemo, useContext, ReactNode, useEffect, useRef } from 'react';
import { nowLondonDateString, isSameLondonDay } from '../utils/timezone';
import { Match, Prediction, Toast as ToastType, Alert, PastPrediction, Team, LeagueTableRow, League, AppData, AlertType, PredictionAccuracy, AccuracyStats, LiveMatch, LiveMatchUpdate, ConfidenceLevel } from '../types';
import { getMatchPrediction } from '../services/geminiService';
import { buildContextForMatch } from '../utils/contextUtils';
import { getAllKnownTeams, getTeamData } from '../services/teamDataService';
import { calculatePredictionAccuracy, calculateAccuracyStats, formatAccuracyDisplay, getLiveAccuracyStats, checkAndUpdateMatchResults, getStoredAccuracyData } from '../services/accuracyService';
import { autoPredictionService } from '../services/autoPredictionService';
import { getLiveMatches, getLiveMatchUpdates, isMatchLive } from '../services/liveMatchService';
import { getFormAnalysis } from '../services/formAnalysisService';
import type { FormAnalysis } from '../types';
import { loadingStateService } from '../services/loadingStateService';
import { 
    getAllUpcomingFixtures, 
    getAllLeagueTables, 
    getAllTeams, 
    getApiUsage, 
    getLeagueTable,
    getInjuries,
    getLeagueId,
    getUpcomingFixtures,
    getTodaysFixtures,
    hasBudget,
    getTeamsByLeague,
    getHeadToHead,
    getRecentTeamForm,
    getTeamStats
} from '../services/footballApiService';
// // import { generatePredictionsForMatches } from '../services/predictionService';
import { advancedPredictionSyncService } from '../services/advancedPredictionSyncService';

interface AppContextType {
    // State
    teams: { [key: string]: Team };
    fixtures: Match[];
    pastPredictions: PastPrediction[];
    leagueTables: { [key in League]?: LeagueTableRow[] };
    favoriteTeams: string[];
    favoriteLeagues: League[];
    alerts: Alert[];
    toasts: ToastType[];
    isLoading: boolean;
    unreadAlertsCount: number;
    apiUsage: { callsUsed: number; callsRemaining: number; percentageUsed: number };
    lastUpdated: { fixtures?: number; teams?: number; tables?: number };
    accuracyRecords: PredictionAccuracy[];
    accuracyStats: AccuracyStats;
    liveMatches: LiveMatch[];
    liveMatchUpdates: { [matchId: string]: LiveMatchUpdate };
    teamCache: { [teamName: string]: { data: Team; timestamp: number; expiresAt: number } };
    todaysFixturesWithPredictions: { match: Match; prediction: Prediction | null; loading: boolean }[];
    fixtureError: string | null;

    // Functions
    loadInitialData: () => void;
    refreshRealTimeData: (options?: { force?: boolean }) => Promise<void>;
    addToast: (message: string, type?: ToastType['type']) => void;
    fetchPrediction: (match: Match) => Promise<Prediction>;
    getPrediction: (matchId: string) => Prediction | null;
    toggleFavoriteTeam: (teamName: string) => void;
    toggleFavoriteLeague: (league: League) => void;
    addAlert: (alert: Omit<Alert, 'id' | 'timestamp' | 'read'>) => void;
    markAlertsAsRead: () => void;
    loadLeagueTable: (league: League) => Promise<void>;
    recordPredictionAccuracy: (matchId: string, actualResult: { homeScore: number; awayScore: number }) => void;
    getAccuracyDisplay: () => string;
    generateTodaysPredictions: () => Promise<{ success: number; failed: number; total: number }>;
    getLiveAccuracyStats: () => AccuracyStats;
    fetchLiveMatches: () => Promise<void>;
    getLiveMatch: (matchId: string) => LiveMatch | null;
    updateLiveMatches: () => Promise<void>;
    updateDailyPredictions: () => Promise<void>;
    loadLeagueFixtures: (league: League) => Promise<void>;
    getTeamForm: (teamId: number, teamName: string) => FormAnalysis;
    // Team cache management
    getCachedTeamData: (teamName: string) => Team | null;
    setCachedTeamData: (teamName: string, teamData: Team) => void;
    clearTeamCache: () => void;
    getTeamDetails: (teamName: string, forceRefresh?: boolean) => Promise<Team | null>;
    refreshTeamDetails: (teamName: string) => Promise<Team | null>;
    refreshAllTeamDetails: () => Promise<void>;
    getTeamDataStatus: () => { totalTeams: number; cachedComplete: number; percentageComplete: number; needsRefresh: number };
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode; value?: Partial<AppContextType> }> = ({ children, value }) => {
  try {
    const [appData, setAppData] = useState<AppData>({
        teams: {},
        fixtures: [],
        leagueTables: {},
    });
    const [pastPredictions, setPastPredictions] = useState<PastPrediction[]>([]);
    const [favoriteTeams, setFavoriteTeams] = useState<string[]>(['Manchester City', 'Real Madrid']);
    // HARD-CODED FEATURED LEAGUES ONLY - NO OTHER LEAGUES ALLOWED
    const [favoriteLeagues, setFavoriteLeagues] = useState<League[]>([League.PremierLeague, League.LaLiga, League.SerieA, League.Championship]);
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [toasts, setToasts] = useState<ToastType[]>([]);
    const [predictionCache, setPredictionCache] = useState<{ [matchId: string]: Prediction }>({});
    const hasLocalStorage = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
    const [lastUpdated, setLastUpdated] = useState<{ fixtures?: number; teams?: number; tables?: number }>({});
    const [accuracyRecords, setAccuracyRecords] = useState<PredictionAccuracy[]>([]);
    const [accuracyStats, setAccuracyStats] = useState<AccuracyStats>({
        totalPredictions: 0,
        correctOutcomes: 0,
        correctScorelines: 0,
        correctBtts: 0,
        correctGoalLine: 0,
        correctHtft: 0,
        correctScoreRange: 0,
        correctFirstGoalscorer: 0,
        correctCleanSheet: 0,
        correctCorners: 0,
        recentAccuracy: { last10: 0, last20: 0, last50: 0 },
        overallAccuracy: 0
    });
    const [liveMatches, setLiveMatches] = useState<LiveMatch[]>([]);
    const [liveMatchUpdates, setLiveMatchUpdates] = useState<{ [matchId: string]: LiveMatchUpdate }>({});
    const [teamCache, setTeamCache] = useState<{ [teamName: string]: { data: Team; timestamp: number; expiresAt: number } }>({});
    const [fixtureError, setFixtureError] = useState<string | null>(null);

    // Keys for persistent caches
    const FIXTURES_CACHE_KEY = 'fixturecast_fixtures_cache_v1';
    const TABLES_CACHE_KEY = 'fixturecast_tables_cache_v1';
    const TEAMS_CACHE_KEY = 'fixturecast_teams_cache_v1';
    const TEAM_CACHE_KEY = 'fixturecast_team_cache_v1';
    const ACCURACY_CACHE_KEY = 'fixturecast_accuracy_cache_v1';

    // Persist and hydrate prediction cache to avoid re-calling Gemini unnecessarily
    useEffect(() => {
        if (!hasLocalStorage) return;
        try {
            const raw = window.localStorage.getItem('fixturecast_prediction_cache');
            if (raw) {
                const parsed = JSON.parse(raw) as { [matchId: string]: Prediction };
                setPredictionCache(parsed);
            }
        } catch (error) {
            console.warn('Failed to load prediction cache:', error);
        }
    }, []);

    useEffect(() => {
        if (!hasLocalStorage) return;
        try {
            window.localStorage.setItem('fixturecast_prediction_cache', JSON.stringify(predictionCache));
        } catch (error) {
            console.warn('Failed to save prediction cache:', error);
        }
    }, [predictionCache]);

    const [isLoading, setIsLoading] = useState(true);

    // Hydrate cached fixtures/tables/teams ASAP to avoid empty UI when API budget is exhausted
    useEffect(() => {
        if (!hasLocalStorage) return;
        try {
            const fRaw = window.localStorage.getItem(FIXTURES_CACHE_KEY);
            const tRaw = window.localStorage.getItem(TABLES_CACHE_KEY);
            const teamsRaw = window.localStorage.getItem(TEAMS_CACHE_KEY);
            
            const cachedFixtures: Match[] = fRaw ? JSON.parse(fRaw) : [];
            const cachedTables: { [key in League]?: LeagueTableRow[] } = tRaw ? JSON.parse(tRaw) : {};
            const cachedTeams: { [key: string]: Team } = teamsRaw ? JSON.parse(teamsRaw) : {};
            
            if (Array.isArray(cachedFixtures) && cachedFixtures.length > 0) {
                setAppData(prev => ({ ...prev, fixtures: cachedFixtures }));
            }
            if (cachedTables && Object.keys(cachedTables).length > 0) {
                setAppData(prev => ({ ...prev, leagueTables: cachedTables }));
            }
            if (cachedTeams && Object.keys(cachedTeams).length > 0) {
                setAppData(prev => ({ ...prev, teams: cachedTeams }));
            }

            // Load accuracy data using the enhanced accuracy service
            // This will automatically load historical data if needed
            const accuracyData = getStoredAccuracyData();
            if (accuracyData && accuracyData.length > 0) {
                setAccuracyRecords(accuracyData);
                const stats = calculateAccuracyStats(accuracyData);
                setAccuracyStats(stats);
                console.log(`✅ Loaded ${accuracyData.length} accuracy records from enhanced accuracy service`);
            }
        } catch (error) {
            console.warn('Failed to load cached data:', error);
        }
    }, [hasLocalStorage]);

    const addToast = useCallback((message: string, type: ToastType['type'] = 'info') => {
        const id = new Date().toISOString() + Math.random();
        const newToast: ToastType = { id, message, type };
        setToasts(currentToasts => [newToast, ...currentToasts.slice(0, 4)]);
        setTimeout(() => {
            setToasts(currentToasts => currentToasts.filter(t => t.id !== id));
        }, 4000);
    }, []);

    const loadInitialData = useCallback(async () => {
        setIsLoading(true);
        setFixtureError(null);
        loadingStateService.setLoading('fixtures', true);
        loadingStateService.setLoading('teams', true);
        loadingStateService.setLoading('tables', true);
        
        try {
            addToast("Loading fixtures from Premier League, Champions League, and Europa League. Please wait a moment for the data to load.", "info");
            console.log('🔄 AppContext: About to call loadCriticalFixtures...');
            
            const criticalFixtures = await loadCriticalFixtures();
            console.log(`🔄 AppContext: loadCriticalFixtures returned ${criticalFixtures.length} fixtures`);
            
            console.log('🔄 AppContext: Getting known teams...');
            const knownTeams = getAllKnownTeams();
            console.log(`🔄 AppContext: Got ${Object.keys(knownTeams).length} known teams`);
            
                        // Load past predictions from static file (browser only)
                        let pastPredictions: PastPrediction[] = [];
                        if (typeof window !== 'undefined') {
                            try {
                                const pastPredictionsRes = await fetch('/data/past-predictions.json', { cache: 'no-cache' });
                                if (pastPredictionsRes.ok) {
                                    pastPredictions = await pastPredictionsRes.json();
                                    setPastPredictions(pastPredictions);
                                } else {
                                    console.warn('Past predictions fetch non-200:', pastPredictionsRes.status);
                                }
                            } catch (error) {
                                console.warn('Could not load past predictions:', (error as any)?.message || error);
                            }
                        }

                        // Load today's predictions from generated file (browser only)
                        if (typeof window !== 'undefined') {
                            try {
                                const currentPredictionsRes = await fetch('/predictions-data.json', { cache: 'no-cache' });
                                if (!currentPredictionsRes.ok) {
                                    console.warn('Predictions file fetch failed:', currentPredictionsRes.status);
                                } else {
                                    const currentPredictionsData = await currentPredictionsRes.json();
                                    console.log('🎯 Loaded current predictions:', currentPredictionsData);
                                    if (currentPredictionsData.predictions?.length) {
                                        const todaysPredictions: { [matchId: string]: Prediction } = {};
                                        const todaysMatches: Match[] = [];
                                        for (const pred of currentPredictionsData.predictions) {
                                            if (pred.matchId && pred.prediction) {
                                                const confidence = pred.prediction.confidence || 50;
                                                todaysPredictions[pred.matchId.toString()] = {
                                                    homeWinProbability: confidence,
                                                    drawProbability: Math.max(0, 100 - confidence - 25),
                                                    awayWinProbability: 25,
                                                    predictedScoreline: pred.prediction.predictedScore || '1-1',
                                                    confidence: confidence > 80 ? ConfidenceLevel.High : confidence > 60 ? ConfidenceLevel.Medium : ConfidenceLevel.Low,
                                                    keyFactors: [{ category: 'AI Analysis', points: [pred.prediction.outcome || 'Predicted outcome'] }],
                                                    goalLine: {
                                                        line: 2.5,
                                                        overProbability: pred.prediction.overUnder === 'Over 2.5' ? 60 : 40,
                                                        underProbability: pred.prediction.overUnder === 'Under 2.5' ? 60 : 40
                                                    },
                                                    btts: {
                                                        yesProbability: pred.prediction.btts === 'Yes' ? 60 : 40,
                                                        noProbability: pred.prediction.btts === 'No' ? 60 : 40
                                                    }
                                                };
                                                const matchExists = criticalFixtures.some(fixture => fixture.id === pred.matchId.toString());
                                                if (!matchExists) {
                                                    todaysMatches.push({
                                                        id: pred.matchId.toString(),
                                                        homeTeam: pred.homeTeam,
                                                        awayTeam: pred.awayTeam,
                                                        homeTeamId: pred.matchId,
                                                        awayTeamId: pred.matchId + 1,
                                                        league: pred.league as League,
                                                        date: pred.matchDate,
                                                        venue: pred.venue || '',
                                                        status: 'NS',
                                                        homeScore: null,
                                                        awayScore: null
                                                    });
                                                }
                                            }
                                        }
                                        const updatedFixtures = [...criticalFixtures, ...todaysMatches];
                                        setPredictionCache(todaysPredictions);
                                        addToast(`Loaded ${currentPredictionsData.predictions.length} predictions for today!`, 'success');
                                        console.log('✅ Today\'s predictions loaded into cache:', todaysPredictions);
                                        setAppData(prev => ({ ...prev, fixtures: updatedFixtures }));
                                    }
                                }
                            } catch (error) {
                                console.warn('Could not load current predictions:', (error as any)?.message || error);
                            }
                        }
            
            // Set initial data
            console.log('🔄 AppContext: Setting app data with', criticalFixtures.length, 'fixtures');
            setAppData({ 
                teams: knownTeams, 
                fixtures: criticalFixtures, 
                leagueTables: {} 
            });
            setLastUpdated({ fixtures: Date.now() });
            setIsLoading(false);
            loadingStateService.setLoading('fixtures', false);
            addToast(`Successfully loaded ${criticalFixtures.length} fixtures!`, "success");
            
            addToast(`Loaded ${criticalFixtures.length} fixtures`, "success");
            console.log(`✅ AppContext: Successfully loaded ${criticalFixtures.length} fixtures, isLoading set to false`);
            
            // Load remaining data in background
            setTimeout(() => loadRemainingData(criticalFixtures, knownTeams), 1000);
            
        } catch (error) {
            console.error("Failed to fetch initial data:", error);
            addToast("Failed to load data. Please refresh.", "error");
            setIsLoading(false);
            loadingStateService.setLoading('fixtures', false);
            loadingStateService.setLoading('teams', false);
            loadingStateService.setLoading('tables', false);
        }
    }, [addToast]);

    // Load critical fixtures first (simplified and reliable)
    const loadCriticalFixtures = async (): Promise<Match[]> => {
        const fixtures: Match[] = [];
        
        try {
            console.log('🔍 loadCriticalFixtures: Starting fixture loading...');
            
            // Load Premier League fixtures
            console.log('🔍 Loading Premier League fixtures...');
            try {
                const premierLeagueFixtures = await getTodaysFixtures(League.PremierLeague);
                console.log(`🔍 Premier League: ${premierLeagueFixtures.length} fixtures`, premierLeagueFixtures);
                if (premierLeagueFixtures.length > 0) {
                    fixtures.push(...premierLeagueFixtures);
                    console.log(`✅ Added ${premierLeagueFixtures.length} Premier League fixtures to total: ${fixtures.length}`);
                }
            } catch (error) {
                console.error('❌ Error loading Premier League fixtures:', error);
                addToast(`Error loading Premier League fixtures: ${error.message}`, "error");
            }
            
            // Load Champions League fixtures
            console.log('🔍 Loading Champions League fixtures...');
            try {
                const championsLeagueFixtures = await getTodaysFixtures(League.ChampionsLeague);
                console.log(`🔍 Champions League: ${championsLeagueFixtures.length} fixtures`);
                if (championsLeagueFixtures.length > 0) {
                    fixtures.push(...championsLeagueFixtures);
                    console.log(`✅ Added ${championsLeagueFixtures.length} Champions League fixtures`);
                }
            } catch (error) {
                console.error('❌ Error loading Champions League fixtures:', error);
            }
            
            // Load Europa League fixtures
            console.log('🔍 Loading Europa League fixtures...');
            try {
                const europaLeagueFixtures = await getTodaysFixtures(League.EuropaLeague);
                console.log(`🔍 Europa League: ${europaLeagueFixtures.length} fixtures`);
                if (europaLeagueFixtures.length > 0) {
                    fixtures.push(...europaLeagueFixtures);
                    console.log(`✅ Added ${europaLeagueFixtures.length} Europa League fixtures`);
                }
            } catch (error) {
                console.error('❌ Error loading Europa League fixtures:', error);
            }
            
            // If no today's games, load upcoming fixtures
            if (fixtures.length === 0) {
                console.log('🔍 No todays games found, loading upcoming fixtures...');
                try {
                    const upcomingPremier = await getUpcomingFixtures(League.PremierLeague, 5);
                    console.log(`🔍 Upcoming Premier League: ${upcomingPremier.length} fixtures`);
                    
                    const upcomingChampions = await getUpcomingFixtures(League.ChampionsLeague, 5);
                    console.log(`🔍 Upcoming Champions League: ${upcomingChampions.length} fixtures`);
                    
                    const upcomingEuropa = await getUpcomingFixtures(League.EuropaLeague, 5);
                    console.log(`🔍 Upcoming Europa League: ${upcomingEuropa.length} fixtures`);
                    
                    fixtures.push(...upcomingPremier, ...upcomingChampions, ...upcomingEuropa);
                    console.log(`✅ Added ${upcomingPremier.length + upcomingChampions.length + upcomingEuropa.length} upcoming fixtures`);
                } catch (error) {
                    console.error('❌ Error loading upcoming fixtures:', error);
                }
            }
            
            // Remove duplicates
            const uniqueFixtures = fixtures.filter((fixture, index, self) =>
            index === self.findIndex(f => f.id === fixture.id)
        );
        
            console.log(`🔍 loadCriticalFixtures: Returning ${uniqueFixtures.length} unique fixtures`);
            return uniqueFixtures;
        } catch (error) {
            console.error('Error loading critical fixtures:', error);
            return [];
        }
    };

    // 🚀 PROFESSIONAL GRADE: Fetch comprehensive team details for ALL teams
    // This ensures instant team information when users click anywhere in the app
    const fetchAllTeamDetails = async (existingTeams: { [key: string]: Team }) => {
        try {
            const teamNames = Object.keys(existingTeams);
            const totalTeams = teamNames.length;
            let processedTeams = 0;
            let successCount = 0;

            // Silent pre-fetching operation

            // Process teams in batches to avoid overwhelming the API
            const BATCH_SIZE = 5;
            const batches = [];
            for (let i = 0; i < teamNames.length; i += BATCH_SIZE) {
                batches.push(teamNames.slice(i, i + BATCH_SIZE));
            }

            for (const batch of batches) {
                if (!hasBudget()) {
                    console.warn('⏸️ API budget reached during team pre-fetching');
                    addToast("API budget reached - some team details may load on demand", "warning");
                    break;
                }

                // Process batch in parallel - silent operation
                const batchPromises = batch.map(async (teamName) => {
                    try {
                        // Check if we already have cached detailed data
                        const cached = teamCache[teamName];
                        if (cached && cached.expiresAt > Date.now()) {
                            return true;
                        }

                        // Fetch comprehensive team details
                        const { getTeamDetails: fetchTeamDetails } = await import('../services/footballApiService');
                        const teamDetails = await fetchTeamDetails(teamName);

                        if (teamDetails) {
                            // Cache the successful result
                            teamCache[teamName] = {
                                data: teamDetails,
                                timestamp: Date.now(),
                                expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
                            };
                            setTeamCache(prev => ({
                                ...prev,
                                [teamName]: teamCache[teamName]
                            }));
                            return true;
                        }
                        return false;
                    } catch (error) {
                        return false;
                    }
                });

                const batchResults = await Promise.all(batchPromises);
                const batchSuccess = batchResults.filter(Boolean).length;

                processedTeams += batch.length;
                successCount += batchSuccess;

                // Small delay between batches to be API-friendly
                await new Promise(resolve => setTimeout(resolve, 300));
            }

            // Pre-fetching complete - teams cached silently

        } catch (error) {
            // Silent error handling - teams will load on demand if needed
        }
    };

    // Load remaining data in background
    // Enhanced background loading for featured leagues
    const loadRemainingData = async (existingFixtures: Match[], existingTeams: { [key: string]: Team }) => {
        try {
            // 🚀 PROFESSIONAL GRADE: Start comprehensive team details fetching immediately
            // This ensures ALL team information is available instantly when users click teams
            setTimeout(() => {
                fetchAllTeamDetails(existingTeams);
            }, 200); // Small delay to not compete with initial UI loading

            // Enhanced featured leagues background loading - PRIORITIZED by importance
            const FEATURED_LEAGUES = [
                // 🎯 PRIORITY 1: UEFA Competitions (Highest Priority)
                League.ChampionsLeague,
                League.EuropaLeague,
                League.EuropaConferenceLeague,

                // 🏆 PRIORITY 2: Top 5 Leagues (Major Domestic)
                League.PremierLeague,
                League.LaLiga,
                League.SerieA,
                League.Bundesliga, // German Bundesliga - now included!
                League.Ligue1,

                // 🥈 PRIORITY 3: Other Major European Leagues
                League.Eredivisie,
                League.PrimeiraLiga,
                League.ScottishPremiership,
                League.SuperLig,
                League.Championship,

                // 🌎 PRIORITY 4: International Leagues
                League.BrasileiraoSerieA,
                League.ArgentineLigaProfesional,
                League.LigaMX,
                League.MLS,
                League.BelgianProLeague,

                // 📊 PRIORITY 5: Second Divisions (Lower Priority)
                League.Bundesliga2,
                League.Ligue2,
                League.SerieB,
                League.SegundaDivision
            ];

            // Silent background loading
            addToast("Loading complete featured leagues data...", "info");
            
            const allFixtures = [...existingFixtures];
            let loadedLeagues = 0;
            const totalLeagues = FEATURED_LEAGUES.length;

            // Process leagues in smaller batches to avoid overwhelming the API
            const BATCH_SIZE = 3; // Load 3 leagues at a time
            const leagueBatches = [];
            for (let i = 0; i < FEATURED_LEAGUES.length; i += BATCH_SIZE) {
                leagueBatches.push(FEATURED_LEAGUES.slice(i, i + BATCH_SIZE));
            }

            // Process each batch of leagues
            for (const batch of leagueBatches) {
                if (!hasBudget()) {
                    console.warn(`⏸️ Budget limit reached. Stopping background loading.`);
                    addToast("API budget reached - some leagues may not be fully loaded", "warning");
                    break;
                }
                
                // Silent batch processing

        // Process leagues in this batch concurrently
        const batchPromises = batch.map(async (league) => {
            try {
                // Load both fixtures and league table for each league
                const [fixturesResult, tableResult] = await Promise.allSettled([
                    getUpcomingFixtures(league, 10), // More fixtures for comprehensive view
                    getLeagueTable(league)
                ]);

                let fixturesLoaded = 0;
                let tableLoaded = false;

                if (fixturesResult.status === 'fulfilled' && fixturesResult.value) {
                    const newFixtures = fixturesResult.value.filter(fixture =>
                        !allFixtures.some(existing => existing.id === fixture.id)
                    );
                    allFixtures.push(...newFixtures);
                    fixturesLoaded = newFixtures.length;
                }

                if (tableResult.status === 'fulfilled' && tableResult.value) {
                    setAppData(prev => ({
                        ...prev,
                        leagueTables: {
                            ...prev.leagueTables,
                            [league]: tableResult.value
                        }
                    }));
                    tableLoaded = true;
                }

                return { league, fixturesLoaded, tableLoaded, success: true };

            } catch (leagueError) {
                return { league, fixturesLoaded: 0, tableLoaded: false, success: false };
            }
        });

                // Wait for all leagues in this batch to complete
                const batchResults = await Promise.all(batchPromises);

        // Update progress silently
        const successfulLoads = batchResults.filter(result => result.success).length;
        loadedLeagues += successfulLoads;

        // Update UI incrementally with unique fixtures
                const uniqueFixtures = allFixtures.filter((fixture, index, self) => 
                    index === self.findIndex(f => f.id === fixture.id)
                );
                
                setAppData(prev => ({ ...prev, fixtures: uniqueFixtures }));
        setLastUpdated(prev => ({ ...prev, fixtures: Date.now(), tables: Date.now() }));
                
                // Larger delay between batches to be API-friendly
                await new Promise(r => setTimeout(r, 500));
            }
            
            const finalCount = allFixtures.filter((fixture, index, self) => 
                index === self.findIndex(f => f.id === fixture.id)
            ).length;
            
            // Background loading complete
            
        } catch (error) {
            console.error("Background loading failed:", error);
            addToast("Background loading encountered issues, but core data is available", "warning");
        }
    };

    const refreshRealTimeData = useCallback(async (options?: { force?: boolean }) => {
        try {
            addToast("Refreshing real-time data...", "info");
            const STALE_MS = 10 * 60 * 1000; // 10 minutes
            const now = Date.now();
            const needFixtures = options?.force || !lastUpdated.fixtures || (now - (lastUpdated.fixtures || 0)) > STALE_MS;
            const needTeams = options?.force || !lastUpdated.teams || (now - (lastUpdated.teams || 0)) > STALE_MS;
            const needTables = options?.force || !lastUpdated.tables || (now - (lastUpdated.tables || 0)) > STALE_MS;

            // Sequential fetching to avoid overwhelming the API
            let teams = appData.teams;
            if (needTeams) {
                teams = await getAllTeams();
                await new Promise(r => setTimeout(r, 100)); // Reduced delay
            }

            let fixtures = appData.fixtures;
            if (needFixtures) {
                fixtures = await getAllUpcomingFixtures();
                await new Promise(r => setTimeout(r, 100)); // Reduced delay
            }

            let leagueTables = appData.leagueTables;
            if (needTables) {
                leagueTables = await getAllLeagueTables();
            }

            setAppData(prev => ({ ...prev, teams, fixtures, leagueTables }));
            setLastUpdated(prev => ({
                fixtures: needFixtures ? now : prev.fixtures,
                teams: needTeams ? now : prev.teams,
                tables: needTables ? now : prev.tables
            }));
            addToast("Real-time data refreshed!", "success");
        } catch (error) {
            console.error("Failed to refresh real-time data:", error);
            addToast("Failed to refresh data.", "error");
        }
    }, [addToast, appData.fixtures, appData.teams, appData.leagueTables, lastUpdated]);

    // Persist fixtures/tables/teams caches whenever they change
    useEffect(() => {
        if (!hasLocalStorage) return;
        try {
            if (appData.fixtures && appData.fixtures.length > 0) {
                window.localStorage.setItem(FIXTURES_CACHE_KEY, JSON.stringify(appData.fixtures));
            }
            if (appData.leagueTables && Object.keys(appData.leagueTables).length > 0) {
                window.localStorage.setItem(TABLES_CACHE_KEY, JSON.stringify(appData.leagueTables));
            }
            if (appData.teams && Object.keys(appData.teams).length > 0) {
                window.localStorage.setItem(TEAMS_CACHE_KEY, JSON.stringify(appData.teams));
            }
        } catch (error) {
            console.warn('Failed to persist cache to localStorage:', error);
        }
    }, [appData.fixtures, appData.leagueTables, appData.teams, hasLocalStorage]);

    // Load a specific league table on-demand and update state
    const loadLeagueTable = useCallback(async (league: League) => {
        try {
            const table = await getLeagueTable(league);
            setAppData(prev => ({
                ...prev,
                leagueTables: {
                    ...prev.leagueTables,
                    [league]: table
                }
            }));
        } catch (error) {
            console.error(`Failed to load league table for ${league}:`, error);
        }
    }, []);

    // On-demand fixtures for a specific league (lazy loading with budget guard)
    const loadLeagueFixtures = useCallback(async (league: League) => {
        try {
            // If we already have fixtures for this league, skip
            const alreadyHas = appData.fixtures.some(f => f.league === league);
            if (alreadyHas) return;

            if (!hasBudget()) {
                addToast('API budget limit reached. Try again later.', 'warning');
                return;
            }

            addToast(`Loading ${league} fixtures...`, 'info');
            const fixtures = await getUpcomingFixtures(league, 10);

            setAppData(prev => {
                const existingById = new Map((prev.fixtures || []).map(m => [m.id, m] as const));
                (fixtures || []).forEach(m => existingById.set(m.id, m));
                const merged = Array.from(existingById.values());
                merged.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                return { ...prev, fixtures: merged };
            });
        } catch (error) {
            console.error(`Failed to load fixtures for ${league}:`, error);
            addToast(`Failed to load ${league} fixtures`, 'error');
        }
    }, [appData.fixtures, addToast]);
    
    const fetchPrediction = useCallback(async (match: Match): Promise<Prediction> => {
        if (predictionCache[match.id]) {
            return predictionCache[match.id];
        }

        // Try to get from advanced sync service first (cross-platform sync)
        try {
            const syncedPrediction = await advancedPredictionSyncService.getPrediction(match.id);
            if (syncedPrediction) {
                // Cache the synced prediction
                setPredictionCache(prev => ({
                    ...prev,
                    [match.id]: syncedPrediction
                }));
                console.log(`✅ Retrieved synced prediction for ${match.homeTeam} vs ${match.awayTeam}`);
                return syncedPrediction;
            }
        } catch (error) {
            console.warn('Failed to get synced prediction:', error);
        }

        // --- Start Enhanced Prediction Context ---
        const leagueId = getLeagueId(match.league);
        let homeTeamInjuries = [] as any[];
        let awayTeamInjuries = [] as any[];
        let h2hData = [] as any[];

        if (leagueId) {
            [
                homeTeamInjuries,
                awayTeamInjuries,
                h2hData
            ] = await Promise.all([
                getInjuries(match.homeTeamId, leagueId),
                getInjuries(match.awayTeamId, leagueId),
                getHeadToHead(match.homeTeamId, match.awayTeamId)
            ]);
        }
        // --- End Enhanced Prediction Context ---

        // Optional: live form override using recent fixtures
        let homeFormOverride: string | undefined;
        let awayFormOverride: string | undefined;
        try {
            const [homeRecent, awayRecent] = await Promise.all([
                getRecentTeamForm(match.homeTeamId),
                getRecentTeamForm(match.awayTeamId)
            ]);
            if (homeRecent && homeRecent.length > 0) {
                homeFormOverride = homeRecent.join(', ');
            }
            if (awayRecent && awayRecent.length > 0) {
                awayFormOverride = awayRecent.join(', ');
            }
        } catch (error) {
            console.warn('Failed to get recent team form:', error);
        }

        const context = buildContextForMatch(
            match,
            pastPredictions,
            appData.leagueTables,
            h2hData || [],
            null, // homeTeamStats not available (can be added with getTeamStats)
            null, // awayTeamStats not available (can be added with getTeamStats)
            homeTeamInjuries || [],
            awayTeamInjuries || [],
            { home: homeFormOverride, away: awayFormOverride }
        );
        const newPrediction = await getMatchPrediction(match, context, accuracyStats);
        // Fallback calculations if model omitted predictions
        if (!newPrediction.btts) {
            // Heuristic fallback based on O/U only when detailed stats are unavailable
            const over = newPrediction.goalLine?.overProbability ?? 50;
            const base = Math.min(90, Math.max(10, Math.round(over * 0.6)));
            newPrediction.btts = {
                yesProbability: base,
                noProbability: 100 - base
            };
        }

        if (!newPrediction.htft) {
            // Fallback HT/FT based on main outcome probabilities
            const homeWin = newPrediction.homeWinProbability;
            const draw = newPrediction.drawProbability;
            const awayWin = newPrediction.awayWinProbability;
            
            newPrediction.htft = {
                homeHome: Math.round(homeWin * 0.6),
                homeDraw: Math.round(homeWin * 0.2),
                homeAway: Math.round(homeWin * 0.2),
                drawHome: Math.round(draw * 0.3),
                drawDraw: Math.round(draw * 0.4),
                drawAway: Math.round(draw * 0.3),
                awayHome: Math.round(awayWin * 0.2),
                awayDraw: Math.round(awayWin * 0.2),
                awayAway: Math.round(awayWin * 0.6)
            };
        }

        if (!newPrediction.scoreRange) {
            // Fallback score range based on goal line
            const over = newPrediction.goalLine?.overProbability ?? 50;
            const under = newPrediction.goalLine?.underProbability ?? 50;
            
            newPrediction.scoreRange = {
                zeroToOne: Math.round(under * 0.4),
                twoToThree: Math.round(under * 0.6 + over * 0.7),
                fourPlus: Math.round(over * 0.3)
            };
        }

        if (!newPrediction.firstGoalscorer) {
            // Fallback first goalscorer based on team strength
            const homeStrength = newPrediction.homeWinProbability;
            const awayStrength = newPrediction.awayWinProbability;
            const noGoals = Math.max(0, 100 - homeStrength - awayStrength);
            
            newPrediction.firstGoalscorer = {
                homeTeam: Math.round(homeStrength * 0.6),
                awayTeam: Math.round(awayStrength * 0.6),
                noGoalscorer: Math.round(noGoals)
            };
        }

        if (!newPrediction.cleanSheet) {
            // Neutral fallback without detailed defensive stats
            newPrediction.cleanSheet = {
                homeTeam: 50,
                awayTeam: 50
            };
        }

        if (!newPrediction.corners) {
            // Fallback corners based on team playing style (assume balanced)
            newPrediction.corners = {
                over: 50,
                under: 50
            };
        }
        // Store in advanced sync service (cross-platform sync)
        try {
            await advancedPredictionSyncService.storePrediction(match, newPrediction);
            console.log(`✅ Prediction synced across platforms for ${match.homeTeam} vs ${match.awayTeam}`);
        } catch (error) {
            console.warn('Failed to sync prediction:', error);
        }

        setPredictionCache(prev => ({ ...prev, [match.id]: newPrediction }));
        return newPrediction;
    }, [predictionCache, pastPredictions, appData.leagueTables]);

    // Record prediction accuracy when actual results are available
    const recordPredictionAccuracy = useCallback((matchId: string, actualResult: { homeScore: number; awayScore: number }) => {
        const prediction = predictionCache[matchId];
        if (!prediction) return;

        const accuracy = calculatePredictionAccuracy(prediction, actualResult);
        
        const accuracyRecord: PredictionAccuracy = {
            matchId,
            prediction,
            actualResult,
            accuracy,
            timestamp: new Date().toISOString()
        };

        setAccuracyRecords(prev => {
            const updated = [...prev, accuracyRecord];
            // Keep only last 100 records to prevent storage bloat
            const trimmed = updated.slice(-100);
            
            // Update stats
            const stats = calculateAccuracyStats(trimmed);
            setAccuracyStats(stats);
            
            // Persist to localStorage
            if (hasLocalStorage) {
                try {
                    localStorage.setItem(ACCURACY_CACHE_KEY, JSON.stringify(trimmed));
                } catch (error) {
                    console.warn('Failed to save accuracy records:', error);
                }
            }
            
            return trimmed;
        });
    }, [predictionCache, hasLocalStorage]);

    // Get formatted accuracy display
    const getAccuracyDisplay = useCallback(() => {
        return formatAccuracyDisplay(accuracyStats);
    }, [accuracyStats]);

    // Generate predictions for all today's games
    const generateTodaysPredictions = useCallback(async () => {
        try {
            return await autoPredictionService.generateTodaysPredictions();
        } catch (error) {
            console.error('Failed to generate today\'s predictions:', error);
            return { success: 0, failed: 0, total: 0 };
        }
    }, []);

    // Get live accuracy stats
    const getLiveAccuracyStatsCallback = useCallback(() => {
        return getLiveAccuracyStats();
    }, []);

    // Fetch live matches
    const fetchLiveMatches = useCallback(async () => {
        try {
            const matches = await getLiveMatches();
            setLiveMatches(matches);
            
            // Update live match updates cache
            const updates: { [matchId: string]: LiveMatchUpdate } = {};
            (matches || []).forEach(match => {
                updates[match.id] = {
                    matchId: match.id,
                    status: match.status,
                    homeScore: match.homeScore,
                    awayScore: match.awayScore,
                    minute: match.minute,
                    period: match.period,
                    events: match.events || [],
                    lastUpdated: match.lastUpdated
                };
            });
            setLiveMatchUpdates(updates);
        } catch (error) {
            console.error('Failed to fetch live matches:', error);
        }
    }, []);

    // Get live match by ID
    const getLiveMatch = useCallback((matchId: string): LiveMatch | null => {
        return liveMatches.find(match => match.id === matchId) || null;
    }, [liveMatches]);

    // Update live matches (for polling)
    const updateLiveMatches = useCallback(async () => {
        try {
            const matches = await getLiveMatches();
            setLiveMatches(matches);
            
            // Update live match updates cache
            const updates: { [matchId: string]: LiveMatchUpdate } = {};
            (matches || []).forEach(match => {
                updates[match.id] = {
                    matchId: match.id,
                    status: match.status,
                    homeScore: match.homeScore,
                    awayScore: match.awayScore,
                    minute: match.minute,
                    period: match.period,
                    events: match.events || [],
                    lastUpdated: match.lastUpdated
                };
            });
            setLiveMatchUpdates(updates);
        } catch (error) {
            console.error('Failed to update live matches:', error);
        }
    }, []);

    // Daily prediction refresh based on current fixtures and previous predictions context
    const updateDailyPredictions = useCallback(async () => {
        try {
            // Prevent multiple runs within the same day
            const todayKey = nowLondonDateString();
            const lastRun = hasLocalStorage ? window.localStorage.getItem('fixturecast_last_prediction_refresh') : null;
            if (lastRun === todayKey) return;

            // Fetch predictions for all currently loaded fixtures
            // Process sequentially to respect minute limits
            for (const match of appData.fixtures) {
                // Skip if we already have a prediction cached
                if (predictionCache[match.id]) continue;
                try {
                    await fetchPrediction(match);
                } catch (error) {
                    // Continue with next match if one fails, but log the error and notify user
                    console.warn(`Prediction failed for ${match.homeTeam} vs ${match.awayTeam}:`, error);
                    try {
                        addToast(`Prediction failed for ${match.homeTeam} vs ${match.awayTeam}`, 'warning');
                    } catch (toastError) {
                        console.warn('Failed to show toast notification:', toastError);
                    }
                }
                // Small delay to be gentle; core Gemini rate limit is 60/min
                await new Promise(r => setTimeout(r, 200));
            }

            if (hasLocalStorage) {
                window.localStorage.setItem('fixturecast_last_prediction_refresh', todayKey);
            }
            addToast('Predictions updated for today', 'success');
        } catch (e) {
            console.error('Failed daily predictions refresh', e);
        }
    }, [appData.fixtures, predictionCache, fetchPrediction, addToast]);

    // Schedule daily refresh: run on load if not yet run today, then schedule next midnight
    useEffect(() => {
        // Kick once on mount
        updateDailyPredictions();

        // Schedule next run at local midnight
        const now = new Date();
        const nextMidnight = new Date(now);
        nextMidnight.setHours(24, 0, 0, 0);
        const timeoutMs = Math.max(1000, nextMidnight.getTime() - now.getTime());
        const id = setTimeout(() => {
            updateDailyPredictions();
        }, timeoutMs);
        return () => clearTimeout(id);
    }, [updateDailyPredictions]);

    const getPrediction = useCallback((matchId: string) => {
        return predictionCache[matchId] || null;
    }, [predictionCache]);
    
    const unreadAlertsCount = useMemo(() => (alerts || []).filter(a => !a.read).length, [alerts]);
    const apiUsage = useMemo(() => getApiUsage(), []);

    const addAlert = useCallback((alert: Omit<Alert, 'id' | 'timestamp' | 'read'>) => {
        const newAlert: Alert = {
            ...alert,
            id: new Date().toISOString() + Math.random(),
            timestamp: new Date().toISOString(),
            read: false,
        };
        setAlerts(prev => [newAlert, ...prev]);
        addToast(`New alert for ${alert.teamName}`, 'info');
    }, [addToast]);

    const markAlertsAsRead = useCallback(() => {
        setAlerts(prevAlerts => (prevAlerts || []).map(a => ({...a, read: true})));
    }, []);

    const toggleFavoriteTeam = useCallback((teamName: string) => {
        setFavoriteTeams(prev => {
            const isFavorited = prev.includes(teamName);
            if (isFavorited) {
                addToast(`${teamName} removed from favorites`, 'warning');
                return (prev || []).filter(t => t !== teamName);
            } else {
                addToast(`${teamName} added to favorites!`, 'success');
                const upcomingMatch = (appData.fixtures || []).find(m => m.homeTeam === teamName || m.awayTeam === teamName);
                if(upcomingMatch && upcomingMatch.homeTeam && upcomingMatch.awayTeam) {
                    addAlert({
                        type: AlertType.PredictionReady,
                        teamName,
                        message: `FixtureCast prediction for ${upcomingMatch.homeTeam} vs ${upcomingMatch.awayTeam} is now available.`,
                    });
                }
                return [...prev, teamName];
            }
        });
    }, [appData.fixtures, addAlert, addToast]);

    const toggleFavoriteLeague = useCallback((league: League) => {
        setFavoriteLeagues(prev => {
            const isFavorited = prev.includes(league);
            if (isFavorited) {
                addToast(`${league} removed from favorites`, 'warning');
                return prev.filter(l => l !== league);
            } else {
                addToast(`${league} added to favorites!`, 'success');
                return [...prev, league];
            }
        });
    }, [addToast]);

    // Load initial data and live matches on mount (guarded for React StrictMode)
    const didInitRef = useRef(false);
    useEffect(() => {
        if (didInitRef.current) return;
        didInitRef.current = true;
        console.log('🚀 AppContext: Starting loadInitialData...');
        console.log('🚀 AppContext: useEffect triggered, calling loadInitialData');
        loadInitialData().then(() => {
            console.log('✅ AppContext: loadInitialData completed successfully');
        }).catch((error) => {
            console.error('❌ AppContext: Failed to load initial data:', error);
        });
        fetchLiveMatches();
    }, [loadInitialData, fetchLiveMatches]);

    // Initialize accuracy checking system
    useEffect(() => {
        // Check for completed matches immediately and then every hour
        const checkForCompletedMatches = async () => {
            try {
                console.log('🔍 Checking for completed matches to update accuracy...');
                
                // Import getFinishedFixtures here to avoid circular imports
                const { getFinishedFixtures } = await import('../services/footballApiService');
                const results = await getFinishedFixtures(3); // Last 3 days
                
                if (results.length > 0) {
                    await checkAndUpdateMatchResults(results);
                    console.log(`✅ Checked ${results.length} completed matches for accuracy updates`);
                } else {
                    console.log('📝 No new completed matches found');
                }
            } catch (error) {
                console.error('🔴 Failed to check match results:', error);
            }
        };

        // Check immediately after a shorter delay (2 seconds) to improve user experience
        const initialCheckTimeout = setTimeout(checkForCompletedMatches, 2000);
        
        // Then check every hour
        const hourlyInterval = setInterval(checkForCompletedMatches, 60 * 60 * 1000);
        
        console.log('🤖 Auto-accuracy checker started (checks every hour)');

        return () => {
            clearTimeout(initialCheckTimeout);
            clearInterval(hourlyInterval);
        };
    }, []);
    
  const todaysFixturesWithPredictions = useMemo(() => {
    const today = new Date();
    return (appData.fixtures || [])
      .filter(match => isSameLondonDay(new Date(match.date), today))
      .map(match => ({
        match,
        prediction: predictionCache[match.id] || null,
        loading: !predictionCache[match.id]
      }));
  }, [appData.fixtures, predictionCache]);

    // Team cache management functions
    const getCachedTeamData = useCallback((teamName: string): Team | null => {
        const cached = teamCache[teamName];
        if (cached && cached.expiresAt > Date.now()) {
            return cached.data;
        }
        return null;
    }, [teamCache]);

    const setCachedTeamData = useCallback((teamName: string, teamData: Team) => {
        setTeamCache(prev => ({
            ...prev,
            [teamName]: {
                data: teamData,
                timestamp: Date.now(),
                expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
            }
        }));
    }, []);

    const clearTeamCache = useCallback(() => {
        setTeamCache({});
    }, []);

    const getTeamDetails = useCallback(async (teamName: string, forceRefresh?: boolean): Promise<Team | null> => {
        if (!forceRefresh) {
            const cached = getCachedTeamData(teamName);
            if (cached) {
                return cached;
            }
        }

        try {
            const { getTeamData } = await import('../services/teamDataService');
            const teamData = await getTeamData(teamName);
            if (teamData) {
                setCachedTeamData(teamName, teamData);
            }
            return teamData;
        } catch (error) {
            console.error('Error fetching team details:', error);
            return null;
        }
    }, [getCachedTeamData, setCachedTeamData]);

    const refreshTeamDetails = useCallback(async (teamName: string): Promise<Team | null> => {
        return getTeamDetails(teamName, true);
    }, [getTeamDetails]);

    const refreshAllTeamDetails = useCallback(async () => {
        const teamNames = Object.keys(teamCache);
        const promises = teamNames.map(teamName => refreshTeamDetails(teamName));
        await Promise.all(promises);
    }, [refreshTeamDetails, teamCache]);

    const getTeamDataStatus = useCallback(() => {
        const totalTeams = Object.keys(appData.teams).length;
        const cachedComplete = Object.keys(teamCache).length;
        const percentageComplete = totalTeams > 0 ? (cachedComplete / totalTeams) * 100 : 0;
        const needsRefresh = Object.values(teamCache).filter(cached => cached.expiresAt <= Date.now()).length;

        return {
            totalTeams,
            cachedComplete,
            percentageComplete,
            needsRefresh
        };
    }, [appData.teams, teamCache]);

    const getTeamForm = useCallback((teamId: number, teamName: string): FormAnalysis => {
        return getFormAnalysis(teamId, teamName);
    }, []);


  const baseContextValue: AppContextType = {
        // State
        teams: appData.teams,
        fixtures: appData.fixtures,
        pastPredictions,
        leagueTables: appData.leagueTables,
        favoriteTeams,
        favoriteLeagues,
        alerts,
        toasts,
        isLoading,
        unreadAlertsCount,
        apiUsage,
        lastUpdated,
        accuracyRecords,
        accuracyStats,
        liveMatches,
        liveMatchUpdates,
        teamCache,
        todaysFixturesWithPredictions,
        loadInitialData,
        refreshRealTimeData,
        addToast,
        fetchPrediction,
        getPrediction,
        toggleFavoriteTeam,
        toggleFavoriteLeague,
        addAlert,
        markAlertsAsRead,
        loadLeagueTable,
        recordPredictionAccuracy,
        getAccuracyDisplay,
        generateTodaysPredictions,
        getLiveAccuracyStats,
        fetchLiveMatches,
        getLiveMatch,
        updateLiveMatches,
        updateDailyPredictions,
        loadLeagueFixtures,
        getTeamForm,
        getCachedTeamData,
        setCachedTeamData,
        clearTeamCache,
        getTeamDetails,
        refreshTeamDetails,
        refreshAllTeamDetails,
        getTeamDataStatus,
        fixtureError,
    };

    const mergedValue = value ? { ...baseContextValue, ...value } : baseContextValue;

    return (
        <AppContext.Provider value={mergedValue}>
            {children}
        </AppContext.Provider>
    );
  } catch (error) {
    console.error('🔴 Critical error in AppProvider:', error);
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
          <p className="text-gray-300 mb-4">Failed to initialize the application</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }
};

export const useAppContext = (): AppContextType => {
    const context = useContext(AppContext);
    if (context === undefined) {
        throw new Error('useAppContext must be used within an AppProvider');
    }
    return context;
};
