import React, { createContext, useContext, useEffect, useState } from 'react';

interface TeamColorContextType {
  getTeamColor: (teamName: string) => string;
  getTeamColorClass: (teamName: string) => string;
  getTeamGradient: (teamName: string) => string;
  getTeamContrastColor: (teamName: string) => string;
  isDark: boolean;
}

// Light theme team colors - vibrant and accessible
const teamColors: { [key: string]: string } = {
  'Manchester City': '#6c5ce7',
  'Manchester United': '#e17055',
  'Arsenal': '#fd79a8',
  'Chelsea': '#00b894',
  'Liverpool': '#e84393',
  'Tottenham': '#0984e3',
  'Real Madrid': '#fdcb6e',
  'Barcelona': '#6c5ce7',
  'Bayern Munich': '#e17055',
  'PSG': '#00b894',
  'Juventus': '#d63031',
  'Inter Milan': '#2d3436',
  'AC Milan': '#e84393',
  'Napoli': '#0984e3',
  'Atletico Madrid': '#e17055',
  'Borussia Dortmund': '#fdcb6e',
  'Ajax': '#e84393',
  'PSV Eindhoven': '#e17055',
  'Feyenoord': '#e84393',
  'Celtic': '#0984e3',
  'Rangers': '#d63031',
  'Benfica': '#e84393',
  'Porto': '#0984e3',
  'Sporting CP': '#6c5ce7'
};

const TeamColorContext = createContext<TeamColorContextType | undefined>(undefined);

export const useTeamColors = () => {
  const context = useContext(TeamColorContext);
  if (!context) {
    throw new Error('useTeamColors must be used within a TeamColorProvider');
  }
  return context;
};

interface TeamColorProviderProps {
  children: React.ReactNode;
}

export const TeamColorProvider: React.FC<TeamColorProviderProps> = ({ children }) => {
  // Always light theme since we're removing dark mode
  const [isDark] = useState(false);

  // Light theme team color definitions
  const teamColorDefinitions: { [key: string]: { primary: string; secondary: string; contrast: string } } = {
    'Manchester City': { primary: '#6c5ce7', secondary: '#a29bfe', contrast: '#2d3436' },
    'Manchester United': { primary: '#e17055', secondary: '#fd79a8', contrast: '#2d3436' },
    'Arsenal': { primary: '#fd79a8', secondary: '#fdcb6e', contrast: '#2d3436' },
    'Chelsea': { primary: '#00b894', secondary: '#00cec9', contrast: '#2d3436' },
    'Liverpool': { primary: '#e84393', secondary: '#fd79a8', contrast: '#2d3436' },
    'Tottenham': { primary: '#0984e3', secondary: '#74b9ff', contrast: '#2d3436' },
    'Real Madrid': { primary: '#fdcb6e', secondary: '#e17055', contrast: '#2d3436' },
    'Barcelona': { primary: '#6c5ce7', secondary: '#a29bfe', contrast: '#2d3436' },
    'Bayern Munich': { primary: '#e17055', secondary: '#fd79a8', contrast: '#2d3436' },
    'PSG': { primary: '#00b894', secondary: '#00cec9', contrast: '#2d3436' },
    'Juventus': { primary: '#d63031', secondary: '#e84393', contrast: '#2d3436' },
    'Inter Milan': { primary: '#2d3436', secondary: '#636e72', contrast: '#f8fafc' },
    'AC Milan': { primary: '#e84393', secondary: '#fd79a8', contrast: '#2d3436' },
    'Napoli': { primary: '#0984e3', secondary: '#74b9ff', contrast: '#2d3436' },
    'Atletico Madrid': { primary: '#e17055', secondary: '#fd79a8', contrast: '#2d3436' },
    'Borussia Dortmund': { primary: '#fdcb6e', secondary: '#e17055', contrast: '#2d3436' },
    'Ajax': { primary: '#e84393', secondary: '#fd79a8', contrast: '#2d3436' },
    'PSV Eindhoven': { primary: '#e17055', secondary: '#fd79a8', contrast: '#2d3436' },
    'Feyenoord': { primary: '#e84393', secondary: '#fd79a8', contrast: '#2d3436' },
    'Celtic': { primary: '#0984e3', secondary: '#74b9ff', contrast: '#2d3436' },
    'Rangers': { primary: '#d63031', secondary: '#e84393', contrast: '#2d3436' },
    'Benfica': { primary: '#e84393', secondary: '#fd79a8', contrast: '#2d3436' },
    'Porto': { primary: '#0984e3', secondary: '#74b9ff', contrast: '#2d3436' },
    'Sporting CP': { primary: '#6c5ce7', secondary: '#a29bfe', contrast: '#2d3436' }
  };

  const getTeamColor = (teamName: string): string => {
    const teamColors = teamColorDefinitions[teamName as keyof typeof teamColorDefinitions];
    if (!teamColors) {
      return '#3b82f6'; // Default primary color for light theme
    }
    return teamColors.primary;
  };

  const getTeamColorClass = (teamName: string): string => {
    const normalizedName = teamName.toLowerCase().replace(/\s+/g, '-');
    return `team-color-${normalizedName}`;
  };

  const getTeamGradient = (teamName: string): string => {
    const teamColors = teamColorDefinitions[teamName as keyof typeof teamColorDefinitions];
    if (!teamColors) {
      return 'linear-gradient(135deg, #3b82f6, #2563eb)';
    }
    return `linear-gradient(135deg, ${teamColors.primary}, ${teamColors.secondary})`;
  };

  const getTeamContrastColor = (teamName: string): string => {
    const teamColors = teamColorDefinitions[teamName as keyof typeof teamColorDefinitions];
    if (!teamColors) {
      return '#2d3436';
    }
    return teamColors.contrast;
  };

  const contextValue: TeamColorContextType = {
    getTeamColor,
    getTeamColorClass,
    getTeamGradient,
    getTeamContrastColor,
    isDark
  };

  return (
    <TeamColorContext.Provider value={contextValue}>
      {children}
    </TeamColorContext.Provider>
  );
};

// Enhanced team logo component with theme-aware colors
interface TeamLogoProps {
  teamName: string;
  size?: 'xsmall' | 'small' | 'medium' | 'large';
  className?: string;
}

export const EnhancedTeamLogo: React.FC<TeamLogoProps> = ({
  teamName,
  size = 'medium',
  className = ''
}) => {
  const { getTeamColor, getTeamGradient, getTeamContrastColor } = useTeamColors();
  
  const sizeClasses = {
    xsmall: 'w-4 h-4',
    small: 'w-6 h-6',
    medium: 'w-8 h-8',
    large: 'w-12 h-12'
  };

  const teamColor = getTeamColor(teamName);
  const teamGradient = getTeamGradient(teamName);
  const contrastColor = getTeamContrastColor(teamName);

  return (
    <div
      className={`${sizeClasses[size]} rounded-full flex items-center justify-center ${className}`}
      style={{
        background: teamGradient,
        color: contrastColor
      }}
      title={teamName}
    >
      <span className="text-xs font-bold">
        {teamName.split(' ').map(word => word[0]).join('').slice(0, 2)}
      </span>
    </div>
  );
};

// Team color utilities for components
export const useTeamColorStyles = (teamName: string) => {
  const { getTeamColor, getTeamGradient, getTeamContrastColor } = useTeamColors();
  
  return {
    color: getTeamColor(teamName),
    gradient: getTeamGradient(teamName),
    contrastColor: getTeamContrastColor(teamName),
    styles: {
      color: getTeamColor(teamName),
      background: getTeamGradient(teamName)
    }
  };
};
