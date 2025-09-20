import React from 'react';
import { League } from '../types';
import { getLeagueFlags } from '../utils/leagueUtils';

interface LeagueLogoProps {
  league?: League;
  leagueName?: League;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

const LEAGUE_LOGOS: Partial<{ [key in League]: string }> = {
  [League.PremierLeague]: 'https://media.api-sports.io/football/leagues/39.png',
  [League.LaLiga]: 'https://media.api-sports.io/football/leagues/140.png',
  [League.SerieA]: 'https://media.api-sports.io/football/leagues/135.png',
  [League.Bundesliga]: 'https://media.api-sports.io/football/leagues/78.png',
  [League.Ligue1]: 'https://media.api-sports.io/football/leagues/61.png',
  [League.ChampionsLeague]: 'https://media.api-sports.io/football/leagues/2.png',
  [League.EuropaLeague]: 'https://media.api-sports.io/football/leagues/3.png',
  [League.EuropaConferenceLeague]: 'https://media.api-sports.io/football/leagues/848.png',
  [League.Championship]: 'https://media.api-sports.io/football/leagues/40.png',
  [League.BrasileiraoSerieA]: 'https://media.api-sports.io/football/leagues/71.png',
  [League.ArgentineLigaProfesional]: 'https://media.api-sports.io/football/leagues/128.png',
  [League.Eredivisie]: 'https://media.api-sports.io/football/leagues/88.png',
  [League.PrimeiraLiga]: 'https://media.api-sports.io/football/leagues/94.png',
  [League.SuperLig]: 'https://media.api-sports.io/football/leagues/203.png',
  [League.LigaMX]: 'https://media.api-sports.io/football/leagues/262.png',
  [League.MLS]: 'https://media.api-sports.io/football/leagues/253.png',
  [League.ScottishPremiership]: 'https://media.api-sports.io/football/leagues/179.png',
  [League.Bundesliga2]: 'https://media.api-sports.io/football/leagues/79.png',
  [League.Ligue2]: 'https://media.api-sports.io/football/leagues/62.png',
  [League.SerieB]: 'https://media.api-sports.io/football/leagues/136.png',
};

const sizeClasses = {
  small: 'w-4 h-4',
  medium: 'w-6 h-6',
  large: 'w-8 h-8'
};

// Create a color palette for consistent league badge colors
const getLeagueBadgeColor = (league: League): string => {
  const colors = [
    'bg-blue-600', 'bg-green-600', 'bg-purple-600', 'bg-red-600', 
    'bg-orange-600', 'bg-indigo-600', 'bg-pink-600', 'bg-teal-600',
    'bg-cyan-600', 'bg-amber-600', 'bg-emerald-600', 'bg-violet-600'
  ];
  
  // Use league name hash to consistently assign colors
  const hash = league.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  
  return colors[Math.abs(hash) % colors.length];
};

// Smart initials generation
const getLeagueInitials = (league: League): string => {
  // Handle special cases first
  const specialCases: { [key in League]?: string } = {
    [League.PremierLeague]: 'PL',
    [League.ChampionsLeague]: 'CL',
    [League.EuropaLeague]: 'EL',
    [League.EuropaConferenceLeague]: 'EC',
    [League.BrasileiraoSerieA]: 'BR',
    [League.ArgentineLigaProfesional]: 'AR',
    [League.MLS]: 'MLS',
    [League.LigaMX]: 'MX',
    [League.SuperLig]: 'TR',
    [League.ScottishPremiership]: 'SP',
  };
  
  if (specialCases[league]) {
    return specialCases[league]!;
  }
  
  // Extract meaningful initials from league name
  const words = league.split(' ').filter(word => 
    !['League', 'Division', 'Championship', 'Premier', 'Super', 'Pro'].includes(word)
  );
  
  if (words.length >= 2) {
    return words.slice(0, 2).map(word => word[0]).join('').toUpperCase();
  } else if (words.length === 1) {
    const word = words[0];
    if (word.length >= 2) {
      return word.substring(0, 2).toUpperCase();
    }
  }
  
  // Fallback to first two characters of league name
  return league.replace(/\s/g, '').substring(0, 2).toUpperCase();
};

const LeagueLogo: React.FC<LeagueLogoProps> = ({ league, leagueName, size = 'small', className = '' }) => {
  const actualLeague = league || leagueName;
  const [hasError, setHasError] = React.useState(false);
  const logoUrl = LEAGUE_LOGOS[actualLeague!];
  const leagueFlags = getLeagueFlags();
  const countryFlag = leagueFlags[actualLeague!];

  // Render official logo if available and no error
  if (!hasError && logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={`${actualLeague} logo`}
        className={`${sizeClasses[size]} object-contain ${className}`}
        onError={() => setHasError(true)}
        title={actualLeague}
      />
    );
  }

  // For fallbacks, decide between flag emoji and circular badge
  const leagueInitials = getLeagueInitials(actualLeague!);
  const badgeColor = getLeagueBadgeColor(actualLeague!);
  
  // Use country flag for major leagues, circular badge for others
  const shouldUseFlag = countryFlag && [
    League.PremierLeague, League.LaLiga, League.SerieA, League.Bundesliga, 
    League.Ligue1, League.Eredivisie, League.PrimeiraLiga, League.SuperLig,
    League.BrasileiraoSerieA, League.ArgentineLigaProfesional, League.MLS, League.LigaMX
  ].includes(actualLeague!);

  if (shouldUseFlag && countryFlag) {
    return (
      <div 
        className={`${sizeClasses[size]} flex items-center justify-center text-lg ${className}`}
        title={actualLeague}
      >
        {countryFlag}
      </div>
    );
  }
  
  // Circular badge fallback with consistent styling
  const textSizeClass = size === 'large' ? 'text-sm' : size === 'medium' ? 'text-xs' : 'text-[10px]';
  
  return (
    <div 
      className={`${sizeClasses[size]} rounded-full ${badgeColor} flex items-center justify-center text-white ${textSizeClass} font-bold shadow-sm border border-white/20 ${className}`}
      title={league}
    >
      {leagueInitials}
    </div>
  );
};

export default LeagueLogo;
