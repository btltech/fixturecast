import { Match, League, LeagueTableRow } from '../types';

// HARD-CODED FEATURED LEAGUES ONLY - NO OTHER LEAGUES ALLOWED
const LEAGUE_SCORES: Partial<{ [key in League]: number }> = {
  [League.PremierLeague]: 90,
  [League.LaLiga]: 85,
  [League.SerieA]: 80,
  [League.Championship]: 40,
  [League.ChampionsLeague]: 100,
  [League.EuropaLeague]: 75,
  [League.EuropaConferenceLeague]: 65,
  [League.Bundesliga]: 85,
  [League.Ligue1]: 75,
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

// Main scoring function
export const scoreMatch = (
  match: Match, 
  leagueTables: { [key in League]?: LeagueTableRow[] } = {}
): number => {
  let totalScore = 0;
  
  // League importance score
  totalScore += LEAGUE_SCORES[match.league] || 0;
  
  // Rivalry bonus
  if (isRivalry(match.homeTeam, match.awayTeam)) {
    totalScore += 50;
  }
  
  // Prime time score
  totalScore += getPrimeTimeScore(match);
  
  // Table context score
  totalScore += getTableContextScore(match, leagueTables);
  
  return totalScore;
};

// Find the best match of the day (only from today's matches)
export const selectMatchOfTheDay = (
  fixtures: Match[], 
  leagueTables: { [key in League]?: LeagueTableRow[] } = {}
): Match | null => {
  if (fixtures.length === 0) return null;
  
  // Filter for today's matches only
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  
  const todaysMatches = fixtures.filter(match => {
    const matchDate = new Date(match.date);
    return matchDate >= todayStart && matchDate < todayEnd;
  });
  
  // If no matches today, return null
  if (todaysMatches.length === 0) return null;
  
  // Score all today's matches
  const scoredMatches = todaysMatches.map(match => ({
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
  const leagueScore = LEAGUE_SCORES[match.league] || 0;
  const rivalryScore = isRivalry(match.homeTeam, match.awayTeam) ? 50 : 0;
  const primeTimeScore = getPrimeTimeScore(match);
  const tableContextScore = getTableContextScore(match, leagueTables);
  const totalScore = leagueScore + rivalryScore + primeTimeScore + tableContextScore;
  
  return {
    match: `${match.homeTeam} vs ${match.awayTeam}`,
    league: match.league,
    date: match.date,
    scores: {
      league: leagueScore,
      rivalry: rivalryScore,
      primeTime: primeTimeScore,
      tableContext: tableContextScore,
      total: totalScore
    }
  };
};
