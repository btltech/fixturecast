import React, { useState, useEffect } from 'react';
import type { LiveMatch } from '../types';
import LiveMatchComponent from './LiveMatch';
import { getLiveMatches } from '../services/liveMatchService';
import LoadingSpinner from './LoadingSpinner';

interface LiveMatchesListProps {
  onSelectMatch?: (match: LiveMatch) => void;
  compact?: boolean;
  maxMatches?: number;
}

const LiveMatchesList: React.FC<LiveMatchesListProps> = ({ 
  onSelectMatch, 
  compact = false, 
  maxMatches = 10 
}) => {
  const [liveMatches, setLiveMatches] = useState<LiveMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

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
    
    // Set up polling for live updates every 30 seconds
    const interval = setInterval(fetchLiveMatches, 30000);
    
    return () => clearInterval(interval);
  }, [maxMatches]);

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-xl p-6 shadow-2xl border border-gray-700">
        <h2 className="text-2xl font-bold text-white mb-4 text-center">Live Matches</h2>
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
        <h2 className="text-2xl font-bold text-white mb-4 text-center">Live Matches</h2>
        <div className="text-center py-8">
          <p className="text-red-400 mb-4">{error}</p>
          <button 
            onClick={fetchLiveMatches}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (liveMatches.length === 0) {
    return (
      <div className="bg-gray-800 rounded-xl p-6 shadow-2xl border border-gray-700">
        <h2 className="text-2xl font-bold text-white mb-4 text-center">Live Matches</h2>
        <div className="text-center py-8">
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

  return (
    <div className="bg-gray-800 rounded-xl p-6 shadow-2xl border border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Live Matches</h2>
        <div className="flex items-center space-x-4 text-sm">
          {liveCount > 0 && (
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-green-400">{liveCount} Live</span>
            </div>
          )}
          {halftimeCount > 0 && (
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              <span className="text-yellow-400">{halftimeCount} HT</span>
            </div>
          )}
          {lastUpdated && (
            <span className="text-xs text-gray-500">
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {liveMatches.map((match) => (
          <LiveMatchComponent
            key={match.id}
            match={match}
            onSelectMatch={onSelectMatch}
            compact={compact}
            showEvents={!compact}
          />
        ))}
      </div>

      {/* Auto-refresh indicator */}
      <div className="mt-4 pt-4 border-t border-gray-700">
        <div className="flex items-center justify-center space-x-2 text-xs text-gray-500">
          <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
          <span>Auto-refreshing every 30 seconds</span>
        </div>
      </div>
    </div>
  );
};

export default LiveMatchesList;
