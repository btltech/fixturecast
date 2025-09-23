import React from 'react';
import { useAppContext } from '../contexts/AppContext';
import TeamLogo from './TeamLogo';
import LoadingSpinner from './LoadingSpinner';
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

  const getLeagueDisplay = (matchLeague?: string) => {
    if (matchLeague) return matchLeague;
    const homeLeague = teams[match.homeTeam]?.league;
    const awayLeague = teams[match.awayTeam]?.league;
    return homeLeague || awayLeague || 'League unknown';
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white">Today&apos;s Predictions</h1>
            <p className="text-gray-400 mt-1">Matches scheduled for today with available predictions. Generate missing ones on demand.</p>
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
                      <div className="flex items-center justify-between text-sm text-gray-400 uppercase tracking-wide">
                        <span>Predicted Outcome</span>
                        {prediction.predictedScoreline && (
                          <span className="text-blue-300">Scoreline: {prediction.predictedScoreline}</span>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-3 text-white text-sm">
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
                        <div className="text-xs text-gray-400">Confidence: {prediction.confidence}</div>
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

