import React, { useState, useEffect } from 'react';
import { LiveMatch } from '../types';
import EnhancedLiveMatch from './EnhancedLiveMatch';
import { getLiveMatches } from '../services/liveMatchService';
import LoadingSpinner from './LoadingSpinner';

interface EnhancedLiveMatchesListProps {
  onSelectMatch?: (match: LiveMatch) => void;
  maxMatches?: number;
  showHeader?: boolean;
}

type ViewMode = 'standard' | 'compact';

const EnhancedLiveMatchesList: React.FC<EnhancedLiveMatchesListProps> = ({ 
  onSelectMatch, 
  maxMatches = 10,
  showHeader = true
}) => {
  const [liveMatches, setLiveMatches] = useState<LiveMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('standard');
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchLiveMatches = async () => {
    try {
      setError(null);
      const matches = await getLiveMatches();
      setLiveMatches(matches.slice(0, maxMatches));
      setLastUpdated(new Date());
    } catch (err) {
      setError('Failed to fetch live matches');
      console.error('Error fetching live matches:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveMatches();
    
    if (autoRefresh) {
      // Set up polling for live updates every 30 seconds
      const interval = setInterval(fetchLiveMatches, 30000);
      return () => clearInterval(interval);
    }
  }, [maxMatches, autoRefresh]);

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-xl p-6 shadow-2xl border border-gray-700">
        <h2 className="text-2xl font-bold text-white mb-4 text-center">⚽ Live Matches</h2>
        <div className="flex justify-center items-center py-8">
          <LoadingSpinner />
          <span className="ml-3 text-gray-300">Loading live matches...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-800 rounded-xl p-6 shadow-2xl border border-gray-700">
        <h2 className="text-2xl font-bold text-white mb-4 text-center">⚽ Live Matches</h2>
        <div className="text-center py-8">
          <p className="text-red-400 mb-4">{error}</p>
          <button 
            onClick={fetchLiveMatches}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            🔄 Retry
          </button>
        </div>
      </div>
    );
  }

  if (liveMatches.length === 0) {
    return (
      <div className="bg-gray-800 rounded-xl p-6 shadow-2xl border border-gray-700">
        <h2 className="text-2xl font-bold text-white mb-4 text-center">⚽ Live Matches</h2>
        <div className="text-center py-8">
          <div className="text-6xl mb-4">⏰</div>
          <p className="text-gray-400 mb-2">No live matches at the moment</p>
          <p className="text-sm text-gray-500">
            Check back later for live updates
          </p>
        </div>
      </div>
    );
  }

  const liveCount = liveMatches.filter(match => match.status === 'LIVE').length;
  const halftimeCount = liveMatches.filter(match => match.status === 'HT').length;
  const finishedCount = liveMatches.filter(match => match.status === 'FT').length;

  return (
    <div className="bg-gray-800 rounded-xl p-3 sm:p-4 lg:p-6 shadow-2xl border border-gray-700">
      {showHeader && (
        <>
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 space-y-3 sm:space-y-0">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-white">⚽ Live Matches</h2>
              {liveCount > 0 && (
                <div className="flex items-center space-x-1 bg-green-600 text-white px-2 py-1 sm:px-3 rounded-full text-xs sm:text-sm font-bold">
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white rounded-full animate-pulse"></div>
                  <span>{liveCount} LIVE</span>
                </div>
              )}
            </div>
            
            {/* View Mode Toggle */}
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="flex bg-gray-700 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('standard')}
                  className={`px-2 py-1 sm:px-3 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                    viewMode === 'standard' 
                      ? 'bg-blue-600 text-white' 
                      : 'text-gray-300 hover:text-white'
                  }`}
                >
                  <span className="hidden sm:inline">📋 Cards</span>
                  <span className="sm:hidden">📋</span>
                </button>
                <button
                  onClick={() => setViewMode('compact')}
                  className={`px-2 py-1 sm:px-3 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                    viewMode === 'compact' 
                      ? 'bg-blue-600 text-white' 
                      : 'text-gray-300 hover:text-white'
                  }`}
                >
                  <span className="hidden sm:inline">📝 List</span>
                  <span className="sm:hidden">📝</span>
                </button>
              </div>
            </div>
          </div>

          {/* Stats and Controls */}
          <div className="flex items-center justify-between mb-6 p-4 bg-gray-700/50 rounded-lg">
            <div className="flex items-center space-x-6">
              {/* Status Counts */}
              <div className="flex items-center space-x-4 text-sm">
                {liveCount > 0 && (
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full border-2 border-green-300"></div>
                    <span className="text-green-400 font-semibold">{liveCount} Live</span>
                  </div>
                )}
                {halftimeCount > 0 && (
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full border-2 border-yellow-300"></div>
                    <span className="text-yellow-400 font-semibold">{halftimeCount} Half Time</span>
                  </div>
                )}
                {finishedCount > 0 && (
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-gray-500 rounded-full border-2 border-gray-300"></div>
                    <span className="text-gray-400 font-semibold">{finishedCount} Finished</span>
                  </div>
                )}
              </div>
            </div>

            {/* Auto-refresh Control and Last Updated */}
            <div className="flex items-center space-x-4 text-sm">
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`flex items-center space-x-2 px-3 py-1 rounded-lg transition-colors ${
                  autoRefresh 
                    ? 'bg-green-600/20 text-green-400 border border-green-500/30' 
                    : 'bg-gray-600/20 text-gray-400 border border-gray-500/30'
                }`}
              >
                <div className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></div>
                <span>{autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}</span>
              </button>
              
              {lastUpdated && (
                <div className="text-xs text-gray-500 flex items-center space-x-1">
                  <span>🕒</span>
                  <span>Updated {lastUpdated.toLocaleTimeString()}</span>
                </div>
              )}

              <button
                onClick={fetchLiveMatches}
                className="flex items-center space-x-1 text-blue-400 hover:text-blue-300 transition-colors"
                disabled={loading}
              >
                <span className={loading ? 'animate-spin' : ''}>🔄</span>
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Update Frequency Notice - Only shown once */}
          {(liveCount > 0 || halftimeCount > 0) && autoRefresh && (
            <div className="mb-6 p-3 bg-blue-600/10 border border-blue-500/30 rounded-lg">
              <div className="flex items-center justify-center space-x-2 text-sm text-blue-400">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span>Live updates every 30 seconds • Real-time scores and events</span>
              </div>
            </div>
          )}
        </>
      )}

      {/* Matches */}
      <div className={`${viewMode === 'compact' ? 'space-y-2' : 'space-y-4'}`}>
        {liveMatches.map((match) => (
          <EnhancedLiveMatch
            key={match.id}
            match={match}
            onSelectMatch={onSelectMatch}
            viewMode={viewMode}
            showEvents={viewMode === 'standard'}
          />
        ))}
      </div>

      {/* Footer Info */}
      {showHeader && (
        <div className="mt-6 pt-4 border-t border-gray-700">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center space-x-4">
              <span>📊 {liveMatches.length} matches displayed</span>
              <span>🎯 Live scores and events</span>
            </div>
            <div className="flex items-center space-x-1">
              <span>Color coding:</span>
              <div className="flex items-center space-x-3 ml-2">
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Live</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <span>Upcoming</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                  <span>Finished</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedLiveMatchesList;
