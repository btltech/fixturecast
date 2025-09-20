import React, { useState, useEffect } from 'react';
import { AccuracyStats } from '../types';
import { getLiveAccuracyStats, getTodaysPredictions } from '../services/accuracyService';
import { autoPredictionService } from '../services/autoPredictionService';
import { getTeamData } from '../services/teamDataService';
import PlaceholderChart from './PlaceholderChart';

interface EnhancedAccuracyTrackerProps {
  className?: string;
  onSelectPrediction?: (prediction: any) => void;
}

const EnhancedAccuracyTracker: React.FC<EnhancedAccuracyTrackerProps> = ({ className = '', onSelectPrediction }) => {
  const [stats, setStats] = useState<AccuracyStats | null>(null);
  const [todaysPredictions, setTodaysPredictions] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const [showAllPredictions, setShowAllPredictions] = useState(false);

  useEffect(() => {
    loadData();
    
    // Refresh data every 30 seconds
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const DEBUG_UI = (import.meta as any)?.env?.VITE_DEBUG_UI === 'true';

  const loadData = () => {
    const accuracyStats = getLiveAccuracyStats();
    const todaysData = getTodaysPredictions();
    const serviceStatus = autoPredictionService.getStatus();
    
    // Debug logging
    if (DEBUG_UI) {
      console.log('🔍 Loading prediction data:', {
        todaysData,
        todaysDataLength: todaysData.length,
        currentDate: new Date().toISOString().split('T')[0],
        allDailyData: JSON.parse(localStorage.getItem('fixturecast_daily_predictions') || '{}')
      });
    }
    
    setStats(accuracyStats);
    setTodaysPredictions(todaysData);
    setIsGenerating(serviceStatus.isGenerating);
    setLastUpdate(Date.now());
  };

  const handleGeneratePredictions = async () => {
    setIsGenerating(true);
    try {
      const result = await autoPredictionService.generateTodaysPredictions();
      console.log('Prediction generation result:', result);
      
      // Refresh data after generation
      setTimeout(loadData, 2000);
      
      // Show user feedback
      if (result.total > 0) {
        alert(`✅ Success! Generated ${result.success} predictions for ${result.total} matches!\n\nCheck the browser console (F12) for detailed logs.`);
      } else {
        alert(`ℹ️ No matches found to generate predictions for.\n\nThis could be because:\n• No matches scheduled for today\n• All major leagues are on break\n• Generation is on cooldown (30min limit)\n\nTry again later or check console (F12) for details.`);
      }
    } catch (error) {
      console.error('Failed to generate predictions:', error);
      alert('Failed to generate predictions. Please try again later.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDebugMatches = async () => {
    console.log('🔍 Running match availability debug...');
    try {
      const summary = await autoPredictionService.debugMatchAvailability();
      console.table(summary.map(s => ({ league: s.league, todays: s.todays.length, upcomingSample: s.upcomingSample.length })));
      alert('🔍 Debug complete! Open console for a summary table of available matches.');
    } catch (error) {
      console.error('Debug failed:', error);
      alert('Debug failed. Check console for details.');
    }
  };

  const handleDebugStorage = () => {
    console.log('🔍 Storage Debug:');
    console.log('📅 Current date:', new Date().toISOString().split('T')[0]);
    console.log('📊 Daily predictions:', localStorage.getItem('fixturecast_daily_predictions'));
    console.log('🎯 Accuracy data:', localStorage.getItem('fixturecast_accuracy_data'));
    console.log('📈 Parsed daily predictions:', JSON.parse(localStorage.getItem('fixturecast_daily_predictions') || '{}'));
    
    const todaysData = getTodaysPredictions();
    console.log('📋 Today\'s predictions from function:', todaysData);
    
    alert('🔍 Storage debug complete! Check the browser console (F12) to see all stored data.');
  };

  const handleClearPredictions = () => {
    if (!confirm('⚠️ This will clear all stored predictions and refresh the app. Continue?')) return;
    try {
      localStorage.removeItem('fixturecast_daily_predictions');
      localStorage.removeItem('fixturecast_last_prediction_refresh');
      console.log('🗑️ Cleared old predictions from storage');
      // Immediate hard refresh to ensure clean state
      window.location.reload();
    } catch (error) {
      console.error('Failed to clear predictions:', error);
      alert('❌ Failed to clear predictions. Check console for details.');
    }
  };

  const getTeamLogo = (teamName: string): string => {
    const teamData = getTeamData(teamName);
    return teamData?.logo || '/team-logos/default.png';
  };

  const getAccuracyColor = (percentage: number) => {
    if (percentage >= 70) return 'text-green-400';
    if (percentage >= 50) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getAccuracyBarColor = (percentage: number) => {
    if (percentage >= 70) return 'bg-green-500';
    if (percentage >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getTrustLevel = (accuracy: number, totalPredictions: number) => {
    if (totalPredictions < 10) return { level: 'Building Trust', color: 'text-blue-400', icon: '🔨' };
    if (accuracy >= 70) return { level: 'Highly Reliable', color: 'text-green-400', icon: '🏆' };
    if (accuracy >= 60) return { level: 'Very Reliable', color: 'text-green-400', icon: '✅' };
    if (accuracy >= 50) return { level: 'Reliable', color: 'text-yellow-400', icon: '👍' };
    return { level: 'Improving', color: 'text-orange-400', icon: '📈' };
  };

  if (!stats || stats.totalPredictions === 0) {
    return (
      <div className={`bg-gray-800 rounded-xl p-4 sm:p-6 ${className}`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-2">
          <h3 className="text-lg sm:text-xl font-bold text-blue-400">🎯 Prediction Accuracy Tracker</h3>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => {
                if ((window as any).navigateTo) {
                  (window as any).navigateTo('fixtures', { todayOnly: true });
                } else {
                  window.location.hash = '#fixtures';
                }
              }}
              className="px-3 py-2 rounded-lg font-medium text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
              title="View all today's matches"
            >
              📅 Matches
            </button>
            {DEBUG_UI && (
              <button
                onClick={handleDebugStorage}
                className="px-3 py-2 rounded-lg font-medium text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
                title="Log stored predictions and accuracy to console"
              >
                💾 Storage
              </button>
            )}
            <button
              onClick={handleClearPredictions}
              className="px-3 py-2 rounded-lg font-medium text-xs bg-red-700 hover:bg-red-600 text-red-100 transition-colors"
              title="Clear current predictions and refresh the app"
            >
              🗑️ Clear & Refresh
            </button>
            <button
              onClick={handleGeneratePredictions}
              disabled={isGenerating}
              className={`px-3 py-2 rounded-lg font-medium text-sm transition-colors ${
                isGenerating 
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {isGenerating ? '⏳ Generating...' : '🤖 Generate Today\'s Predictions'}
            </button>
          </div>
        </div>

        <div className="text-center py-8 bg-gray-600/30 rounded-lg border border-gray-500/30">
          <div className="text-4xl mb-4">🎯</div>
          <h4 className="text-lg font-bold text-white mb-2">Building Track Record</h4>
          <p className="text-gray-300 mb-4">
            Every prediction is tracked and verified against actual results to ensure complete transparency.
          </p>
          <p className="text-sm text-gray-400 mb-4">
            Today's predictions: <span className="font-semibold text-blue-400">{todaysPredictions.length}</span> generated
          </p>
          
          {/* Show today's predictions if any */}
          {todaysPredictions.length > 0 && (
            <div className="mt-4 p-4 bg-gray-700/40 rounded-lg border border-gray-600/30">
              <div className="flex items-center justify-between mb-2">
                <h5 className="text-sm font-semibold text-blue-400">Today's Generated Predictions:</h5>
                {todaysPredictions.length > 3 && (
                  <button
                    onClick={() => setShowAllPredictions(!showAllPredictions)}
                    className="text-xs text-blue-400 hover:text-blue-300 transition-colors font-medium"
                  >
                    {showAllPredictions ? 'Show Less' : 'Show More'}
                  </button>
                )}
              </div>
              <div className="space-y-2 text-xs">
                {(showAllPredictions ? todaysPredictions : todaysPredictions.slice(0, 3)).map((pred, index) => (
                  <div 
                    key={index} 
                    className="flex items-center justify-between p-2 bg-gray-700/50 rounded border border-gray-600/30 hover:border-blue-500/40 hover:bg-gray-600/50 transition-all duration-200 cursor-pointer group"
                    onClick={() => onSelectPrediction?.(pred)}
                  >
                    <div className="flex items-center space-x-2">
                      <img 
                        src={getTeamLogo(pred.homeTeam)} 
                        alt={`${pred.homeTeam} logo`}
                        className="w-4 h-4 rounded-full object-cover border border-gray-500/30"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = '/team-logos/default.png';
                        }}
                      />
                      <span className="text-gray-200">{pred.homeTeam}</span>
                      <span className="text-gray-400">vs</span>
                      <span className="text-gray-200">{pred.awayTeam}</span>
                      <img 
                        src={getTeamLogo(pred.awayTeam)} 
                        alt={`${pred.awayTeam} logo`}
                        className="w-4 h-4 rounded-full object-cover border border-gray-500/30"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = '/team-logos/default.png';
                        }}
                      />
                    </div>
                    <div className="px-2 py-1 bg-blue-600/20 border border-blue-500/30 rounded">
                      <span className="font-bold text-blue-300 group-hover:text-blue-200 transition-colors">
                        {pred.prediction?.predictedScoreline || 'N/A'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  const trustLevel = getTrustLevel(stats.overallAccuracy, stats.totalPredictions);

  return (
    <div className={`bg-gray-700/50 rounded-xl p-4 sm:p-6 border border-gray-600/30 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div>
          <h3 className="text-lg sm:text-xl font-bold text-blue-400">🎯 Prediction Accuracy Tracker</h3>
          <div className={`flex items-center space-x-2 mt-1 ${trustLevel.color}`}>
            <span className="text-lg">{trustLevel.icon}</span>
            <span className="font-medium">{trustLevel.level}</span>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => {
              if ((window as any).navigateTo) {
                (window as any).navigateTo('fixtures', { todayOnly: true });
              } else {
                window.location.hash = '#fixtures';
              }
            }}
            className="px-3 py-2 rounded-lg font-medium text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
            title="View all today's matches"
          >
            📅 Matches
          </button>
          {DEBUG_UI && (
            <button
              onClick={handleDebugStorage}
              className="px-3 py-2 rounded-lg font-medium text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
              title="Log stored predictions and accuracy to console"
            >
              💾 Storage
            </button>
          )}
          <button
            onClick={handleClearPredictions}
            className="px-3 py-2 rounded-lg font-medium text-xs bg-red-700 hover:bg-red-600 text-red-100 transition-colors"
            title="Clear current predictions and refresh the app"
          >
            🗑️ Clear & Refresh
          </button>
          <button
            onClick={handleGeneratePredictions}
            disabled={isGenerating}
            className={`px-3 py-2 rounded-lg font-medium text-sm transition-colors ${
              isGenerating 
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {isGenerating ? '⏳ Generating...' : '🤖 Generate Today\'s Predictions'}
          </button>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Overall Accuracy */}
        <div className="bg-gray-900 rounded-lg p-4 text-center">
          <div className={`text-2xl sm:text-3xl font-bold ${getAccuracyColor(stats.overallAccuracy)}`}>
            {stats.overallAccuracy}%
          </div>
          <div className="text-sm text-gray-400">Overall Accuracy</div>
          <div className="text-xs text-gray-500 mt-1">
            {stats.correctOutcomes}/{stats.totalPredictions} correct
          </div>
        </div>

        {/* Recent Form */}
        <div className="bg-gray-900 rounded-lg p-4 text-center">
          <div className={`text-2xl sm:text-3xl font-bold ${getAccuracyColor(stats.recentAccuracy.last10)}`}>
            {stats.recentAccuracy.last10}%
          </div>
          <div className="text-sm text-gray-400">Last 10 Games</div>
          <div className="text-xs text-gray-500 mt-1">Recent form</div>
        </div>

        {/* Today's Predictions */}
        <div className="bg-gray-900 rounded-lg p-4 text-center">
          <div className="text-2xl sm:text-3xl font-bold text-blue-400">
            {todaysPredictions.length}
          </div>
          <div className="text-sm text-gray-400">Today's Predictions</div>
          <div className="text-xs text-gray-500 mt-1">Generated</div>
        </div>

        {/* Total Predictions */}
        <div className="bg-gray-900 rounded-lg p-4 text-center">
          <div className="text-2xl sm:text-3xl font-bold text-gray-300">
            {stats.totalPredictions}
          </div>
          <div className="text-sm text-gray-400">Total Tracked</div>
          <div className="text-xs text-gray-500 mt-1">All time</div>
        </div>
      </div>

      {/* Detailed Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Accuracy Breakdown */}
        <div className="bg-gray-900 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-300 mb-3">Prediction Type Accuracy</h4>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Match Outcome</span>
              <span className={`text-sm font-medium ${getAccuracyColor(Math.round((stats.correctOutcomes / stats.totalPredictions) * 100))}`}>
                {Math.round((stats.correctOutcomes / stats.totalPredictions) * 100)}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Exact Score</span>
              <span className={`text-sm font-medium ${getAccuracyColor(Math.round((stats.correctScorelines / stats.totalPredictions) * 100))}`}>
                {Math.round((stats.correctScorelines / stats.totalPredictions) * 100)}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Over/Under Goals</span>
              <span className={`text-sm font-medium ${getAccuracyColor(Math.round((stats.correctGoalLine / stats.totalPredictions) * 100))}`}>
                {Math.round((stats.correctGoalLine / stats.totalPredictions) * 100)}%
              </span>
            </div>
          </div>
        </div>

        {/* Trend Analysis */}
        <div className="bg-gray-900 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-300 mb-3">Accuracy Trends</h4>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Last 10 matches</span>
              <span className={`text-sm font-medium ${getAccuracyColor(stats.recentAccuracy.last10)}`}>
                {stats.recentAccuracy.last10}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Last 20 matches</span>
              <span className={`text-sm font-medium ${getAccuracyColor(stats.recentAccuracy.last20)}`}>
                {stats.recentAccuracy.last20}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Last 50 matches</span>
              <span className={`text-sm font-medium ${getAccuracyColor(stats.recentAccuracy.last50)}`}>
                {stats.recentAccuracy.last50}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Today's Predictions Detail */}
      {todaysPredictions.length > 0 && (
        <div className="bg-gray-600/30 rounded-lg p-4 mb-4 border border-gray-500/20">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-blue-400">Today's Generated Predictions ({todaysPredictions.length})</h4>
            {todaysPredictions.length > 3 && (
              <button
                onClick={() => setShowAllPredictions(!showAllPredictions)}
                className="text-xs text-blue-400 hover:text-blue-300 transition-colors font-medium"
              >
                {showAllPredictions ? 'Show Less' : 'Show More'}
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(showAllPredictions ? todaysPredictions : todaysPredictions.slice(0, 3)).map((pred, index) => (
              <div 
                key={index} 
                className="bg-gray-700/50 rounded-lg p-3 border border-gray-600/30 hover:border-blue-500/40 hover:bg-gray-600/50 transition-all duration-200 cursor-pointer group"
                onClick={() => onSelectPrediction?.(pred)}
              >
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs text-blue-300 font-medium">{pred.league}</span>
                  <span className="text-xs text-gray-400">
                    {new Date(pred.predictionTime).toLocaleTimeString()}
                  </span>
                </div>
                
                {/* Team matchup with logos */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2 flex-1">
                    <img 
                      src={getTeamLogo(pred.homeTeam)} 
                      alt={`${pred.homeTeam} logo`}
                      className="w-6 h-6 rounded-full object-cover border border-gray-500/30"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = '/team-logos/default.png';
                      }}
                    />
                    <span className="text-sm font-medium text-white truncate">{pred.homeTeam}</span>
                  </div>
                  
                  <div className="px-3 py-1 bg-blue-600/20 border border-blue-500/30 rounded-lg">
                    <span className="text-lg font-bold text-blue-300 group-hover:text-blue-200 transition-colors">
                      {pred.prediction?.predictedScoreline || 'N/A'}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-2 flex-1 justify-end">
                    <span className="text-sm font-medium text-white truncate text-right">{pred.awayTeam}</span>
                    <img 
                      src={getTeamLogo(pred.awayTeam)} 
                      alt={`${pred.awayTeam} logo`}
                      className="w-6 h-6 rounded-full object-cover border border-gray-500/30"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = '/team-logos/default.png';
                      }}
                    />
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="text-xs text-gray-400">
                    {new Date(pred.matchDate).toLocaleDateString()}
                  </div>
                  {pred.prediction?.confidence && (
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      pred.prediction.confidence === 'High' ? 'bg-green-600/80 text-green-100' :
                      pred.prediction.confidence === 'Medium' ? 'bg-yellow-600/80 text-yellow-100' :
                      'bg-red-600/80 text-red-100'
                    }`}>
                      {pred.prediction.confidence}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trust Indicator */}
      <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-semibold text-blue-400">Transparency Promise</h4>
            <p className="text-xs text-gray-400 mt-1">
              Every prediction is automatically tracked and verified against actual match results. 
              No cherry-picking, no fake stats - just honest, verifiable accuracy.
            </p>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500">Last updated</div>
            <div className="text-xs text-blue-400">
              {new Date(lastUpdate).toLocaleTimeString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedAccuracyTracker;
