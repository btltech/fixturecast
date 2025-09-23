import React, { useMemo, useState } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { useAppContext } from '../contexts/AppContext';
import { getTeamData } from '../services/teamDataService';
import { getTeamDetails } from '../services/footballApiService';
import TeamLogo from './TeamLogo';
import MatchCard from './MatchCard';
import { View, Player, Transfer, Injury, MatchResult } from '../types';
import TeamFormChart from './TeamFormChart';
import LoadingSpinner from './LoadingSpinner';

interface TeamPageProps {
  onNavigate: (view: View) => void;
}

const TeamPage: React.FC<TeamPageProps> = ({ onNavigate }) => {
  const { teamName: encodedTeamName } = useParams<{ teamName: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'squad' | 'stats' | 'fixtures' | 'transfers'>('overview');
  const [loading, setLoading] = useState(false);

  // Decode the team name from URL
  const teamName = encodedTeamName ? decodeURIComponent(encodedTeamName) : '';

  // If no team name, redirect to fixtures
  if (!teamName) {
    return <Navigate to="/fixtures" replace />;
  }

  const { teams, fixtures, favoriteTeams, toggleFavoriteTeam, getTeamForm, addToast, getTeamDetails, getCachedTeamData, refreshTeamDetails } = useAppContext();
  
  // Get team data with API enrichment and fallback
  const [teamData, setTeamData] = React.useState(() => {
    // First check if we have cached detailed data
    const cached = getCachedTeamData(teamName);
    if (cached) {
      console.log(`📋 Using cached detailed data for ${teamName}`);
      return cached;
    }
    // Fallback to basic team data
    return teams[teamName] || getTeamData(teamName);
  });

  React.useEffect(() => {
    let isMounted = true;

    const fetchTeamData = async () => {
      // Check if we already have detailed data (either cached or previously loaded)
      const cached = getCachedTeamData(teamName);
      if (cached && cached.squad && cached.seasonStats) {
        console.log(`📋 ${teamName} already has comprehensive data`);
        if (isMounted) {
          setTeamData(cached);
        }
        return;
      }

      setLoading(true);
      try {
        console.log(`🔍 Fetching detailed data for ${teamName}...`);
        const apiTeam = await getTeamDetails(teamName);
        if (isMounted && apiTeam) {
          // Derive league from any fixture containing the team if missing
          const leagueFromFixtures = fixtures.find(f => f.homeTeam === teamName || f.awayTeam === teamName)?.league;
          const enrichedData = {
            ...apiTeam,
            league: apiTeam.league || leagueFromFixtures || teamData.league
          };
          setTeamData(enrichedData);
          console.log(`✅ Successfully loaded detailed data for ${teamName}`);
        }
      } catch (e) {
        console.error(`❌ Failed to fetch detailed data for ${teamName}:`, e);
        addToast('Failed to load team details - using available data', 'warning');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchTeamData();
    return () => { isMounted = false; };
  }, [teamName, fixtures, addToast, getTeamDetails, getCachedTeamData, teamData.league]);
  const isFavorite = favoriteTeams.includes(teamName);
  const formAnalysis = getTeamForm(teams[teamName]?.id || 0, teamName);
  
  // Compute upcoming and recent matches
  const { upcomingMatches, recentResults } = useMemo(() => {
    const now = new Date();
    const teamMatches = fixtures.filter(m => m.homeTeam === teamName || m.awayTeam === teamName);
    const upcoming = teamMatches
      .filter(m => new Date(m.date) >= now)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 5);
    const recent = teamMatches
      .filter(m => new Date(m.date) < now)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
    return { upcomingMatches: upcoming, recentResults: recent };
  }, [fixtures, teamName]);

  // Helper functions
  const getPositionColor = (position: string) => {
    switch (position) {
      case 'Goalkeeper': return 'text-yellow-400';
      case 'Defender': return 'text-blue-400';
      case 'Midfielder': return 'text-green-400';
      case 'Attacker': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getResultColor = (result: string) => {
    switch (result) {
      case 'W': return 'text-green-400';
      case 'D': return 'text-yellow-400';
      case 'L': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate('/')}
            className="flex items-center text-blue-400 hover:text-blue-300 transition-colors bg-gray-800 hover:bg-gray-700 px-3 py-2 rounded-lg font-medium"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>Back to Dashboard</span>
          </button>

          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-400">
              {loading ? 'Loading team details...' : 'Team Details'}
            </span>
            {loading && <LoadingSpinner />}
            {!loading && (
              <button
                onClick={async () => {
                  setLoading(true);
                  try {
                    const refreshedData = await refreshTeamDetails(teamName);
                    if (refreshedData) {
                      setTeamData(refreshedData);
                      addToast('Team details refreshed!', 'success');
                    }
                  } catch (error) {
                    addToast('Failed to refresh team details', 'error');
                  } finally {
                    setLoading(false);
                  }
                }}
                className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                title="Refresh team details"
              >
                🔄
              </button>
            )}
          </div>
        </div>

        {/* Team Header */}
        <div className="bg-gray-800 rounded-xl p-6 mb-6 border border-gray-700">
          <div className="flex flex-col md:flex-row items-center md:items-start space-y-4 md:space-y-0 md:space-x-6">
            <TeamLogo teamName={teamName} size="large" showJerseyColors={true} />

            <div className="flex-1 text-center md:text-left">
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">{teamName}</h1>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mb-3">
                <span className="text-gray-400">{teamData.league || 'Unknown League'}</span>
                <span className="text-gray-500">•</span>
                <span className="text-gray-400">{teamData.country || 'Unknown Country'}</span>
                {teamData.founded && (
                  <>
                    <span className="text-gray-500">•</span>
                    <span className="text-gray-400">Founded {teamData.founded}</span>
                  </>
                )}
              </div>

              {/* League Position & Stats */}
              {teamData.leaguePosition && (
                <div className="flex items-center justify-center md:justify-start space-x-4 mb-3">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-400">#{teamData.leaguePosition}</div>
                    <div className="text-xs text-gray-400">Position</div>
                  </div>
                  {teamData.points && (
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-400">{teamData.points}</div>
                      <div className="text-xs text-gray-400">Points</div>
                    </div>
                  )}
                  {teamData.seasonStats && (
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-400">{teamData.seasonStats.won}-{teamData.seasonStats.drawn}-{teamData.seasonStats.lost}</div>
                      <div className="text-xs text-gray-400">W-D-L</div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-col items-center md:items-end space-y-2">
                {/* Data Status Indicator */}
                <div className="flex items-center space-x-2 text-xs">
                  {loading && (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-400"></div>
                      <span className="text-blue-400">Loading details...</span>
                    </>
                  )}
                  {!loading && teamData.squad && teamData.seasonStats && (
                    <div className="flex items-center space-x-1 text-green-400">
                      <span>✅</span>
                      <span>Complete</span>
                    </div>
                  )}
                  {!loading && (!teamData.squad || !teamData.seasonStats) && (
                <div className="flex items-center space-x-2 text-yellow-400">
                  <span>⚠️</span>
                  <div>
                    <div>Limited data</div>
                    <div className="text-[10px] text-gray-500">
                      Some details are unavailable; showing basic team info only.
                    </div>
                  </div>
                </div>
                  )}
                </div>

                <button
                  onClick={() => toggleFavoriteTeam(teamName)}
                  className={`px-4 py-2 rounded-lg transition-colors font-medium ${
                    isFavorite
                      ? 'bg-yellow-500 text-black hover:bg-yellow-400'
                      : 'bg-gray-700 text-white hover:bg-gray-600'
                  }`}
                >
                  {isFavorite ? '★ Favorited' : '☆ Add to Favorites'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-gray-800 rounded-lg p-1 mb-6 border border-gray-700">
          <div className="flex space-x-1">
            {[
              { id: 'overview', label: 'Overview', icon: '📊' },
              { id: 'squad', label: 'Squad', icon: '👥' },
              { id: 'stats', label: 'Statistics', icon: '📈' },
              { id: 'fixtures', label: 'Fixtures', icon: '📅' },
              { id: 'transfers', label: 'Transfers', icon: '↗️' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 px-4 py-2 rounded-md transition-all duration-200 font-medium ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Data Completeness Status */}
              <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                <h3 className="text-lg font-bold text-white mb-4">Data Status</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className={`p-3 rounded-lg ${teamData.squad ? 'bg-green-900/20 border border-green-600/30' : 'bg-red-900/20 border border-red-600/30'}`}>
                    <div className={`text-sm font-medium ${teamData.squad ? 'text-green-400' : 'text-red-400'}`}>
                      {teamData.squad ? '✅ Squad' : '❌ Squad'}
                    </div>
                    <div className="text-xs text-gray-400">
                      {teamData.squad ? `${teamData.squad.length} players` : 'Not available'}
                    </div>
                  </div>

                  <div className={`p-3 rounded-lg ${teamData.seasonStats ? 'bg-green-900/20 border border-green-600/30' : 'bg-red-900/20 border border-red-600/30'}`}>
                    <div className={`text-sm font-medium ${teamData.seasonStats ? 'text-green-400' : 'text-red-400'}`}>
                      {teamData.seasonStats ? '✅ Stats' : '❌ Stats'}
                    </div>
                    <div className="text-xs text-gray-400">
                      {teamData.seasonStats ? `${teamData.seasonStats.played} matches` : 'Not available'}
                    </div>
                  </div>

                  <div className={`p-3 rounded-lg ${teamData.last5Matches ? 'bg-green-900/20 border border-green-600/30' : 'bg-red-900/20 border border-red-600/30'}`}>
                    <div className={`text-sm font-medium ${teamData.last5Matches ? 'text-green-400' : 'text-red-400'}`}>
                      {teamData.last5Matches ? '✅ Form' : '❌ Form'}
                    </div>
                    <div className="text-xs text-gray-400">
                      {teamData.last5Matches ? `${teamData.last5Matches.length} matches` : 'Not available'}
                    </div>
                  </div>

                  <div className={`p-3 rounded-lg ${teamData.transfers ? 'bg-green-900/20 border border-green-600/30' : 'bg-red-900/20 border border-red-600/30'}`}>
                    <div className={`text-sm font-medium ${teamData.transfers ? 'text-green-400' : 'text-red-400'}`}>
                      {teamData.transfers ? '✅ Transfers' : '❌ Transfers'}
                    </div>
                    <div className="text-xs text-gray-400">
                      {teamData.transfers ? `${teamData.transfers.length} transfers` : 'Not available'}
                    </div>
                  </div>
                </div>

              </div>

              {/* Recent Form */}
              {teamData.recentForm && teamData.recentForm.length > 0 && (
                <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                  <h3 className="text-xl font-bold text-white mb-4">Recent Form</h3>
                  <div className="flex space-x-2">
                    {teamData.recentForm.map((result, index) => (
                      <div
                        key={index}
                        className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg ${
                          result === 'W' ? 'bg-green-600 text-white' :
                          result === 'D' ? 'bg-yellow-600 text-white' :
                          result === 'L' ? 'bg-red-600 text-white' :
                          'bg-gray-600 text-white'
                        }`}
                      >
                        {result}
                      </div>
                    ))}
                  </div>
                  <p className="text-sm text-gray-400 mt-2">Last 5 matches</p>
                </div>
              )}

              {/* Last 5 Matches */}
              {teamData.last5Matches && teamData.last5Matches.length > 0 && (
                <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                  <h3 className="text-xl font-bold text-white mb-4">Last 5 Matches</h3>
                  <div className="space-y-2">
                    {teamData.last5Matches.map((match, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <span className={`font-bold text-lg ${getResultColor(match.result)}`}>
                            {match.result}
                          </span>
                          <div>
                            <div className="text-white font-medium">
                              {match.home ? 'vs' : '@'} {match.opponent}
                            </div>
                            <div className="text-sm text-gray-400">{match.competition}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-white font-medium">{match.score}</div>
                          <div className="text-sm text-gray-400">
                            {new Date(match.date).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Current Injuries */}
              {teamData.injuries && teamData.injuries.length > 0 && (
                <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                  <h3 className="text-xl font-bold text-white mb-4">Current Injuries</h3>
                  <div className="space-y-2">
                    {teamData.injuries.map((injury, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-red-900/20 border border-red-800/30 rounded-lg">
                        <div>
                          <div className="text-white font-medium">{injury.player}</div>
                          <div className="text-sm text-gray-400">{injury.type}</div>
                        </div>
                        <div className="text-right text-sm text-gray-400">
                          {injury.expectedReturn && `Return: ${injury.expectedReturn}`}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Squad Tab */}
          {activeTab === 'squad' && (
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h3 className="text-xl font-bold text-white mb-6">Team Squad</h3>

              {teamData.squad && teamData.squad.length > 0 ? (
                <div className="space-y-4">
                  {/* Group by position */}
                  {['Goalkeeper', 'Defender', 'Midfielder', 'Attacker'].map(position => {
                    const players = teamData.squad!.filter(p => p.position === position);
                    if (players.length === 0) return null;

                    return (
                      <div key={position}>
                        <h4 className={`text-lg font-semibold mb-3 ${getPositionColor(position)}`}>
                          {position}s
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {players.map(player => (
                            <div key={player.id} className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                              <div className="flex items-center space-x-3">
                                {player.photo ? (
                                  <img
                                    src={player.photo}
                                    alt={player.name}
                                    className="w-12 h-12 rounded-full object-cover"
                                  />
                                ) : (
                                  <div className="w-12 h-12 rounded-full bg-gray-600 flex items-center justify-center">
                                    <span className="text-white font-bold text-sm">
                                      {player.name.charAt(0)}
                                    </span>
                                  </div>
                                )}
                                <div className="flex-1">
                                  <div className="text-white font-medium">{player.name}</div>
                                  <div className="text-sm text-gray-400">
                                    {player.age} years • #{player.number}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-400">Squad information not available</p>
                </div>
              )}
            </div>
          )}

          {/* Statistics Tab */}
          {activeTab === 'stats' && (
            <div className="space-y-6">
              {teamData.seasonStats && (
                <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                  <h3 className="text-xl font-bold text-white mb-6">Season Statistics</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-gray-700/50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-400">{teamData.seasonStats.played}</div>
                      <div className="text-sm text-gray-400">Played</div>
                    </div>
                    <div className="text-center p-4 bg-gray-700/50 rounded-lg">
                      <div className="text-2xl font-bold text-green-400">{teamData.seasonStats.won}</div>
                      <div className="text-sm text-gray-400">Won</div>
                    </div>
                    <div className="text-center p-4 bg-gray-700/50 rounded-lg">
                      <div className="text-2xl font-bold text-yellow-400">{teamData.seasonStats.drawn}</div>
                      <div className="text-sm text-gray-400">Drawn</div>
                    </div>
                    <div className="text-center p-4 bg-gray-700/50 rounded-lg">
                      <div className="text-2xl font-bold text-red-400">{teamData.seasonStats.lost}</div>
                      <div className="text-sm text-gray-400">Lost</div>
                    </div>
                    <div className="text-center p-4 bg-gray-700/50 rounded-lg">
                      <div className="text-2xl font-bold text-purple-400">{teamData.seasonStats.goalsFor}</div>
                      <div className="text-sm text-gray-400">Goals For</div>
                    </div>
                    <div className="text-center p-4 bg-gray-700/50 rounded-lg">
                      <div className="text-2xl font-bold text-orange-400">{teamData.seasonStats.goalsAgainst}</div>
                      <div className="text-sm text-gray-400">Goals Against</div>
                    </div>
                    <div className="text-center p-4 bg-gray-700/50 rounded-lg">
                      <div className="text-2xl font-bold text-cyan-400">{teamData.seasonStats.cleanSheets}</div>
                      <div className="text-sm text-gray-400">Clean Sheets</div>
                    </div>
                    <div className="text-center p-4 bg-gray-700/50 rounded-lg">
                      <div className="text-2xl font-bold text-pink-400">{teamData.seasonStats.failedToScore}</div>
                      <div className="text-sm text-gray-400">Failed to Score</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Fixtures Tab */}
          {activeTab === 'fixtures' && (
            <div className="space-y-6">
              {/* Upcoming Matches */}
              {upcomingMatches.length > 0 && (
                <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                  <h3 className="text-xl font-bold text-white mb-4">Upcoming Fixtures</h3>
                  <div className="space-y-4">
                    {upcomingMatches.map((match) => (
                      <MatchCard
                        key={match.id}
                        match={match}
                        onSelectMatch={(m) => navigate(`/match/${m.id}`, { state: { match: m } })}
                        onSelectTeam={(team) => navigate(`/team/${encodeURIComponent(team)}`)}
                        compact={true}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Results */}
              {recentResults.length > 0 && (
                <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                  <h3 className="text-xl font-bold text-white mb-4">Recent Results</h3>
                  <div className="space-y-4">
                    {recentResults.map((match) => (
                      <MatchCard
                        key={match.id}
                        match={match}
                        onSelectMatch={(m) => navigate(`/match/${m.id}`, { state: { match: m } })}
                        onSelectTeam={(team) => navigate(`/team/${encodeURIComponent(team)}`)}
                        compact={true}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Transfers Tab */}
          {activeTab === 'transfers' && (
            <div className="space-y-6">
              {teamData.transfers && teamData.transfers.length > 0 ? (
                <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                  <h3 className="text-xl font-bold text-white mb-6">Transfer Activity</h3>
                  <div className="space-y-4">
                    {teamData.transfers.map((transfer, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                            transfer.type === 'in'
                              ? 'bg-green-600/20 text-green-400 border border-green-600/30'
                              : 'bg-red-600/20 text-red-400 border border-red-600/30'
                          }`}>
                            {transfer.type === 'in' ? '↘️ IN' : '↗️ OUT'}
                          </div>
                          <div>
                            <div className="text-white font-medium">{transfer.player}</div>
                            <div className="text-sm text-gray-400">
                              {transfer.from && `From: ${transfer.from}`}
                              {transfer.to && `To: ${transfer.to}`}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-400">
                            {new Date(transfer.date).toLocaleDateString()}
                          </div>
                          {transfer.fee && (
                            <div className="text-sm text-blue-400">{transfer.fee}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 text-center">
                  <p className="text-gray-400">No recent transfer activity</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

};

export default TeamPage;
