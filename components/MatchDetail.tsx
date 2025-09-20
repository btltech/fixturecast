import React, { useState, useEffect } from 'react';
import { useParams, useLocation, Navigate } from 'react-router-dom';
import { Match, Prediction } from '../types';
import TeamLogo from './TeamLogo';
import LoadingSpinner from './LoadingSpinner';
import ProbabilityBar from './ProbabilityBar';
import ConfidenceMeter from './ConfidenceMeter';
import ConfidenceIndicator from './ConfidenceIndicator';
import TeamFormChart from './TeamFormChart';
import KeyFactorsVisualizer from './KeyFactorsVisualizer';
import { useAppContext } from '../contexts/AppContext';

interface MatchDetailProps {
  onSelectTeam: (teamName: string) => void;
}

const MatchDetail: React.FC<MatchDetailProps> = ({ onSelectTeam }) => {
  const { matchId } = useParams<{ matchId: string }>();
  const location = useLocation();
  const { fixtures } = useAppContext();

  // Get match from route state or find it in fixtures
  const match = location.state?.match || fixtures.find(f => f.id === matchId);

  // If no match found, redirect to fixtures
  if (!match) {
    return <Navigate to="/fixtures" replace />;
  }
  const { fetchPrediction, getPrediction, favoriteTeams, toggleFavoriteTeam, teams, accuracyStats, getTeamForm } = useAppContext();
  const [prediction, setPrediction] = useState<Prediction | null>(getPrediction(match.id));
  const [loading, setLoading] = useState(!prediction);
  const [error, setError] = useState<string | null>(null);
  
  // Get team form data
  const homeTeamForm = getTeamForm(1, match.homeTeam);
  const awayTeamForm = getTeamForm(2, match.awayTeam);

  useEffect(() => {
    const loadPrediction = async () => {
      if (!getPrediction(match.id)) {
        setLoading(true);
        try {
          setError(null);
          const pred = await fetchPrediction(match);
          setPrediction(pred);
        } catch (error: any) {
          console.error("Failed to fetch match prediction:", error);
          setError(error?.message || 'Failed to load prediction');
        } finally {
          setLoading(false);
        }
      }
    };

    loadPrediction();
  }, [match, fetchPrediction, getPrediction]);

  const { homeTeam, awayTeam, league, date } = match;
  const matchDate = new Date(date);

  const homeTeamColors = teams[homeTeam]?.jerseyColors || { primary: '#1f2937', secondary: '#ffffff' };
  const awayTeamColors = teams[awayTeam]?.jerseyColors || { primary: '#374151', secondary: '#ffffff' };

  const isFavorite = (teamName: string) => favoriteTeams.includes(teamName);

  const renderPrediction = () => {
    if (loading) {
      return (
        <div className="text-center p-8">
            <LoadingSpinner />
            <p className="mt-4 text-gray-300 animate-pulse">Generating FixtureCast prediction...</p>
        </div>
      );
    }

    if (!prediction) {
      return (
        <div className="text-center p-8">
          <p className="text-red-400 mb-4">{error || 'Could not load prediction.'}</p>
          <button
            onClick={async () => {
              setLoading(true);
              try {
                setError(null);
                const pred = await fetchPrediction(match);
                setPrediction(pred);
              } catch (err: any) {
                setError(err?.message || 'Failed to load prediction');
              } finally {
                setLoading(false);
              }
            }}
            className="inline-flex items-center px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium"
          >
            Retry Prediction
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div>
            <h3 className="text-lg font-semibold text-blue-400 mb-2">Outcome Probability</h3>
            <ProbabilityBar home={prediction.homeWinProbability} draw={prediction.drawProbability} away={prediction.awayWinProbability} />
            <div className="flex justify-between mt-2 text-sm">
                <span className="text-green-400">{homeTeam} Win: {prediction.homeWinProbability}%</span>
                <span className="text-yellow-400">Draw: {prediction.drawProbability}%</span>
                <span className="text-red-400">{awayTeam} Win: {prediction.awayWinProbability}%</span>
            </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-gray-800 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-blue-400 mb-2">Predicted Scoreline</h3>
                <p className="text-4xl font-bold text-white text-center">{prediction.predictedScoreline}</p>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-blue-400 mb-3">Prediction Confidence</h3>
                <div className="space-y-3">
                    <ConfidenceMeter level={prediction.confidence} />
                    <div className="flex justify-center">
                        <ConfidenceIndicator
                            prediction={prediction}
                            accuracyStats={accuracyStats}
                            matchContext={{
                                league: match.league,
                                hasRecentForm: true,
                                hasHeadToHead: true
                            }}
                            size="medium"
                            showPercentage={true}
                            showTooltip={true}
                        />
                    </div>
                </div>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-blue-400 mb-2">Goal Line (O/U)</h3>
                 <div className="text-center">
                    <p className="text-2xl font-bold text-white">{prediction.goalLine.line} Goals</p>
                    <div className="flex justify-around mt-2 text-sm">
                        <div>
                            <span className="text-gray-400 block">Over</span>
                            <span className="font-bold text-lg text-white">{prediction.goalLine.overProbability}%</span>
                        </div>
                        <div>
                            <span className="text-gray-400 block">Under</span>
                            <span className="font-bold text-lg text-white">{prediction.goalLine.underProbability}%</span>
                        </div>
                    </div>
                </div>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-blue-400 mb-2">Both Teams To Score</h3>
                 <div className="text-center">
                    {prediction.btts ? (
                      <div className="flex justify-around mt-2 text-sm">
                          <div>
                              <span className="text-gray-400 block">BTTS: Yes</span>
                              <span className="font-bold text-lg text-white">{prediction.btts.yesProbability}%</span>
                          </div>
                          <div>
                              <span className="text-gray-400 block">BTTS: No</span>
                              <span className="font-bold text-lg text-white">{prediction.btts.noProbability}%</span>
                          </div>
                      </div>
                    ) : (
                      <p className="text-gray-300">Not available</p>
                    )}
                 </div>
            </div>
            
            {/* HT/FT Prediction */}
            <div className="bg-gray-800 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-blue-400 mb-2">Half-Time/Full-Time</h3>
                {prediction.htft ? (
                  <div className="grid grid-cols-3 gap-1 text-xs">
                    <div className="text-center">
                      <span className="text-gray-400 block">H/H</span>
                      <span className="font-bold text-white">{prediction.htft.homeHome}%</span>
                    </div>
                    <div className="text-center">
                      <span className="text-gray-400 block">H/D</span>
                      <span className="font-bold text-white">{prediction.htft.homeDraw}%</span>
                    </div>
                    <div className="text-center">
                      <span className="text-gray-400 block">H/A</span>
                      <span className="font-bold text-white">{prediction.htft.homeAway}%</span>
                    </div>
                    <div className="text-center">
                      <span className="text-gray-400 block">D/H</span>
                      <span className="font-bold text-white">{prediction.htft.drawHome}%</span>
                    </div>
                    <div className="text-center">
                      <span className="text-gray-400 block">D/D</span>
                      <span className="font-bold text-white">{prediction.htft.drawDraw}%</span>
                    </div>
                    <div className="text-center">
                      <span className="text-gray-400 block">D/A</span>
                      <span className="font-bold text-white">{prediction.htft.drawAway}%</span>
                    </div>
                    <div className="text-center">
                      <span className="text-gray-400 block">A/H</span>
                      <span className="font-bold text-white">{prediction.htft.awayHome}%</span>
                    </div>
                    <div className="text-center">
                      <span className="text-gray-400 block">A/D</span>
                      <span className="font-bold text-white">{prediction.htft.awayDraw}%</span>
                    </div>
                    <div className="text-center">
                      <span className="text-gray-400 block">A/A</span>
                      <span className="font-bold text-white">{prediction.htft.awayAway}%</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-300">Not available</p>
                )}
            </div>

            {/* Score Range Prediction */}
            <div className="bg-gray-800 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-blue-400 mb-2">Total Goals Range</h3>
                {prediction.scoreRange ? (
                  <div className="text-center">
                    <div className="flex justify-around mt-2 text-sm">
                        <div>
                            <span className="text-gray-400 block">0-1 Goals</span>
                            <span className="font-bold text-lg text-white">{prediction.scoreRange.zeroToOne}%</span>
                        </div>
                        <div>
                            <span className="text-gray-400 block">2-3 Goals</span>
                            <span className="font-bold text-lg text-white">{prediction.scoreRange.twoToThree}%</span>
                        </div>
                        <div>
                            <span className="text-gray-400 block">4+ Goals</span>
                            <span className="font-bold text-lg text-white">{prediction.scoreRange.fourPlus}%</span>
                        </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-300">Not available</p>
                )}
            </div>

            {/* First Goalscorer Prediction */}
            <div className="bg-gray-800 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-blue-400 mb-2">First Goalscorer</h3>
                {prediction.firstGoalscorer ? (
                  <div className="text-center">
                    <div className="flex justify-around mt-2 text-sm">
                        <div>
                            <span className="text-gray-400 block">Home First</span>
                            <span className="font-bold text-lg text-white">{prediction.firstGoalscorer.homeTeam}%</span>
                        </div>
                        <div>
                            <span className="text-gray-400 block">Away First</span>
                            <span className="font-bold text-lg text-white">{prediction.firstGoalscorer.awayTeam}%</span>
                        </div>
                        <div>
                            <span className="text-gray-400 block">No Goals</span>
                            <span className="font-bold text-lg text-white">{prediction.firstGoalscorer.noGoalscorer}%</span>
                        </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-300">Not available</p>
                )}
            </div>

            {/* Clean Sheet Prediction */}
            <div className="bg-gray-800 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-blue-400 mb-2">Clean Sheets</h3>
                {prediction.cleanSheet ? (
                  <div className="text-center">
                    <div className="flex justify-around mt-2 text-sm">
                        <div>
                            <span className="text-gray-400 block">Home CS</span>
                            <span className="font-bold text-lg text-white">{prediction.cleanSheet.homeTeam}%</span>
                        </div>
                        <div>
                            <span className="text-gray-400 block">Away CS</span>
                            <span className="font-bold text-lg text-white">{prediction.cleanSheet.awayTeam}%</span>
                        </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-300">Not available</p>
                )}
            </div>

            {/* Corner Prediction */}
            <div className="bg-gray-800 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-blue-400 mb-2">Corners (O/U 9.5)</h3>
                {prediction.corners ? (
                  <div className="text-center">
                    <div className="flex justify-around mt-2 text-sm">
                        <div>
                            <span className="text-gray-400 block">Over 9.5</span>
                            <span className="font-bold text-lg text-white">{prediction.corners.over}%</span>
                        </div>
                        <div>
                            <span className="text-gray-400 block">Under 9.5</span>
                            <span className="font-bold text-lg text-white">{prediction.corners.under}%</span>
                        </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-300">Not available</p>
                )}
            </div>
        </div>

        {/* Team Form Analysis */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TeamFormChart 
                formAnalysis={homeTeamForm} 
                showHomeAway={true}
                compact={false}
            />
            <TeamFormChart 
                formAnalysis={awayTeamForm} 
                showHomeAway={true}
                compact={false}
            />
        </div>

        {/* Advanced ML Model Insights */}
        {(prediction.expectedGoals || prediction.modelWeights || prediction.uncertaintyMetrics) && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-purple-400 mb-4">🧠 Advanced ML Model Insights</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Expected Goals */}
              {prediction.expectedGoals && (
                <div className="bg-gradient-to-br from-purple-900/30 to-gray-800 p-4 rounded-lg border border-purple-500/20">
                  <h4 className="text-md font-semibold text-purple-300 mb-3">⚽ Expected Goals (xG)</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">{homeTeam}</span>
                      <span className="text-xl font-bold text-blue-400">{prediction.expectedGoals.homeXg.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">{awayTeam}</span>
                      <span className="text-xl font-bold text-red-400">{prediction.expectedGoals.awayXg.toFixed(2)}</span>
                    </div>
                    <div className="text-xs text-gray-400 mt-2">
                      From Poisson Regression Model
                    </div>
                  </div>
                </div>
              )}

              {/* Model Weights */}
              {prediction.modelWeights && (
                <div className="bg-gradient-to-br from-purple-900/30 to-gray-800 p-4 rounded-lg border border-purple-500/20">
                  <h4 className="text-md font-semibold text-purple-300 mb-3">⚖️ Ensemble Weights</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-300">XGBoost</span>
                      <span className="text-green-400 font-medium">{prediction.modelWeights.xgboost}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-300">Poisson</span>
                      <span className="text-blue-400 font-medium">{prediction.modelWeights.poisson}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-300">Neural Net</span>
                      <span className="text-purple-400 font-medium">{prediction.modelWeights.neuralNet}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-300">Bayesian</span>
                      <span className="text-orange-400 font-medium">{prediction.modelWeights.bayesian}%</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Uncertainty Metrics */}
              {prediction.uncertaintyMetrics && (
                <div className="bg-gradient-to-br from-purple-900/30 to-gray-800 p-4 rounded-lg border border-purple-500/20">
                  <h4 className="text-md font-semibold text-purple-300 mb-3">📊 Prediction Quality</h4>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-300">Model Agreement</span>
                        <span className="text-green-400 font-medium">{prediction.uncertaintyMetrics.modelAgreement}%</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full progress-bar" 
                          style={{ '--progress-width': `${prediction.uncertaintyMetrics.modelAgreement}%` } as React.CSSProperties}
                        ></div>
                      </div>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-300">Data Quality</span>
                      <span className={`font-medium ${
                        prediction.uncertaintyMetrics.dataQuality === 'High' ? 'text-green-400' :
                        prediction.uncertaintyMetrics.dataQuality === 'Medium' ? 'text-yellow-400' : 'text-red-400'
                      }`}>
                        {prediction.uncertaintyMetrics.dataQuality}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-300">Variance</span>
                      <span className="text-gray-400">{prediction.uncertaintyMetrics.predictionVariance.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div>
            <h3 className="text-lg font-semibold text-blue-400 mb-4">Key Factors Analysis</h3>
            <KeyFactorsVisualizer factors={prediction.keyFactors} />
            <p className="text-xs text-gray-500 mt-4 text-right italic">
                Powered by FixtureCast Advanced Ensemble AI
            </p>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-gray-800/50 rounded-xl shadow-2xl border border-gray-700 overflow-hidden">
      <div className="p-6 bg-gray-900/70">
        <p className="text-center text-lg font-bold text-blue-300">{league}</p>
        <p className="text-center text-sm text-gray-400">
            {matchDate.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            {' at '}
            {matchDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
      
      <div className="p-8">
        <div className="flex items-center justify-around mb-8">
          <div 
            className="flex flex-col items-center space-y-3 w-[45%] p-4 rounded-lg transition-all team-background"
            style={{ '--team-gradient': `linear-gradient(to bottom, ${homeTeamColors?.primary || '#1f2937'}33, #1f293700)` } as React.CSSProperties}
          >
            <TeamLogo teamName={homeTeam} size="large" showJerseyColors={true} clickable={true} onClick={() => onSelectTeam(homeTeam)} />
            <span className="text-xs uppercase tracking-wide text-green-300">Home</span>
            <h2 
              className="text-2xl font-bold text-center text-white cursor-pointer hover:text-blue-400 transition-colors duration-200"
              onClick={() => onSelectTeam(homeTeam)}
            >
              {homeTeam}
            </h2>
            <button
                onClick={() => toggleFavoriteTeam(homeTeam)}
                className={`text-3xl transition-colors ${isFavorite(homeTeam) ? 'text-yellow-400' : 'text-gray-600 hover:text-yellow-300'}`}
                title={`Favorite ${homeTeam}`}
            >
                ★
            </button>
          </div>
          <div className="text-6xl font-extrabold text-gray-500">vs</div>
          <div 
            className="flex flex-col items-center space-y-3 w-[45%] p-4 rounded-lg transition-all team-background"
            style={{ '--team-gradient': `linear-gradient(to bottom, ${awayTeamColors?.primary || '#1f2937'}33, #1f293700)` } as React.CSSProperties}
          >
            <TeamLogo teamName={awayTeam} size="large" showJerseyColors={true} clickable={true} onClick={() => onSelectTeam(awayTeam)} />
            <span className="text-xs uppercase tracking-wide text-red-300">Away</span>
            <h2 
              className="text-2xl font-bold text-center text-white cursor-pointer hover:text-blue-400 transition-colors duration-200"
              onClick={() => onSelectTeam(awayTeam)}
            >
              {awayTeam}
            </h2>
            <button
                onClick={() => toggleFavoriteTeam(awayTeam)}
                className={`text-3xl transition-colors ${isFavorite(awayTeam) ? 'text-yellow-400' : 'text-gray-600 hover:text-yellow-300'}`}
                title={`Favorite ${awayTeam}`}
            >
                ★
            </button>
          </div>
        </div>
        
        <div className="border-t border-gray-700 pt-6">
            {renderPrediction()}
        </div>
      </div>
      
      {/* Navigation handled via onSelectTeam; modal removed */}
    </div>
  );
};

export default MatchDetail;
