import React, { useState, useMemo } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { getTeamData, isKnownTeam } from '../services/teamDataService';

interface TeamLogoProps {
  teamName: string;
  size?: 'small' | 'medium' | 'large';
  showJerseyColors?: boolean;
  onClick?: () => void;
  clickable?: boolean;
}

const PlaceholderIcon = () => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        className="w-3/5 h-3/5 text-gray-500"
        aria-hidden="true"
    >
        <path d="M12 2L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-3z" />
    </svg>
);

const TeamLogo: React.FC<TeamLogoProps> = ({ teamName, size = 'medium', showJerseyColors = false, onClick, clickable = false }) => {
  const { teams } = useAppContext();
  const [hasError, setHasError] = useState(false);
  
  // Get team data with fallback system
  const teamData = useMemo(() => {
    // First try to get from context (API data)
    const contextTeam = teams[teamName];
    const base = contextTeam || getTeamData(teamName);
    // Guarantee jerseyColors are present
    if (!base.jerseyColors || !base.jerseyColors.primary || !base.jerseyColors.secondary) {
      const fallback = getTeamData(teamName);
      return { ...base, jerseyColors: fallback.jerseyColors };
    }
    return base;
  }, [teams, teamName]);

  // Generate smart initials
  const getSmartInitials = useMemo(() => {
    if (teamData.shortName && teamData.shortName.length <= 3) {
      return teamData.shortName.toUpperCase();
    }
    
    // For longer team names, create smart initials
    const words = teamName.split(' ').filter(word => 
      !['FC', 'CF', 'United', 'City', 'Town', 'Club', 'Football', 'Soccer'].includes(word)
    );
    
    if (words.length >= 2) {
      return words.slice(0, 2).map(word => word[0]).join('').toUpperCase();
    } else if (words.length === 1) {
      const word = words[0];
      if (word.length >= 3) {
        return word.substring(0, 2).toUpperCase();
      }
      return word[0].toUpperCase();
    }
    
    return teamName.substring(0, 2).toUpperCase();
  }, [teamName, teamData.shortName]);
  
  const sizeClasses = {
      small: 'w-10 h-10 text-xs',
      medium: 'w-16 h-16 text-sm',
      large: 'w-24 h-24 text-xl'
  };

  // Enhanced color palette for better visual variety
  const getTeamColors = useMemo(() => {
    if (showJerseyColors && teamData?.jerseyColors) {
      return {
        background: teamData.jerseyColors.primary,
        text: teamData.jerseyColors.secondary
      };
    }
    
    // Generate colors based on team name for consistency
    const hash = teamName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const colorPalettes = [
      { background: '#1e40af', text: '#ffffff' }, // Blue
      { background: '#dc2626', text: '#ffffff' }, // Red  
      { background: '#16a34a', text: '#ffffff' }, // Green
      { background: '#c2410c', text: '#ffffff' }, // Orange
      { background: '#7c3aed', text: '#ffffff' }, // Purple
      { background: '#0891b2', text: '#ffffff' }, // Cyan
      { background: '#be123c', text: '#ffffff' }, // Rose
      { background: '#4338ca', text: '#ffffff' }, // Indigo
    ];
    
    return colorPalettes[hash % colorPalettes.length];
  }, [teamName, showJerseyColors, teamData]);
  
  const containerClasses = `rounded-full flex items-center justify-center overflow-hidden shadow-lg border-2 border-white/10 ${sizeClasses[size]} ${clickable ? 'cursor-pointer hover:shadow-xl hover:scale-105 transition-all duration-200 ease-in-out hover:border-white/20' : ''}`;
  const containerStyle = { backgroundColor: getTeamColors.background };

  // Enhanced fallback with better styling
  if (hasError || !teamData.logo) {
    return (
      <div 
        className={containerClasses} 
        style={containerStyle}
        title={`${teamName} (Logo unavailable)`}
        onClick={clickable ? onClick : undefined}
      >
        <div 
          className="w-full h-full flex items-center justify-center font-bold tracking-tight select-none"
          style={{ color: getTeamColors.text }}
        >
          {getSmartInitials}
        </div>
      </div>
    );
  }
  
  return (
    <div className={containerClasses} style={containerStyle} onClick={clickable ? onClick : undefined}> {/* eslint-disable-line react/forbid-dom-props */}
        <img 
            src={teamData.logo} 
            alt={`${teamName} logo`} 
            className="w-full h-full object-cover"
            onError={() => setHasError(true)}
            onLoad={() => setHasError(false)}
        />
    </div>
  );
};

export default TeamLogo;
