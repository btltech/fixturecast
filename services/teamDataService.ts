import { Team, League } from '../types';

// Common alias mappings to canonical team names used in TEAM_DATA
const TEAM_ALIASES: { [alias: string]: string } = {
  'PSG': 'Paris Saint Germain',
  'Paris Saint-Germain': 'Paris Saint Germain',
  'Man City': 'Manchester City',
  'Manchester City FC': 'Manchester City',
  'Man United': 'Manchester United',
  'Man Utd': 'Manchester United',
  'Manchester Utd': 'Manchester United',
  'Spurs': 'Tottenham',
  'Inter Milan': 'Inter',
  'Internazionale': 'Inter',
  'Athletic Bilbao': 'Athletic Club',
  'Real Betis Balompié': 'Real Betis',
  'Bayern München': 'Bayern Munich',
  'Bayer 04 Leverkusen': 'Bayer Leverkusen',
  '1. FC Köln': 'FC Koln',
  'Newcastle United': 'Newcastle',
  // Nigeria Premier League (NPFL) aliases → 2025–26 canonical names
  'Enyimba International': 'Enyimba',
  'Rangers International': 'Enugu Rangers',
  'Rangers Int.': 'Enugu Rangers',
  'Shooting Stars SC': 'Shooting Stars',
  '3SC': 'Shooting Stars',
  'Wikki Tourists FC': 'Wikki Tourists',
  'Warri Wolves FC': 'Warri Wolves',
  'Kano Pillars FC': 'Kano Pillars',
  'Katsina Utd': 'Katsina United',
  'Kwara Utd': 'Kwara United',
  'Plateau Utd': 'Plateau United',
  'Remo Stars FC': 'Remo Stars',
  'Rivers Utd': 'Rivers United',
  'Niger Tornadoes FC': 'Niger Tornadoes',
  'Nasarawa Utd': 'Nasarawa United',
  'Bendel Insurance FC': 'Bendel Insurance',
  'Bayelsa Utd': 'Bayelsa United',
  'Abia Warriors FC': 'Abia Warriors',
  'El Kanemi Warriors': 'El-Kanemi Warriors',
};

export const resolveTeamName = (name: string): string => {
  const key = name?.trim();
  if (!key) return name;
  return TEAM_ALIASES[key] || key;
};

