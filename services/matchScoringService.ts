import { Match, League, LeagueTableRow } from '../types';

// TEAM PRESTIGE SCORES - Biggest teams get highest priority
const TEAM_PRESTIGE_SCORES: { [teamName: string]: number } = {
  // Tier 1: Global Superpowers (90-100 points)
  'Manchester United': 100,
  'Real Madrid': 100,
  'Barcelona': 95,
  'Liverpool': 95,
  'Bayern Munich': 95,
  'Manchester City': 90,
  'Arsenal': 90,
  'Chelsea': 90,
  'Juventus': 90,
  'AC Milan': 90,
  'Inter': 90,
  'Paris Saint Germain': 90,
  
  // Tier 2: Elite European Teams (75-85 points)
  'Tottenham': 85,
  'Atletico Madrid': 85,
  'Borussia Dortmund': 85,
  'Napoli': 80,
  'Newcastle': 80,
  'West Ham': 75,
  'Aston Villa': 75,
  'Brighton': 75,
  'Sevilla': 75,
  'Valencia': 75,
  'Villarreal': 75,
  'Athletic Club': 75,
  'Real Sociedad': 75,
  'Roma': 75,
  'Lazio': 75,
  'Atalanta': 75,
  'Fiorentina': 75,
  'RB Leipzig': 75,
  'Bayer Leverkusen': 75,
  'Eintracht Frankfurt': 75,
  'Lyon': 75,
  'Marseille': 75,
  'Monaco': 75,
  
  // Tier 3: Strong Teams (50-70 points)
  'Everton': 70,
  'Leicester': 70,
  'Crystal Palace': 65,
  'Fulham': 65,
  'Brentford': 65,
  'Wolves': 65,
  'Nottingham Forest': 65,
  'Bournemouth': 60,
  'Sheffield United': 55,
  'Burnley': 55,
  'Luton': 50,
  'Real Betis': 70,
  'Getafe': 60,
  'Real Valladolid': 55,
  'Osasuna': 55,
  'Bologna': 65,
  'Torino': 60,
  'Genoa': 55,
  'Lecce': 50,
  'Werder Bremen': 65,
  'Union Berlin': 60,
  'Freiburg': 60,
  'Hoffenheim': 55,
  'Augsburg': 50,
  'Lille': 65,
  'Rennes': 60,
  'Nice': 60,
  'Montpellier': 55,
  'Strasbourg': 50,
  
  // Add more teams as needed - default is 30 points for unlisted teams
};

// LEAGUE MULTIPLIERS - Simple league importance
const LEAGUE_MULTIPLIERS: Partial<{ [key in League]: number }> = {
  [League.ChampionsLeague]: 1.5,
  [League.PremierLeague]: 1.3,
  [League.LaLiga]: 1.2,
  [League.SerieA]: 1.2,
  [League.Bundesliga]: 1.2,
  [League.Ligue1]: 1.1,
  [League.EuropaLeague]: 1.1,
  [League.EuropaConferenceLeague]: 1.0,
  [League.Championship]: 0.7,
};

