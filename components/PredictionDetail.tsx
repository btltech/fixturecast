import React from 'react';
import { useLocation, useNavigate, Navigate, useParams } from 'react-router-dom';
import { getTeamData } from '../services/teamDataService';
import { View, Match } from '../types';
import { useAppContext } from '../contexts/AppContext';

interface PredictionDetailProps {
  onNavigate?: (view: View) => void;
}

const PredictionDetail: React.FC<PredictionDetailProps> = ({ onNavigate }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { matchId } = useParams<{ matchId: string }>();
  const { fixtures, getPrediction } = useAppContext();

  // Get prediction from route state or fetch by matchId
  let prediction = location.state?.prediction;
  let match: Match | undefined = location.state?.match;

  // If we have a matchId but no prediction from state, try to find it
  if (matchId && !prediction) {
    const matchFromFixtures = fixtures.find(f => f.id === matchId);
    if (matchFromFixtures) {
      match = matchFromFixtures;
      prediction = getPrediction(matchId);
    }
  }

  if (!prediction) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <div className="text-6xl mb-4">🤔</div>
        <h2 className="text-xl font-bold text-white mb-2">No Prediction Selected</h2>
        <p className="text-gray-400 mb-4">Please select a prediction to view detailed analysis.</p>
        <button
          onClick={() => navigate('/')}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  const getTeamLogo = (teamName: string): string => {
    const teamData = getTeamData(teamName);
    return teamData?.logo || '/team-logos/default.png';
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'High': return 'text-green-400 bg-green-600/20 border-green-500/30';
      case 'Medium': return 'text-yellow-400 bg-yellow-600/20 border-yellow-500/30';
      case 'Low': return 'text-red-400 bg-red-600/20 border-red-500/30';
      default: return 'text-gray-400 bg-gray-600/20 border-gray-500/30';
    }
  };

  const formatPercentage = (value: number) => {
    return isNaN(value) ? 'N/A' : `${Math.round(value)}%`;
  };

  return (
    <div className="space-y-6">
      {/* Header with Back Button */}
      {onNavigate && (
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => onNavigate(View.Dashboard)}
            className="flex items-center text-blue-400 hover:text-blue-300 transition-colors bg-gray-800 hover:bg-gray-700 px-3 py-2 rounded-lg font-medium"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-sm sm:text-base">Back to Dashboard</span>
          </button>
        </div>
      )}

      {/* Match Header */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <div className="text-center mb-6">
          <div className="text-sm text-blue-400 font-medium mb-2">{prediction.league}</div>
          <div className="text-xs text-gray-400 mb-4">
            {new Date(prediction.matchDate).toLocaleDateString()} • {new Date(prediction.matchDate).toLocaleTimeString()}
          </div>
        </div>

        {/* Team Matchup */}
        <div className="flex items-center justify-center space-x-8 mb-6">
          <div className="flex flex-col items-center space-y-3">
            <img 
              src={getTeamLogo(prediction.homeTeam)} 
              alt={`${prediction.homeTeam} logo`}
              className="w-16 h-16 rounded-full object-cover border-2 border-gray-600"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = '/team-logos/default.png';
              }}
            />
            <div className="text-center">
              <div className="font-bold text-white text-lg">{prediction.homeTeam}</div>
              <div className="text-xs text-gray-400">Home</div>
            </div>
          </div>

          <div className="flex flex-col items-center space-y-2">
            <div className="text-xs text-gray-400">Prediction</div>
            <div className="px-6 py-3 bg-blue-600/20 border border-blue-500/30 rounded-xl">
              <div className="text-3xl font-bold text-blue-300 text-center">
                {prediction.prediction?.predictedScoreline || 'N/A'}
              </div>
            </div>
            <div className={`px-3 py-1 rounded-lg border ${getConfidenceColor(prediction.prediction?.confidence || 'Unknown')}`}>
              <span className="text-sm font-medium">{prediction.prediction?.confidence || 'Unknown'} Confidence</span>
            </div>
          </div>

          <div className="flex flex-col items-center space-y-3">
            <img 
              src={getTeamLogo(prediction.awayTeam)} 
              alt={`${prediction.awayTeam} logo`}
              className="w-16 h-16 rounded-full object-cover border-2 border-gray-600"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = '/team-logos/default.png';
              }}
            />
            <div className="text-center">
              <div className="font-bold text-white text-lg">{prediction.awayTeam}</div>
              <div className="text-xs text-gray-400">Away</div>
            </div>
          </div>
        </div>
      </div>

      {/* Prediction Probabilities */}
      {prediction.prediction && (
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h3 className="text-lg font-bold text-white mb-4">🎯 Match Outcome Probabilities</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gray-700/50 rounded-lg border border-gray-600/30">
              <div className="text-2xl font-bold text-green-400 mb-1">
                {formatPercentage(prediction.prediction.homeWinProbability)}
              </div>
              <div className="text-sm text-gray-300">{prediction.homeTeam} Win</div>
            </div>
            <div className="text-center p-4 bg-gray-700/50 rounded-lg border border-gray-600/30">
              <div className="text-2xl font-bold text-yellow-400 mb-1">
                {formatPercentage(prediction.prediction.drawProbability)}
              </div>
              <div className="text-sm text-gray-300">Draw</div>
            </div>
            <div className="text-center p-4 bg-gray-700/50 rounded-lg border border-gray-600/30">
              <div className="text-2xl font-bold text-blue-400 mb-1">
                {formatPercentage(prediction.prediction.awayWinProbability)}
              </div>
              <div className="text-sm text-gray-300">{prediction.awayTeam} Win</div>
            </div>
          </div>
        </div>
      )}

      {/* Additional Markets */}
      {prediction.prediction && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Goals & BTTS */}
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <h4 className="text-lg font-bold text-white mb-4">⚽ Goals & Scoring</h4>
            <div className="space-y-4">
              {prediction.prediction.goalLine && (
                <div className="flex justify-between items-center p-3 bg-gray-700/50 rounded-lg">
                  <span className="text-gray-300">Over {prediction.prediction.goalLine.line} Goals</span>
                  <span className="font-bold text-blue-400">{formatPercentage(prediction.prediction.goalLine.overProbability)}</span>
                </div>
              )}
              {prediction.prediction.btts && (
                <div className="flex justify-between items-center p-3 bg-gray-700/50 rounded-lg">
                  <span className="text-gray-300">Both Teams to Score</span>
                  <span className="font-bold text-green-400">{formatPercentage(prediction.prediction.btts.yesProbability)}</span>
                </div>
              )}
              {prediction.prediction.expectedGoals && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-3 bg-gray-700/50 rounded-lg">
                    <div className="text-lg font-bold text-white">{prediction.prediction.expectedGoals.homeXg}</div>
                    <div className="text-xs text-gray-400">Home xG</div>
                  </div>
                  <div className="text-center p-3 bg-gray-700/50 rounded-lg">
                    <div className="text-lg font-bold text-white">{prediction.prediction.expectedGoals.awayXg}</div>
                    <div className="text-xs text-gray-400">Away xG</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Clean Sheets */}
          {prediction.prediction.cleanSheet && (
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h4 className="text-lg font-bold text-white mb-4">🛡️ Clean Sheet Probabilities</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-gray-700/50 rounded-lg">
                  <span className="text-gray-300">{prediction.homeTeam} Clean Sheet</span>
                  <span className="font-bold text-green-400">{formatPercentage(prediction.prediction.cleanSheet.homeTeam)}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-700/50 rounded-lg">
                  <span className="text-gray-300">{prediction.awayTeam} Clean Sheet</span>
                  <span className="font-bold text-blue-400">{formatPercentage(prediction.prediction.cleanSheet.awayTeam)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Key Factors Analysis */}
      {prediction.prediction?.keyFactors && (
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h3 className="text-lg font-bold text-white mb-4">🧠 AI Analysis & Key Factors</h3>
          <div className="space-y-6">
            {prediction.prediction.keyFactors.map((factor: any, index: number) => (
              <div key={index} className="border-l-4 border-blue-500 pl-4">
                <h4 className="font-semibold text-blue-400 mb-2">{factor.category}</h4>
                <ul className="space-y-2">
                  {factor.points.map((point: string, pointIndex: number) => (
                    <li key={pointIndex} className="text-gray-300 text-sm leading-relaxed">
                      • {point}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Model Information */}
      {prediction.prediction?.modelWeights && (
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h3 className="text-lg font-bold text-white mb-4">🤖 Model Ensemble Details</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(prediction.prediction.modelWeights).map(([model, weight]: [string, any]) => (
              <div key={model} className="text-center p-3 bg-gray-700/50 rounded-lg">
                <div className="text-lg font-bold text-blue-400">{weight}%</div>
                <div className="text-xs text-gray-400 capitalize">{model}</div>
              </div>
            ))}
          </div>
          {prediction.prediction.uncertaintyMetrics && (
            <div className="mt-4 p-4 bg-gray-700/30 rounded-lg border border-gray-600/30">
              <div className="text-sm text-gray-400 mb-2">Prediction Quality Metrics:</div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-sm font-medium text-white">{prediction.prediction.uncertaintyMetrics.modelAgreement}%</div>
                  <div className="text-xs text-gray-400">Model Agreement</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-white">{prediction.prediction.uncertaintyMetrics.dataQuality}</div>
                  <div className="text-xs text-gray-400">Data Quality</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-white">{prediction.prediction.uncertaintyMetrics.predictionVariance}%</div>
                  <div className="text-xs text-gray-400">Variance</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Prediction Metadata */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h3 className="text-lg font-bold text-white mb-4">ℹ️ Prediction Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Generated:</span>
            <span className="text-white">{new Date(prediction.predictionTime).toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Match ID:</span>
            <span className="text-white font-mono">{prediction.matchId}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Verified:</span>
            <span className={prediction.verified ? "text-green-400" : "text-yellow-400"}>
              {prediction.verified ? "✓ Verified" : "⏳ Pending"}
            </span>
          </div>
          {prediction.prediction?.confidenceReason && (
            <div className="md:col-span-2">
              <span className="text-gray-400">Confidence Reason:</span>
              <div className="text-white mt-1 text-xs">{prediction.prediction.confidenceReason}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PredictionDetail;
