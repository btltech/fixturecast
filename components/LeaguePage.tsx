import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { Match, League } from '../types';
import { useAppContext } from '../contexts/AppContext';
import LeagueLogo from './LeagueLogo';
import EnhancedFixtureCard from './EnhancedFixtureCard';
import MatchStatusIndicator from './MatchStatusIndicator';
import LoadingSpinner from './LoadingSpinner';
import { colorSystemService } from '../services/colorSystemService';

interface LeaguePageProps {
  onSelectMatch: (match: Match) => void;
  onSelectTeam: (teamName: string) => void;
  onSelectPrediction?: (prediction: any) => void;
}

const LeaguePage: React.FC<LeaguePageProps> = ({
  onSelectMatch,
  onSelectTeam,
  onSelectPrediction
}) => {
  const { league: leagueParam } = useParams<{ league: string }>();
  const navigate = useNavigate();
  const {
    fixtures,
    leagueTables,
    loadLeagueFixtures,
    loadLeagueTable,
    getPrediction,
    isLoading,
    addToast
  } = useAppContext();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validate league parameter
  const league = useMemo(() => {
    if (!leagueParam) return null;
    // Convert string to League enum if possible
    const leagueValue = Object.values(League).find(l => l === leagueParam);
    return leagueValue || null;
  }, [leagueParam]);

  // Get league fixtures
  const leagueFixtures = useMemo(() => {
    if (!league) return [];
    return fixtures.filter(fixture => fixture.league === league);
  }, [fixtures, league]);

  // Get league table if available
  const leagueTable = useMemo(() => {
    if (!league || !leagueTables[league]) return null;
    return leagueTables[league];
  }, [leagueTables, league]);

  // Group fixtures by date
  const fixturesByDate = useMemo(() => {
    const groups: { [key: string]: Match[] } = {};

    leagueFixtures.forEach(match => {
      const date = new Date(match.date);
      const dateKey = date.toDateString();

      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(match);
    });

    // Sort matches within each date by time
    Object.keys(groups).forEach(dateKey => {
      groups[dateKey].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    });

    return groups;
  }, [leagueFixtures]);

  // Sort dates chronologically
  const sortedDates = useMemo(() => {
    return Object.keys(fixturesByDate).sort((a, b) => {
      return new Date(a).getTime() - new Date(b).getTime();
    });
  }, [fixturesByDate]);

  // Load league data on mount
  useEffect(() => {
    const loadLeagueData = async () => {
      if (!league) return;

      setLoading(true);
      setError(null);

      try {
        // Load fixtures and table in parallel
        await Promise.all([
          loadLeagueFixtures(league),
          loadLeagueTable(league)
        ]);

        addToast(`Loaded ${leagueFixtures.length} fixtures for ${league}`, 'success');
      } catch (err) {
        console.error('Failed to load league data:', err);
        setError('Failed to load league data. Please try again.');
        addToast('Failed to load league data', 'error');
      } finally {
        setLoading(false);
      }
    };

    loadLeagueData();
  }, [league, loadLeagueFixtures, loadLeagueTable, addToast]);

  // Format date header
  const formatDateHeader = (dateString: string): { day: string; date: string; isToday: boolean; isTomorrow: boolean } => {
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const isTomorrow = date.toDateString() === new Date(now.getTime() + 24 * 60 * 60 * 1000).toDateString();

    const day = date.toLocaleDateString('en-US', { weekday: 'long' });
    const dateStr = date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });

    return { day, date: dateStr, isToday, isTomorrow };
  };

  // Get league colors
  const leagueColors = useMemo(() => {
    return league ? colorSystemService.getLeagueColors(league) : { primary: '#6B7280', secondary: '#374151', accent: '#FFFFFF', text: '#FFFFFF' };
  }, [league]);

  if (!league) {
    return (
      <div className="min-h-screen bg-gray-900 text-gray-100 font-sans flex flex-col items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">League Not Found</h2>
          <p className="text-gray-400 mb-6">The requested league could not be found.</p>
          <button
            onClick={() => navigate('/')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/')}
                className="flex items-center text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Dashboard
              </button>
            </div>

            <div className="flex items-center space-x-4">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg"
                style={{ backgroundColor: leagueColors.primary }}
              >
                <LeagueLogo league={league} size="medium" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">{league}</h1>
                <p className="text-sm text-gray-400">
                  {leagueFixtures.length} upcoming fixtures
                  {leagueTable && ` • ${leagueTable.length} teams`}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => navigate('/fixtures')}
                className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors font-medium"
              >
                View All Fixtures
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <LoadingSpinner />
            <p className="mt-4 text-gray-400">Loading {league} fixtures...</p>
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <div className="text-red-400 mb-4">⚠️ {error}</div>
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : leagueFixtures.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-gray-400 mb-4">
              <svg className="mx-auto h-16 w-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-xl font-semibold text-white mb-2">No Upcoming Fixtures</h3>
              <p className="text-gray-400">There are no upcoming fixtures for {league} at this time.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* League Table Preview */}
            {leagueTable && leagueTable.length > 0 && (
              <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-white">League Table</h2>
                  <span className="text-sm text-gray-400">Top 5 Teams</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left py-2 px-2 text-gray-400">#</th>
                        <th className="text-left py-2 px-2 text-gray-400">Team</th>
                        <th className="text-center py-2 px-2 text-gray-400">MP</th>
                        <th className="text-center py-2 px-2 text-gray-400">W</th>
                        <th className="text-center py-2 px-2 text-gray-400">D</th>
                        <th className="text-center py-2 px-2 text-gray-400">L</th>
                        <th className="text-center py-2 px-2 text-gray-400">Pts</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leagueTable.slice(0, 5).map((team, index) => (
                        <tr key={team.team.id} className="border-b border-gray-700/50">
                          <td className="py-2 px-2 text-gray-300">{index + 1}</td>
                          <td className="py-2 px-2">
                            <button
                              onClick={() => onSelectTeam(team.team.name)}
                              className="text-blue-400 hover:text-blue-300 transition-colors font-medium"
                            >
                              {team.team.name}
                            </button>
                          </td>
                          <td className="text-center py-2 px-2 text-gray-300">{team.all.played}</td>
                          <td className="text-center py-2 px-2 text-gray-300">{team.all.win}</td>
                          <td className="text-center py-2 px-2 text-gray-300">{team.all.draw}</td>
                          <td className="text-center py-2 px-2 text-gray-300">{team.all.lose}</td>
                          <td className="text-center py-2 px-2 font-semibold text-white">{team.points}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Fixtures by Date */}
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-white">Upcoming Fixtures</h2>

              {sortedDates.map(dateKey => {
                const dateFixtures = fixturesByDate[dateKey];
                const dateInfo = formatDateHeader(dateKey);

                return (
                  <div key={dateKey} className="space-y-4">
                    {/* Date Header */}
                    <div className="sticky top-0 z-10 bg-gray-800/90 backdrop-blur-sm border border-gray-700 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center space-x-2">
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center"
                              style={{ backgroundColor: leagueColors.primary }}
                            >
                              <LeagueLogo league={league} size="small" />
                            </div>
                            <div>
                              <h3 className={`text-lg font-bold ${
                                dateInfo.isToday ? 'text-blue-400' :
                                dateInfo.isTomorrow ? 'text-green-400' :
                                'text-white'
                              }`}>
                                {dateInfo.isToday ? 'TODAY' :
                                 dateInfo.isTomorrow ? 'TOMORROW' :
                                 dateInfo.day}
                              </h3>
                              <p className="text-sm text-gray-400">{dateInfo.date}</p>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-medium text-gray-400">
                            {dateFixtures.length} {dateFixtures.length === 1 ? 'match' : 'matches'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Fixtures Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {dateFixtures.map((match) => {
                        const prediction = getPrediction(match.id);
                        return (
                          <EnhancedFixtureCard
                            key={match.id}
                            match={match}
                            prediction={prediction}
                            onClick={() => onSelectMatch(match)}
                            onSelectMatch={onSelectMatch}
                            onSelectTeam={onSelectTeam}
                            onSelectPrediction={onSelectPrediction}
                            showStatusBadge={true}
                            statusVariant="detailed"
                            className="w-full"
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LeaguePage;
