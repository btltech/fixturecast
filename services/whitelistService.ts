import { League } from '../types';
import { resolveTeamName, TEAM_DATA, getAllKnownTeams } from './teamDataService';

// Central, strict whitelist for leagues we feature
const CORE_ALLOWED_LEAGUE_NAMES: string[] = [
  // UEFA competitions
  League.ChampionsLeague,
  League.EuropaLeague,
  League.EuropaConferenceLeague,

  // Top 5 + Championship
  League.PremierLeague,
  League.LaLiga,
  League.SerieA,
  League.Bundesliga,
  League.Ligue1,
  League.Championship,
  League.LeagueOne,
  League.LeagueTwo,
];

// Common marketplace/sponsor/alias variants → canonical
const leagueAliasToCanonical: Record<string, string> = {
  // English
  'english premier league': League.PremierLeague,
  'premier league 1': League.PremierLeague,
  // Spain
  'laliga': League.LaLiga,
  'laliga ea sports': League.LaLiga,
  'la liga santander': League.LaLiga,
  // Italy
  'serie a tim': League.SerieA,
  // Germany
  'bundesliga 1': League.Bundesliga,
  // France
  'ligue 1 uber eats': League.Ligue1,
  // Championship
  'championship': League.Championship,
  'efl championship': League.Championship,
  'league one': League.LeagueOne,
  'efl league one': League.LeagueOne,
  'sky bet league one': League.LeagueOne,
  'league two': League.LeagueTwo,
  'efl league two': League.LeagueTwo,
  'sky bet league two': League.LeagueTwo,
  // UEFA
  'champions league': League.ChampionsLeague,
  'uefa champions league': League.ChampionsLeague,
  'europa league': League.EuropaLeague,
  'uefa europa league': League.EuropaLeague,
  'europa conference league': League.EuropaConferenceLeague,
  'uefa europa conference league': League.EuropaConferenceLeague,
};

const normalize = (input: string): string => {
  return (input || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
};

export const isLeagueAllowed = (leagueName: string): boolean => {
  const norm = normalize(leagueName);
  const canonical = leagueAliasToCanonical[norm] || leagueName;
  // Build a normalized set once per call (small set; overhead negligible)
  const allowedSet = new Set(CORE_ALLOWED_LEAGUE_NAMES.map(l => normalize(l)));
  return allowedSet.has(normalize(canonical));
};

export const isTeamAllowed = (teamName: string): boolean => {
  const canonical = resolveTeamName(teamName);
  // Prefer exported helper if available, fallback to TEAM_DATA
  try {
    const teams = getAllKnownTeams ? getAllKnownTeams() : TEAM_DATA;
    return Boolean(teams[canonical]);
  } catch {
    return Boolean(TEAM_DATA[canonical]);
  }
};

export const getAllowedLeagues = (): string[] => [...CORE_ALLOWED_LEAGUE_NAMES];
export const getAllowedTeams = (): string[] => Object.keys(TEAM_DATA);


