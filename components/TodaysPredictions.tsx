import React, { useState } from 'react';
import { useAppContext } from '../contexts/AppContext';
import TeamLogo from './TeamLogo';
import LoadingSpinner from './LoadingSpinner';
import SyncStatusIndicator from './SyncStatusIndicator';
import { Prediction } from '../types';

const TodaysPredictions: React.FC = () => {
  const {
    todaysFixturesWithPredictions,
    fetchPrediction,
    addToast,
    isLoading,
    generateTodaysPredictions,
    fixtures,
    teams
  } = useAppContext();

  const [generating, setGenerating] = React.useState(false);
  const [expandedPredictions, setExpandedPredictions] = useState<Set<string>>(new Set());

  const handleGenerateMissing = async () => {
    try {
      setGenerating(true);
      const { success, failed, total } = await generateTodaysPredictions();
      addToast(`Generated predictions: ${success}/${total} (failed: ${failed})`, failed > 0 ? 'warning' : 'success');
    } catch (error) {
      console.error('Failed to generate today\'s predictions:', error);
      addToast('Failed to generate today\'s predictions', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleGeneratePrediction = async (matchId: string) => {
    const match = fixtures.find(f => f.id === matchId);
    if (!match) return;

    try {
      await fetchPrediction(match);
      addToast('Prediction generated', 'success');
    } catch (error) {
      console.error('Failed to generate prediction:', error);
      addToast('Failed to generate prediction', 'error');
    }
  };

  // TODO: refine league detection if required; current implementation unused & referenced undefined variable
  const getLeagueDisplay = (matchLeague?: string) => matchLeague || 'League unknown';

  const togglePredictionExpansion = (matchId: string) => {
    setExpandedPredictions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(matchId)) {
        newSet.delete(matchId);
      } else {
        newSet.add(matchId);
      }
      return newSet;
    });
  };

  const isExpanded = (matchId: string) => expandedPredictions.has(matchId);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white">Today&apos;s Predictions</h1>
            <p className="text-gray-400 mt-1">Matches scheduled for today with available predictions. Generate missing ones on demand.</p>
            <div className="mt-2">
              <SyncStatusIndicator showDetails={true} />
            </div>
          </div>

          <button
            onClick={handleGenerateMissing}
            disabled={generating}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors inline-flex items-center space-x-2 ${
              generating
                ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-500 text-white'
            }`}
          >
            {generating && <LoadingSpinner />}
            <span>{generating ? 'Generating...' : 'Generate Missing Predictions'}</span>
          </button>
        </div>

        {isLoading && (
          <div className="flex justify-center py-16">
            <LoadingSpinner />
          </div>
        )}

        {!isLoading && todaysFixturesWithPredictions.length === 0 && (
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 text-center text-gray-400">
            No fixtures scheduled for today.
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {todaysFixturesWithPredictions.map(({ match, prediction, loading }) => (
            <div key={match.id} className="bg-gray-800 border border-gray-700 rounded-xl p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-white font-semibold">{match.homeTeam} vs {match.awayTeam}</h2>
                  <div className="text-sm text-gray-400">
                    {new Date(match.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                {!prediction && (
                  <button
                    onClick={() => handleGeneratePrediction(match.id)}
                    disabled={loading}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                      loading
                        ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                        : 'bg-blue-500 hover:bg-blue-400 text-white'
                    }`}
                  >
                    {loading ? 'Generating...' : 'Generate'}
                  </button>
                )}
              </div>

              <div className="bg-gray-900/60 border border-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <TeamLogo teamName={match.homeTeam} size="small" />
                    <div>
                      <div className="text-white font-semibold">{match.homeTeam}</div>
                      <div className="text-xs text-gray-500">Home</div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-400">
                    vs
                  </div>
                  <div className="flex items-center space-x-4 text-right">
                    <div>
                      <div className="text-white font-semibold">{match.awayTeam}</div>
                      <div className="text-xs text-gray-500">Away</div>
                    </div>
                    <TeamLogo teamName={match.awayTeam} size="small" />
                  </div>
                </div>

                <div className="mt-4 bg-gray-800/60 rounded-lg p-4 space-y-2">
                  {prediction ? (
                    <>
                      <div 
                        className="cursor-pointer hover:bg-gray-700/50 rounded-lg p-2 transition-colors"
                        onClick={() => togglePredictionExpansion(match.id)}
                      >
                        <div className="flex items-center justify-between text-sm text-gray-400 uppercase tracking-wide">
                          <span>Predicted Outcome</span>
                          <div className="flex items-center space-x-2">
                            {prediction.predictedScoreline && (
                              <span className="text-blue-300">Scoreline: {prediction.predictedScoreline}</span>
                            )}
                            <span className="text-xs text-gray-500">
                              {isExpanded(match.id) ? '▼ Click to collapse' : '▶ Click to expand details'}
                            </span>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3 text-white text-sm mt-2">
                          <div className="bg-blue-900/30 rounded-lg p-3 text-center">
                            <div className="text-xs text-gray-300 uppercase">Home</div>
                            <div className="text-xl font-bold">{prediction.homeWinProbability}%</div>
                          </div>
                          <div className="bg-gray-900/50 rounded-lg p-3 text-center">
                            <div className="text-xs text-gray-300 uppercase">Draw</div>
                            <div className="text-xl font-bold">{prediction.drawProbability}%</div>
                          </div>
                          <div className="bg-blue-900/30 rounded-lg p-3 text-center">
                            <div className="text-xs text-gray-300 uppercase">Away</div>
                            <div className="text-xl font-bold">{prediction.awayWinProbability}%</div>
                          </div>
                        </div>
                        {prediction.confidence && (
                          <div className="text-xs text-gray-400 mt-2">Confidence: {prediction.confidence}</div>
                        )}
                      </div>

                      {/* Detailed Prediction View */}
                      {isExpanded(match.id) && (
                        <div className="mt-4 bg-gray-900/80 rounded-lg p-4 space-y-4 border border-gray-600">
                          <h3 className="text-lg font-semibold text-white mb-3">Detailed Prediction Analysis</h3>
                          
                          {/* Key Factors */}
                          {Array.isArray(prediction.keyFactors) && prediction.keyFactors.length > 0 && (
                            <div>
                              <h4 className="text-sm font-semibold text-blue-300 mb-2">Key Factors</h4>
                              <div className="space-y-2">
                                {prediction.keyFactors.map((factor: any, index) => {
                                  const title = factor?.factor || factor?.category || `Factor ${index + 1}`;
                                  const impact = factor?.impact || (Array.isArray(factor?.points) ? factor.points.join('; ') : factor?.description || '');
                                  return (
                                    <div key={index} className="bg-gray-800/50 rounded p-2 text-sm">
                                      <div className="font-medium text-white">{title}</div>
                                      {impact && <div className="text-gray-300">{impact}</div>}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Goal Line Prediction */}
                          {prediction.goalLine && (
                            <div>
                              <h4 className="text-sm font-semibold text-green-300 mb-2">Goal Line (O/U {prediction.goalLine.line})</h4>
                              <div className="bg-gray-800/50 rounded p-3 grid grid-cols-2 gap-3 text-center">
                                <div>
                                  <div className="text-xs text-gray-400">Over</div>
                                  <div className="text-green-300 font-bold">{prediction.goalLine.overProbability}%</div>
                                </div>
                                <div>
                                  <div className="text-xs text-gray-400">Under</div>
                                  <div className="text-green-300 font-bold">{prediction.goalLine.underProbability}%</div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* BTTS Prediction */}
                          {prediction.btts && (
                            <div>
                              <h4 className="text-sm font-semibold text-yellow-300 mb-2">Both Teams to Score</h4>
                              <div className="bg-gray-800/50 rounded p-3 grid grid-cols-2 gap-3 text-center">
                                <div>
                                  <div className="text-xs text-gray-400">Yes</div>
                                  <div className="text-yellow-300 font-bold">{prediction.btts.yesProbability}%</div>
                                </div>
                                <div>
                                  <div className="text-xs text-gray-400">No</div>
                                  <div className="text-yellow-300 font-bold">{prediction.btts.noProbability}%</div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* HT/FT Prediction */}
                          {prediction.htft && (
                            <div>
                              <h4 className="text-sm font-semibold text-purple-300 mb-2">Half Time / Full Time (Selected)</h4>
                              <div className="bg-gray-800/50 rounded p-3 text-xs grid grid-cols-3 gap-2">
                                <div>H/H: {prediction.htft.homeHome}%</div>
                                <div>H/D: {prediction.htft.homeDraw}%</div>
                                <div>H/A: {prediction.htft.homeAway}%</div>
                                <div>D/H: {prediction.htft.drawHome}%</div>
                                <div>D/D: {prediction.htft.drawDraw}%</div>
                                <div>D/A: {prediction.htft.drawAway}%</div>
                                <div>A/H: {prediction.htft.awayHome}%</div>
                                <div>A/D: {prediction.htft.awayDraw}%</div>
                                <div>A/A: {prediction.htft.awayAway}%</div>
                              </div>
                            </div>
                          )}

                          {/* Score Range */}
                          {prediction.scoreRange && (
                            <div>
                              <h4 className="text-sm font-semibold text-orange-300 mb-2">Score Range Probabilities</h4>
                              <div className="bg-gray-800/50 rounded p-3 grid grid-cols-3 gap-2 text-center text-xs">
                                <div>
                                  <div className="text-gray-400">0-1</div>
                                  <div className="text-orange-300 font-bold">{prediction.scoreRange.zeroToOne}%</div>
                                </div>
                                <div>
                                  <div className="text-gray-400">2-3</div>
                                  <div className="text-orange-300 font-bold">{prediction.scoreRange.twoToThree}%</div>
                                </div>
                                <div>
                                  <div className="text-gray-400">4+</div>
                                  <div className="text-orange-300 font-bold">{prediction.scoreRange.fourPlus}%</div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* First Goalscorer */}
                          {prediction.firstGoalscorer && (
                            <div>
                              <h4 className="text-sm font-semibold text-pink-300 mb-2">First Goalscorer Probabilities</h4>
                              <div className="bg-gray-800/50 rounded p-3 grid grid-cols-3 gap-2 text-center text-xs">
                                <div>
                                  <div className="text-gray-400">Home</div>
                                  <div className="text-pink-300 font-bold">{prediction.firstGoalscorer.homeTeam}%</div>
                                </div>
                                <div>
                                  <div className="text-gray-400">Away</div>
                                  <div className="text-pink-300 font-bold">{prediction.firstGoalscorer.awayTeam}%</div>
                                </div>
                                <div>
                                  <div className="text-gray-400">No Goal</div>
                                  <div className="text-pink-300 font-bold">{prediction.firstGoalscorer.noGoalscorer}%</div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Clean Sheet */}
                          {prediction.cleanSheet && (
                            <div>
                              <h4 className="text-sm font-semibold text-cyan-300 mb-2">Clean Sheet Probabilities</h4>
                              <div className="bg-gray-800/50 rounded p-3 grid grid-cols-2 gap-3 text-center text-xs">
                                <div>
                                  <div className="text-gray-400">Home CS</div>
                                  <div className="text-cyan-300 font-bold">{prediction.cleanSheet.homeTeam}%</div>
                                </div>
                                <div>
                                  <div className="text-gray-400">Away CS</div>
                                  <div className="text-cyan-300 font-bold">{prediction.cleanSheet.awayTeam}%</div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Corners */}
                          {prediction.corners && (
                            <div>
                              <h4 className="text-sm font-semibold text-indigo-300 mb-2">Corners (O/U 9.5)</h4>
                              <div className="bg-gray-800/50 rounded p-3 grid grid-cols-2 gap-3 text-center text-xs">
                                <div>
                                  <div className="text-gray-400">Over 9.5</div>
                                  <div className="text-indigo-300 font-bold">{prediction.corners.over}%</div>
                                </div>
                                <div>
                                  <div className="text-gray-400">Under 9.5</div>
                                  <div className="text-indigo-300 font-bold">{prediction.corners.under}%</div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Expected Goals */}
                          {prediction.expectedGoals && (
                            <div>
                              <h4 className="text-sm font-semibold text-emerald-300 mb-2">Expected Goals (xG)</h4>
                              <div className="bg-gray-800/50 rounded p-3 grid grid-cols-2 gap-4 text-center">
                                <div>
                                  <div className="text-xs text-gray-400">Home xG</div>
                                  <div className="text-emerald-300 font-bold">{prediction.expectedGoals.homeXg}</div>
                                </div>
                                <div>
                                  <div className="text-xs text-gray-400">Away xG</div>
                                  <div className="text-emerald-300 font-bold">{prediction.expectedGoals.awayXg}</div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Confidence Details */}
                          {prediction.confidencePercentage && (
                            <div>
                              <h4 className="text-sm font-semibold text-blue-300 mb-2">Confidence Analysis</h4>
                              <div className="bg-gray-800/50 rounded p-3">
                                <div className="flex justify-between items-center mb-2">
                                  <span className="text-white">Confidence Level</span>
                                  <span className="text-blue-300 font-bold">{prediction.confidencePercentage}%</span>
                                </div>
                                {prediction.confidenceReason && (
                                  <div className="text-xs text-gray-400">{prediction.confidenceReason}</div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Uncertainty Metrics */}
                          {prediction.uncertaintyMetrics && (
                            <div>
                              <h4 className="text-sm font-semibold text-red-300 mb-2">Uncertainty Analysis</h4>
                              <div className="bg-gray-800/50 rounded p-3 grid grid-cols-3 gap-4 text-center text-xs">
                                <div>
                                  <div className="text-gray-400">Variance</div>
                                  <div className="text-red-300 font-bold">{prediction.uncertaintyMetrics.predictionVariance}%</div>
                                </div>
                                <div>
                                  <div className="text-gray-400">Data Quality</div>
                                  <div className="text-red-300 font-bold">{prediction.uncertaintyMetrics.dataQuality}</div>
                                </div>
                                <div>
                                  <div className="text-gray-400">Agreement</div>
                                  <div className="text-red-300 font-bold">{prediction.uncertaintyMetrics.modelAgreement}%</div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-sm text-yellow-400">
                      Prediction not available. Use the Generate button to request one.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TodaysPredictions;

