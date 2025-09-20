import { Match, Team, LeagueTableRow, League, Player, TeamSeasonStats, MatchResult, Transfer, Injury } from '../types';
import { resolveTeamName } from './teamDataService';

// API-Football.com configuration
const API_BASE_URL = 'https://v3.football.api-sports.io';
const PROXY_BASE_URL = (import.meta as any).env?.VITE_PROXY_URL || 'http://localhost:3001/api';
const VERCEL_API_BASE = '/api/proxy'; // Vercel serverless function
const CLOUDFLARE_API_BASE = '/api/proxy'; // Cloudflare Pages function
const DIRECT_BASE_URL = 'https://v3.football.api-sports.io';
const CORS_PROXY_URL = 'https://api.allorigins.win/raw?url=';
// Enhanced API key detection with production debugging
const API_KEY = (() => {
  const viteKey = (import.meta as any).env?.VITE_FOOTBALL_API_KEY;
  const fallbackKey = (import.meta as any).env?.FOOTBALL_API_KEY;
  const defaultKey = '89e32953fd6a91a630144cf150bcf151';
  
  // Enhanced logging for production debugging
  console.log('🔑 API Key Environment Check:', {
    hasViteKey: !!viteKey,
    hasFallbackKey: !!fallbackKey,
    isProduction: (import.meta as any).env?.PROD,
    mode: (import.meta as any).env?.MODE || 'unknown',
    baseUrl: typeof window !== 'undefined' ? window.location.origin : 'server',
    deploymentPlatform: typeof window !== 'undefined' && window.location.hostname.includes('vercel') ? 'vercel' :
                      typeof window !== 'undefined' && window.location.hostname.includes('pages.dev') ? 'cloudflare' :
                      typeof window !== 'undefined' && window.location.hostname.includes('netlify') ? 'netlify' : 'unknown'
  });
  
  return viteKey || fallbackKey || defaultKey;
})();

// Detect deployment environment
const isProduction = (import.meta as any).env?.PROD || (import.meta as any).env?.MODE === 'production';
const isCloudflare = typeof window !== 'undefined' && (
  window.location.hostname.includes('.pages.dev') || 
  window.location.hostname.includes('cloudflare') ||
  // Additional Cloudflare detection
  navigator.userAgent.includes('Cloudflare') ||
  (import.meta as any).env?.CF_PAGES === '1'
);
const isVercel = typeof window !== 'undefined' && window.location.hostname.includes('.vercel.app');

// Environment detection logging
console.log('🔍 Environment Detection:', {
  hostname: typeof window !== 'undefined' ? window.location.hostname : 'server',
  isProduction,
  isCloudflare,
  isVercel,
  env: (import.meta as any).env?.MODE || 'unknown'
});

// Debug API key availability
console.log('🔍 Football API Key check:', {
  hasViteKey: !!(import.meta as any).env?.VITE_FOOTBALL_API_KEY,
  hasFallbackKey: !!(import.meta as any).env?.FOOTBALL_API_KEY,
  usingDefaultKey: !(import.meta as any).env?.VITE_FOOTBALL_API_KEY && !(import.meta as any).env?.FOOTBALL_API_KEY,
  keyLength: API_KEY?.length || 0
});

// API usage tracking
let apiCallCount = 0;
const MAX_DAILY_CALLS = 75000;
const BUDGET_SOFT_LIMIT_PERCENT = 0.8; // More conservative to stay under quota

export const hasBudget = (estimatedCalls: number = 1): boolean => {
  const budget = (apiCallCount + estimatedCalls) <= Math.floor(MAX_DAILY_CALLS * BUDGET_SOFT_LIMIT_PERCENT);
  console.log(`🔍 Budget check: ${apiCallCount}/${Math.floor(MAX_DAILY_CALLS * BUDGET_SOFT_LIMIT_PERCENT)} calls used, ${budget ? 'HAS' : 'NO'} budget for ${estimatedCalls} more calls`);
  return budget;
};

// Dynamic season calculation for future seasons
const getCurrentSeason = (): number => {
  // Fixed date: September 20, 2025 (current real date)
  const currentYear = 2025;
  const currentMonth = 9; // September
  
  // Football seasons typically run from August to May
  // If we're in August or later, it's the current year's season
  // If we're before August, it's the previous year's season
  const season = currentMonth >= 8 ? currentYear : currentYear - 1;
  console.log(`🔍 Season calculation: Current date 2025-09-20, month ${currentMonth}, calculated season: ${season}`);
  
  return season; // Will return 2025
};

// League IDs mapping for API-Football.com
const LEAGUE_IDS = {
  'Premier League': 39,
  'La Liga': 140,
  'Serie A': 135,
  'Bundesliga': 78,
  'Ligue 1': 61,
  'UEFA Champions League': 2,
  'UEFA Europa League': 3,
  'UEFA Europa Conference League': 848,
  'EFL Championship': 40,
  'Brasileirão Série A': 71,
  'Argentine Liga Profesional': 128,
  'Eredivisie': 88,
  'Primeira Liga': 94,
  'Scottish Premiership': 179,
  // Newly added leagues
  'Süper Lig': 203, // Turkey Super Lig
  'Liga MX': 262,    // Mexico Liga MX
  'Major League Soccer': 253, // USA MLS
  // Second divisions (IDs according to API-Football)
  '2. Bundesliga': 79,
  'Ligue 2': 62,
  'Serie B': 136,
  'Segunda División': 141,
  'Liga Portugal 2': 97,
  // Additional top divisions
  'Belgian Pro League': 144,
  'A-League': 188,
  'Super League 1': 197,
  'Primera A': 279,
  'Primera División': 265,
  'FA WSL': 100,
  'NWSL': 254,
  'AFC Champions League': 11,
  'Copa Libertadores': 13
};

