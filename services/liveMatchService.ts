import { LiveMatch, LiveMatchUpdate, MatchEvent } from '../types';
import { resolveTeamName } from './teamDataService';
import { makeApiRequest } from './footballApiService';
import { isLeagueAllowed, isTeamAllowed } from './whitelistService';

// League allow list moved to whitelistService for single source of truth

export const getLiveMatches = async (): Promise<LiveMatch[]> => {
  try {
    // Fetch live matches from the API
    const response = await makeApiRequest('/fixtures', { live: 'all' });
    
    if (!response || !response.response) {
      return [];
    }
    
    // Transform API response to LiveMatch format
    const liveMatches: LiveMatch[] = response.response
      .filter((fixture: any) => {
        // Filter for live status
        const isLiveStatus = fixture.fixture.status.short === 'LIVE' ||
                            fixture.fixture.status.short === 'HT' ||
                            fixture.fixture.status.short === '1H' ||
                            fixture.fixture.status.short === '2H';

        // Strict league and team allow list checks
        const leagueName = fixture.league?.name || '';
        const leagueAllowed = isLeagueAllowed(leagueName);

        const homeAllowed = isTeamAllowed(fixture.teams?.home?.name || '');
        const awayAllowed = isTeamAllowed(fixture.teams?.away?.name || '');

        if (isLiveStatus && (!leagueAllowed || !homeAllowed || !awayAllowed)) {
          console.warn(
            `⚠️ Filtering out match. LeagueAllowed=${leagueAllowed} HomeAllowed=${homeAllowed} AwayAllowed=${awayAllowed} :: ${leagueName} - ${fixture.teams?.home?.name} vs ${fixture.teams?.away?.name}`
          );
        }

        return isLiveStatus && leagueAllowed && homeAllowed && awayAllowed;
      })
      .map((fixture: any) => ({
        id: fixture.fixture.id.toString(),
        homeTeam: resolveTeamName(fixture.teams.home.name),
        awayTeam: resolveTeamName(fixture.teams.away.name),
        league: fixture.league.name as any,
        date: fixture.fixture.date,
        status: fixture.fixture.status.short as LiveMatch['status'],
        homeScore: fixture.goals.home || 0,
        awayScore: fixture.goals.away || 0,
        minute: fixture.fixture.status.elapsed || undefined,
        period: fixture.fixture.status.short === '1H' ? '1H' :
                fixture.fixture.status.short === '2H' ? '2H' : undefined,
        venue: fixture.fixture.venue?.name,
        referee: fixture.fixture.referee,
        events: [], // TODO: Fetch match events if needed
        lastUpdated: new Date().toISOString()
      }));
    
    return liveMatches;
  } catch (error) {
    console.error('Failed to fetch live matches:', error);
    return [];
  }
};

export const getLiveMatchById = async (matchId: string): Promise<LiveMatch | null> => {
  const liveMatches = await getLiveMatches();
  // Additional filtering to ensure only allowed leagues
  const allowedLiveMatches = liveMatches.filter(match => {
    const leagueName = typeof match.league === 'string' ? match.league : match.league?.name || '';
    const allowed = isLeagueAllowed(leagueName) && isTeamAllowed(match.homeTeam) && isTeamAllowed(match.awayTeam);
    if (!allowed) {
      console.warn(`⚠️ Filtering out live match by ID due to whitelist policy: ${leagueName} - ${match.homeTeam} vs ${match.awayTeam}`);
    }
    return allowed;
  });
  return allowedLiveMatches.find(match => match.id === matchId) || null;
};

export const getLiveMatchUpdates = async (matchIds: string[]): Promise<LiveMatchUpdate[]> => {
  const liveMatches = await getLiveMatches();
  // Additional filtering to ensure only allowed leagues
  const allowedLiveMatches = liveMatches.filter(match => {
    const leagueName = typeof match.league === 'string' ? match.league : match.league?.name || '';
    const allowed = isLeagueAllowed(leagueName) && isTeamAllowed(match.homeTeam) && isTeamAllowed(match.awayTeam);
    if (!allowed) {
      console.warn(`⚠️ Filtering out live match updates due to whitelist policy: ${leagueName} - ${match.homeTeam} vs ${match.awayTeam}`);
    }
    return allowed;
  });

  return allowedLiveMatches
    .filter(match => matchIds.includes(match.id))
    .map(match => ({
      matchId: match.id,
      status: match.status,
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      minute: match.minute,
      period: match.period,
      events: match.events || [],
      lastUpdated: match.lastUpdated
    }));
};

export const getMatchStatusText = (status: LiveMatch['status']): string => {
  switch (status) {
    case 'NS': return 'Not Started';
    case 'LIVE': return 'Live';
    case 'HT': return 'HT';
    case 'FT': return 'FT';
    case 'CANC': return 'Cancelled';
    case 'POSTP': return 'Postponed';
    case 'SUSP': return 'Suspended';
    case 'TBD': return 'TBD';
    default: return 'FT'; // Default to FT instead of Unknown
  }
};

export const getMatchStatusColor = (status: LiveMatch['status']): string => {
  switch (status) {
    case 'NS': return 'text-gray-400';
    case 'LIVE': return 'text-green-500 animate-pulse'; // Green for live
    case 'HT': return 'text-yellow-400'; // Yellow for halftime
    case 'FT': return 'text-gray-400'; // Grey for finished
    case 'CANC': return 'text-red-400';
    case 'POSTP': return 'text-orange-400';
    case 'SUSP': return 'text-red-400';
    case 'TBD': return 'text-gray-400';
    default: return 'text-gray-400';
  }
};

export const formatMatchTime = (match: LiveMatch): string => {
  if (match.status === 'LIVE' && match.minute) {
    return `${match.minute}'`;
  }
  if (match.status === 'HT') {
    return 'HT';
  }
  if (match.status === 'FT') {
    return 'FT';
  }
  if (match.status === 'NS') {
    return new Date(match.date).toLocaleTimeString(undefined, { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }
  // For other statuses, return the status text
  return getMatchStatusText(match.status);
};

export const isMatchLive = (match: LiveMatch): boolean => {
  return match.status === 'LIVE' || match.status === 'HT';
};

export const getRecentEvents = (match: LiveMatch, limit: number = 3): MatchEvent[] => {
  if (!match.events) return [];
  return match.events
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit);
};
