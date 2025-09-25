import React, { useEffect, useState } from 'react';
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
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const [showAllPredictions, setShowAllPredictions] = useState(false);

  useEffect(() => {
    loadData();
    
    // Refresh data every 30 seconds
    const interval = setInterval(loadData, 30000);

    // Progressive updates: listen for prediction stored events
    const handler = () => {
      loadData();
    };
    window.addEventListener('fixturecast:prediction-stored' as any, handler as any);

    return () => {
      clearInterval(interval);
      window.removeEventListener('fixturecast:prediction-stored' as any, handler as any);
    };
  }, []);

  const DEBUG_UI = (import.meta as any)?.env?.VITE_DEBUG_UI === 'true';

  const loadData = () => {
    const accuracyStats = getLiveAccuracyStats();
    const todaysData = getTodaysPredictions();
    const serviceStatus = autoPredictionService.getStatus();
    
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
    setLastUpdate(Date.now());
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

  const visiblePredictions = showAllPredictions ? todaysPredictions : todaysPredictions.slice(0, 6);
  const remaining = Math.max(todaysPredictions.length - 6, 0);

  return (
    <div className={`bg-gray-800 rounded-xl p-4 border border-gray-700 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg sm:text-xl font-bold text-blue-400">🎯 Prediction Accuracy Tracker</h3>
        <div className="flex gap-2 flex-wrap">
          {!showAllPredictions && remaining > 0 && (
            <button
              onClick={() => setShowAllPredictions(true)}
              className="px-3 py-2 rounded-lg font-medium text-sm bg-gray-700 hover:bg-gray-600 text-gray-200"
              title={`Show remaining ${remaining} predictions as they generate`}
            >
              Show {remaining} more
            </button>
          )}
        </div>
      </div>

      {/* Predictions list (first 6 immediately, rest on demand) */}
      <div className="space-y-2">
        {visiblePredictions.map((p) => (
          <div key={p.matchId} className="bg-gray-900 border border-gray-700 rounded-lg p-3 text-sm text-gray-200">
            <div className="flex justify-between">
              <span>{p.homeTeam} vs {p.awayTeam}</span>
              <span className="text-xs text-gray-400">{new Date(p.matchDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <div className="mt-1 text-xs text-gray-400">
              {p.cloudStored ? '☁️ Synced' : '💾 Local'}{p.verified ? ' • ✅ Verified' : ''}
            </div>
          </div>
        ))}
        {visiblePredictions.length === 0 && (
          <div className="text-center text-gray-400 text-sm py-4">No predictions yet for today.</div>
        )}
      </div>

      {/* Stats */}
      {stats && (
        <div className="mt-4 text-xs text-gray-300">
          <div>Overall accuracy: {stats.overallAccuracy}%</div>
          <div>Last updated: {new Date(lastUpdate).toLocaleTimeString()}</div>
        </div>
      )}
    </div>
  );
};

export default EnhancedAccuracyTracker;
