import React, { useState, useEffect } from 'react';
import { Match, League } from '../types';
import { getTodaysFixtures } from '../services/footballApiService';
import LocalPrediction from './LocalPrediction';
import LoadingSpinner from './LoadingSpinner';

const LocalPredictionPage: React.FC = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [isLoadingMatches, setIsLoadingMatches] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTodaysMatches = async () => {
    setIsLoadingMatches(true);
    setError(null);
    
    try {
      console.log('🔄 Loading matches for Gemini Flash predictions...');
      
      // Try multiple leagues to find today's matches
      const leagues = [League.PremierLeague, League.ChampionsLeague, League.LaLiga, League.SerieA, League.Bundesliga];
      let allMatches: Match[] = [];
      
      for (const league of leagues) {
        try {
          console.log(`📊 Checking ${league} for matches...`);
          const leagueMatches = await getTodaysFixtures(league);
          if (leagueMatches.length > 0) {
            allMatches = [...allMatches, ...leagueMatches];
            console.log(`✅ Found ${leagueMatches.length} matches in ${league}`);
          }
        } catch (leagueError: any) {
          console.warn(`⚠️ No matches in ${league}:`, leagueError.message);
        }
      }
      
      if (allMatches.length === 0) {
        console.log('📝 No matches scheduled for today.');
        setError('No matches scheduled for today. Please check back later or try a different date.');
        setMatches([]);
        setSelectedMatch(null);
        return;
      }
      
      setMatches(allMatches);
      if (allMatches.length > 0) {
        setSelectedMatch(allMatches[0]); // Auto-select first match
      }
      
      console.log(`📅 Loaded ${allMatches.length} matches for local predictions`);
      
    } catch (error: any) {
      console.error('❌ Failed to load matches:', error);
      setError(`Failed to load matches: ${error.message}`);
    } finally {
      setIsLoadingMatches(false);
    }
  };

  useEffect(() => {
    loadTodaysMatches();
  }, []);

  const formatMatchTime = (dateString: string) => {
    const matchDate = new Date(dateString);
    const now = new Date();
    
    // Check if it's today
    const isToday = matchDate.toDateString() === now.toDateString();
    
    if (isToday) {
      return `Today ${matchDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      return matchDate.toLocaleDateString([], { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  if (isLoadingMatches) {
    return (
      <div className="min-h-screen bg-gray-900 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center">
            <LoadingSpinner />
            <p className="text-white mt-4">Loading matches for Gemini Flash predictions...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">
            🤖 Gemini Flash Predictions
          </h1>
          <p className="text-xl text-gray-300 mt-2 mb-6">
            Generate predictions using Gemini Flash - AI-powered football match analysis
          </p>
        </div>

        {/* Comparison Info */}
        <div className="mb-6 p-4 bg-gradient-to-r from-blue-900/20 to-green-900/20 border border-gray-600 rounded-lg">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <h3 className="text-white font-semibold mb-1">🔄 Model Comparison Setup</h3>
              <div className="text-sm text-gray-300">
                <div>🤖 <strong>Engine:</strong> Gemini Flash (fast and accurate predictions)</div>
                <div>🔮 <strong>Live Site:</strong> Gemini 2.5 Flash (fast predictions, ~15s)</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-blue-400 font-semibold">Perfect for A/B Testing!</div>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-yellow-900/20 border border-yellow-600 rounded-lg">
            <div className="flex items-center space-x-2">
              <span className="text-yellow-400">⚠️</span>
              <p className="text-yellow-300">{error}</p>
            </div>
          </div>
        )}

        {/* Match Selection */}
        {matches.length > 0 && (
          <div className="mb-6">
            <label className="block text-white font-semibold mb-3">
              📅 Select Match for Prediction ({matches.length} available):
            </label>
            <div className="grid gap-3">
              {matches.map((match) => (
                <button
                  key={match.id}
                  onClick={() => setSelectedMatch(match)}
                  className={`p-4 rounded-lg border text-left transition-colors ${
                    selectedMatch?.id === match.id
                      ? 'border-green-500 bg-green-900/30 text-white'
                      : 'border-gray-600 bg-gray-800 hover:bg-gray-700 text-gray-300'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-semibold text-lg">
                        {match.homeTeam} vs {match.awayTeam}
                      </div>
                      <div className="text-sm text-gray-400">
                        {match.league} • {match.venue}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {formatMatchTime(match.date)}
                      </div>
                      {selectedMatch?.id === match.id && (
                        <div className="text-green-400 text-xs mt-1">✓ Selected</div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-4 text-center">
              <button
                onClick={loadTodaysMatches}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                🔄 Refresh Matches
              </button>
            </div>
          </div>
        )}

        {/* Local Prediction Component */}
        {selectedMatch && (
          <div className="mt-6">
            <LocalPrediction 
              match={selectedMatch}
              context={undefined}
            />
          </div>
        )}

        {/* No matches state */}
        {matches.length === 0 && !isLoadingMatches && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🤖</div>
            <h2 className="text-xl font-bold text-white mb-2">No Matches Available</h2>
            <p className="text-gray-400 mb-4">
              No matches found for today. Try refreshing or check back later.
            </p>
            <button
              onClick={loadTodaysMatches}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold"
            >
              🔄 Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LocalPredictionPage;