// Major rivalries (add more as needed)
const RIVALRIES: { [key: string]: string[] } = {
  // Premier League
  'Manchester United': ['Manchester City', 'Liverpool', 'Arsenal', 'Chelsea', 'Leeds United'],
  'Manchester City': ['Manchester United', 'Liverpool'],
  'Liverpool': ['Manchester United', 'Manchester City', 'Everton', 'Chelsea'],
  'Arsenal': ['Tottenham', 'Chelsea', 'Manchester United'],
  'Chelsea': ['Arsenal', 'Tottenham', 'Liverpool', 'Manchester United'],
  'Tottenham': ['Arsenal', 'Chelsea'],
  'Everton': ['Liverpool'],
  'Newcastle': ['Sunderland', 'Middlesbrough'],
  'West Ham': ['Tottenham', 'Chelsea', 'Millwall'],
  'Aston Villa': ['Birmingham City'],
  'Leicester': ['Nottingham Forest', 'Derby County'],
  'Nottingham Forest': ['Leicester', 'Derby County'],
  'Southampton': ['Portsmouth'],
  'Brighton': ['Crystal Palace'],
  'Crystal Palace': ['Brighton'],
  'Brentford': ['Fulham', 'QPR'],
  'Fulham': ['Brentford', 'QPR', 'Chelsea'],
  'Wolves': ['West Bromwich Albion', 'Birmingham City'],
  'Bournemouth': ['Southampton'],
  'Ipswich': ['Norwich City'],
  
  // La Liga
  'Real Madrid': ['Barcelona', 'Atletico Madrid', 'Sevilla'],
  'Barcelona': ['Real Madrid', 'Espanyol', 'Atletico Madrid'],
  'Atletico Madrid': ['Real Madrid', 'Barcelona'],
  'Sevilla': ['Real Betis', 'Real Madrid'],
  'Real Betis': ['Sevilla'],
  'Valencia': ['Villarreal', 'Levante'],
  'Villarreal': ['Valencia'],
  'Athletic Club': ['Real Sociedad'],
  'Real Sociedad': ['Athletic Club'],
  
  // Serie A
  'Juventus': ['Inter', 'AC Milan', 'Torino', 'Napoli'],
  'Inter': ['AC Milan', 'Juventus', 'Napoli'],
  'AC Milan': ['Inter', 'Juventus', 'Napoli'],
  'Napoli': ['Juventus', 'Inter', 'AC Milan', 'Roma'],
  'Roma': ['Lazio', 'Napoli'],
  'Lazio': ['Roma'],
  'Atalanta': ['Inter', 'AC Milan'],
  'Fiorentina': ['Juventus', 'Inter', 'AC Milan'],
  'Bologna': ['Inter', 'AC Milan'],
  'Torino': ['Juventus'],
  
  // Bundesliga
  'Bayern Munich': ['Borussia Dortmund', 'RB Leipzig', '1860 Munich'],
  'Borussia Dortmund': ['Bayern Munich', 'Schalke 04', 'RB Leipzig'],
  'RB Leipzig': ['Bayern Munich', 'Borussia Dortmund'],
  'Bayer Leverkusen': ['Cologne'],
  'Eintracht Frankfurt': ['Mainz 05'],
  'Hoffenheim': ['Stuttgart'],
  'Freiburg': ['Stuttgart'],
  'Augsburg': ['1860 Munich'],
  'Werder Bremen': ['Hamburg'],
  'Stuttgart': ['Hoffenheim', 'Freiburg'],
  
  // Ligue 1
  'Paris Saint Germain': ['Marseille', 'Lyon', 'Monaco'],
  'Marseille': ['Paris Saint Germain', 'Lyon', 'Monaco'],
  'Lyon': ['Paris Saint Germain', 'Marseille', 'Saint-Etienne'],
  'Monaco': ['Paris Saint Germain', 'Marseille', 'Nice'],
  'Lille': ['Lens', 'Lyon'],
  'Lens': ['Lille'],
  'Nice': ['Monaco', 'Marseille'],
  'Rennes': ['Nantes'],
  'Montpellier': ['Nimes'],
  'Strasbourg': ['Metz'],
  
  // Primeira Liga (Portugal)
  'Benfica': ['Porto', 'Sporting CP'],
  'Porto': ['Benfica', 'Sporting CP'],
  'Sporting CP': ['Benfica', 'Porto'],
  'Braga': ['Vitória Guimarães'],
  'Vitória Guimarães': ['Braga'],
  
  // Süper Lig (Turkey)
  'Galatasaray': ['Fenerbahçe', 'Beşiktaş'],
  'Fenerbahçe': ['Galatasaray', 'Beşiktaş'],
  'Beşiktaş': ['Galatasaray', 'Fenerbahçe'],
  'Trabzonspor': ['Fenerbahçe'],
  'Başakşehir': ['Galatasaray', 'Fenerbahçe'],
  
  // Liga MX (Mexico)
  'Club América': ['Guadalajara', 'Cruz Azul', 'UNAM'],
  'Guadalajara': ['Club América', 'Atlas'],
  'Cruz Azul': ['Club América', 'UNAM'],
  'UNAM': ['Club América', 'Cruz Azul'],
  'Tigres UANL': ['Monterrey'],
  'Monterrey': ['Tigres UANL'],
  'Santos Laguna': ['Monterrey'],
  'Pachuca': ['Toluca'],
  'Toluca': ['Pachuca'],
  'León': ['Pachuca'],
  
  // Major League Soccer (MLS)
  'LA Galaxy': ['LAFC', 'San Jose Earthquakes'],
  'LAFC': ['LA Galaxy'],
  'Seattle Sounders': ['Portland Timbers', 'Vancouver Whitecaps'],
  'Portland Timbers': ['Seattle Sounders', 'Vancouver Whitecaps'],
  'New York City FC': ['New York Red Bulls'],
  'New York Red Bulls': ['New York City FC', 'DC United'],
  'Atlanta United': ['Orlando City'],
  'Inter Miami': ['Orlando City'],
  'Toronto FC': ['Montreal Impact', 'Vancouver Whitecaps'],
  'Vancouver Whitecaps': ['Seattle Sounders', 'Portland Timbers', 'Toronto FC']
};