// Optional country hints to disambiguate dynamic league lookups
const LEAGUE_COUNTRIES: Record<string, string> = {
  'Premier League': 'England',
  'La Liga': 'Spain',
  'Serie A': 'Italy',
  'Bundesliga': 'Germany',
  'Ligue 1': 'France',
  '2. Bundesliga': 'Germany',
  'Ligue 2': 'France',
  'Serie B': 'Italy',
  'Segunda División': 'Spain',
  'Liga Portugal 2': 'Portugal',
  'Belgian Pro League': 'Belgium',
  'A-League': 'Australia',
  
  'Super League 1': 'Greece',
  'Primera A': 'Colombia',
  'Primera División': 'Chile',
  'FA WSL': 'England',
  'AFC Champions League': 'Asia',
  'Copa Libertadores': 'South America'
};

const dynamicLeagueIdCache = new Map<string, number>();

// HARD-CODED FEATURED LEAGUES + CHAMPIONSHIP ONLY - NO OTHER LEAGUES ALLOWED
const ALLOWED_LEAGUES = [
  // UEFA Competitions (International)
  'UEFA Champions League',
  'UEFA Europa League',
  'UEFA Europa Conference League',
  
  // Top 5 European Leagues + Championship
  'Premier League',
  'La Liga',
  'Serie A',
  'Bundesliga',
  'Ligue 1',
  'EFL Championship',
  'Championship', // Alternative name for EFL Championship
  
  // Other Major European Leagues (Featured)
  'Eredivisie',
  'Primeira Liga',
  'Scottish Premiership',
  'Turkish Süper Lig',
  'Belgian Pro League',
  
  // Major International Leagues (Featured)
  'Liga MX',
  'Major League Soccer',
  'Brasileirão Série A',
  'Argentine Liga Profesional'
];

const findLeagueIdByName = async (leagueName: string): Promise<number | null> => {
  try {
    // Check if the league is in our allowed list before proceeding
    if (!ALLOWED_LEAGUES.some(allowed => allowed.toLowerCase() === leagueName.toLowerCase())) {
      console.warn(`⚠️ Blocked attempt to load unauthorized league: ${leagueName}`);
      return null;
    }

    if (dynamicLeagueIdCache.has(leagueName)) {
      return dynamicLeagueIdCache.get(leagueName)!;
    }
    const country = LEAGUE_COUNTRIES[leagueName];
    const res = await makeApiRequest('/leagues', country ? { search: leagueName, country } : { search: leagueName });
    const list: any[] = res?.response || [];
    const match = list.find((item: any) => {
      const name = item?.league?.name || '';
      const ctry = item?.country?.name || '';
      const active = Array.isArray(item?.seasons) ? item.seasons.some((s: any) => s.current) : true;
      const nameMatches = name.toLowerCase().includes(leagueName.toLowerCase());
      const countryMatches = country ? ctry?.toLowerCase() === country.toLowerCase() : true;
      return nameMatches && countryMatches && active;
    }) || list[0];
    const id = match?.league?.id ? Number(match.league.id) : null;
    if (id) dynamicLeagueIdCache.set(leagueName, id);
    return id;
  } catch (e) {
    console.warn('Failed to dynamically resolve league id for', leagueName, e);
    return null;
  }
};

