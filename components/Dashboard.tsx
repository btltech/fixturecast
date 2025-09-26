
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Match, Prediction, League } from '../types';
import MatchCard from './MatchCard';
import TeamLogo from './TeamLogo';
import LeagueLogo from './LeagueLogo';
import { useAppContext } from '../contexts/AppContext';
import { selectMatchOfTheDay, getMatchScoreBreakdown, scoreMatch } from '../services/matchScoringService';
import { getHomeTeamName, getAwayTeamName, getMatchLeagueName } from '../utils/matchUtils';
import EnhancedAccuracyTracker from './EnhancedAccuracyTracker';
import CloudIntegrityPanel from './CloudIntegrityPanel';
import EnhancedLiveMatchesList from './EnhancedLiveMatchesList';
import ConfidenceOverview from './ConfidenceOverview';
import FormTrendsOverview from './FormTrendsOverview';
// DeploymentStatus removed from public view - admin debugging only
// PerformanceDashboard removed from public view - admin monitoring only
import LoadingSpinner from './LoadingSpinner';
import AutomatedSystemStatus from './AutomatedSystemStatus';

interface DashboardProps {
  onSelectMatch: (match: Match) => void;
  onSelectTeam: (teamName: string) => void;
  navigateToFixtures: () => void;
  setSelectedLeagueFilter: (league: League | 'all') => void;
  onSelectPrediction?: (prediction: any) => void;
}

const Countdown: React.FC<{ targetDate: Date }> = ({ targetDate }) => {
  const [timeLeft, setTimeLeft] = useState(() => {
    const difference = +targetDate - +new Date();
    if (difference > 0) {
      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
      };
    }
    return {};
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const difference = +targetDate - +new Date();
      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
        });
      } else {
        setTimeLeft({});
      }
    }, 1000 * 60); // Update every minute is sufficient

    return () => clearInterval(timer);
  }, [targetDate]);
  
  const getTimeUnitColor = (interval: string) => {
    switch (interval) {
      case 'days': return 'text-blue-400';
      case 'hours': return 'text-green-400';
      case 'minutes': return 'text-yellow-400';
      default: return 'text-white';
    }
  };

  const timerComponents = Object.entries(timeLeft).map(([interval, value]) => (
    <div key={interval} className="text-center">
      <span className={`text-3xl sm:text-4xl lg:text-6xl font-black tracking-tight ${getTimeUnitColor(interval)} drop-shadow-lg`}>
        {String(value).padStart(2, '0')}
      </span>
      <span className="block text-sm text-gray-300 uppercase font-medium mt-2 tracking-wide">
        {interval}
      </span>
    </div>
  ));
  
  return (
    <div className="flex space-x-3 sm:space-x-6 lg:space-x-8 justify-center items-center">
      {timerComponents.length ? (
        <>
          {timerComponents.map((component, index) => (
            <React.Fragment key={index}>
              {component}
              {index < timerComponents.length - 1 && (
                <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-500 self-start mt-1 sm:mt-2 lg:mt-3">:</div>
              )}
            </React.Fragment>
          ))}
        </>
      ) : (
        <span className="text-lg sm:text-xl lg:text-2xl font-bold text-white">Matchday</span>
      )}
    </div>
  );
};

