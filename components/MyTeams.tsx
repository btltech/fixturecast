import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import TeamLogo from './TeamLogo';
import AlertCard from './AlertCard';
import PerformanceTracker from './PerformanceTracker';
import { useAppContext } from '../contexts/AppContext';
import { AlertType, View, Match, Prediction, League } from '../types';
import { onDemandPredictionService } from '../services/onDemandPredictionService';
import { getTeamInfo, searchTeamsByName, inferCompetitionForTeam } from '../services/footballApiService';

interface MyTeamsProps {
  onSelectTeam?: (teamName: string) => void;
  onNavigate?: (view: View) => void;
}

const MyTeams: React.FC<MyTeamsProps> = ({ onSelectTeam, onNavigate }) => {
  const navigate = useNavigate();
    const { 
        teams, 
        favoriteTeams, 
        toggleFavoriteTeam, 
        alerts, 
        addAlert, 
        pastPredictions, 
        addToast 
    } = useAppContext();
    const [searchTerm, setSearchTerm] = useState('');
    const [showAllTeams, setShowAllTeams] = useState(false);
    
    const allTeamNames = useMemo(() => Object.keys(teams || {}).sort(), [teams]);

    // Show only favorited teams by default, or all teams when explicitly requested
    const teamsToDisplay = useMemo(() => {
        const baseTeams = showAllTeams ? allTeamNames : favoriteTeams;
        if (!searchTerm) {
            return baseTeams;
        }
        return baseTeams.filter(team => team.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [allTeamNames, favoriteTeams, searchTerm, showAllTeams]);

    const handleSimulateClick = () => {
        if (favoriteTeams.length > 0) {
            const randomTeam = favoriteTeams[Math.floor(Math.random() * favoriteTeams.length)];
            addAlert({
                type: AlertType.InjuryNews,
                teamName: randomTeam,
                message: `Key player for ${randomTeam} has sustained an injury during training. Prediction models are being updated.`,
            });
        } else {
            addToast("Please favorite a team to simulate an alert.", "warning");
        }
    };

    // On-demand prediction UI state
    const [homeTeam, setHomeTeam] = useState<string>('');
    const [awayTeam, setAwayTeam] = useState<string>('');
    const [leagueIdInput, setLeagueIdInput] = useState<string>('');
    const [seasonInput, setSeasonInput] = useState<string>('');
    const [isGenerating, setIsGenerating] = useState<boolean>(false);
    const [prediction, setPrediction] = useState<Prediction | null>(null);
    const [predictError, setPredictError] = useState<string | null>(null);

    // Autocomplete + inference state
    const [homeSuggestions, setHomeSuggestions] = useState<Array<{ teamId: number; name: string }>>([]);
    const [awaySuggestions, setAwaySuggestions] = useState<Array<{ teamId: number; name: string }>>([]);
    const [homeTeamId, setHomeTeamId] = useState<number | null>(null);
    const [awayTeamId, setAwayTeamId] = useState<number | null>(null);
    const [inferredLeague, setInferredLeague] = useState<{ leagueId: number; season: number } | null>(null);

    const swapTeams = () => {
        setPrediction(null);
        setPredictError(null);
        const h = homeTeam;
        const a = awayTeam;
        setHomeTeam(a);
        setAwayTeam(h);
    };

    const coerceLeague = (maybe: any): League => {
        const values = Object.values(League) as string[];
        if (maybe && values.includes(String(maybe))) {
            return maybe as League;
        }
        return League.PremierLeague;
    };

    const handleGeneratePrediction = async () => {
        setPrediction(null);
        setPredictError(null);
        if (!homeTeam || !awayTeam) {
            setPredictError('Select both teams.');
            return;
        }
        if (homeTeam === awayTeam) {
            setPredictError('Teams must be different.');
            return;
        }
        try {
            setIsGenerating(true);

            // Resolve team details/IDs (prefer context, fallback to API)
            const homeCtx = teams[homeTeam];
            const awayCtx = teams[awayTeam];

            const [homeApi, awayApi] = await Promise.all([
                homeCtx?.id ? Promise.resolve(homeCtx) : getTeamInfo(homeTeam),
                awayCtx?.id ? Promise.resolve(awayCtx) : getTeamInfo(awayTeam)
            ]);

            const homeId = Number(homeTeamId || homeApi?.id || homeCtx?.id || 0);
            const awayId = Number(awayTeamId || awayApi?.id || awayCtx?.id || 0);

            // Derive league preference from home team if available
            const league: League = coerceLeague(homeApi?.league || homeCtx?.league || awayApi?.league || awayCtx?.league || League.PremierLeague);

            const match: Match = {
                id: `custom-${Date.now()}`,
                homeTeam: homeTeam,
                awayTeam: awayTeam,
                homeTeamId: homeId,
                awayTeamId: awayId,
                league,
                date: new Date().toISOString(),
                venue: undefined,
                status: 'NS',
                homeScore: 0,
                awayScore: 0,
            };

            // Prefer auto-inferred competition identifiers
            let leagueIdToUse: number | undefined;
            let seasonToUse: number | undefined;
            if (inferredLeague?.leagueId && inferredLeague?.season) {
                leagueIdToUse = inferredLeague.leagueId;
                seasonToUse = inferredLeague.season;
            } else if (homeId) {
                const inf = await inferCompetitionForTeam(homeId);
                if (inf?.leagueId) {
                    leagueIdToUse = inf.leagueId;
                    seasonToUse = inf.season;
                }
            }
            if (leagueIdToUse) (match as any).leagueId = leagueIdToUse;
            if (seasonToUse) (match as any).season = seasonToUse;

            const generated = await onDemandPredictionService.generateMatchPrediction(match);
            setPrediction(generated);
        } catch (e: any) {
            setPredictError(e?.message || 'Failed to generate prediction.');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="space-y-8 sm:space-y-12">
            {/* Header with Back Button */}
            <div className="flex items-center justify-between mb-6">
                {onNavigate && (
                    <button
                        onClick={() => navigate('/')}
                        className="flex items-center text-blue-400 hover:text-blue-300 transition-colors bg-gray-800 hover:bg-gray-700 px-3 py-2 rounded-lg font-medium"
                    >
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                        <span className="text-sm sm:text-base">Back to Home</span>
                    </button>
                )}
            </div>

            <section>
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                        {showAllTeams ? 'All Teams' : 'My Favorite Teams'}
                    </h2>
                    {favoriteTeams.length === 0 && !showAllTeams && (
                        <button
                            onClick={() => setShowAllTeams(true)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors"
                        >
                            Browse Teams
                        </button>
                    )}
                    {showAllTeams && (
                        <button
                            onClick={() => setShowAllTeams(false)}
                            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors"
                        >
                            Show Favorites Only
                        </button>
                    )}
                </div>

                {favoriteTeams.length === 0 && !showAllTeams ? (
                    <div className="text-center py-16 bg-gray-800 rounded-xl border border-gray-700">
                        <div className="text-6xl mb-4">⭐</div>
                        <h3 className="text-xl font-bold text-white mb-2">No Favorite Teams Yet</h3>
                        <p className="text-gray-400 mb-6">Add teams to your favorites to see them here and receive personalized alerts.</p>
                        <button
                            onClick={() => setShowAllTeams(true)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                        >
                            Browse All Teams
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="mb-6">
                            <input
                                type="text"
                                placeholder={`Search ${showAllTeams ? 'all teams' : 'your favorite teams'}...`}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {teamsToDisplay.map(teamName => {
                                const isFavorite = favoriteTeams.includes(teamName);
                                return (
                                    <div 
                                        key={teamName}
                                        className={`flex items-center space-x-3 p-3 rounded-lg transition-colors duration-200 ${
                                            isFavorite ? 'bg-blue-900/50 border-blue-500' : 'bg-gray-800 border-gray-700 hover:bg-gray-700'
                                        } border`}
                                    >
                                        <button onClick={() => onSelectTeam && onSelectTeam(teamName)} className="flex items-center space-x-3 flex-grow text-left">
                                          <TeamLogo teamName={teamName} size="small" showJerseyColors={true} clickable={true} />
                                          <span className="font-medium text-sm truncate">{teamName}</span>
                                        </button>
                                        <button onClick={() => toggleFavoriteTeam(teamName)} title={isFavorite ? "Remove from favorites" : "Add to favorites"} className="text-2xl flex-shrink-0">
                                            <span className={isFavorite ? 'text-yellow-400' : 'text-gray-600'}>★</span>
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                        {teamsToDisplay.length === 0 && searchTerm && (
                            <div className="text-center py-8 text-gray-400">
                                <p>No teams found for "{searchTerm}".</p>
                            </div>
                        )}
                    </>
                )}
            </section>
            
            <section>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-3xl font-bold tracking-tight text-white">Notifications</h2>
                    <button 
                        onClick={handleSimulateClick}
                        className="bg-yellow-600 hover:bg-yellow-700 text-white font-semibold py-2 px-4 rounded-lg text-sm transition-transform transform hover:scale-105"
                        title="Generates a sample injury alert for one of your favorite teams"
                    >
                        Simulate Injury Alert
                    </button>
                </div>
                 <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 space-y-4 max-h-[500px] overflow-y-auto">
                    {(alerts || []).length > 0 ? (
                        (alerts || []).map(alert => <AlertCard key={alert.id} alert={alert} />)
                    ) : (
                        <div className="text-center text-gray-400 py-8">
                            <p>You have no notifications.</p>
                            <p className="text-sm">Favorite a team to start receiving alerts.</p>
                        </div>
                    )}
                </div>
            </section>

            {/* On-Demand Prediction Panel */}
            <section>
                <h2 className="text-3xl font-bold tracking-tight text-white mb-4">On-Demand Prediction</h2>
                <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-gray-400 mb-2">Team A (Home)</label>
                            <input
                                list="home-team-options"
                                value={homeTeam}
                                onChange={async (e) => {
                                    const value = e.target.value;
                                    setHomeTeam(value);
                                    setPrediction(null);
                                    setPredictError(null);
                                    setHomeTeamId(null);
                                    setInferredLeague(null);
                                    if (value && value.length >= 2) {
                                        const results = await searchTeamsByName(value);
                                        setHomeSuggestions(results.map(r => ({ teamId: r.teamId, name: r.name })));
                                    } else {
                                        setHomeSuggestions([]);
                                    }
                                }}
                                placeholder="Any club or national team"
                                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                aria-label="Select Team A (Home)"
                                title="Select Team A (Home)"
                            />
                            {homeSuggestions.length > 0 && (
                                <ul className="mt-2 max-h-48 overflow-auto bg-gray-900 border border-gray-700 rounded-md">
                                    {homeSuggestions.map(s => (
                                        <li key={s.teamId}>
                                            <button
                                                className="w-full text-left px-3 py-2 hover:bg-gray-800 text-sm text-white"
                                                onClick={async () => {
                                                    setHomeTeam(s.name);
                                                    setHomeTeamId(s.teamId);
                                                    setHomeSuggestions([]);
                                                    const inf = await inferCompetitionForTeam(s.teamId);
                                                    if (inf) setInferredLeague({ leagueId: inf.leagueId, season: inf.season });
                                                }}
                                            >{s.name}</button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-2">Team B (Away)</label>
                            <input
                                list="away-team-options"
                                value={awayTeam}
                                onChange={async (e) => {
                                    const value = e.target.value;
                                    setAwayTeam(value);
                                    setPrediction(null);
                                    setPredictError(null);
                                    setAwayTeamId(null);
                                    if (value && value.length >= 2) {
                                        const results = await searchTeamsByName(value);
                                        setAwaySuggestions(results.map(r => ({ teamId: r.teamId, name: r.name })));
                                    } else {
                                        setAwaySuggestions([]);
                                    }
                                }}
                                placeholder="Any club or national team"
                                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                aria-label="Select Team B (Away)"
                                title="Select Team B (Away)"
                            />
                            {awaySuggestions.length > 0 && (
                                <ul className="mt-2 max-h-48 overflow-auto bg-gray-900 border border-gray-700 rounded-md">
                                    {awaySuggestions.map(s => (
                                        <li key={s.teamId}>
                                            <button
                                                className="w-full text-left px-3 py-2 hover:bg-gray-800 text-sm text-white"
                                                onClick={() => {
                                                    setAwayTeam(s.name);
                                                    setAwayTeamId(s.teamId);
                                                    setAwaySuggestions([]);
                                                }}
                                            >{s.name}</button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                        {/* Manual League/Season inputs removed in favor of inference */}
                    </div>
                    <datalist id="home-team-options">
                        {homeSuggestions.map(s => (
                            <option key={s.teamId} value={s.name} />
                        ))}
                    </datalist>
                    <datalist id="away-team-options">
                        {awaySuggestions.map(s => (
                            <option key={s.teamId} value={s.name} />
                        ))}
                    </datalist>
                    <div className="flex items-center gap-3 mt-4">
                        <button
                            onClick={swapTeams}
                            className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm"
                            disabled={!homeTeam && !awayTeam}
                        >
                            Swap Teams
                        </button>
                        <button
                            onClick={handleGeneratePrediction}
                            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-900 text-white px-4 py-2 rounded-lg font-medium text-sm"
                            disabled={isGenerating || !homeTeam || !awayTeam || homeTeam === awayTeam}
                        >
                            {isGenerating ? 'Generating…' : 'Generate Prediction'}
                        </button>
                        {predictError && (
                            <span className="text-red-400 text-sm">{predictError}</span>
                        )}
                    </div>

                    {prediction && (
                        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
                                <div className="text-gray-400 text-xs mb-1">Outcome Probabilities</div>
                                <div className="text-white text-sm">Home: {prediction.homeWinProbability}%</div>
                                <div className="text-white text-sm">Draw: {prediction.drawProbability}%</div>
                                <div className="text-white text-sm">Away: {prediction.awayWinProbability}%</div>
                                <div className="text-white text-sm mt-2">Predicted Scoreline: {prediction.predictedScoreline}</div>
                                <div className="text-white text-sm mt-2">Confidence: {prediction.confidence}</div>
                            </div>
                            <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
                                <div className="text-gray-400 text-xs mb-1">Markets</div>
                                {prediction.goalLine && (
                                    <div className="text-white text-sm">Over/Under {prediction.goalLine.line}: {prediction.goalLine.overProbability}% / {prediction.goalLine.underProbability}%</div>
                                )}
                                {prediction.btts && (
                                    <div className="text-white text-sm mt-2">BTTS: Yes {prediction.btts.yesProbability}% / No {prediction.btts.noProbability}%</div>
                                )}
                                {prediction.htft && (
                                    <div className="text-white text-xs mt-2">HT/FT: HH {prediction.htft.homeHome}%, HD {prediction.htft.homeDraw}%, HA {prediction.htft.homeAway}%, DH {prediction.htft.drawHome}%, DD {prediction.htft.drawDraw}%, DA {prediction.htft.drawAway}%, AH {prediction.htft.awayHome}%, AD {prediction.htft.awayDraw}%, AA {prediction.htft.awayAway}%</div>
                                )}
                            </div>
                            <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
                                <div className="text-gray-400 text-xs mb-1">Advanced</div>
                                {prediction.expectedGoals && (
                                    <div className="text-white text-sm">xG: Home {prediction.expectedGoals.homeXg.toFixed(2)} / Away {prediction.expectedGoals.awayXg.toFixed(2)}</div>
                                )}
                                {prediction.uncertaintyMetrics && (
                                    <div className="text-white text-sm mt-2">Uncertainty: Var {prediction.uncertaintyMetrics.predictionVariance} / Agreement {prediction.uncertaintyMetrics.modelAgreement}%</div>
                                )}
                                {prediction.modelWeights && (
                                    <div className="text-white text-xs mt-2">Ensemble Weights: XGB {prediction.modelWeights.xgboost}%, Poisson {prediction.modelWeights.poisson}%, NN {prediction.modelWeights.neuralNet}%, Bayesian {prediction.modelWeights.bayesian}%</div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </section>

            <section>
                <h2 className="text-3xl font-bold tracking-tight text-white mb-6">Prediction Performance</h2>
                <PerformanceTracker predictions={pastPredictions} />
            </section>
        </div>
    );
};

export default MyTeams;
