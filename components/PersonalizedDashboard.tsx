import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Match, League, Prediction } from '../types';
import { useAppContext } from '../contexts/AppContext';
import TeamLogo from './TeamLogo';
import LeagueLogo from './LeagueLogo';
import MatchStatusIndicator from './MatchStatusIndicator';
import { onDemandPredictionService } from '../services/onDemandPredictionService';
import { notificationService } from '../services/notificationService';
import { calendarService } from '../services/calendarService';

interface PersonalizedDashboardProps {
  onSelectMatch: (match: Match) => void;
  onSelectTeam: (teamName: string) => void;
  onSelectPrediction?: (prediction: any) => void;
  className?: string;
}

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: string;
  isEnabled: boolean;
  action: () => void;
  color: string;
}

interface StatsCard {
  id: string;
  title: string;
  value: string;
  icon: string;
  color: string;
  trend?: 'up' | 'down' | 'neutral';
}

const PersonalizedDashboard: React.FC<PersonalizedDashboardProps> = ({
  onSelectMatch,
  onSelectTeam,
  onSelectPrediction,
  className = ''
}) => {
  const {
    fixtures,
    teams,
    favoriteTeams,
    favoriteLeagues,
    toggleFavoriteTeam,
    toggleFavoriteLeague,
    getPrediction,
    accuracyStats,
    liveMatches,
    fetchLiveMatches,
    getTeamDataStatus
  } = useAppContext();

  const [generatingPredictions, setGeneratingPredictions] = useState<Set<string>>(new Set());
  const [notificationsEnabled, setNotificationsEnabled] = useState(() =>
    notificationService.getPermissionStatus().granted
  );
  const [calendarSyncEnabled, setCalendarSyncEnabled] = useState(false);
  const [remindersEnabled, setRemindersEnabled] = useState(false);
  const [activeSection, setActiveSection] = useState<'overview' | 'teams' | 'competitions' | 'live'>('overview');

  // Get current time for greeting
  const currentHour = new Date().getHours();
  const getGreeting = () => {
    if (currentHour < 12) return 'Good morning';
    if (currentHour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  // Get favorite teams' upcoming matches
  const favoriteTeamsMatches = useMemo(() => {
    if (favoriteTeams.length === 0) return [];

    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    return fixtures.filter(match => {
      const matchDate = new Date(match.date);
      return matchDate >= today && matchDate <= nextWeek &&
             (favoriteTeams.includes(match.homeTeam) || favoriteTeams.includes(match.awayTeam));
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [fixtures, favoriteTeams]);

  // Get favorite competitions' matches
  const favoriteCompetitionsMatches = useMemo(() => {
    if (favoriteLeagues.length === 0) return [];

    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    return fixtures.filter(match => {
      const matchDate = new Date(match.date);
      return matchDate >= today && matchDate <= nextWeek &&
             favoriteLeagues.includes(match.league);
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [fixtures, favoriteLeagues]);

  // Get all upcoming matches for favorite teams and competitions
  const upcomingMatches = useMemo(() => {
    const allMatches = [...favoriteTeamsMatches, ...favoriteCompetitionsMatches];
    const uniqueMatches = allMatches.filter((match, index, self) =>
      index === self.findIndex(m => m.id === match.id)
    );
    return uniqueMatches.slice(0, 12);
  }, [favoriteTeamsMatches, favoriteCompetitionsMatches]);

  // Get today's matches
  const todaysMatches = useMemo(() => {
    const today = new Date();
    return upcomingMatches.filter(match => {
      const matchDate = new Date(match.date);
      return matchDate.toDateString() === today.toDateString();
    });
  }, [upcomingMatches]);

  // Get team data stats
  const teamDataStats = useMemo(() => {
    const status = getTeamDataStatus();
    return {
      totalTeams: status.totalTeams,
      cachedComplete: status.cachedComplete,
      percentageComplete: status.percentageComplete,
      needsRefresh: status.needsRefresh
    };
  }, [getTeamDataStatus]);

  // Quick actions configuration
  const quickActions: QuickAction[] = [
    {
      id: 'notifications',
      title: 'Notifications',
      description: notificationsEnabled ? 'Notifications enabled' : 'Enable match notifications',
      icon: '🔔',
      isEnabled: notificationsEnabled,
      action: handleNotificationToggle,
      color: notificationsEnabled ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-600 hover:bg-gray-700'
    },
    {
      id: 'calendar',
      title: 'Calendar Sync',
      description: calendarSyncEnabled ? 'Calendar synced' : 'Sync matches to calendar',
      icon: '📅',
      isEnabled: calendarSyncEnabled,
      action: handleCalendarSync,
      color: calendarSyncEnabled ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-600 hover:bg-gray-700'
    },
    {
      id: 'reminders',
      title: 'Reminders',
      description: remindersEnabled ? 'Reminders active' : 'Set match reminders',
      icon: '⏰',
      isEnabled: remindersEnabled,
      action: handleReminderToggle,
      color: remindersEnabled ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-gray-600 hover:bg-gray-700'
    }
  ];

  // Statistics cards
  const statsCards: StatsCard[] = [
    {
      id: 'teams',
      title: 'Favorite Teams',
      value: favoriteTeams.length.toString(),
      icon: '⭐',
      color: 'bg-purple-500',
      trend: favoriteTeams.length > 0 ? 'up' : 'neutral'
    },
    {
      id: 'leagues',
      title: 'Competitions',
      value: favoriteLeagues.length.toString(),
      icon: '🏆',
      color: 'bg-blue-500',
      trend: favoriteLeagues.length > 0 ? 'up' : 'neutral'
    },
    {
      id: 'matches',
      title: 'Upcoming',
      value: upcomingMatches.length.toString(),
      icon: '⚽',
      color: 'bg-green-500',
      trend: upcomingMatches.length > 0 ? 'up' : 'neutral'
    },
    {
      id: 'live',
      title: 'Live Now',
      value: liveMatches.length.toString(),
      icon: '🔴',
      color: 'bg-red-500',
      trend: liveMatches.length > 0 ? 'up' : 'neutral'
    }
  ];

  // Handle prediction generation
  const handlePredictionClick = async (match: Match) => {
    const existingPrediction = getPrediction(match.id);

    if (existingPrediction && onSelectPrediction) {
      onSelectPrediction(existingPrediction);
    } else if (onSelectPrediction) {
      try {
        setGeneratingPredictions(prev => new Set(prev).add(match.id));
        const generatedPrediction = await onDemandPredictionService.generateMatchPrediction(match);
        onSelectPrediction(generatedPrediction);
      } catch (error) {
        console.error('Failed to generate prediction:', error);
        onSelectMatch(match);
      } finally {
        setGeneratingPredictions(prev => {
          const newSet = new Set(prev);
          newSet.delete(match.id);
          return newSet;
        });
      }
    } else {
      onSelectMatch(match);
    }
  };

  // Quick action handlers
  const handleNotificationToggle = async () => {
    try {
      if (notificationsEnabled) {
        // In a real app, this would unsubscribe
        setNotificationsEnabled(false);
        console.log('Notifications disabled');
      } else {
        const granted = await notificationService.requestPermission();
        setNotificationsEnabled(granted);
        if (granted) {
          console.log('Notifications enabled');
        }
      }
    } catch (error) {
      console.error('Failed to toggle notifications:', error);
    }
  };

  const handleCalendarSync = async () => {
    try {
      if (calendarSyncEnabled) {
        setCalendarSyncEnabled(false);
        console.log('Calendar sync disabled');
      } else {
        // In a real app, this would connect to calendar service
        setCalendarSyncEnabled(true);
        console.log('Calendar sync enabled');
      }
    } catch (error) {
      console.error('Failed to sync calendar:', error);
    }
  };

  const handleReminderToggle = () => {
    setRemindersEnabled(!remindersEnabled);
    console.log('Reminders', !remindersEnabled ? 'enabled' : 'disabled');
  };

  // Format time for display
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  // Format date for display
  const formatDate = (date: Date) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });
    }
  };

  return (
    <div className={`personalized-dashboard min-h-screen bg-gray-50 ${className}`}>
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              {getGreeting()}, Football Fan! 👋
            </h1>
            <p className="text-blue-100">
              Your personalized football dashboard - {favoriteTeams.length} favorite teams, {upcomingMatches.length} upcoming matches
            </p>
          </div>
          <div className="hidden md:block">
            <div className="text-6xl">⚽</div>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {statsCards.map(card => (
          <div key={card.id} className={`${card.color} rounded-lg p-4 text-white`}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{card.value}</div>
                <div className="text-sm opacity-90">{card.title}</div>
              </div>
              <div className="text-3xl">{card.icon}</div>
            </div>
            {card.trend && (
              <div className="mt-2 text-xs">
                {card.trend === 'up' && '↗️ Trending'}
                {card.trend === 'down' && '↘️ Declining'}
                {card.trend === 'neutral' && '➡️ Stable'}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-gray-800 rounded-xl p-6 mb-6">
        <h2 className="text-xl font-bold text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {quickActions.map(action => (
            <button
              key={action.id}
              onClick={action.action}
              className={`flex items-center space-x-3 p-4 rounded-lg transition-all duration-200 transform hover:scale-105 ${action.color} text-white`}
            >
              <div className="text-2xl">{action.icon}</div>
              <div className="text-left">
                <div className="font-semibold">{action.title}</div>
                <div className="text-sm opacity-90">{action.description}</div>
              </div>
              <div className="ml-auto">
                {action.isEnabled ? (
                  <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                ) : (
                  <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex bg-gray-800 rounded-lg p-1 mb-6">
        {[
          { id: 'overview', label: 'Overview', icon: '📊' },
          { id: 'teams', label: 'My Teams', icon: '⭐', count: favoriteTeams.length },
          { id: 'competitions', label: 'Competitions', icon: '🏆', count: favoriteLeagues.length },
          { id: 'live', label: 'Live', icon: '🔴', count: liveMatches.length }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSection(tab.id as any)}
            className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 text-sm rounded-md transition-colors ${
              activeSection === tab.id
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
            {tab.count !== undefined && tab.count > 0 && (
              <span className="bg-gray-600 text-gray-300 text-xs px-2 py-1 rounded-full">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content Sections */}
      <div className="space-y-6">
        {/* Overview Section */}
        {activeSection === 'overview' && (
          <>
            {/* Today's Matches */}
            {todaysMatches.length > 0 && (
              <div className="bg-gray-800 rounded-xl p-6">
                <h2 className="text-xl font-bold text-white mb-4">Today's Matches ⚽</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {todaysMatches.map(match => (
                    <div
                      key={match.id}
                      className="bg-gray-700 rounded-lg p-4 cursor-pointer hover:bg-gray-600 transition-colors"
                      onClick={() => handlePredictionClick(match)}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm text-gray-300">
                          {formatTime(new Date(match.date))}
                        </span>
                        <MatchStatusIndicator match={match} size="small" showIcon={true} showText={true} />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <TeamLogo teamName={match.homeTeam} size="medium" />
                          <div>
                            <div className="text-white font-semibold">{match.homeTeam}</div>
                            <div className="text-xs text-gray-400">vs</div>
                            <div className="text-white font-semibold">{match.awayTeam}</div>
                          </div>
                          <TeamLogo teamName={match.awayTeam} size="medium" />
                        </div>
                        <LeagueLogo league={match.league} size="small" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upcoming Matches Preview */}
            <div className="bg-gray-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">Upcoming Matches</h2>
                <button
                  onClick={() => setActiveSection('teams')}
                  className="text-blue-400 hover:text-blue-300 text-sm"
                >
                  View All →
                </button>
              </div>

              {upcomingMatches.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-400 text-4xl mb-4">📅</div>
                  <p className="text-gray-500 mb-4">No upcoming matches</p>
                  <button
                    onClick={() => onSelectTeam('')}
                    className="text-blue-400 hover:text-blue-300"
                  >
                    Add favorite teams
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {upcomingMatches.slice(0, 6).map(match => (
                    <div
                      key={match.id}
                      className="bg-gray-700 rounded-lg p-4 cursor-pointer hover:bg-gray-600 transition-colors"
                      onClick={() => handlePredictionClick(match)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-300">
                          {formatDate(new Date(match.date))} • {formatTime(new Date(match.date))}
                        </span>
                        <MatchStatusIndicator match={match} size="small" showIcon={true} showText={false} />
                      </div>
                      <div className="flex items-center space-x-3 mb-3">
                        <TeamLogo teamName={match.homeTeam} size="small" />
                        <div className="flex-1">
                          <div className="text-white font-medium text-sm">{match.homeTeam}</div>
                          <div className="text-gray-400 text-xs">vs</div>
                          <div className="text-white font-medium text-sm">{match.awayTeam}</div>
                        </div>
                        <TeamLogo teamName={match.awayTeam} size="small" />
                      </div>
                      <div className="flex items-center justify-between">
                        <LeagueLogo league={match.league} size="small" />
                        {generatingPredictions.has(match.id) && (
                          <div className="flex items-center space-x-1">
                            <div className="animate-spin rounded-full h-3 w-3 border-b border-blue-500"></div>
                            <span className="text-xs text-blue-400">Generating...</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* My Teams Section */}
        {activeSection === 'teams' && (
          <div className="space-y-4">
            {favoriteTeams.length === 0 ? (
              <div className="bg-gray-800 rounded-xl p-8 text-center">
                <div className="text-gray-400 text-5xl mb-4">⭐</div>
                <h3 className="text-xl font-bold text-white mb-2">No Favorite Teams Yet</h3>
                <p className="text-gray-400 mb-6">Add your favorite teams to see their matches and get personalized updates</p>
                <button
                  onClick={() => onSelectTeam('')}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
                >
                  Add Your First Team
                </button>
              </div>
            ) : (
              favoriteTeams.map(teamName => {
                const teamMatches = favoriteTeamsMatches.filter(match =>
                  match.homeTeam === teamName || match.awayTeam === teamName
                );

                return (
                  <div key={teamName} className="bg-gray-800 rounded-xl p-6">
                    <div className="flex items-center space-x-4 mb-4">
                      <TeamLogo teamName={teamName} size="large" />
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-white">{teamName}</h3>
                        <p className="text-gray-400">
                          {teamMatches.length} upcoming match{teamMatches.length !== 1 ? 'es' : ''}
                        </p>
                      </div>
                      <button
                        onClick={() => onSelectTeam(teamName)}
                        className="text-blue-400 hover:text-blue-300"
                      >
                        View Details →
                      </button>
                    </div>

                    {teamMatches.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {teamMatches.map(match => (
                          <div
                            key={match.id}
                            className="bg-gray-700 rounded-lg p-4 cursor-pointer hover:bg-gray-600 transition-colors"
                            onClick={() => handlePredictionClick(match)}
                          >
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-sm text-gray-300">
                                {formatDate(new Date(match.date))} • {formatTime(new Date(match.date))}
                              </span>
                              <MatchStatusIndicator match={match} size="small" showIcon={true} showText={false} />
                            </div>
                            <div className="flex items-center space-x-3 mb-3">
                              <TeamLogo teamName={match.homeTeam} size="small" />
                              <span className="text-white font-medium">{match.homeTeam}</span>
                              <span className="text-gray-400">vs</span>
                              <span className="text-white font-medium">{match.awayTeam}</span>
                              <TeamLogo teamName={match.awayTeam} size="small" />
                            </div>
                            <div className="flex items-center justify-between">
                              <LeagueLogo league={match.league} size="small" />
                              {generatingPredictions.has(match.id) && (
                                <div className="flex items-center space-x-1">
                                  <div className="animate-spin rounded-full h-3 w-3 border-b border-blue-500"></div>
                                  <span className="text-xs text-blue-400">Generating...</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-400">
                        <div className="text-3xl mb-2">📅</div>
                        <p>No upcoming matches for this team</p>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Competitions Section */}
        {activeSection === 'competitions' && (
          <div className="space-y-4">
            {favoriteLeagues.length === 0 ? (
              <div className="bg-gray-800 rounded-xl p-8 text-center">
                <div className="text-gray-400 text-5xl mb-4">🏆</div>
                <h3 className="text-xl font-bold text-white mb-2">No Favorite Competitions Yet</h3>
                <p className="text-gray-400 mb-6">Follow your favorite leagues to see all their matches</p>
                <button
                  onClick={() => onSelectTeam('')}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
                >
                  Browse Leagues
                </button>
              </div>
            ) : (
              favoriteLeagues.map(league => {
                const leagueMatches = favoriteCompetitionsMatches.filter(match =>
                  match.league === league
                );

                return (
                  <div key={league} className="bg-gray-800 rounded-xl p-6">
                    <div className="flex items-center space-x-4 mb-4">
                      <LeagueLogo league={league} size="large" />
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-white">{league}</h3>
                        <p className="text-gray-400">
                          {leagueMatches.length} upcoming match{leagueMatches.length !== 1 ? 'es' : ''}
                        </p>
                      </div>
                    </div>

                    {leagueMatches.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {leagueMatches.map(match => (
                          <div
                            key={match.id}
                            className="bg-gray-700 rounded-lg p-4 cursor-pointer hover:bg-gray-600 transition-colors"
                            onClick={() => handlePredictionClick(match)}
                          >
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-sm text-gray-300">
                                {formatDate(new Date(match.date))} • {formatTime(new Date(match.date))}
                              </span>
                              <MatchStatusIndicator match={match} size="small" showIcon={true} showText={false} />
                            </div>
                            <div className="flex items-center space-x-3 mb-3">
                              <TeamLogo teamName={match.homeTeam} size="small" />
                              <span className="text-white font-medium">{match.homeTeam}</span>
                              <span className="text-gray-400">vs</span>
                              <span className="text-white font-medium">{match.awayTeam}</span>
                              <TeamLogo teamName={match.awayTeam} size="small" />
                            </div>
                            <div className="flex items-center justify-between">
                              <LeagueLogo league={match.league} size="small" />
                              {generatingPredictions.has(match.id) && (
                                <div className="flex items-center space-x-1">
                                  <div className="animate-spin rounded-full h-3 w-3 border-b border-blue-500"></div>
                                  <span className="text-xs text-blue-400">Generating...</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-400">
                        <div className="text-3xl mb-2">📅</div>
                        <p>No upcoming matches in this league</p>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Live Section */}
        {activeSection === 'live' && (
          <div className="bg-gray-800 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">Live Matches 🔴</h2>

            {liveMatches.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-400 text-4xl mb-4">⚽</div>
                <p className="text-gray-500">No live matches at the moment</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {liveMatches.map(match => (
                  <div
                    key={match.id}
                    className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 cursor-pointer hover:bg-red-900/30 transition-colors"
                    onClick={() => onSelectMatch(match)}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-red-400 font-semibold">LIVE</span>
                      <MatchStatusIndicator match={match} size="small" showIcon={true} showText={true} />
                    </div>
                    <div className="flex items-center space-x-3 mb-3">
                      <TeamLogo teamName={match.homeTeam} size="medium" />
                      <div className="flex-1">
                        <div className="text-white font-semibold">{match.homeTeam}</div>
                        <div className="text-gray-400 text-sm">vs</div>
                        <div className="text-white font-semibold">{match.awayTeam}</div>
                      </div>
                      <TeamLogo teamName={match.awayTeam} size="medium" />
                    </div>
                    <div className="flex items-center justify-between">
                      <LeagueLogo league={match.league} size="small" />
                      <span className="text-xs text-gray-400">{match.league}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PersonalizedDashboard;