// Comprehensive team data with proper jersey colors and fallback logos
export const TEAM_DATA: { [key: string]: Team } = {
  // Premier League
  'Arsenal': {
    logo: 'https://media.api-sports.io/football/teams/42.png',
    shortName: 'ARS',
    jerseyColors: { primary: '#EF0107', secondary: '#FFFFFF' },
    country: 'England',
    league: League.PremierLeague,
    founded: 1886,
    venue: 'Emirates Stadium'
  },
  'Aston Villa': {
    logo: 'https://media.api-sports.io/football/teams/66.png',
    shortName: 'AVL',
    jerseyColors: { primary: '#95BFE5', secondary: '#670E36' }
  },
  'Bournemouth': {
    logo: 'https://media.api-sports.io/football/teams/35.png',
    shortName: 'BOU',
    jerseyColors: { primary: '#DA020E', secondary: '#000000' }
  },
  'Brentford': {
    logo: 'https://media.api-sports.io/football/teams/55.png',
    shortName: 'BRE',
    jerseyColors: { primary: '#E30613', secondary: '#FFFFFF' }
  },
  'Brighton': {
    logo: 'https://media.api-sports.io/football/teams/51.png',
    shortName: 'BHA',
    jerseyColors: { primary: '#0057B8', secondary: '#FFFFFF' }
  },
  'Chelsea': {
    logo: 'https://media.api-sports.io/football/teams/49.png',
    shortName: 'CHE',
    jerseyColors: { primary: '#034694', secondary: '#FFFFFF' }
  },
  'Crystal Palace': {
    logo: 'https://media.api-sports.io/football/teams/52.png',
    shortName: 'CRY',
    jerseyColors: { primary: '#1B458F', secondary: '#C4122E' }
  },
  'Everton': {
    logo: 'https://media.api-sports.io/football/teams/45.png',
    shortName: 'EVE',
    jerseyColors: { primary: '#003399', secondary: '#FFFFFF' }
  },
  'Fulham': {
    logo: 'https://media.api-sports.io/football/teams/36.png',
    shortName: 'FUL',
    jerseyColors: { primary: '#FFFFFF', secondary: '#000000' }
  },
  'Ipswich': {
    logo: 'https://media.api-sports.io/football/teams/57.png',
    shortName: 'IPS',
    jerseyColors: { primary: '#0033A0', secondary: '#FFFFFF' }
  },
  'Leicester': {
    logo: 'https://media.api-sports.io/football/teams/46.png',
    shortName: 'LEI',
    jerseyColors: { primary: '#003090', secondary: '#FDBE11' }
  },
  'Liverpool': {
    logo: 'https://media.api-sports.io/football/teams/40.png',
    shortName: 'LIV',
    jerseyColors: { primary: '#C8102E', secondary: '#FFFFFF' }
  },
  'Manchester City': {
    logo: 'https://media.api-sports.io/football/teams/50.png',
    shortName: 'MCI',
    jerseyColors: { primary: '#6CABDD', secondary: '#FFFFFF' }
  },
  'Manchester United': {
    logo: 'https://media.api-sports.io/football/teams/33.png',
    shortName: 'MUN',
    jerseyColors: { primary: '#DA020E', secondary: '#FFFFFF' }
  },
  'Newcastle': {
    logo: 'https://media.api-sports.io/football/teams/34.png',
    shortName: 'NEW',
    jerseyColors: { primary: '#241F20', secondary: '#FFFFFF' }
  },
  'Nottingham Forest': {
    logo: 'https://media.api-sports.io/football/teams/65.png',
    shortName: 'NFO',
    jerseyColors: { primary: '#DD0000', secondary: '#FFFFFF' }
  },
  'Southampton': {
    logo: 'https://media.api-sports.io/football/teams/41.png',
    shortName: 'SOU',
    jerseyColors: { primary: '#D71920', secondary: '#FFFFFF' }
  },
  'Tottenham': {
    logo: 'https://media.api-sports.io/football/teams/47.png',
    shortName: 'TOT',
    jerseyColors: { primary: '#132257', secondary: '#FFFFFF' }
  },
  'West Ham': {
    logo: 'https://media.api-sports.io/football/teams/48.png',
    shortName: 'WHU',
    jerseyColors: { primary: '#7A263A', secondary: '#1BB1E7' }
  },
  'Wolves': {
    logo: 'https://media.api-sports.io/football/teams/39.png',
    shortName: 'WOL',
    jerseyColors: { primary: '#FDB913', secondary: '#231F20' }
  },

  // La Liga
  'Real Madrid': {
    logo: 'https://media.api-sports.io/football/teams/541.png',
    shortName: 'RMA',
    jerseyColors: { primary: '#FFFFFF', secondary: '#000000' }
  },
  'Barcelona': {
    logo: 'https://media.api-sports.io/football/teams/529.png',
    shortName: 'BAR',
    jerseyColors: { primary: '#A50044', secondary: '#004D98' },
    country: 'Spain',
    league: League.LaLiga,
    founded: 1899,
    venue: 'Estadi Olímpic Lluís Companys'
  },
  'Atletico Madrid': {
    logo: 'https://media.api-sports.io/football/teams/530.png',
    shortName: 'ATM',
    jerseyColors: { primary: '#CE2029', secondary: '#FFFFFF' }
  },
  'Real Sociedad': {
    logo: 'https://media.api-sports.io/football/teams/548.png',
    shortName: 'RSO',
    jerseyColors: { primary: '#0033A0', secondary: '#FFFFFF' }
  },
  'Athletic Club': {
    logo: 'https://media.api-sports.io/football/teams/531.png',
    shortName: 'ATH',
    jerseyColors: { primary: '#EE2523', secondary: '#FFFFFF' }
  },
  'Real Betis': {
    logo: 'https://media.api-sports.io/football/teams/543.png',
    shortName: 'BET',
    jerseyColors: { primary: '#00A651', secondary: '#FFFFFF' }
  },
  'Villarreal': {
    logo: 'https://media.api-sports.io/football/teams/533.png',
    shortName: 'VIL',
    jerseyColors: { primary: '#FFCD00', secondary: '#000000' }
  },
  'Valencia': {
    logo: 'https://media.api-sports.io/football/teams/532.png',
    shortName: 'VAL',
    jerseyColors: { primary: '#FF6600', secondary: '#000000' }
  },
  'Sevilla': {
    logo: 'https://media.api-sports.io/football/teams/536.png',
    shortName: 'SEV',
    jerseyColors: { primary: '#FFFFFF', secondary: '#D2001F' }
  },
  'Getafe': {
    logo: 'https://media.api-sports.io/football/teams/546.png',
    shortName: 'GET',
    jerseyColors: { primary: '#0066CC', secondary: '#FFFFFF' }
  },

  // Serie A
  'Inter': {
    logo: 'https://media.api-sports.io/football/teams/505.png',
    shortName: 'INT',
    jerseyColors: { primary: '#0068A8', secondary: '#000000' }
  },
  'AC Milan': {
    logo: 'https://media.api-sports.io/football/teams/489.png',
    shortName: 'MIL',
    jerseyColors: { primary: '#FB090B', secondary: '#000000' }
  },
  'Juventus': {
    logo: 'https://media.api-sports.io/football/teams/496.png',
    shortName: 'JUV',
    jerseyColors: { primary: '#000000', secondary: '#FFFFFF' }
  },
  'Atalanta': {
    logo: 'https://media.api-sports.io/football/teams/499.png',
    shortName: 'ATA',
    jerseyColors: { primary: '#0066CC', secondary: '#000000' }
  },
  'Roma': {
    logo: 'https://media.api-sports.io/football/teams/497.png',
    shortName: 'ROM',
    jerseyColors: { primary: '#8B0000', secondary: '#FFD700' }
  },
  'Lazio': {
    logo: 'https://media.api-sports.io/football/teams/487.png',
    shortName: 'LAZ',
    jerseyColors: { primary: '#87CEEB', secondary: '#FFFFFF' }
  },
  'Napoli': {
    logo: 'https://media.api-sports.io/football/teams/492.png',
    shortName: 'NAP',
    jerseyColors: { primary: '#0C4A9C', secondary: '#FFFFFF' }
  },
  'Fiorentina': {
    logo: 'https://media.api-sports.io/football/teams/502.png',
    shortName: 'FIO',
    jerseyColors: { primary: '#4A0080', secondary: '#FFFFFF' }
  },
  'Bologna': {
    logo: 'https://media.api-sports.io/football/teams/500.png',
    shortName: 'BOL',
    jerseyColors: { primary: '#8B0000', secondary: '#0000FF' }
  },
  'Torino': {
    logo: 'https://media.api-sports.io/football/teams/503.png',
    shortName: 'TOR',
    jerseyColors: { primary: '#8B0000', secondary: '#FFFFFF' }
  },

  // Bundesliga
  'Bayern Munich': {
    logo: 'https://media.api-sports.io/football/teams/157.png',
    shortName: 'BAY',
    jerseyColors: { primary: '#DC052D', secondary: '#FFFFFF' },
    country: 'Germany',
    league: League.Bundesliga,
    founded: 1900,
    venue: 'Allianz Arena'
  },
  'Bayer Leverkusen': {
    logo: 'https://media.api-sports.io/football/teams/168.png',
    shortName: 'LEV',
    jerseyColors: { primary: '#E32221', secondary: '#000000' },
    country: 'Germany',
    league: League.Bundesliga,
    founded: 1904,
    venue: 'BayArena'
  },
  'Borussia Dortmund': {
    logo: 'https://media.api-sports.io/football/teams/165.png',
    shortName: 'BVB',
    jerseyColors: { primary: '#FDE100', secondary: '#000000' },
    country: 'Germany',
    league: League.Bundesliga,
    founded: 1909,
    venue: 'Signal Iduna Park'
  },
  'RB Leipzig': {
    logo: 'https://media.api-sports.io/football/teams/721.png',
    shortName: 'RBL',
    jerseyColors: { primary: '#DD0000', secondary: '#FFFFFF' },
    country: 'Germany',
    league: League.Bundesliga,
    founded: 2009,
    venue: 'Red Bull Arena Leipzig'
  },
  'Stuttgart': {
    logo: 'https://media.api-sports.io/football/teams/172.png',
    shortName: 'STU',
    jerseyColors: { primary: '#FFFFFF', secondary: '#000000' },
    country: 'Germany',
    league: League.Bundesliga,
    founded: 1893,
    venue: 'MHPArena'
  },
  'Eintracht Frankfurt': {
    logo: 'https://media.api-sports.io/football/teams/169.png',
    shortName: 'EIN',
    jerseyColors: { primary: '#E3000F', secondary: '#000000' },
    country: 'Germany',
    league: League.Bundesliga,
    founded: 1899,
    venue: 'Deutsche Bank Park'
  },
  'Hoffenheim': {
    logo: 'https://media.api-sports.io/football/teams/175.png',
    shortName: 'HOF',
    jerseyColors: { primary: '#1C63B8', secondary: '#FFFFFF' },
    country: 'Germany',
    league: League.Bundesliga,
    founded: 1899,
    venue: 'PreZero Arena'
  },
  'Freiburg': {
    logo: 'https://media.api-sports.io/football/teams/160.png',
    shortName: 'FRE',
    jerseyColors: { primary: '#000000', secondary: '#FFFFFF' },
    country: 'Germany',
    league: League.Bundesliga,
    founded: 1904,
    venue: 'Europa-Park Stadion'
  },
  'Augsburg': {
    logo: 'https://media.api-sports.io/football/teams/170.png',
    shortName: 'AUG',
    jerseyColors: { primary: '#BC1C2E', secondary: '#FFFFFF' },
    country: 'Germany',
    league: League.Bundesliga,
    founded: 1907,
    venue: 'WWK Arena'
  },
  'Werder Bremen': {
    logo: 'https://media.api-sports.io/football/teams/162.png',
    shortName: 'BRE',
    jerseyColors: { primary: '#1D365D', secondary: '#FFFFFF' },
    country: 'Germany',
    league: League.Bundesliga,
    founded: 1899,
    venue: 'Weserstadion'
  },

  // Ligue 1
  'Paris Saint Germain': {
    logo: 'https://media.api-sports.io/football/teams/85.png',
    shortName: 'PSG',
    jerseyColors: { primary: '#004170', secondary: '#ED1C24' }
  },
  'Monaco': {
    logo: 'https://media.api-sports.io/football/teams/91.png',
    shortName: 'MON',
    jerseyColors: { primary: '#E31837', secondary: '#FFFFFF' }
  },
  'Lille': {
    logo: 'https://media.api-sports.io/football/teams/79.png',
    shortName: 'LIL',
    jerseyColors: { primary: '#ED1C24', secondary: '#FFFFFF' }
  },
  'Lyon': {
    logo: 'https://media.api-sports.io/football/teams/80.png',
    shortName: 'LYO',
    jerseyColors: { primary: '#FFFFFF', secondary: '#0000FF' }
  },
  'Marseille': {
    logo: 'https://media.api-sports.io/football/teams/81.png',
    shortName: 'MAR',
    jerseyColors: { primary: '#00A8CC', secondary: '#FFFFFF' }
  },
  'Rennes': {
    logo: 'https://media.api-sports.io/football/teams/94.png',
    shortName: 'REN',
    jerseyColors: { primary: '#E31837', secondary: '#000000' }
  },
  'Nice': {
    logo: 'https://media.api-sports.io/football/teams/84.png',
    shortName: 'NIC',
    jerseyColors: { primary: '#E31837', secondary: '#000000' }
  },
  'Lens': {
    logo: 'https://media.api-sports.io/football/teams/116.png',
    shortName: 'LEN',
    jerseyColors: { primary: '#FF0000', secondary: '#FFD700' }
  },
  'Montpellier': {
    logo: 'https://media.api-sports.io/football/teams/82.png',
    shortName: 'MON',
    jerseyColors: { primary: '#FF6600', secondary: '#FFFFFF' }
  },
  'Strasbourg': {
    logo: 'https://media.api-sports.io/football/teams/95.png',
    shortName: 'STR',
    jerseyColors: { primary: '#0000FF', secondary: '#FFFFFF' }
  },

  // Primeira Liga (Portugal)
  'Benfica': {
    logo: 'https://media.api-sports.io/football/teams/211.png',
    shortName: 'BEN',
    jerseyColors: { primary: '#FF0000', secondary: '#FFFFFF' }
  },
  'Porto': {
    logo: 'https://media.api-sports.io/football/teams/212.png',
    shortName: 'POR',
    jerseyColors: { primary: '#0000FF', secondary: '#FFFFFF' }
  },
  'Sporting CP': {
    logo: 'https://media.api-sports.io/football/teams/213.png',
    shortName: 'SPO',
    jerseyColors: { primary: '#00FF00', secondary: '#FFFFFF' }
  },
  'Braga': {
    logo: 'https://media.api-sports.io/football/teams/214.png',
    shortName: 'BRA',
    jerseyColors: { primary: '#FF6600', secondary: '#FFFFFF' }
  },
  'Vitória Guimarães': {
    logo: 'https://media.api-sports.io/football/teams/215.png',
    shortName: 'VGU',
    jerseyColors: { primary: '#FFFFFF', secondary: '#000000' }
  },
  'Moreirense': {
    logo: 'https://media.api-sports.io/football/teams/216.png',
    shortName: 'MOR',
    jerseyColors: { primary: '#FFFF00', secondary: '#000000' }
  },
  'Famalicão': {
    logo: 'https://media.api-sports.io/football/teams/217.png',
    shortName: 'FAM',
    jerseyColors: { primary: '#FF1493', secondary: '#FFFFFF' }
  },
  'Arouca': {
    logo: 'https://media.api-sports.io/football/teams/218.png',
    shortName: 'ARO',
    jerseyColors: { primary: '#8B0000', secondary: '#FFFFFF' }
  },
  'Estoril': {
    logo: 'https://media.api-sports.io/football/teams/219.png',
    shortName: 'EST',
    jerseyColors: { primary: '#000080', secondary: '#FFFFFF' }
  },
  'Rio Ave': {
    logo: 'https://media.api-sports.io/football/teams/220.png',
    shortName: 'RAV',
    jerseyColors: { primary: '#00CED1', secondary: '#FFFFFF' }
  },

  // Süper Lig (Turkey)
  'Galatasaray': {
    logo: 'https://media.api-sports.io/football/teams/516.png',
    shortName: 'GAL',
    jerseyColors: { primary: '#FF0000', secondary: '#FFFF00' }
  },
  'Fenerbahçe': {
    logo: 'https://media.api-sports.io/football/teams/517.png',
    shortName: 'FEN',
    jerseyColors: { primary: '#0000FF', secondary: '#FFFF00' }
  },
  'Beşiktaş': {
    logo: 'https://media.api-sports.io/football/teams/518.png',
    shortName: 'BES',
    jerseyColors: { primary: '#000000', secondary: '#FFFFFF' }
  },
  'Trabzonspor': {
    logo: 'https://media.api-sports.io/football/teams/519.png',
    shortName: 'TRA',
    jerseyColors: { primary: '#800080', secondary: '#FFFFFF' }
  },
  'Başakşehir': {
    logo: 'https://media.api-sports.io/football/teams/520.png',
    shortName: 'BAS',
    jerseyColors: { primary: '#FF6600', secondary: '#FFFFFF' }
  },
  'Alanyaspor': {
    logo: 'https://media.api-sports.io/football/teams/521.png',
    shortName: 'ALA',
    jerseyColors: { primary: '#FF1493', secondary: '#FFFFFF' }
  },
  'Antalyaspor': {
    logo: 'https://media.api-sports.io/football/teams/522.png',
    shortName: 'ANT',
    jerseyColors: { primary: '#FF0000', secondary: '#FFFFFF' }
  },
  'Konyaspor': {
    logo: 'https://media.api-sports.io/football/teams/523.png',
    shortName: 'KON',
    jerseyColors: { primary: '#00FF00', secondary: '#000000' }
  },
  'Sivasspor': {
    logo: 'https://media.api-sports.io/football/teams/524.png',
    shortName: 'SIV',
    jerseyColors: { primary: '#FFD700', secondary: '#000000' }
  },
  'Adana Demirspor': {
    logo: 'https://media.api-sports.io/football/teams/525.png',
    shortName: 'ADA',
    jerseyColors: { primary: '#0000FF', secondary: '#FFFFFF' }
  },

  // Liga MX (Mexico)
  'Club América': {
    logo: 'https://media.api-sports.io/football/teams/1281.png',
    shortName: 'AME',
    jerseyColors: { primary: '#FFD700', secondary: '#0000FF' }
  },
  'Guadalajara': {
    logo: 'https://media.api-sports.io/football/teams/1282.png',
    shortName: 'GUA',
    jerseyColors: { primary: '#FF0000', secondary: '#FFFFFF' }
  },
  'Cruz Azul': {
    logo: 'https://media.api-sports.io/football/teams/1283.png',
    shortName: 'CRU',
    jerseyColors: { primary: '#0000FF', secondary: '#FFFFFF' }
  },
  'UNAM': {
    logo: 'https://media.api-sports.io/football/teams/1284.png',
    shortName: 'UNA',
    jerseyColors: { primary: '#FFD700', secondary: '#000000' }
  },
  'Tigres UANL': {
    logo: 'https://media.api-sports.io/football/teams/1285.png',
    shortName: 'TIG',
    jerseyColors: { primary: '#000000', secondary: '#FFFF00' }
  },
  'Monterrey': {
    logo: 'https://media.api-sports.io/football/teams/1286.png',
    shortName: 'MON',
    jerseyColors: { primary: '#0000FF', secondary: '#FFFFFF' }
  },
  'Santos Laguna': {
    logo: 'https://media.api-sports.io/football/teams/1287.png',
    shortName: 'SAN',
    jerseyColors: { primary: '#00FF00', secondary: '#000000' }
  },
  'Pachuca': {
    logo: 'https://media.api-sports.io/football/teams/1288.png',
    shortName: 'PAC',
    jerseyColors: { primary: '#0000FF', secondary: '#FFFFFF' }
  },
  'Toluca': {
    logo: 'https://media.api-sports.io/football/teams/1289.png',
    shortName: 'TOL',
    jerseyColors: { primary: '#FF0000', secondary: '#FFFFFF' }
  },
  'León': {
    logo: 'https://media.api-sports.io/football/teams/1290.png',
    shortName: 'LEO',
    jerseyColors: { primary: '#00FF00', secondary: '#FFFFFF' }
  },

  // Major League Soccer (MLS)
  'LA Galaxy': {
    logo: 'https://media.api-sports.io/football/teams/1609.png',
    shortName: 'LAG',
    jerseyColors: { primary: '#FFD700', secondary: '#000000' }
  },
  'LAFC': {
    logo: 'https://media.api-sports.io/football/teams/1610.png',
    shortName: 'LAF',
    jerseyColors: { primary: '#000000', secondary: '#FFD700' }
  },
  'Seattle Sounders': {
    logo: 'https://media.api-sports.io/football/teams/1611.png',
    shortName: 'SEA',
    jerseyColors: { primary: '#00FF00', secondary: '#0000FF' }
  },
  'Portland Timbers': {
    logo: 'https://media.api-sports.io/football/teams/1612.png',
    shortName: 'POR',
    jerseyColors: { primary: '#00FF00', secondary: '#FFFFFF' }
  },
  'New York City FC': {
    logo: 'https://media.api-sports.io/football/teams/1613.png',
    shortName: 'NYC',
    jerseyColors: { primary: '#0000FF', secondary: '#FFFFFF' }
  },
  'New York Red Bulls': {
    logo: 'https://media.api-sports.io/football/teams/1614.png',
    shortName: 'NYR',
    jerseyColors: { primary: '#FF0000', secondary: '#FFFFFF' }
  },
  'Atlanta United': {
    logo: 'https://media.api-sports.io/football/teams/1615.png',
    shortName: 'ATL',
    jerseyColors: { primary: '#FF0000', secondary: '#000000' }
  },
  'Inter Miami': {
    logo: 'https://media.api-sports.io/football/teams/1616.png',
    shortName: 'MIA',
    jerseyColors: { primary: '#FFD700', secondary: '#000000' }
  },
  'Toronto FC': {
    logo: 'https://media.api-sports.io/football/teams/1617.png',
    shortName: 'TOR',
    jerseyColors: { primary: '#FF0000', secondary: '#FFFFFF' }
  },
  'Vancouver Whitecaps': {
    logo: 'https://media.api-sports.io/football/teams/1618.png',
    shortName: 'VAN',
    jerseyColors: { primary: '#0000FF', secondary: '#FFFFFF' }
  }
};

// Fallback team data generator for teams not in our database
export const createFallbackTeam = (teamName: string): Team => {
  // Generate a consistent color based on team name
  const hash = teamName.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  
  const hue = Math.abs(hash) % 360;
  const primaryColor = `hsl(${hue}, 70%, 50%)`;
  const secondaryColor = hue > 180 ? '#FFFFFF' : '#000000';
  
  return {
    logo: `https://media.api-sports.io/football/teams/${Math.abs(hash) % 1000}.png`,
    shortName: teamName.substring(0, 3).toUpperCase(),
    jerseyColors: {
      primary: primaryColor,
      secondary: secondaryColor
    }
  };
};

// Get team data with fallback
export const getTeamData = (teamName: string): Team => {
  const canonical = resolveTeamName(teamName);
  return TEAM_DATA[canonical] || createFallbackTeam(teamName);
};

// Get all known teams
export const getAllKnownTeams = (): { [key: string]: Team } => {
  return { ...TEAM_DATA };
};

// Check if team exists in our database
export const isKnownTeam = (teamName: string): boolean => {
  return teamName in TEAM_DATA;
};
