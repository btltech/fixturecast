import React from 'react';
import { useAppContext } from '../contexts/AppContext';
import { getTeamData } from '../services/teamDataService';
import TeamLogo from './TeamLogo';
import TeamFormChart from './TeamFormChart';

interface TeamInfoProps {
  teamName: string;
  onClose: () => void;
}

const TeamInfo: React.FC<TeamInfoProps> = ({ teamName, onClose }) => {
  const { teams, fixtures, favoriteTeams, toggleFavoriteTeam, getTeamForm } = useAppContext();
  
  // Get team data with fallback
  const teamData = teams[teamName] || getTeamData(teamName);
  const isFavorite = favoriteTeams.includes(teamName);
  
  // Get team's upcoming matches
  const upcomingMatches = fixtures.filter(match => 
    match.homeTeam === teamName || match.awayTeam === teamName
  ).slice(0, 5);

  // Get team form data
  const teamForm = getTeamForm(teamData.id || 0, teamName);

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-gray-900 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-gray-700">
        {/* Header */}
        <div className="sticky top-0 bg-gray-900 border-b border-gray-700 p-6 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <TeamLogo teamName={teamName} size="large" showJerseyColors={true} />
            <div>
              <h1 className="text-3xl font-bold text-white">{teamName}</h1>
              <p className="text-gray-400">{teamData.country || 'Unknown Country'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-2"
            title="Close team information"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-8">
          {/* Team Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-800 rounded-xl p-6">
              <h2 className="text-2xl font-bold text-white mb-4">Team Information</h2>
              <div className="space-y-3">
                <div>
                  <span className="text-gray-400">Full Name:</span>
                  <span className="text-white ml-2">{teamData.fullName || teamName}</span>
                </div>
                <div>
                  <span className="text-gray-400">Short Name:</span>
                  <span className="text-white ml-2">{teamData.shortName || teamName}</span>
                </div>
                <div>
                  <span className="text-gray-400">League:</span>
                  <span className="text-white ml-2">{teamData.league || 'Unknown'}</span>
                </div>
                <div>
                  <span className="text-gray-400">Country:</span>
                  <span className="text-white ml-2">{teamData.country || 'Unknown'}</span>
                </div>
                <div>
                  <span className="text-gray-400">Founded:</span>
                  <span className="text-white ml-2">{teamData.founded || 'Unknown'}</span>
                </div>
                <div>
                  <span className="text-gray-400">Venue:</span>
                  <span className="text-white ml-2">{teamData.venue || 'Unknown'}</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-800 rounded-xl p-6">
              <h2 className="text-2xl font-bold text-white mb-4">Jersey Colors</h2>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-12 h-12 rounded border border-gray-600"
                    style={{ backgroundColor: teamData.jerseyColors?.primary || '#1f2937' }}
                  ></div>
                  <div>
                    <p className="text-white font-semibold">Primary</p>
                    <p className="text-gray-400 text-sm">{teamData.jerseyColors?.primary || '#1f2937'}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-12 h-12 rounded border border-gray-600"
                    style={{ backgroundColor: teamData.jerseyColors?.secondary || '#ffffff' }}
                  ></div>
                  <div>
                    <p className="text-white font-semibold">Secondary</p>
                    <p className="text-gray-400 text-sm">{teamData.jerseyColors?.secondary || '#ffffff'}</p>
                  </div>
                </div>
                <button
                  onClick={() => toggleFavoriteTeam(teamName)}
                  className={`w-full px-4 py-2 rounded-lg transition-colors ${
                    isFavorite 
                      ? 'bg-yellow-500 text-black hover:bg-yellow-400' 
                      : 'bg-gray-700 text-white hover:bg-gray-600'
                  }`}
                >
                  {isFavorite ? '★ Remove from Favorites' : '☆ Add to Favorites'}
                </button>
              </div>
            </div>
          </div>

          {/* Team Form */}
          {teamForm && (
            <div className="bg-gray-800 rounded-xl p-6">
              <h2 className="text-2xl font-bold text-white mb-4">Recent Form</h2>
              <TeamFormChart 
                formAnalysis={teamForm} 
                showHomeAway={true}
                teamName={teamName}
              />
            </div>
          )}

          {/* Upcoming Matches */}
          {upcomingMatches.length > 0 && (
            <div className="bg-gray-800 rounded-xl p-6">
              <h2 className="text-2xl font-bold text-white mb-4">Upcoming Matches</h2>
              <div className="space-y-4">
                {upcomingMatches.map((match) => (
                  <div key={match.id} className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <TeamLogo teamName={match.homeTeam} size="small" />
                      <span className="text-white font-semibold">vs</span>
                      <TeamLogo teamName={match.awayTeam} size="small" />
                    </div>
                    <div className="text-right">
                      <p className="text-white font-semibold">
                        {match.homeTeam} vs {match.awayTeam}
                      </p>
                      <p className="text-gray-400 text-sm">
                        {new Date(match.date).toLocaleDateString()} at {new Date(match.date).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Team Description */}
          {teamData.description && (
            <div className="bg-gray-800 rounded-xl p-6">
              <h2 className="text-2xl font-bold text-white mb-4">About</h2>
              <p className="text-gray-300 leading-relaxed">{teamData.description}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeamInfo;
