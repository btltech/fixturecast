import React from 'react';
import { Match } from '../types';
import TeamFormChart from './TeamFormChart';
import { useAppContext } from '../contexts/AppContext';

interface FormTrendsOverviewProps {
  matches: Match[];
  maxMatches?: number;
  className?: string;
}

const FormTrendsOverview: React.FC<FormTrendsOverviewProps> = ({
  matches,
  maxMatches = 6,
  className = ''
}) => {
  const { getTeamForm } = useAppContext();
  
  // Get unique teams from matches
  const teams = Array.from(new Set([
    ...matches.map(m => m.homeTeam),
    ...matches.map(m => m.awayTeam)
  ])).slice(0, maxMatches);
  
  if (teams.length === 0) {
    return (
      <div className={`bg-gray-800 rounded-lg p-4 ${className}`}>
        <h3 className="text-lg font-semibold text-blue-400 mb-2">Team Form Trends</h3>
        <p className="text-gray-400">No teams available</p>
      </div>
    );
  }
  
  return (
    <div className={`bg-gray-800 rounded-lg p-4 ${className}`}>
      <h3 className="text-lg font-semibold text-blue-400 mb-4">Team Form Trends</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {teams.map((teamName, index) => {
          const formAnalysis = getTeamForm(index + 1, teamName);
          
          return (
            <div key={teamName} className="bg-gray-700 rounded-lg p-3">
              <h4 className="text-sm font-semibold text-white mb-2">{teamName}</h4>
              <TeamFormChart 
                formAnalysis={formAnalysis}
                showHomeAway={false}
                compact={true}
              />
            </div>
          );
        })}
      </div>
      
      <div className="mt-4 text-xs text-gray-500 text-center">
        Showing form for {teams.length} teams from upcoming matches
      </div>
    </div>
  );
};

export default FormTrendsOverview;