// Prime time scoring (weekend matches and UK evening kickoffs get higher scores)
const getPrimeTimeScore = (match: Match): number => {
  const matchDate = new Date(match.date);
  const dayOfWeek = matchDate.getDay(); // 0 = Sunday, 6 = Saturday
  const hour = matchDate.getHours();
  
  let score = 0;
  
  // Weekend bonus (prime football days)
  if (dayOfWeek === 0 || dayOfWeek === 6) { // Sunday or Saturday
    score += 30;
  } else if (dayOfWeek === 5) { // Friday
    score += 15;
  }
  
  // UK evening prime time bonus (5:30 PM - 8:30 PM UK time is peak viewing)
  if (hour >= 17 && hour <= 20) { // 5 PM to 8 PM
    score += 25;
  } else if (hour >= 15 && hour <= 16) { // 3 PM to 4 PM (traditional UK kickoff)
    score += 20;
  } else if (hour >= 12 && hour <= 14) { // 12 PM to 2 PM (lunchtime kickoffs)
    score += 10;
  } else if (hour >= 21 && hour <= 22) { // 9 PM to 10 PM (late evening)
    score += 15;
  }
  
  return score;
};

// Table context scoring (matches between teams close in the table get higher scores)
const getTableContextScore = (match: Match, leagueTables: { [key in League]?: LeagueTableRow[] }): number => {
  const table = leagueTables[match.league];
  if (!table || table.length === 0) return 0;
  
  const homeTeamPosition = table.findIndex(row => row.teamName === match.homeTeam);
  const awayTeamPosition = table.findIndex(row => row.teamName === match.awayTeam);
  
  if (homeTeamPosition === -1 || awayTeamPosition === -1) return 0;
  
  const positionDifference = Math.abs(homeTeamPosition - awayTeamPosition);
  const totalTeams = table.length;
  
  // Closer teams in the table = higher score
  let score = 0;
  
  // Title race (top 3 teams)
  if (homeTeamPosition < 3 && awayTeamPosition < 3) {
    score += 40;
  }
  // Champions League spots (top 4-6)
  else if (homeTeamPosition < 6 && awayTeamPosition < 6) {
    score += 30;
  }
  // European spots (top 7-10)
  else if (homeTeamPosition < 10 && awayTeamPosition < 10) {
    score += 20;
  }
  // Relegation battle (bottom 3)
  else if (homeTeamPosition >= totalTeams - 3 && awayTeamPosition >= totalTeams - 3) {
    score += 25;
  }
  // Mid-table clash
  else if (positionDifference <= 2) {
    score += 15;
  }
  
  return score;
};

// Check if teams are rivals
const isRivalry = (homeTeam: string, awayTeam: string): boolean => {
  const homeRivals = RIVALRIES[homeTeam] || [];
  const awayRivals = RIVALRIES[awayTeam] || [];
  
  return homeRivals.includes(awayTeam) || awayRivals.includes(homeTeam);
};

// Get team prestige score
const getTeamPrestigeScore = (teamName: string): number => {
  return TEAM_PRESTIGE_SCORES[teamName] || 30; // Default 30 for unlisted teams
};

