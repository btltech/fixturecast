import { Match, League } from '../types';

export function getTeamName(team: { name: string } | string): string {
  return typeof team === 'string' ? team : team.name;
}

export function getLeagueName(league: League | { name: string }): string {
  return typeof league === 'string' ? league : league.name;
}

export function getHomeTeamName(match: Match): string {
  return getTeamName(match.homeTeam);
}

export function getAwayTeamName(match: Match): string {
  return getTeamName(match.awayTeam);
}

export function getMatchLeagueName(match: Match): string {
  return getLeagueName(match.league);
}

export function getMatchVenue(match: Match): string | undefined {
  return match.venue;
}

export function getMatchStatus(match: Match): string | undefined {
  return match.status;
}

export function formatMatchTitle(match: Match): string {
  return `${getHomeTeamName(match)} vs ${getAwayTeamName(match)}`;
}

export function formatMatchDescription(match: Match): string {
  const time = new Date(match.date).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  const date = new Date(match.date).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
  return `Match: ${formatMatchTitle(match)}. ${date} at ${time}. ${getMatchLeagueName(match)} league.`;
}
