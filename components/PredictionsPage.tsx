import React, { useState, useEffect } from 'react';
import { Prediction, Match, League } from '../types';
import EnhancedFixtureCard from './EnhancedFixtureCard';
import LoadingSpinner from './LoadingSpinner';
import { predictionCacheService } from '../services/predictionCacheService';

interface StoredPredictionData {
  id: string;
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  league: string;
  matchDate: string;
  prediction: Prediction;
  predictionTime: string;
  verified: boolean;
}

export const PredictionsPage: React.FC = () => {
  const [predictions, setPredictions] = useState<StoredPredictionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedLeague, setSelectedLeague] = useState<string>('');

  useEffect(() => {
    fetchPredictions();
  }, [selectedDate, selectedLeague]);

  const fetchPredictions = async () => {
    setLoading(true);
    setError(null);

    try {
      let url = `/api/predictions?date=${selectedDate}`;
      if (selectedLeague) {
        url += `&league=${encodeURIComponent(selectedLeague)}`;
      }

      const response = await fetch(url);
      const data = await response.json();

      if (response.ok) {
        setPredictions(data.predictions || []);
      } else {
        setError(data.message || 'Failed to fetch predictions');
      }
    } catch (err) {
      setError('Error connecting to predictions service');
      console.error('Error fetching predictions:', err);
    } finally {
      setLoading(false);
    }
  };

  const convertToMatch = (predictionData: StoredPredictionData): Match => {
    return {
      id: predictionData.matchId,
      homeTeam: predictionData.homeTeam,
      awayTeam: predictionData.awayTeam,
      homeTeamId: 0, // We don't have team IDs from stored predictions
      awayTeamId: 1, // We don't have team IDs from stored predictions
      league: predictionData.league as League,
      date: predictionData.matchDate,
      homeScore: undefined,
      awayScore: undefined,
      status: 'NS'
    };
  };

  const availableLeagues = [...new Set(predictions.map(p => p.league).filter(Boolean))];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">
            🎯 Stored Predictions
          </h1>
          <p className="text-blue-200">
            View predictions generated and cached in your system
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                League
              </label>
              <select
                value={selectedLeague}
                onChange={(e) => setSelectedLeague(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Leagues</option>
                {availableLeagues.map(league => (
                  <option key={league} value={league}>{league}</option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={fetchPredictions}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 mb-8">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <h3 className="text-red-400 font-medium">Error Loading Predictions</h3>
                <p className="text-red-300">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        {predictions.length > 0 ? (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-white">
                {predictions.length} Prediction{predictions.length !== 1 ? 's' : ''} Found
              </h2>
              <div className="text-sm text-blue-200">
                Cached predictions • No API calls needed
              </div>
            </div>

            <div className="grid gap-6">
              {predictions.map((predictionData) => {
                const match = convertToMatch(predictionData);
                return (
                  <div key={predictionData.id} className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-white">
                          {predictionData.homeTeam} vs {predictionData.awayTeam}
                        </h3>
                        <p className="text-blue-200">{predictionData.league}</p>
                        <p className="text-sm text-gray-400">
                          Generated: {new Date(predictionData.predictionTime).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                          predictionData.verified 
                            ? 'bg-green-500/20 text-green-400' 
                            : 'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {predictionData.verified ? '✅ Verified' : '⏳ Pending'}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {/* Main Outcome Probabilities */}
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium text-gray-300">Match Outcome</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-white">{predictionData.homeTeam} Win</span>
                            <span className="font-bold text-blue-400">{predictionData.prediction.homeWinProbability}%</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-white">Draw</span>
                            <span className="font-bold text-yellow-400">{predictionData.prediction.drawProbability}%</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-white">{predictionData.awayTeam} Win</span>
                            <span className="font-bold text-red-400">{predictionData.prediction.awayWinProbability}%</span>
                          </div>
                        </div>
                      </div>

                      {/* Scoreline & Confidence */}
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium text-gray-300">Prediction Details</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-white">Predicted Score</span>
                            <span className="font-bold text-green-400">{predictionData.prediction.predictedScoreline}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-white">Confidence</span>
                            <span className={`font-bold ${
                              predictionData.prediction.confidence === 'High' ? 'text-green-400' :
                              predictionData.prediction.confidence === 'Medium' ? 'text-yellow-400' : 'text-red-400'
                            }`}>
                              {predictionData.prediction.confidence}
                            </span>
                          </div>
                          {predictionData.prediction.confidencePercentage && (
                            <div className="flex justify-between items-center">
                              <span className="text-white">Confidence Score</span>
                              <span className="font-bold text-purple-400">{predictionData.prediction.confidencePercentage}%</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Additional Markets */}
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium text-gray-300">Additional Markets</h4>
                        <div className="space-y-2">
                          {predictionData.prediction.btts && (
                            <div className="flex justify-between items-center">
                              <span className="text-white">BTTS Yes</span>
                              <span className="font-bold text-orange-400">{predictionData.prediction.btts.yesProbability}%</span>
                            </div>
                          )}
                          {predictionData.prediction.goalLine && (
                            <div className="flex justify-between items-center">
                              <span className="text-white">Over {predictionData.prediction.goalLine.line}</span>
                              <span className="font-bold text-cyan-400">{predictionData.prediction.goalLine.overProbability}%</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Key Factors */}
                    {predictionData.prediction.keyFactors && predictionData.prediction.keyFactors.length > 0 && (
                      <div className="mt-6 pt-6 border-t border-white/10">
                        <h4 className="text-sm font-medium text-gray-300 mb-4">Key Factors Analysis</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {predictionData.prediction.keyFactors.map((factor, index) => (
                            <div key={index} className="space-y-2">
                              <h5 className="text-sm font-medium text-white">{factor.category}</h5>
                              <ul className="space-y-1">
                                {factor.points.map((point, pointIndex) => (
                                  <li key={pointIndex} className="text-sm text-gray-300 flex items-start space-x-2">
                                    <span className="text-blue-400 mt-1">•</span>
                                    <span>{point}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📭</div>
            <h3 className="text-2xl font-bold text-white mb-2">No Predictions Found</h3>
            <p className="text-blue-200 mb-6">
              No cached predictions for {selectedDate}
              {selectedLeague && ` in ${selectedLeague}`}
            </p>
            <button
              onClick={() => window.history.back()}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              ← Back to Dashboard
            </button>
          </div>
        )}

        {/* Cache Info */}
        <div className="mt-8 text-center">
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
            <p className="text-blue-200 text-sm">
              💡 <strong>Smart Caching:</strong> These predictions were generated once and cached. 
              When anyone clicks the same match, we show this cached version instead of generating a new prediction.
              This saves API credits and ensures consistency.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};