// Cache for API data - optimized for 7500 daily calls
const cache = new Map<string, { data: any, timestamp: number }>();
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour for fixtures and tables with higher budget
const TEAM_CACHE_DURATION = 12 * 60 * 60 * 1000; // 12 hours for team data

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to make API requests
export const makeApiRequest = async (endpoint: string, params: Record<string, any> = {}): Promise<any> => {
  console.log(`🌐 Making API request to ${endpoint} with params:`, params);
  if (!API_KEY) {
    throw new Error('API-Football.com key not configured');
  }

  const cacheKey = `${endpoint}-${JSON.stringify(params)}`;
  
  // Check cache first with appropriate duration
  const cached = cache.get(cacheKey);
  const cacheDuration = endpoint.includes('/teams') ? TEAM_CACHE_DURATION : CACHE_DURATION;
  if (cached && (Date.now() - cached.timestamp) < cacheDuration) {
    console.log(`Using cached data for ${endpoint}`);
    return cached.data;
  }

  // Choose the appropriate API endpoint based on environment
  let apiUrl;
  let fetchOptions = { headers: { 'Accept': 'application/json' } };
  let platform: 'LOCAL' | 'CLOUDFLARE' | 'VERCEL' | 'DIRECT' = 'LOCAL';

  if (isCloudflare || (isProduction && !isVercel)) {
    // Use Cloudflare Pages function
    apiUrl = new URL(`${CLOUDFLARE_API_BASE}${endpoint}`, window.location.origin);
    Object.entries(params).forEach(([key, value]) => {
      apiUrl.searchParams.append(key, value.toString());
    });
    platform = 'CLOUDFLARE';
    console.log(`🔍 Using Cloudflare Pages Function: ${apiUrl.toString()}`);
  } else if (isVercel || isProduction) {
    // Use Vercel serverless function
    apiUrl = new URL(`${VERCEL_API_BASE}${endpoint}`, window.location.origin);
    Object.entries(params).forEach(([key, value]) => {
      apiUrl.searchParams.append(key, value.toString());
    });
    platform = 'VERCEL';
    console.log(`🔍 Using Vercel API: ${apiUrl.toString()}`);
  } else {
    // Use direct API access since local proxy is not running
    apiUrl = new URL(`${API_BASE_URL}${endpoint}`);
    Object.entries(params).forEach(([key, value]) => {
      apiUrl.searchParams.append(key, value.toString());
    });
    platform = 'DIRECT';
    console.log(`🔍 Using direct API (proxy disabled): ${apiUrl.toString()}`);
    
    // Set headers for direct API access
    fetchOptions.headers = {
      ...fetchOptions.headers,
      'X-RapidAPI-Key': API_KEY!,
      'X-RapidAPI-Host': 'v3.football.api-sports.io'
    };
  }

  try {
    console.log(`🌐 API request: ${endpoint} - ${apiUrl.toString()}`);
    const response = await fetch(apiUrl.toString(), fetchOptions);
    console.log(`📡 Response: ${response.status} ${response.statusText}`);
    if (response.ok) {
      const data = await response.json();
      
      // Check for rate limiting
      if (data.errors && data.errors.rateLimit) {
        console.warn(`⚠️ Rate limit hit: ${data.errors.rateLimit}`);
        // Wait 60 seconds before retrying
        await new Promise(resolve => setTimeout(resolve, 60000));
        throw new Error(`Rate limit exceeded: ${data.errors.rateLimit}`);
      }
      
      // Ensure the response is valid
      if (!data) {
          console.warn('API returned null/undefined data:', data);
          throw new Error('API returned null/undefined data');
      }

      if (!data.hasOwnProperty('response')) {
          console.warn('API returned payload without response property:', {
            dataKeys: Object.keys(data),
            dataType: typeof data,
            dataValue: data
          });
          throw new Error('API returned payload without response property');
      }
      apiCallCount++;
      console.log(`✅ API call #${apiCallCount}/${MAX_DAILY_CALLS} via ${platform} - ${endpoint}`);
      // Silent operation - no individual API call logging
      cache.set(cacheKey, { data, timestamp: Date.now() });
      
      // Add delay to prevent rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
      
      return data;
    } else {
      const errorText = await response.text();
      console.error(`🔴 API request failed for ${endpoint}:`, {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }
  } catch (err) {
    console.error('🔴 API request failed:', err);

    // Provide more specific error messages
    if (err.message?.includes('fetch')) {
      console.error('🔴 Network error - check if proxy server is running on http://localhost:3001');
      throw new Error('Network error: Check if proxy server is running');
    } else if (err.message?.includes('CORS')) {
      console.error('🔴 CORS error - API access blocked');
      throw new Error('CORS error: API access blocked');
    } else {
    throw new Error(`API connection failed: ${err.message}`);
    }
  }
};

// Resolve a League enum value to its numeric API league ID
export const getLeagueId = (league: League): number | null => {
  return LEAGUE_IDS[league] || dynamicLeagueIdCache.get(league) || null;
};

export const getTeamsByLeague = async (league: League): Promise<{ [key: string]: Team }> => {
  try {
    let leagueId = getLeagueId(league);
    if (!leagueId) {
      leagueId = await findLeagueIdByName(league as unknown as string) || null;
    }
    if (!leagueId) {
      console.warn('No league ID found for', league);
      return {};
    }
    const res = await makeApiRequest('/teams', { league: leagueId, season: getCurrentSeason() });
    let all: { [key: string]: Team } = {};
    if (res && res.response) {
      res.response.forEach((item: any) => {
        const team = item.team;
        const venue = item.venue;
        
        // Use resolveTeamName to normalize team names and avoid duplicates
        const normalizedName = resolveTeamName(team.name);
        
        // Only add if we don't already have this team (avoid duplicates)
        if (!all[normalizedName]) {
          all[normalizedName] = {
            id: team.id,
            logo: team.logo,
            shortName: team.code || team.name.substring(0, 3).toUpperCase(),
            jerseyColors: { primary: '#1f2937', secondary: '#ffffff' },
            country: team.country,
            league: league,
            founded: team.founded || undefined,
            venue: venue?.name || undefined,
          } as Team;
        }
      });
    }
    // If empty, try dynamic league id lookup and retry once
    if (Object.keys(all).length === 0) {
      const dynId = await findLeagueIdByName(league as unknown as string);
      if (dynId) {
        const res2 = await makeApiRequest('/teams', { league: dynId, season: getCurrentSeason() });
        if (res2 && res2.response) {
          res2.response.forEach((item: any) => {
            const team = item.team;
            const venue = item.venue;
            
            // Use resolveTeamName to normalize team names and avoid duplicates
            const normalizedName = resolveTeamName(team.name);
            
            // Only add if we don't already have this team (avoid duplicates)
            if (!all[normalizedName]) {
              all[normalizedName] = {
                id: team.id,
                logo: team.logo,
                shortName: team.code || team.name.substring(0, 3).toUpperCase(),
                jerseyColors: { primary: '#1f2937', secondary: '#ffffff' },
                country: team.country,
                league: league,
                founded: team.founded || undefined,
                venue: venue?.name || undefined,
              } as Team;
            }
          });
        }
      }
    }
    return all;
  } catch (e) {
    console.error('Failed to fetch teams by league', league, e);
    return {};
  }
};

// Get upcoming fixtures for a specific league
export const getUpcomingFixtures = async (league: League, limit: number = 10): Promise<Match[]> => {
  let leagueId = getLeagueId(league);
  if (!leagueId) {
    return [];
  }
  
  try {
    const data = await makeApiRequest('/fixtures', {
      league: leagueId,
      season: getCurrentSeason(),
      status: 'NS'
    });

    if (!data.response || data.response.length === 0) {
      return [];
    }

    const fixtures = data.response.map((fixture: any) => {
      if (!fixture.fixture || !fixture.teams || !fixture.teams.home || !fixture.teams.away) {
        return null;
      }

      return {
        id: fixture.fixture.id.toString(),
        homeTeam: resolveTeamName(fixture.teams.home.name),
        awayTeam: resolveTeamName(fixture.teams.away.name),
        homeTeamId: fixture.teams.home.id,
        awayTeamId: fixture.teams.away.id,
        league: league,
        date: fixture.fixture.date
      };
    }).filter((f: any) => f !== null);

    return fixtures.slice(0, limit);
  } catch (error) {
    console.error(`Failed to fetch upcoming fixtures for ${league}:`, error);
    return [];
  }
};

// Get finished fixtures for accuracy checking
export const getFinishedFixtures = async (daysBack: number = 3): Promise<{ id: string; homeScore: number; awayScore: number; status: string }[]> => {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - daysBack);
    
    const fromDate = startDate.toISOString().split('T')[0];
    const toDate = endDate.toISOString().split('T')[0];
    
    const params = {
      from: fromDate,
      to: toDate,
      status: 'FT' // Only finished matches
    };
    
    const data = await makeApiRequest('/fixtures', params);
    
    if (!data.response || !Array.isArray(data.response)) {
      console.warn('No finished fixtures found');
      return [];
    }
    
    const finishedMatches = data.response.map((fixture: any) => ({
      id: fixture.fixture.id.toString(),
      homeScore: fixture.goals.home || 0,
      awayScore: fixture.goals.away || 0,
      status: fixture.fixture.status.short
    }));
    
    console.log(`📊 Found ${finishedMatches.length} finished matches in last ${daysBack} days`);
    return finishedMatches;
    
  } catch (error) {
    console.error('Failed to fetch finished fixtures:', error);
    return [];
  }
};