const Dashboard: React.FC<DashboardProps> = ({ onSelectMatch, onSelectTeam, navigateToFixtures, setSelectedLeagueFilter, onSelectPrediction }) => {
  const { fixtures, teams, leagueTables, favoriteTeams, toggleFavoriteTeam, lastUpdated, refreshRealTimeData, accuracyStats, getAccuracyDisplay, liveMatches, fetchLiveMatches, getPrediction, loadLeagueFixtures, loadLeagueTable, apiUsage, isLoading, getTeamDataStatus, refreshAllTeamDetails, fixtureError } = useAppContext();
  const navigate = useNavigate();

  // Debug: Log fixtures status and examine real fixture data
  console.log('📊 Dashboard: fixtures length:', fixtures.length);
  console.log('📊 Dashboard: isLoading:', isLoading);
  
  if (fixtures.length > 0) {
    // Show ALL fixtures with dates so we can see what's actually available
    console.log('🔍 Dashboard: ALL REAL FIXTURES:', fixtures.map(f => ({
      match: `${f.homeTeam} vs ${f.awayTeam}`,
      league: f.league,
      date: f.date,
      dateOnly: f.date.split('T')[0]
    })));
    
    // Show today's fixtures specifically
    const todayStr = '2025-09-26';
    const todayFixtures = fixtures.filter(f => f.date.startsWith(todayStr));
    console.log(`🎯 FIXTURES FOR TODAY (${todayStr}):`, todayFixtures.map(f => ({
      match: `${f.homeTeam} vs ${f.awayTeam}`,
      league: f.league,
      time: f.date.split('T')[1]?.substring(0, 5)
    })));
    
    // Show weekend fixtures
    const weekendFixtures = fixtures.filter(f => 
      f.date.startsWith('2025-09-27') || f.date.startsWith('2025-09-28')
    );
    console.log(`🏁 WEEKEND FIXTURES (Sep 27-28):`, weekendFixtures.map(f => ({
      match: `${f.homeTeam} vs ${f.awayTeam}`,
      league: f.league,
      date: f.date.split('T')[0]
    })));
    
    console.log('🔍 Dashboard: Premier League fixtures:', fixtures.filter(f => f.league === League.PremierLeague).length);
  }
  const [allTeamsCollapsed, setAllTeamsCollapsed] = useState(true);

  // Prefer today's earliest match for countdown; fallback to first fixture
  // Determine current UTC date window dynamically (remove hard-coded date)
  const todayIso = new Date().toISOString().slice(0,10); // YYYY-MM-DD
  const todayStart = new Date(`${todayIso}T00:00:00Z`);
  const todayEnd = new Date(`${todayIso}T00:00:00Z`);
  todayEnd.setUTCDate(todayEnd.getUTCDate() + 1);
  const todaysFixtures = useMemo(() => {
    // Define league importance hierarchy (most important first)
    const LEAGUE_PRIORITY = {
      'UEFA Champions League': 1,
      'UEFA Europa League': 2,
      'UEFA Europa Conference League': 3,
      'Premier League': 4,
      'La Liga': 5,
      'Serie A': 6,
      'Bundesliga': 7,
      'Ligue 1': 8,
      'EFL Championship': 9,
      'Eredivisie': 10,
      'Primeira Liga': 11,
      'Scottish Premiership': 12,
      'Turkish Süper Lig': 13,
      'Belgian Pro League': 14,
      'Liga MX': 15,
      'Major League Soccer': 16,
      'Brasileirão Série A': 17,
      'Argentine Liga Profesional': 18
    };

    // Define team importance within leagues (big clubs get priority)
    const TEAM_IMPORTANCE = {
      // Premier League
      'Manchester United': 1, 'Manchester City': 1, 'Liverpool': 1, 'Arsenal': 1, 'Chelsea': 1, 'Tottenham': 2,
      'Newcastle': 3, 'Aston Villa': 3, 'Brighton': 4, 'West Ham': 4, 'Crystal Palace': 4, 'Fulham': 4,
      // La Liga
      'Real Madrid': 1, 'Barcelona': 1, 'Atletico Madrid': 2, 'Real Betis': 3, 'Sevilla': 3, 'Valencia': 3, 'Villarreal': 3,
      // Serie A
      'Juventus': 1, 'Inter': 1, 'AC Milan': 1, 'Napoli': 2, 'Roma': 2, 'Lazio': 3, 'Atalanta': 3, 'Fiorentina': 3,
      // Bundesliga
      'Bayern Munich': 1, 'Borussia Dortmund': 1, 'RB Leipzig': 2, 'Bayer Leverkusen': 2, 'Eintracht Frankfurt': 3,
      // Ligue 1
      'PSG': 1, 'Monaco': 2, 'Marseille': 2, 'Lyon': 2, 'Nice': 3, 'Lille': 3
    };

    return fixtures.filter(f => {
      const d = new Date(f.date);
      return d >= todayStart && d < todayEnd;
    }).sort((a, b) => {
      // Sort by league importance first
      const leagueA = LEAGUE_PRIORITY[a.league as keyof typeof LEAGUE_PRIORITY] || 999;
      const leagueB = LEAGUE_PRIORITY[b.league as keyof typeof LEAGUE_PRIORITY] || 999;
      
      if (leagueA !== leagueB) {
        return leagueA - leagueB;
      }
      
      // Within same league, sort by team importance
      const teamA = Math.min(
        TEAM_IMPORTANCE[a.homeTeam as keyof typeof TEAM_IMPORTANCE] || 999,
        TEAM_IMPORTANCE[a.awayTeam as keyof typeof TEAM_IMPORTANCE] || 999
      );
      const teamB = Math.min(
        TEAM_IMPORTANCE[b.homeTeam as keyof typeof TEAM_IMPORTANCE] || 999,
        TEAM_IMPORTANCE[b.awayTeam as keyof typeof TEAM_IMPORTANCE] || 999
      );
      
      if (teamA !== teamB) {
        return teamA - teamB;
      }
      
      // Finally, sort by time as tiebreaker
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });
  }, [fixtures, todayStart, todayEnd]);
  const nextMatchday = todaysFixtures.length > 0
    ? new Date(todaysFixtures[0].date)
    : (fixtures.length > 0 ? new Date(fixtures[0].date) : new Date());

  // Use intelligent match scoring to select Match of the Day
  const matchOfTheDay = useMemo(() => {
    const selected = selectMatchOfTheDay(fixtures, leagueTables);
    
    if (selected) {
      console.log('🎯 MATCH OF THE DAY SELECTED:', {
        match: `${selected.homeTeam} vs ${selected.awayTeam}`,
        league: selected.league,
        date: selected.date,
        isToday: selected.date.startsWith(todayIso)
      });
    } else {
      console.log('❌ NO MATCH OF THE DAY SELECTED - no fixtures available');
    }
    
    return selected;
  }, [fixtures, leagueTables]);

  // Get remaining fixtures (excluding the selected match of the day) - sorted by biggest teams
  const upcomingFocusMatches = useMemo(() => {
    const remainingFixtures = matchOfTheDay 
      ? fixtures.filter(f => f.id !== matchOfTheDay.id)
      : fixtures;
    
    // Sort by match score to prioritize biggest teams
    const scoredMatches = remainingFixtures.map(match => ({
      match,
      score: scoreMatch(match, leagueTables)
    }));
    
    scoredMatches.sort((a, b) => b.score - a.score);
    
    return scoredMatches.slice(0, 3).map(item => item.match);
  }, [fixtures, matchOfTheDay, leagueTables]);

  const homeTeamColor = matchOfTheDay && teams ? teams[getHomeTeamName(matchOfTheDay)]?.jerseyColors.primary || '#1f2937' : '#1f2937';
  const awayTeamColor = matchOfTheDay && teams ? teams[getAwayTeamName(matchOfTheDay)]?.jerseyColors.primary || '#374151' : '#374151';

  return (
    <div className="space-y-6 sm:space-y-8 lg:space-y-12">
      {/* Next Major Matchday */}
      <section className="text-center bg-gradient-to-br from-indigo-900/40 to-purple-900/40 rounded-xl p-4 sm:p-6 lg:p-10 shadow-2xl border border-indigo-500/40">
        <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-indigo-300 mb-4 sm:mb-6">Next Major Matchday</h2>
        <Countdown targetDate={nextMatchday} />
      </section>

      {/* Automated System Status */}
      <AutomatedSystemStatus />

      {/* Match of the Day */}
      {matchOfTheDay && (
        <section>
          <h2 className="text-3xl font-bold tracking-tight text-white mb-6">🎯 Match of the Day</h2>
          <div
            className="rounded-xl overflow-hidden shadow-2xl border border-gray-700 p-8 relative match-background"
            data-bg={`${homeTeamColor}_${awayTeamColor}`}
            data-testid="match-card"
          >
            <div className="flex flex-col md:flex-row items-center justify-around text-center">
              <div className="flex flex-col items-center space-y-3 w-full md:w-1/3">
                <TeamLogo teamName={getHomeTeamName(matchOfTheDay)} size="large" clickable={true} onClick={() => onSelectTeam(getHomeTeamName(matchOfTheDay))} />
                <h3
                  className="text-xl md:text-2xl font-bold text-white cursor-pointer hover:text-blue-400 transition-colors duration-200"
                  onClick={() => onSelectTeam(getHomeTeamName(matchOfTheDay))}
                >
                  {getHomeTeamName(matchOfTheDay)}
                </h3>
              </div>
              <div className="flex flex-col items-center my-6 md:my-0">
                <p className="text-5xl font-extrabold text-gray-400">vs</p>
                <p className="text-blue-300 font-semibold mt-4">{getMatchLeagueName(matchOfTheDay)}</p>
                <p className="text-sm text-gray-400">{new Date(matchOfTheDay.date).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</p>
                <p className="text-lg font-bold text-white mt-2">{new Date(matchOfTheDay.date).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })}</p>
              </div>
              <div className="flex flex-col items-center space-y-3 w-full md:w-1/3">
                <TeamLogo teamName={getAwayTeamName(matchOfTheDay)} size="large" clickable={true} onClick={() => onSelectTeam(getAwayTeamName(matchOfTheDay))} />
                <h3
                  className="text-xl md:text-2xl font-bold text-white cursor-pointer hover:text-blue-400 transition-colors duration-200"
                  onClick={() => onSelectTeam(getAwayTeamName(matchOfTheDay))}
                >
                  {getAwayTeamName(matchOfTheDay)}
                </h3>
              </div>
            </div>
            <div className="mt-8 text-center">
              <button
                onClick={() => onSelectMatch(matchOfTheDay)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors duration-200 shadow-lg"
              >
                View Full Prediction
              </button>
              {(() => {
                const prediction = getPrediction(matchOfTheDay.id);
                if (prediction?.predictedScoreline) {
                  return (
                    <p className="mt-4 text-xl font-semibold text-blue-300" data-testid="predicted-scoreline">
                      {prediction.predictedScoreline}
                    </p>
                  );
                }
                return null;
              })()}
            </div>
          </div>
        </section>
      )}

      {/* Quick Accuracy Overview */}
      {accuracyStats.totalPredictions > 0 && (
        <section className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-xl p-4 sm:p-6 shadow-2xl border border-blue-500/40">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">📊</span>
              <div>
                <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-300">Prediction Accuracy</h2>
                <p className="text-sm text-blue-200">Track and analyze prediction performance</p>
              </div>
              <div className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-semibold">New</div>
            </div>
            <button
              onClick={() => navigate('/accuracy')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors duration-200 font-medium text-sm"
            >
              View Accuracy Dashboard
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-800/50 rounded-lg p-3">
              <div className="text-2xl font-bold text-green-400">{accuracyStats.overallAccuracy.toFixed(1)}%</div>
              <div className="text-xs text-gray-400">Overall Accuracy</div>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-3">
              <div className="text-2xl font-bold text-blue-400">{accuracyStats.totalPredictions}</div>
              <div className="text-xs text-gray-400">Total Predictions</div>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-3">
              <div className="text-2xl font-bold text-purple-400">{accuracyStats.correctOutcomes}</div>
              <div className="text-xs text-gray-400">Correct Outcomes</div>
            </div>
          </div>
        </section>
      )}

      {/* Today's Champions League Section */}
      {todaysFixtures.some(m => m.league === League.ChampionsLeague) && (
        <section className="bg-gray-900 rounded-xl p-4 sm:p-6 shadow-2xl border border-indigo-700/40">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-indigo-300">Today's UEFA Champions League</h2>
            <button
              onClick={() => { setSelectedLeagueFilter(League.ChampionsLeague); navigateToFixtures(); }}
              className="px-2 py-1 sm:px-3 sm:py-2 bg-indigo-700 hover:bg-indigo-600 text-white rounded-lg transition-colors duration-200 font-medium text-sm sm:text-base"
            >
              View All
            </button>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
            {todaysFixtures.filter(m => m.league === League.ChampionsLeague).map(match => (
              <MatchCard
                key={match.id}
                match={match}
                onSelectMatch={onSelectMatch}
                onSelectTeam={onSelectTeam}
              />
            ))}
          </div>
        </section>
      )}

      {/* Live Matches */}
      {liveMatches.length > 0 && (
        <section>
          <EnhancedLiveMatchesList 
            onSelectMatch={(liveMatch) => {
              // Convert LiveMatch to Match for compatibility
              const match: Match = {
                id: liveMatch.id,
                homeTeam: liveMatch.homeTeam,
                awayTeam: liveMatch.awayTeam,
                homeTeamId: liveMatch.homeTeamId,
                awayTeamId: liveMatch.awayTeamId,
                league: liveMatch.league,
                date: liveMatch.date
              };
              onSelectMatch(match);
            }}
            maxMatches={5}
          />
        </section>
      )}

      {/* Upcoming Focus */}
      <section>
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-bold tracking-tight text-white">Upcoming Focus</h2>
            <button 
                onClick={navigateToFixtures}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200"
            >
                View All Fixtures
            </button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
          {upcomingFocusMatches.map((match) => (
            <MatchCard 
                key={match.id} 
                match={match} 
                onSelectMatch={onSelectMatch}
                onSelectTeam={onSelectTeam}
            />
          ))}
        </div>
      </section>

      {/* Today's Predictions */}
      {todaysFixtures.length > 0 && (
        <section className="bg-gradient-to-r from-orange-900/30 to-red-900/30 rounded-xl p-4 sm:p-6 shadow-2xl border border-orange-500/40">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">🔥</span>
              <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-orange-300">Today's Predictions</h2>
              <div className="bg-orange-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                {todaysFixtures.length} {todaysFixtures.length === 1 ? 'match' : 'matches'}
              </div>
            </div>
            <button
              onClick={navigateToFixtures}
              className="px-3 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg transition-colors duration-200 font-medium text-sm"
            >
              View All Fixtures
            </button>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
            {todaysFixtures.map(match => {
              const prediction = getPrediction(match.id);
              return (
                <div key={match.id} className="relative">
                  <MatchCard
                    match={match}
                    onSelectMatch={onSelectMatch}
                    onSelectTeam={onSelectTeam}
                  />
                  {prediction && (
                    <div className="absolute top-2 right-2 bg-orange-600 text-white px-2 py-1 rounded-md text-xs font-bold">
                      TODAY
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Team Data Status */}
      <section className="bg-gray-800 rounded-xl p-6 shadow-2xl border border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Team Data Status</h2>
          <button
            onClick={async () => {
              console.log('🔄 Refresh All button clicked');
              try {
                await refreshAllTeamDetails();
                console.log('✅ Team data refresh completed');
              } catch (error) {
                console.error('❌ Team data refresh failed:', error);
              }
            }}
            className="px-3 py-2 bg-blue-700 hover:bg-blue-600 text-white rounded-lg transition-colors duration-200 font-medium text-sm"
            title="Refresh all team data"
          >
            🔄 Refresh All
          </button>
        </div>

        {(() => {
          const status = getTeamDataStatus();
          return (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-gray-700/50 rounded-lg">
                  <div className="text-lg font-bold text-blue-400">{status.totalTeams}</div>
                  <div className="text-xs text-gray-400">Total Teams</div>
                </div>
                <div className="text-center p-3 bg-gray-700/50 rounded-lg">
                  <div className="text-lg font-bold text-green-400">{status.cachedComplete}</div>
                  <div className="text-xs text-gray-400">Complete Data</div>
                </div>
                <div className="text-center p-3 bg-gray-700/50 rounded-lg">
                  <div className="text-lg font-bold text-orange-400">{status.needsRefresh}</div>
                  <div className="text-xs text-gray-400">Needs Refresh</div>
                </div>
                <div className="text-center p-3 bg-gray-700/50 rounded-lg">
                  <div className="text-lg font-bold text-purple-400">{status.percentageComplete}%</div>
                  <div className="text-xs text-gray-400">Complete</div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${
                    status.percentageComplete >= 80 ? 'bg-green-400' :
                    status.percentageComplete >= 60 ? 'bg-yellow-400' :
                    'bg-red-400'
                  }`}></div>
                  <span className="text-sm text-gray-400">
                    {status.percentageComplete >= 80 ? 'Excellent' :
                     status.percentageComplete >= 60 ? 'Good' :
                     status.percentageComplete >= 30 ? 'Fair' : 'Needs Update'}
                  </span>
                </div>
                <span className="text-xs text-gray-500">
                  Click any team for instant detailed information
                </span>
              </div>
            </div>
          );
        })()}
      </section>

      {/* Featured Leagues */}
      <section className="bg-gray-800 rounded-xl p-6 shadow-2xl border border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-white">Featured Leagues</h2>
          <button
            onClick={() => {
              console.log('🔄 General refresh button clicked');
              try {
                refreshRealTimeData({ force: true });
                console.log('✅ General refresh initiated');
              } catch (error) {
                console.error('❌ General refresh failed:', error);
              }
            }}
            className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors duration-200 font-medium"
            title="Refresh data"
          >
            🔄
          </button>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
          {[
            // Major European Leagues
            League.PremierLeague,
            League.LaLiga,
            League.SerieA,
            League.Bundesliga,
            League.Ligue1,
            League.Championship,
            // European Competitions
            League.ChampionsLeague,
            League.EuropaLeague,
            // Other Major Leagues
            League.PrimeiraLiga,
            League.Eredivisie,
            League.ScottishPremiership,
            League.SuperLig,
            League.BelgianProLeague,
            League.GreekSuperLeague1,
            // International & Other
            League.BrasileiraoSerieA,
            League.LigaMX,
            League.MLS,
            League.AFCChampionsLeague,
            League.CopaLibertadores
          ]
            .map(league => {
            const hasFixtures = fixtures.some(f => f.league === league);
            return (
              <button
                key={league}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  console.log(`🎯 Clicking league: ${league}`);
                  try {
                    // Use Fixtures page with pre-selected league filter for robustness
                    setSelectedLeagueFilter(league);
                    navigateToFixtures();
                    console.log(`✅ Navigated to fixtures for ${league}`);
                  } catch (error) {
                    console.error(`❌ Error navigating to fixtures for ${league}:`, error);
                  }
                }}
                className={`relative p-3 rounded-lg text-center text-xs sm:text-sm font-medium transition-all duration-200 flex flex-col items-center justify-center min-h-[90px] sm:min-h-[100px] cursor-pointer group w-full ${
                  hasFixtures
                    ? 'bg-gray-700 hover:bg-blue-600 text-blue-300 border border-blue-500/30 hover:border-blue-400/50 shadow-lg hover:shadow-xl transform hover:scale-105'
                    : 'bg-gray-800 hover:bg-gray-700 text-gray-400 border border-gray-600/30 hover:border-gray-500/50'
                }`}
                title={`Click to view ${fixtures.filter(f => f.league === league).length} upcoming ${league} games`}
              >
                <div className="flex flex-col items-center space-y-3">
                  <LeagueLogo league={league as League} size="medium" />
                  <div className="text-center">
                    <div className="text-xs font-medium leading-tight">{league}</div>
                    <div className="text-xs text-gray-400 mt-1">
                      {fixtures.filter(f => f.league === league).length > 0
                        ? `${fixtures.filter(f => f.league === league).length} upcoming`
                        : 'No upcoming games'}
                    </div>
                  </div>
                </div>
                
                {/* Status indicator - bottom-right corner */}
                <div className={`absolute bottom-2 right-2 w-6 h-6 rounded-full flex items-center justify-center ${
                  hasFixtures
                    ? 'bg-green-500 text-white shadow-sm'
                    : 'bg-gray-600 text-gray-300'
                }`} title={hasFixtures ? 'Has upcoming games' : 'No upcoming games'}>
                  {hasFixtures ? '⚽' : '📅'}
                </div>

                {/* Clickable indicator */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </div>
              </button>
            );
          })}
        </div>
        {isLoading && (
          <div data-testid="fixtures-loading" className="flex items-center justify-center py-8">
            <div className="flex flex-col items-center space-y-3">
              <LoadingSpinner />
              <p className="text-sm text-gray-300">Loading complete featured leagues data</p>
            </div>
          </div>
        )}
        {fixtureError && !isLoading && (
          <div data-testid="fixtures-error-message" className="flex items-center justify-center py-8">
            <p className="text-red-400 text-center text-sm sm:text-base">
              {fixtureError || 'Failed to load fixtures'}
            </p>
          </div>
        )}
      </section>

      {/* Team Form Trends */}
      <section>
        <FormTrendsOverview matches={upcomingFocusMatches} maxMatches={6} />
      </section>

      {/* Enhanced Prediction Accuracy Tracker */}
      <section>
        <EnhancedAccuracyTracker onSelectPrediction={onSelectPrediction} />
      </section>

      {/* Cloud Prediction Integrity Panel */}
      <section>
        <CloudIntegrityPanel />
      </section>

      {/* Confidence Overview */}
      <section>
        <ConfidenceOverview
          predictions={upcomingFocusMatches.map(match => getPrediction(match.id)).filter(Boolean) as Prediction[]}
          accuracyStats={accuracyStats}
        />
      </section>

      {/* Debug: Show fixture loading status (only if truly no fixtures) */}
      {fixtures.length === 0 && (
        <section className="bg-blue-800 rounded-xl p-6 shadow-2xl border border-blue-700">
          <h2 className="text-2xl font-bold text-white mb-4 text-center">🔄 Loading Fixtures...</h2>
          <p className="text-center text-blue-200">
            Fixtures are being loaded from Premier League, Champions League, and Europa League.
            Please wait a moment for the data to load.
          </p>
          <div className="mt-4 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        </section>
      )}

      {/* All Teams */}
      <section className="bg-gray-800 rounded-xl p-6 shadow-2xl border border-gray-700">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-2xl font-bold text-white">All Teams</h2>
            <p className="text-sm text-gray-400">{Object.keys(teams).length} teams loaded</p>
          </div>
          <button
            onClick={() => setAllTeamsCollapsed(v => !v)}
            className="text-sm bg-gray-700 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center space-x-2"
            title={allTeamsCollapsed ? 'Expand teams' : 'Collapse teams'}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transition-transform ${allTeamsCollapsed ? '' : 'rotate-180'}`} viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            <span>{allTeamsCollapsed ? 'Expand' : 'Collapse'}</span>
          </button>
        </div>
        {allTeamsCollapsed ? (
          <div className="text-center text-gray-400 text-sm py-4">Teams list collapsed</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
            {Object.keys(teams)
              .sort((a, b) => a.localeCompare(b))
              .map(teamName => {
                const isFavorite = favoriteTeams.includes(teamName);
                return (
                  <div key={teamName} className="flex flex-col items-center bg-gray-900/40 border border-gray-700 rounded-lg p-3">
                    <TeamLogo teamName={teamName} size="small" showJerseyColors={true} clickable={true} onClick={() => onSelectTeam(teamName)} />
                    <div className="mt-2 flex items-center w-full justify-between">
                      <span className="text-xs text-white truncate" title={teamName}>{teamName}</span>
                      <button
                        onClick={() => toggleFavoriteTeam(teamName)}
                        className={`text-lg ${isFavorite ? 'text-yellow-400' : 'text-gray-600 hover:text-yellow-300'}`}
                        aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                        title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                      >
                        ★
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </section>

      
      {/* Navigation handled via onSelectTeam; modal removed */}
    </div>
  );
};

export default Dashboard;
