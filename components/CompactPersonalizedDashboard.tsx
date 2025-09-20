import React, { useState, useMemo } from 'react';
import { Match, League } from '../types';
import { useAppContext } from '../contexts/AppContext';
import { getHomeTeamName, getAwayTeamName } from '../utils/matchUtils';
import TeamLogo from './TeamLogo';
import LeagueLogo from './LeagueLogo';
import MatchStatusIndicator from './MatchStatusIndicator';
import { onDemandPredictionService } from '../services/onDemandPredictionService';

interface CompactPersonalizedDashboardProps {
  onSelectMatch: (match: Match) => void;
  onSelectTeam: (teamName: string) => void;
  onSelectPrediction?: (prediction: any) => void;
  className?: string;
}

const CompactPersonalizedDashboard: React.FC<CompactPersonalizedDashboardProps> = ({
  onSelectMatch,
  onSelectTeam,
  onSelectPrediction,
  className = ''
}) => {
  const { 
    fixtures, 
    favoriteTeams, 
    favoriteLeagues, 
    getPrediction,
    liveMatches
  } = useAppContext();

  const [generatingPredictions, setGeneratingPredictions] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'teams' | 'competitions' | 'upcoming'>('teams');

  // Get favorite teams' upcoming matches
  const favoriteTeamsMatches = useMemo(() => {
    if (favoriteTeams.length === 0) return [];
    
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    return fixtures.filter(match => {
      const matchDate = new Date(match.date);
      return matchDate >= today && matchDate <= nextWeek &&
             (favoriteTeams.includes(getHomeTeamName(match)) || favoriteTeams.includes(getAwayTeamName(match)));
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
             favoriteLeagues.includes(match.league as League);
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [fixtures, favoriteLeagues]);

  // Get all upcoming matches
  const upcomingMatches = useMemo(() => {
    const allMatches = [...favoriteTeamsMatches, ...favoriteCompetitionsMatches];
    const uniqueMatches = allMatches.filter((match, index, self) => 
      index === self.findIndex(m => m.id === match.id)
    );
    return uniqueMatches.slice(0, 6);
  }, [favoriteTeamsMatches, favoriteCompetitionsMatches]);

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

  const tabs = [
    { id: 'teams', label: 'Teams', count: favoriteTeams.length },
    { id: 'competitions', label: 'Competitions', count: favoriteLeagues.length },
    { id: 'upcoming', label: 'Upcoming', count: upcomingMatches.length }
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'teams':
        if (favoriteTeams.length === 0) {
          return (
            <div className="text-center py-8">
              <div className="text-gray-400 text-4xl mb-4">⭐</div>
              <p className="text-gray-500 mb-4">No favorite teams yet</p>
              <button
                onClick={() => onSelectTeam('')}
                className="text-blue-400 hover:text-blue-300 transition-colors"
              >
                Add your first favorite team
              </button>
            </div>
          );
        }

        return (
          <div className="space-y-3">
            {favoriteTeams.map(teamName => {
              const teamMatches = favoriteTeamsMatches.filter(match => 
                match.homeTeam === teamName || match.awayTeam === teamName
              ).slice(0, 2);

              return (
                <div key={teamName} className="bg-gray-700 rounded-lg p-3">
                  <div className="flex items-center space-x-3 mb-2">
                    <TeamLogo teamName={teamName} size="small" />
                    <div>
                      <h3 className="text-sm font-semibold text-white">{teamName}</h3>
                      <p className="text-xs text-gray-400">
                        {teamMatches.length} upcoming match{teamMatches.length !== 1 ? 'es' : ''}
                      </p>
                    </div>
                  </div>

                  {teamMatches.length > 0 && (
                    <div className="space-y-2">
                      {teamMatches.map(match => (
                        <div
                          key={match.id}
                          className="bg-gray-600 rounded p-2 cursor-pointer hover:bg-gray-500 transition-colors"
                          onClick={() => handlePredictionClick(match)}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-gray-300">
                              {formatDate(new Date(match.date))} {formatTime(new Date(match.date))}
                            </span>
                            <MatchStatusIndicator match={match} size="small" showIcon={true} showText={false} />
                          </div>
                          <div className="flex items-center space-x-1">
                            <TeamLogo teamName={getHomeTeamName(match)} size="small" />
                            <span className="text-xs text-white">{getHomeTeamName(match)}</span>
                            <span className="text-gray-400 text-xs">vs</span>
                            <span className="text-xs text-white">{getAwayTeamName(match)}</span>
                            <TeamLogo teamName={getAwayTeamName(match)} size="small" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );

      case 'competitions':
        if (favoriteLeagues.length === 0) {
          return (
            <div className="text-center py-8">
              <div className="text-gray-400 text-4xl mb-4">🏆</div>
              <p className="text-gray-500 mb-4">No favorite competitions yet</p>
              <button
                onClick={() => onSelectTeam('')}
                className="text-blue-400 hover:text-blue-300 transition-colors"
              >
                Add your first competition
              </button>
            </div>
          );
        }

        return (
          <div className="space-y-3">
            {favoriteLeagues.map(league => {
              const leagueMatches = favoriteCompetitionsMatches.filter(match => 
                match.league === league
              ).slice(0, 2);

              return (
                <div key={league} className="bg-gray-700 rounded-lg p-3">
                  <div className="flex items-center space-x-3 mb-2">
                    <LeagueLogo league={league} size="small" />
                    <div>
                      <h3 className="text-sm font-semibold text-white">{league}</h3>
                      <p className="text-xs text-gray-400">
                        {leagueMatches.length} upcoming match{leagueMatches.length !== 1 ? 'es' : ''}
                      </p>
                    </div>
                  </div>

                  {leagueMatches.length > 0 && (
                    <div className="space-y-2">
                      {leagueMatches.map(match => (
                        <div
                          key={match.id}
                          className="bg-gray-600 rounded p-2 cursor-pointer hover:bg-gray-500 transition-colors"
                          onClick={() => handlePredictionClick(match)}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-gray-300">
                              {formatDate(new Date(match.date))} {formatTime(new Date(match.date))}
                            </span>
                            <MatchStatusIndicator match={match} size="small" showIcon={true} showText={false} />
                          </div>
                          <div className="flex items-center space-x-1">
                            <TeamLogo teamName={getHomeTeamName(match)} size="small" />
                            <span className="text-xs text-white">{getHomeTeamName(match)}</span>
                            <span className="text-gray-400 text-xs">vs</span>
                            <span className="text-xs text-white">{getAwayTeamName(match)}</span>
                            <TeamLogo teamName={getAwayTeamName(match)} size="small" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );

      case 'upcoming':
        if (upcomingMatches.length === 0) {
          return (
            <div className="text-center py-8">
              <div className="text-gray-400 text-4xl mb-4">📅</div>
              <p className="text-gray-500 mb-4">No upcoming matches</p>
              <button
                onClick={() => onSelectTeam('')}
                className="text-blue-400 hover:text-blue-300 transition-colors"
              >
                Add favorite teams and competitions
              </button>
            </div>
          );
        }

        return (
          <div className="space-y-3">
            {upcomingMatches.map(match => (
              <div
                key={match.id}
                className="bg-gray-700 rounded-lg p-3 cursor-pointer hover:bg-gray-600 transition-colors"
                onClick={() => handlePredictionClick(match)}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-300">
                    {formatDate(new Date(match.date))} {formatTime(new Date(match.date))}
                  </span>
                  <MatchStatusIndicator match={match} size="small" showIcon={true} showText={true} />
                </div>
                
                <div className="flex items-center space-x-2 mb-2">
                  <TeamLogo teamName={getHomeTeamName(match)} size="small" />
                  <span className="text-sm text-white">{getHomeTeamName(match)}</span>
                  <span className="text-gray-400 text-xs">vs</span>
                  <span className="text-sm text-white">{getAwayTeamName(match)}</span>
                  <TeamLogo teamName={getAwayTeamName(match)} size="small" />
                </div>
                
                <div className="flex items-center justify-between">
                  <LeagueLogo league={match.league as League} size="small" />
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
        );

      default:
        return null;
    }
  };

  return (
    <div className={`compact-personalized-dashboard ${className}`}>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-2">Your Dashboard</h1>
        <p className="text-gray-400 text-sm">
          {liveMatches.length} live • {favoriteTeams.length} teams • {upcomingMatches.length} upcoming
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex bg-gray-800 rounded-lg p-1 mb-6">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 flex items-center justify-center space-x-2 px-3 py-2 text-sm rounded-md transition-colors ${
              activeTab === tab.id 
                ? 'bg-blue-600 text-white' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <span>{tab.label}</span>
            <span className="bg-gray-600 text-gray-300 text-xs px-1.5 py-0.5 rounded-full">
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="min-h-[400px]">
        {renderContent()}
      </div>
    </div>
  );
};

export default CompactPersonalizedDashboard;
