import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import TeamLogo from './TeamLogo';
import AlertCard from './AlertCard';
import PerformanceTracker from './PerformanceTracker';
import { useAppContext } from '../contexts/AppContext';
import { AlertType, View } from '../types';

interface MyTeamsProps {
  onSelectTeam?: (teamName: string) => void;
  onNavigate?: (view: View) => void;
}

const MyTeams: React.FC<MyTeamsProps> = ({ onSelectTeam, onNavigate }) => {
  const navigate = useNavigate();
    const { 
        teams, 
        favoriteTeams, 
        toggleFavoriteTeam, 
        alerts, 
        addAlert, 
        pastPredictions, 
        addToast 
    } = useAppContext();
    const [searchTerm, setSearchTerm] = useState('');
    const [showAllTeams, setShowAllTeams] = useState(false);
    
    const allTeamNames = useMemo(() => Object.keys(teams || {}).sort(), [teams]);

    // Show only favorited teams by default, or all teams when explicitly requested
    const teamsToDisplay = useMemo(() => {
        const baseTeams = showAllTeams ? allTeamNames : favoriteTeams;
        if (!searchTerm) {
            return baseTeams;
        }
        return baseTeams.filter(team => team.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [allTeamNames, favoriteTeams, searchTerm, showAllTeams]);

    const handleSimulateClick = () => {
        if (favoriteTeams.length > 0) {
            const randomTeam = favoriteTeams[Math.floor(Math.random() * favoriteTeams.length)];
            addAlert({
                type: AlertType.InjuryNews,
                teamName: randomTeam,
                message: `Key player for ${randomTeam} has sustained an injury during training. Prediction models are being updated.`,
            });
        } else {
            addToast("Please favorite a team to simulate an alert.", "warning");
        }
    };

    return (
        <div className="space-y-8 sm:space-y-12">
            {/* Header with Back Button */}
            <div className="flex items-center justify-between mb-6">
                {onNavigate && (
                    <button
                        onClick={() => navigate('/')}
                        className="flex items-center text-blue-400 hover:text-blue-300 transition-colors bg-gray-800 hover:bg-gray-700 px-3 py-2 rounded-lg font-medium"
                    >
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                        <span className="text-sm sm:text-base">Back to Home</span>
                    </button>
                )}
            </div>

            <section>
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                        {showAllTeams ? 'All Teams' : 'My Favorite Teams'}
                    </h2>
                    {favoriteTeams.length === 0 && !showAllTeams && (
                        <button
                            onClick={() => setShowAllTeams(true)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors"
                        >
                            Browse Teams
                        </button>
                    )}
                    {showAllTeams && (
                        <button
                            onClick={() => setShowAllTeams(false)}
                            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors"
                        >
                            Show Favorites Only
                        </button>
                    )}
                </div>

                {favoriteTeams.length === 0 && !showAllTeams ? (
                    <div className="text-center py-16 bg-gray-800 rounded-xl border border-gray-700">
                        <div className="text-6xl mb-4">⭐</div>
                        <h3 className="text-xl font-bold text-white mb-2">No Favorite Teams Yet</h3>
                        <p className="text-gray-400 mb-6">Add teams to your favorites to see them here and receive personalized alerts.</p>
                        <button
                            onClick={() => setShowAllTeams(true)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                        >
                            Browse All Teams
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="mb-6">
                            <input
                                type="text"
                                placeholder={`Search ${showAllTeams ? 'all teams' : 'your favorite teams'}...`}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {teamsToDisplay.map(teamName => {
                                const isFavorite = favoriteTeams.includes(teamName);
                                return (
                                    <div 
                                        key={teamName}
                                        className={`flex items-center space-x-3 p-3 rounded-lg transition-colors duration-200 ${
                                            isFavorite ? 'bg-blue-900/50 border-blue-500' : 'bg-gray-800 border-gray-700 hover:bg-gray-700'
                                        } border`}
                                    >
                                        <button onClick={() => onSelectTeam && onSelectTeam(teamName)} className="flex items-center space-x-3 flex-grow text-left">
                                          <TeamLogo teamName={teamName} size="small" showJerseyColors={true} clickable={true} />
                                          <span className="font-medium text-sm truncate">{teamName}</span>
                                        </button>
                                        <button onClick={() => toggleFavoriteTeam(teamName)} title={isFavorite ? "Remove from favorites" : "Add to favorites"} className="text-2xl flex-shrink-0">
                                            <span className={isFavorite ? 'text-yellow-400' : 'text-gray-600'}>★</span>
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                        {teamsToDisplay.length === 0 && searchTerm && (
                            <div className="text-center py-8 text-gray-400">
                                <p>No teams found for "{searchTerm}".</p>
                            </div>
                        )}
                    </>
                )}
            </section>
            
            <section>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-3xl font-bold tracking-tight text-white">Notifications</h2>
                    <button 
                        onClick={handleSimulateClick}
                        className="bg-yellow-600 hover:bg-yellow-700 text-white font-semibold py-2 px-4 rounded-lg text-sm transition-transform transform hover:scale-105"
                        title="Generates a sample injury alert for one of your favorite teams"
                    >
                        Simulate Injury Alert
                    </button>
                </div>
                 <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 space-y-4 max-h-[500px] overflow-y-auto">
                    {(alerts || []).length > 0 ? (
                        (alerts || []).map(alert => <AlertCard key={alert.id} alert={alert} />)
                    ) : (
                        <div className="text-center text-gray-400 py-8">
                            <p>You have no notifications.</p>
                            <p className="text-sm">Favorite a team to start receiving alerts.</p>
                        </div>
                    )}
                </div>
            </section>

            <section>
                <h2 className="text-3xl font-bold tracking-tight text-white mb-6">Prediction Performance</h2>
                <PerformanceTracker predictions={pastPredictions} />
            </section>
        </div>
    );
};

export default MyTeams;
