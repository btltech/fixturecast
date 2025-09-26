import React, { useState } from 'react';
import { Match, Prediction } from '../types';
import { getMatchPrediction } from '../services/geminiService';
import { withRateLimit } from '../services/rateLimitService';
import RateLimitStatus from './RateLimitStatus';

interface LocalPredictionProps {
  match: Match;
  context?: any;
}

const LocalPrediction: React.FC<LocalPredictionProps> = ({ match, context }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [responseTime, setResponseTime] = useState<number>(0);

  const generateLocalPrediction = async () => {
    setIsLoading(true);
    setError(null);
    setPrediction(null);
    
    const startTime = Date.now();
    
    try {
      console.log(`🤖 Generating Gemini Flash prediction for ${match.homeTeam} vs ${match.awayTeam}`);
      
      const result = await getMatchPrediction(match, context);
      const endTime = Date.now();
      
      setPrediction(result);
      setResponseTime(endTime - startTime);
      
      console.log(`✅ Gemini Flash prediction completed in ${endTime - startTime}ms`);
      
    } catch (err: any) {
      const endTime = Date.now();
      setResponseTime(endTime - startTime);
      
      console.error('❌ Gemini Flash prediction failed:', err);
      
      // Handle rate limit errors gracefully
      if (err.message?.toLowerCase().includes('rate limit')) {
        setError('Gemini rate limit reached. Please wait a few minutes before trying again.');
      } else {
        setError(`Gemini prediction failed: ${err.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const formatResponseTime = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  return (
    <div className="bg-gray-900 p-6 rounded-lg">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">
          🤖 Gemini Flash Prediction
        </h2>
        <div className="text-gray-400">
          <div className="font-semibold">{match.homeTeam} vs {match.awayTeam}</div>
          <div className="text-sm">{match.league} • {match.venue}</div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="mb-6 p-4 bg-blue-900/20 border border-blue-600 rounded-lg">
        <div className="flex items-start space-x-3">
          <span className="text-blue-400 text-xl">💡</span>
          <div>
            <h3 className="text-blue-300 font-semibold mb-1">Local vs Live Site Comparison</h3>
            <p className="text-blue-200 text-sm">
              This uses <strong>DeepSeek V3.1</strong> locally, while your live site uses <strong>Gemini 2.5 Flash</strong>.
              Perfect for comparing different AI model predictions!
            </p>
          </div>
        </div>
      </div>

      {/* Rate Limit Status */}
      <RateLimitStatus className="mb-6" />

      {/* Generate Button */}
      <div className="mb-6 text-center">
        <button
          onClick={generateLocalPrediction}
          disabled={isLoading}
          className="px-8 py-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors text-lg"
        >
          {isLoading ? (
            <div className="flex items-center">
              <svg className="animate-spin -ml-1 mr-3 h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Generating DeepSeek Prediction... (~3min)</span>
            </div>
          ) : (
            `🚀 Generate Local Prediction`
          )}
        </button>
      </div>

      {/* Error State */}
      {error && (
        <div className="mb-6 p-4 bg-red-900/20 border border-red-500 rounded-lg">
          <div className="flex items-center space-x-2">
            <span className="text-red-400">❌</span>
            <div>
              <h3 className="text-red-400 font-semibold">Prediction Failed</h3>
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Prediction Result */}
      {prediction && (
        <div className="space-y-6">
          <div className="p-6 border border-green-500 rounded-lg bg-green-900/20">
            {/* Header with Response Time */}
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-2xl font-bold text-green-400">🤖 DeepSeek V3.1 Terminus</h3>
              <div className="text-right">
                <div className="text-green-300 font-semibold">
                  {formatResponseTime(responseTime)}
                </div>
                <div className="text-xs text-green-400">Response Time</div>
              </div>
            </div>
            
            {/* Main Outcome Probabilities */}
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-green-300 mb-3">Match Outcome</h4>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-gray-800 p-4 rounded-lg">
                  <div className="text-3xl font-bold text-green-400">{prediction.homeWinProbability}%</div>
                  <div className="text-sm text-gray-400">{match.homeTeam} Win</div>
                </div>
                <div className="bg-gray-800 p-4 rounded-lg">
                  <div className="text-3xl font-bold text-green-400">{prediction.drawProbability}%</div>
                  <div className="text-sm text-gray-400">Draw</div>
                </div>
                <div className="bg-gray-800 p-4 rounded-lg">
                  <div className="text-3xl font-bold text-green-400">{prediction.awayWinProbability}%</div>
                  <div className="text-sm text-gray-400">{match.awayTeam} Win</div>
                </div>
              </div>
            </div>

            {/* Key Prediction Details */}
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div className="space-y-3">
                <h4 className="text-lg font-semibold text-green-300">Key Predictions</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Predicted Score:</span>
                    <span className="text-green-400 font-bold text-lg">{prediction.predictedScoreline}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Confidence:</span>
                    <span className="text-green-400 font-bold">{prediction.confidence}</span>
                  </div>
                  {prediction.btts && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Both Teams to Score:</span>
                      <span className="text-green-400 font-bold">{prediction.btts.yesProbability}%</span>
                    </div>
                  )}
                  {prediction.goalLine && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Over 2.5 Goals:</span>
                      <span className="text-green-400 font-bold">{prediction.goalLine.overProbability}%</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Additional Markets */}
              <div className="space-y-3">
                <h4 className="text-lg font-semibold text-green-300">Additional Markets</h4>
                <div className="space-y-2 text-sm">
                  {prediction.htft && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Half-time/Full-time:</span>
                      <span className="text-green-400">Available</span>
                    </div>
                  )}
                  {prediction.scoreRange && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Score Range:</span>
                      <span className="text-green-400">Analyzed</span>
                    </div>
                  )}
                  {prediction.corners && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Corners:</span>
                      <span className="text-green-400">{prediction.corners.over}% over</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Key Factors */}
            {Array.isArray(prediction.keyFactors) && prediction.keyFactors.length > 0 && (
              <div className="mb-4">
                <h4 className="text-lg font-semibold text-green-300 mb-2">Key Analysis Factors</h4>
                <div className="bg-gray-800 p-3 rounded">
                  <ul className="text-sm text-gray-300 space-y-1">
                    {prediction.keyFactors.map((factor: any, index) => (
                      <li key={index}>• {typeof factor === 'string' ? factor : factor?.factor || factor?.category || JSON.stringify(factor)}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Comparison Reminder */}
            <div className="mt-4 p-3 bg-blue-900/30 border border-blue-600 rounded">
              <div className="text-sm text-blue-200">
                💡 <strong>Compare with live site:</strong> Visit your production site to see Gemini's prediction for the same match!
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LocalPrediction;