// Get TODAY'S fixtures specifically for a league
export const getTodaysFixtures = async (league: League): Promise<Match[]> => {
  let leagueId = getLeagueId(league);
  if (!leagueId) {
    return [];
  }
  
  try {
    const todayStr = '2025-09-20';
    const data = await makeApiRequest('/fixtures', {
      league: leagueId,
      season: getCurrentSeason(),
      date: todayStr
    });
    
    if (!data.response || data.response.length === 0) {
      return [];
    }

    const fixtures = data.response.map((fixture: any) => {
      if (!fixture.fixture || !fixture.teams || !fixture.teams.home || !fixture.teams.away) {
        return null;
      }

      return {
        id: fixture.fixture.id.toString(),
        homeTeam: resolveTeamName(fixture.teams.home.name),
        awayTeam: resolveTeamName(fixture.teams.away.name),
        homeTeamId: fixture.teams.home.id,
        awayTeamId: fixture.teams.away.id,
        league: league,
        date: fixture.fixture.date
      };
    }).filter((f: any) => f !== null);
    
    return fixtures;
  } catch (error) {
    console.error(`Failed to fetch today's fixtures for ${league}:`, error);
    return [];
  }
};

// Get all upcoming fixtures with TODAY'S GAMES PRIORITY
export const getAllUpcomingFixtures = async (): Promise<Match[]> => {
  
  // Featured leagues to load at startup
  const featuredLeagues: League[] = [
    League.PremierLeague,
    League.Championship,
    League.LaLiga,
    League.SerieA,
    League.Bundesliga,
    League.Ligue1,
    League.Eredivisie,
    League.PrimeiraLiga,
    League.ScottishPremiership,
    League.BrasileiraoSerieA,
    League.ArgentineLigaProfesional,
  ];
  
  try {
    console.log(`🔥🔥🔥 PRIORITY: Loading TODAY'S GAMES first from major leagues - ${new Date().toISOString()}`);
    
    const todaysFixtures: Match[] = [];
    const upcomingFixtures: Match[] = [];
    
    // STEP 1: Get TODAY'S GAMES from priority leagues FIRST
    const todaysPriorityLeagues = [League.PremierLeague, League.LaLiga, League.SerieA, League.Bundesliga, League.Ligue1];
    
    for (const league of todaysPriorityLeagues) {
      if (!hasBudget()) {
        console.warn('API budget reached while loading today\'s games');
        break;
      }
      
      try {
        console.log(`🔥📅 Loading TODAY'S games for ${league} - ${new Date().toISOString()}...`);
        const todaysGames = await getTodaysFixtures(league);
        if (todaysGames.length > 0) {
          console.log(`🔥 FOUND ${todaysGames.length} games TODAY in ${league}:`, 
            todaysGames.map(g => `${g.homeTeam} vs ${g.awayTeam}`));
          todaysFixtures.push(...todaysGames);
        }
      } catch (error) {
        console.error(`❌ Failed to fetch today's games for ${league}:`, error);
      }
      
      await delay(50); // Shorter delay for today's games
    }
    
    // STEP 1.5: Get today's INTERNATIONAL competitions (Champions League, etc.)
    try {
      console.log(`🔥🏆 Loading TODAY'S INTERNATIONAL competitions - ${new Date().toISOString()}...`);
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      
      const internationalCompetitions = [
        { id: 2, name: 'UEFA Champions League' },
        { id: 3, name: 'UEFA Europa League' },
        { id: 48, name: 'League Cup' }, // English League Cup
        { id: 45, name: 'FA Cup' }, // English FA Cup
      ];
      
      for (const comp of internationalCompetitions) {
        try {
          const data = await makeApiRequest('/fixtures', {
            league: comp.id,
            season: getCurrentSeason(),
            date: todayStr
          });
          
          if (data.response && data.response.length > 0) {
            console.log(`🏆 FOUND ${data.response.length} ${comp.name} games TODAY!`);
            const fixtures = data.response.map((fixture: any) => {
              // Validate fixture structure
              if (!fixture.fixture || !fixture.teams || !fixture.teams.home || !fixture.teams.away) {
                console.error(`❌ Invalid fixture structure for ${comp.name}:`, fixture);
                return null;
              }

              return {
                id: fixture.fixture.id.toString(),
                homeTeam: resolveTeamName(fixture.teams.home.name),
                awayTeam: resolveTeamName(fixture.teams.away.name),
                homeTeamId: fixture.teams.home.id,
                awayTeamId: fixture.teams.away.id,
                league: comp.name as any,
                date: fixture.fixture.date
              };
            }).filter((f: any) => f !== null);
            todaysFixtures.push(...fixtures);
          }
        } catch (error) {
          console.error(`❌ Failed to fetch ${comp.name} today:`, error);
        }
        await delay(50);
      }
    } catch (error) {
      console.error(`❌ Failed to fetch international competitions:`, error);
    }
    
    // STEP 2: Get upcoming fixtures from featured leagues
    console.log(`📅 Loading upcoming fixtures from ${featuredLeagues.length} leagues`);
    
    for (let i = 0; i < featuredLeagues.length; i++) {
      const league = featuredLeagues[i];
      
      if (!hasBudget()) {
        console.warn('API budget soft limit reached; skipping remaining leagues for fixtures');
        break;
      }
      
      try {
        const fixtures = await getUpcomingFixtures(league, 7); // Reduced days
        console.log(`✅ Got ${fixtures.length} upcoming fixtures for ${league}`);
        upcomingFixtures.push(...fixtures);
      } catch (error) {
        console.error(`❌ Failed to fetch upcoming fixtures for ${league}:`, error);
      }
      
      await delay(100);
    }

    // STEP 3: Combine with TODAY'S GAMES FIRST
    const allFixtures = [...todaysFixtures, ...upcomingFixtures];
    
    // Remove duplicates
    const uniqueFixtures = allFixtures.filter((fixture, index, self) => 
      index === self.findIndex(f => f.id === fixture.id)
    );
    
    // Sort: Today's games first, then by date
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    
    uniqueFixtures.sort((a, b) => {
      const aDate = new Date(a.date);
      const bDate = new Date(b.date);
      
      const aIsToday = aDate >= todayStart && aDate < todayEnd;
      const bIsToday = bDate >= todayStart && bDate < todayEnd;
      
      // Today's games always come first
      if (aIsToday && !bIsToday) return -1;
      if (!aIsToday && bIsToday) return 1;
      
      return aDate.getTime() - bDate.getTime();
    });
    
    const todaysCount = uniqueFixtures.filter(f => {
      const fDate = new Date(f.date);
      return fDate >= todayStart && fDate < todayEnd;
    }).length;
    
    console.log(`🎯 getAllUpcomingFixtures complete:`, {
      todaysGames: todaysCount,
      totalFixtures: uniqueFixtures.length,
      firstFixture: uniqueFixtures[0] || 'none',
      todaysSample: uniqueFixtures.slice(0, Math.min(5, todaysCount))
        .map(f => `${f.homeTeam} vs ${f.awayTeam} (${new Date(f.date).toLocaleTimeString()})`)
    });
    
    return uniqueFixtures;
  } catch (error) {
    console.error('❌ Failed to fetch fixtures:', error);
    console.error('❌ Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    return [];
  }
};

// Get all teams (EUROPEAN LEAGUES)
export const getAllTeams = async (): Promise<{ [key: string]: Team }> => {
  const leagueIds = [
    LEAGUE_IDS['Premier League'],
    LEAGUE_IDS['EFL Championship'],
    LEAGUE_IDS['La Liga'],
    LEAGUE_IDS['Serie A'],
    LEAGUE_IDS['Bundesliga'],
    LEAGUE_IDS['Ligue 1'],
    LEAGUE_IDS['Eredivisie'],
    LEAGUE_IDS['Primeira Liga'],
    LEAGUE_IDS['Scottish Premiership'],
    LEAGUE_IDS['Brasileirão Série A'],
    LEAGUE_IDS['Argentine Liga Profesional'],
    LEAGUE_IDS['Süper Lig'],
    LEAGUE_IDS['Liga MX'],
    LEAGUE_IDS['Major League Soccer']
  ];
  
  
  try {
    const allTeams: { [key: string]: Team } = {};
    for (let i = 0; i < leagueIds.length; i++) {
      const leagueId = leagueIds[i];
      if (!hasBudget()) {
        console.warn('API budget soft limit reached; skipping remaining leagues for teams');
        break;
      }
      const leagueName = Object.keys(LEAGUE_IDS).find(k => LEAGUE_IDS[k] === leagueId);
      try {
        const res = await makeApiRequest('/teams', { league: leagueId, season: getCurrentSeason() });
        if (res && res.response) {
          res.response.forEach((item: any) => {
            const team = item.team;
            const venue = item.venue;
            
            // Use resolveTeamName to normalize team names and avoid duplicates
            const normalizedName = resolveTeamName(team.name);
            
            // Only add if we don't already have this team (avoid duplicates)
            if (!allTeams[normalizedName]) {
              allTeams[normalizedName] = {
                id: team.id,
                logo: team.logo,
                shortName: team.code || team.name.substring(0, 3).toUpperCase(),
                jerseyColors: {
                  primary: '#1f2937',
                  secondary: '#ffffff'
                },
                country: team.country,
                league: leagueName || undefined,
                founded: team.founded || undefined,
                venue: venue?.name || undefined,
              } as Team;
            }
          });
        }
      } catch (e) {
        console.error(`❌ [${i + 1}/${leagueIds.length}] ${leagueName} (ID: ${leagueId}): Failed to fetch teams:`, e);
      }
      await delay(100);
    }
    
    return allTeams;
  } catch (error) {
    console.error('❌ Failed to fetch teams:', error);
    return {};
  }
};

export const getTeamInfo = async (teamName: string): Promise<Team | null> => {

  try {
    const data = await makeApiRequest('/teams', {
      search: teamName,
      season: getCurrentSeason()
    });

    // Debug API response for team searches
    console.log(`🔍 Team search for "${teamName}":`, {
      hasResponse: !!data.response,
      responseType: typeof data.response,
      responseLength: data.response?.length || 0,
      responseKeys: data.response ? Object.keys(data.response) : [],
      firstItem: data.response?.[0] ? {
        keys: Object.keys(data.response[0]),
        hasTeam: !!data.response[0].team,
        hasName: !!data.response[0].name,
        rawData: data.response[0]
      } : 'No first item'
    });

    // Check if response exists and has data
    if (!data.response || !Array.isArray(data.response) || data.response.length === 0) {
      console.warn(`❌ No team data found in response for ${teamName}`);
      return null;
    }

    const firstResult = data.response[0];

    // Handle different response structures
    let team, venue;

    // Try the standard API-Football structure first
    if (firstResult.team) {
      team = firstResult.team;
      venue = firstResult.venue;
    } else if (firstResult.name || firstResult.id) {
      // Alternative structure (direct team object)
      team = firstResult;
      venue = firstResult.venue || firstResult.stadium;
    } else if (Object.keys(firstResult).length > 0) {
      // Try to find team-like properties in any structure
      const possibleTeamKeys = ['team', 'club', 'organization', 'entity'];
      const possibleNameKeys = ['name', 'fullName', 'teamName', 'clubName'];
      const possibleIdKeys = ['id', 'teamId', 'clubId'];

      for (const key of possibleTeamKeys) {
        if (firstResult[key] && typeof firstResult[key] === 'object') {
          team = firstResult[key];
          venue = firstResult.venue || firstResult.stadium;
          break;
        }
      }

      // If no team object found, try direct properties
      if (!team) {
        for (const key of possibleNameKeys) {
          if (firstResult[key]) {
            team = { ...firstResult };
            venue = firstResult.venue || firstResult.stadium;
            break;
          }
        }
      }
    }

    // Last resort: create a basic team object
    if (!team) {
      console.warn(`⚠️ Creating fallback team object for ${teamName}`);
      team = {
        id: Math.floor(Math.random() * 1000000), // Generate random numeric ID
        name: teamName,
        logo: undefined,
        country: 'Unknown',
        founded: undefined
      };
      venue = undefined;
    }

    // Validate essential team data
    if (!team.id && !team.name) {
      console.warn(`❌ Team data missing essential fields for ${teamName}`);
      return null;
    }

    // Create team object with fallback values
    const teamInfo: Team = {
      id: team.id || team.name || teamName,
      logo: team.logo || team.crest || undefined,
      shortName: team.code || team.shortName || teamName.substring(0, 3).toUpperCase(),
      jerseyColors: {
        primary: '#1f2937', // Default colors - API doesn't provide jersey colors
        secondary: '#ffffff'
      },
      country: team.country || team.nationality || undefined,
      founded: team.founded || team.established || undefined,
      venue: venue?.name || venue?.stadium || team.stadium || undefined,
      // League will be derived from fixtures context
    };

    console.log(`✅ Successfully parsed team info for ${teamName}`);
    return teamInfo;

  } catch (error) {
    console.error(`❌ Failed to fetch team info for ${teamName}:`, error);

    // Fallback: Return basic team data to prevent app from breaking
    console.log(`🔄 Using fallback data for ${teamName}`);
    return {
      id: Math.floor(Math.random() * 1000000), // Generate random numeric ID
      logo: '/team-logos/default.svg',
      shortName: teamName.substring(0, 3).toUpperCase(),
      jerseyColors: {
        primary: '#1f2937',
        secondary: '#ffffff'
      },
      country: 'Unknown',
      founded: undefined,
      venue: undefined
    };
  }
}

// Enhanced team details fetching with comprehensive information
export const getTeamDetails = async (teamName: string): Promise<Team | null> => {
  try {
    // First get basic team info
    const basicInfo = await getTeamInfo(teamName);
    if (!basicInfo) {
      return null;
    }

    // Get team ID for further API calls
    const teamId = basicInfo.id;
    if (!teamId) {
      return basicInfo; // Return basic info as fallback
    }

    // Fetch comprehensive team data in parallel
    const [
      squadResult,
      statisticsResult,
      fixturesResult,
      transfersResult,
      injuriesResult
    ] = await Promise.allSettled([
      fetchTeamSquad(teamId),
      fetchTeamStatistics(teamId),
      fetchTeamFixtures(teamId),
      fetchTeamTransfers(teamId),
      fetchTeamInjuries(teamId)
    ]);

    // Build comprehensive team object
    const enhancedTeam: Team = {
      ...basicInfo,
      squad: squadResult.status === 'fulfilled' ? squadResult.value : undefined,
      seasonStats: statisticsResult.status === 'fulfilled' ? statisticsResult.value.stats : undefined,
      leaguePosition: statisticsResult.status === 'fulfilled' ? statisticsResult.value.position : undefined,
      points: statisticsResult.status === 'fulfilled' ? statisticsResult.value.points : undefined,
      goalDifference: statisticsResult.status === 'fulfilled' ? statisticsResult.value.goalDifference : undefined,
      recentForm: fixturesResult.status === 'fulfilled' ? fixturesResult.value.form : undefined,
      last5Matches: fixturesResult.status === 'fulfilled' ? fixturesResult.value.last5Matches : undefined,
      transfers: transfersResult.status === 'fulfilled' ? transfersResult.value : undefined,
      injuries: injuriesResult.status === 'fulfilled' ? injuriesResult.value : undefined,
    };

    console.log(`🎉 Successfully fetched comprehensive data for ${teamName}`);
    return enhancedTeam;

  } catch (error) {
    console.error(`❌ Failed to fetch comprehensive team details for ${teamName}:`, error);
    // Return basic info as fallback
    const basicInfo = await getTeamInfo(teamName);
    if (basicInfo) {
      return basicInfo;
    }

    // Last resort fallback
    console.log(`🔄 Using last resort fallback for ${teamName}`);
    return {
      id: Math.floor(Math.random() * 1000000), // Generate random numeric ID
      logo: '/team-logos/default.svg',
      shortName: teamName.substring(0, 3).toUpperCase(),
      jerseyColors: {
        primary: '#1f2937',
        secondary: '#ffffff'
      },
      country: 'Unknown',
      founded: undefined,
      venue: undefined,
      squad: undefined,
      statistics: undefined,
      recentFixtures: undefined,
      transfers: undefined,
      injuries: undefined
    };
  }
};

// Fetch team squad information
const fetchTeamSquad = async (teamId: number): Promise<Player[]> => {
  try {
    const data = await makeApiRequest('/players/squads', {
      team: teamId
    });

    const players = data.response?.[0]?.players || [];
    return players.map((player: any) => ({
      id: player.id,
      name: player.name,
      position: player.position,
      age: player.age || 0,
      nationality: player.nationality,
      photo: player.photo,
      number: player.number
    }));
  } catch (error) {
    console.error('Failed to fetch team squad:', error);
    return [];
  }
};

// Fetch team statistics
const fetchTeamStatistics = async (teamId: number): Promise<{
  stats: TeamSeasonStats;
  position: number;
  points: number;
  goalDifference: number;
}> => {
  try {
    const data = await makeApiRequest('/teams/statistics', {
      team: teamId,
      season: getCurrentSeason(),
      league: 39 // Premier League by default, will be enhanced
    });

    const stats = data.response;
    return {
      stats: {
        played: stats.fixtures?.played?.total || 0,
        won: stats.fixtures?.wins?.total || 0,
        drawn: stats.fixtures?.draws?.total || 0,
        lost: stats.fixtures?.loses?.total || 0,
        goalsFor: stats.goals?.for?.total?.total || 0,
        goalsAgainst: stats.goals?.against?.total?.total || 0,
        cleanSheets: stats.clean_sheet?.total || 0,
        failedToScore: stats.failed_to_score?.total || 0,
        biggestWin: stats.biggest?.wins?.home || stats.biggest?.wins?.away,
        biggestLoss: stats.biggest?.loses?.home || stats.biggest?.loses?.away,
        currentStreak: stats.biggest?.streak?.wins || stats.biggest?.streak?.draws || stats.biggest?.streak?.loses
      },
      position: 0, // Will be fetched from league table
      points: 0,   // Will be fetched from league table
      goalDifference: (stats.goals?.for?.total?.total || 0) - (stats.goals?.against?.total?.total || 0)
    };
  } catch (error) {
    console.error('Failed to fetch team statistics:', error);
    return {
      stats: {
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        cleanSheets: 0,
        failedToScore: 0
      },
      position: 0,
      points: 0,
      goalDifference: 0
    };
  }
};

// Fetch team fixtures for recent form
const fetchTeamFixtures = async (teamId: number): Promise<{
  form: string[];
  last5Matches: MatchResult[];
}> => {
  try {
    const data = await makeApiRequest('/fixtures', {
      team: teamId,
      last: 10, // Get last 10 matches
      season: getCurrentSeason()
    });

    const fixtures = data.response || [];
    const form: string[] = [];
    const last5Matches: MatchResult[] = [];

    fixtures.slice(-10).forEach((fixture: any) => {
      const isHome = fixture.teams.home.id === teamId;
      const homeScore = fixture.goals.home;
      const awayScore = fixture.goals.away;
      const result = fixture.fixture.status.short === 'FT' ?
        (isHome ?
          (homeScore > awayScore ? 'W' : homeScore < awayScore ? 'L' : 'D') :
          (awayScore > homeScore ? 'W' : awayScore < homeScore ? 'L' : 'D')
        ) : 'U'; // U for upcoming

      form.push(result);

      if (last5Matches.length < 5) {
        last5Matches.push({
          date: fixture.fixture.date,
          opponent: isHome ? fixture.teams.away.name : fixture.teams.home.name,
          result: result as 'W' | 'D' | 'L',
          score: `${homeScore}-${awayScore}`,
          competition: fixture.league.name,
          home: isHome
        });
      }
    });

    return { form: form.slice(-5), last5Matches };
  } catch (error) {
    console.error('Failed to fetch team fixtures:', error);
    return { form: [], last5Matches: [] };
  }
};

// Fetch team transfers
const fetchTeamTransfers = async (teamId: number): Promise<Transfer[]> => {
  try {
    const data = await makeApiRequest('/transfers', {
      team: teamId
    });

    const transfers = data.response || [];
    return transfers.slice(0, 10).map((transfer: any) => ({
      id: transfer.player.id,
      player: transfer.player.name,
      type: transfer.type === 'In' ? 'in' : 'out',
      date: transfer.date,
      from: transfer.teams?.out?.name,
      to: transfer.teams?.in?.name,
      fee: transfer.type === 'Free' ? 'Free Transfer' : transfer.type === 'Loan' ? 'Loan' : 'Undisclosed'
    }));
  } catch (error) {
    console.error('Failed to fetch team transfers:', error);
    return [];
  }
};

// Fetch team injuries
const fetchTeamInjuries = async (teamId: number): Promise<Injury[]> => {
  try {
    const data = await makeApiRequest('/injuries', {
      team: teamId,
      season: getCurrentSeason()
    });

    const injuries = data.response || [];
    return injuries.map((injury: any) => ({
      player: injury.player.name,
      type: injury.player.type || 'Injury',
      expectedReturn: injury.player.date || undefined,
      missedGames: injury.player.missed_games || 0
    }));
  } catch (error) {
    console.error('Failed to fetch team injuries:', error);
    return [];
  }
};

// Get league table
export const getLeagueTable = async (league: League): Promise<LeagueTableRow[]> => {
  const leagueId = getLeagueId(league);
  if (!leagueId) {
    console.warn(`League ID not found for ${league}`);
    return [];
  }

  try {
    const data = await makeApiRequest('/standings', {
      league: leagueId,
      season: getCurrentSeason()
    });

    const container = data.response?.[0]?.league?.standings;
    if (!container) return [];

    // API can return nested arrays (groups). Flatten if needed.
    let rows: any[] = [];
    if (Array.isArray(container)) {
      if (Array.isArray(container[0])) {
        rows = (container as any[]).flat();
      } else {
        rows = container as any[];
      }
    }
    if (!rows || rows.length === 0) return [];

    return rows.map((team: any, index: number) => ({
      rank: typeof team.rank === 'number' ? team.rank : (index + 1),
      teamName: team.team.name,
      played: team.all.played,
      won: team.all.win,
      drawn: team.all.draw,
      lost: team.all.lose,
      goalDifference: team.goalsDiff,
      points: team.points
    }));
  } catch (error) {
    console.error(`Failed to fetch league table for ${league}:`, error);
    return [];
  }
};

// Get all league tables (EUROPEAN LEAGUES)
export const getAllLeagueTables = async (): Promise<{ [key in League]?: LeagueTableRow[] }> => {
  const featuredLeagues: League[] = [
    League.PremierLeague,
    League.Championship,
    League.LaLiga,
    League.SerieA,
    League.Bundesliga,
    League.Ligue1,
    League.Eredivisie,
    League.PrimeiraLiga,
    League.ScottishPremiership,
    League.BrasileiraoSerieA,
    League.ArgentineLigaProfesional,
    League.SuperLig,
    League.LigaMX,
    League.MLS
  ];
  
  console.log(`🌍 Loading league tables from ${featuredLeagues.length} featured leagues (sequential)...`);

  try {
    const allTables: { [key in League]?: LeagueTableRow[] } = {};
    for (const league of featuredLeagues) {
      if (!hasBudget()) {
        console.warn('API budget soft limit reached; skipping remaining leagues for tables');
        break;
      }
      try {
        const table = await getLeagueTable(league);
        allTables[league] = table;
        console.log(`✅ ${league}: ${table.length} teams in table`);
      } catch (e) {
        console.error(`❌ ${league}: Failed to fetch table:`, e);
      }
      await delay(250);
    }

    console.log(`🔍 getAllLeagueTables: ${Object.keys(allTables).length} league tables loaded across Europe & South America`);
    
    return allTables;
  } catch (error) {
    console.error('❌ Failed to fetch league tables:', error);
    return {};
  }
};

// Get Head-to-Head data for a match
export const getHeadToHead = async (team1Id: number, team2Id: number): Promise<any[]> => {
  try {
    const data = await makeApiRequest('/fixtures/headtohead', {
      h2h: `${team1Id}-${team2Id}`,
      last: 5 // Get last 5 h2h matches
    });
    return data.response || [];
  } catch (error) {
    console.error(`Failed to fetch H2H for teams ${team1Id} vs ${team2Id}:`, error);
    return [];
  }
};

// Get injuries for a team
export const getInjuries = async (teamId: number, leagueId: number): Promise<any[]> => {
  try {
    // First try league-scoped injuries
    let data = await makeApiRequest('/injuries', {
      team: teamId,
      league: leagueId,
      season: getCurrentSeason()
    });

    let list = data.response || [];
    // Fallback: some competitions (e.g., international cups) return empty when scoping by league
    if (!list || list.length === 0) {
      data = await makeApiRequest('/injuries', {
        team: teamId,
        season: getCurrentSeason()
      });
      list = data.response || [];
    }
    return list;
  } catch (error) {
    console.error(`Failed to fetch injuries for team ${teamId}:`, error);
    return [];
  }
};

// Get team statistics for better predictions
export const getTeamStats = async (teamId: number, leagueId: number): Promise<any> => {
  try {
    const data = await makeApiRequest('/teams/statistics', {
      team: teamId,
      league: leagueId,
      season: getCurrentSeason()
    });

    return data.response;
  } catch (error) {
    console.error(`Failed to fetch team stats for team ${teamId}:`, error);
    return null;
  }
};

// Get last 5 results (W/D/L) for a team based on recent fixtures
export const getRecentTeamForm = async (teamId: number): Promise<Array<'W' | 'D' | 'L'>> => {
  try {
    const data = await makeApiRequest('/fixtures', {
      team: teamId,
      season: getCurrentSeason(),
      last: 5
    });
    const fixtures: any[] = data.response || [];
    const letters: Array<'W' | 'D' | 'L'> = fixtures.map(fix => {
      const homeGoals = fix.goals?.home ?? 0;
      const awayGoals = fix.goals?.away ?? 0;
      const isHome = fix.teams?.home?.id === teamId;
      const myGoals = isHome ? homeGoals : awayGoals;
      const oppGoals = isHome ? awayGoals : homeGoals;
      if (myGoals > oppGoals) return 'W';
      if (myGoals === oppGoals) return 'D';
      return 'L';
    });
    return letters;
  } catch (error) {
    console.error(`Failed to fetch recent form for team ${teamId}:`, error);
    return [];
  }
};

export const getApiUsage = () => ({
  callsUsed: apiCallCount,
  callsRemaining: MAX_DAILY_CALLS - apiCallCount,
  percentageUsed: Math.round((apiCallCount / MAX_DAILY_CALLS) * 100)
});

// Clear cache (useful for testing)
export const clearCache = (): void => {
  cache.clear();
  apiCallCount = 0;
  console.log('API cache cleared and usage reset');
};

// Export alias for getTeamDetails
export const getTeamData = getTeamDetails;
