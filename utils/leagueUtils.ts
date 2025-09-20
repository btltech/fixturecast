import { League } from '../types';

export interface LeagueGroup {
  name: string;
  emoji: string;
  leagues: League[];
  priority: number;
}

export const LEAGUE_REGIONS: { [key in League]: string } = {
  // UEFA Competitions
  [League.ChampionsLeague]: 'UEFA',
  [League.EuropaLeague]: 'UEFA',
  [League.EuropaConferenceLeague]: 'UEFA',
  
  // England
  [League.PremierLeague]: 'England',
  [League.Championship]: 'England',
  
  // Major European Leagues
  [League.LaLiga]: 'Spain',
  [League.SerieA]: 'Italy',
  [League.Bundesliga]: 'Germany',
  [League.Ligue1]: 'France',
  [League.Eredivisie]: 'Netherlands',
  [League.PrimeiraLiga]: 'Portugal',
  [League.SuperLig]: 'Turkey',
  [League.ScottishPremiership]: 'Scotland',
  [League.BelgianProLeague]: 'Belgium',
  
  // Second Divisions
  [League.Bundesliga2]: 'Germany',
  [League.Ligue2]: 'France',
  [League.SerieB]: 'Italy',
  [League.SegundaDivision]: 'Spain',
  [League.LigaPortugal2]: 'Portugal',
  [League.GreekSuperLeague1]: 'Greece',
  
  // Americas
  [League.BrasileiraoSerieA]: 'Americas',
  [League.ArgentineLigaProfesional]: 'Americas',
  [League.LigaMX]: 'Americas',
  [League.MLS]: 'Americas',
  [League.ColombiaPrimeraA]: 'Americas',
  [League.ChilePrimeraDivision]: 'Americas',
  [League.CopaLibertadores]: 'Americas',
  
  // Asia & Oceania
  [League.ALeague]: 'Oceania',
  [League.AFCChampionsLeague]: 'Asia',
  
  // Women's Football
  [League.FAWSL]: 'Women',
  [League.NWSL]: 'Women',
};

// HARD-CODED FEATURED LEAGUES ONLY
export const LEAGUE_GROUPS: LeagueGroup[] = [
  {
    name: 'Featured Leagues',
    emoji: '⭐',
    priority: 1,
    leagues: [
      League.PremierLeague,
      League.LaLiga,
      League.SerieA,
    ]
  },
  {
    name: 'England Championship',
    emoji: '🏴',
    priority: 2,
    leagues: [
      League.Championship,
    ]
  },
];

export type LeagueSortOption = 'alphabetical' | 'popularity' | 'fixture-count' | 'region';

export const sortLeagues = (
  leagues: League[], 
  sortBy: LeagueSortOption, 
  fixtureCount: { [key in League]?: number } = {}
): League[] => {
  switch (sortBy) {
    case 'alphabetical':
      return [...leagues].sort((a, b) => a.localeCompare(b));
    
    case 'popularity':
      // Define popularity based on general following/viewership
      const popularityOrder: { [key in League]?: number } = {
        [League.PremierLeague]: 1,
        [League.LaLiga]: 2,
        [League.ChampionsLeague]: 3,
        [League.SerieA]: 4,
        [League.Bundesliga]: 5,
        [League.Ligue1]: 6,
        [League.BrasileiraoSerieA]: 7,
        [League.Championship]: 8,
        [League.Eredivisie]: 9,
        [League.PrimeiraLiga]: 10,
        [League.MLS]: 11,
        [League.LigaMX]: 12,
        [League.SuperLig]: 13,
        [League.ArgentineLigaProfesional]: 14,
        [League.ScottishPremiership]: 15,
      };
      
      return [...leagues].sort((a, b) => {
        const orderA = popularityOrder[a] || 999;
        const orderB = popularityOrder[b] || 999;
        return orderA - orderB;
      });
    
    case 'fixture-count':
      return [...leagues].sort((a, b) => {
        const countA = fixtureCount[a] || 0;
        const countB = fixtureCount[b] || 0;
        return countB - countA; // Descending order
      });
    
    case 'region':
      return [...leagues].sort((a, b) => {
        const regionA = LEAGUE_REGIONS[a] || 'Other';
        const regionB = LEAGUE_REGIONS[b] || 'Other';
        
        if (regionA === regionB) {
          return a.localeCompare(b);
        }
        
        return regionA.localeCompare(regionB);
      });
    
    default:
      return leagues;
  }
};

export const getLeagueGroup = (league: League): LeagueGroup | undefined => {
  return LEAGUE_GROUPS.find(group => group.leagues.includes(league));
};

export const filterLeaguesBySearch = (leagues: League[], searchTerm: string): League[] => {
  if (!searchTerm) return leagues;
  
  const term = searchTerm.toLowerCase();
  return leagues.filter(league => 
    league.toLowerCase().includes(term) ||
    LEAGUE_REGIONS[league]?.toLowerCase().includes(term)
  );
};

export const getLeagueFlags = (): { [key in League]?: string } => {
  return {
    [League.PremierLeague]: '🏴',
    [League.Championship]: '🏴',
    [League.LaLiga]: '🇪🇸',
    [League.SerieA]: '🇮🇹',
    [League.Bundesliga]: '🇩🇪',
    [League.Bundesliga2]: '🇩🇪',
    [League.Ligue1]: '🇫🇷',
    [League.Ligue2]: '🇫🇷',
    [League.Eredivisie]: '🇳🇱',
    [League.PrimeiraLiga]: '🇵🇹',
    [League.SuperLig]: '🇹🇷',
    [League.ScottishPremiership]: '🏴',
    [League.BrasileiraoSerieA]: '🇧🇷',
    [League.ArgentineLigaProfesional]: '🇦🇷',
    [League.LigaMX]: '🇲🇽',
    [League.MLS]: '🇺🇸',
    [League.ALeague]: '🇦🇺',
    [League.BelgianProLeague]: '🇧🇪',
    [League.GreekSuperLeague1]: '🇬🇷',
    [League.ColombiaPrimeraA]: '🇨🇴',
    [League.ChilePrimeraDivision]: '🇨🇱',
    [League.FAWSL]: '🏴',
    [League.NWSL]: '🇺🇸',
    [League.ChampionsLeague]: '🏆',
    [League.EuropaLeague]: '🏆',
    [League.EuropaConferenceLeague]: '🏆',
    [League.CopaLibertadores]: '🏆',
    [League.AFCChampionsLeague]: '🏆',
  };
};