// Main scoring function - SIMPLIFIED to prioritize biggest teams
export const scoreMatch = (
  match: Match, 
  leagueTables: { [key in League]?: LeagueTableRow[] } = {}
): number => {
  // Base score is the sum of both teams' prestige scores
  const homeTeamScore = getTeamPrestigeScore(match.homeTeam);
  const awayTeamScore = getTeamPrestigeScore(match.awayTeam);
  let totalScore = homeTeamScore + awayTeamScore;
  
  // Apply league multiplier
  const leagueMultiplier = LEAGUE_MULTIPLIERS[match.league] || 1.0;
  totalScore = totalScore * leagueMultiplier;
  
  // Big rivalry bonus (still important for El Clasico, etc.)
  if (isRivalry(match.homeTeam, match.awayTeam)) {
    totalScore += 50;
  }
  
  // Small weekend bonus for tie-breaking
  const matchDate = new Date(match.date);
  const dayOfWeek = matchDate.getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) { // Weekend
    totalScore += 10;
  }
  
  return Math.round(totalScore);
};

// Find the best match of the day (only from today's matches - UK timezone aware)
export const selectMatchOfTheDay = (
  fixtures: Match[], 
  leagueTables: { [key in League]?: LeagueTableRow[] } = {}
): Match | null => {
  if (fixtures.length === 0) return null;
  
  // Get today's date in UK timezone (UTC+1 in summer, UTC+0 in winter)
  // For simplicity, using UTC and being flexible with date boundaries
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  // Be more flexible - include matches from today and next 24 hours
  const todayStart = new Date(today.getTime() - (12 * 60 * 60 * 1000)); // 12 hours before today
  const todayEnd = new Date(today.getTime() + (36 * 60 * 60 * 1000)); // 36 hours after today start
  
  const todaysMatches = fixtures.filter(match => {
    const matchDate = new Date(match.date);
    return matchDate >= todayStart && matchDate < todayEnd;
  });
  
  console.log(`🎯 Match of the Day selection:`, {
    totalFixtures: fixtures.length,
    todaysMatches: todaysMatches.length,
    todayStart: todayStart.toISOString(),
    todayEnd: todayEnd.toISOString(),
    matchDates: todaysMatches.slice(0, 3).map(m => ({ 
      match: `${m.homeTeam} vs ${m.awayTeam}`, 
      date: m.date 
    }))
  });
  
  // If no matches today, fall back to next available matches
  const matchesToScore = todaysMatches.length > 0 ? todaysMatches : fixtures.slice(0, 10);
  
  // Score matches prioritizing biggest teams
  const scoredMatches = matchesToScore.map(match => ({
    match,
    score: scoreMatch(match, leagueTables)
  }));
  
  // Sort by score (highest first)
  scoredMatches.sort((a, b) => b.score - a.score);
  
  // Return the highest scoring match from today
  return scoredMatches[0].match;
};

// Get match score breakdown for debugging
export const getMatchScoreBreakdown = (
  match: Match, 
  leagueTables: { [key in League]?: LeagueTableRow[] } = {}
) => {
  const homeTeamScore = getTeamPrestigeScore(match.homeTeam);
  const awayTeamScore = getTeamPrestigeScore(match.awayTeam);
  const baseScore = homeTeamScore + awayTeamScore;
  const leagueMultiplier = LEAGUE_MULTIPLIERS[match.league] || 1.0;
  const leagueAdjustedScore = baseScore * leagueMultiplier;
  const rivalryScore = isRivalry(match.homeTeam, match.awayTeam) ? 50 : 0;
  const weekendBonus = (new Date(match.date).getDay() === 0 || new Date(match.date).getDay() === 6) ? 10 : 0;
  const totalScore = Math.round(leagueAdjustedScore + rivalryScore + weekendBonus);
  
  return {
    match: `${match.homeTeam} vs ${match.awayTeam}`,
    league: match.league,
    date: match.date,
    scores: {
      homeTeam: `${match.homeTeam} (${homeTeamScore})`,
      awayTeam: `${match.awayTeam} (${awayTeamScore})`,
      baseScore: baseScore,
      leagueMultiplier: leagueMultiplier,
      leagueAdjustedScore: Math.round(leagueAdjustedScore),
      rivalry: rivalryScore,
      weekendBonus: weekendBonus,
      total: totalScore
    }
  };
};
