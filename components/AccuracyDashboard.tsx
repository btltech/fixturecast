/**
 * Accuracy Dashboard Component
 * Displays prediction accuracy metrics and validation results
 */

import React, { useState } from 'react';
import { useAppContext } from '../contexts/AppContext';
import LoadingSpinner from './LoadingSpinner';

interface AccuracyDashboardProps {
  className?: string;
}

export const AccuracyDashboard: React.FC<AccuracyDashboardProps> = ({ className = '' }) => {
  const { accuracyStats } = useAppContext();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authInput, setAuthInput] = useState('');
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);

  // Admin authentication key (in production, this should be more secure)
  const ADMIN_KEY = 'fixturecast-admin-2024';

  // Safe access to accuracyStats with fallbacks
  const safeAccuracyStats = {
    totalPredictions: accuracyStats?.totalPredictions || 0,
    correctOutcomes: accuracyStats?.correctOutcomes || 0,
    correctScorelines: accuracyStats?.correctScorelines || 0,
    correctBtts: accuracyStats?.correctBtts || 0,
    correctGoalLine: accuracyStats?.correctGoalLine || 0,
    correctHtft: accuracyStats?.correctHtft || 0,
    correctCleanSheet: accuracyStats?.correctCleanSheet || 0,
    correctCorners: accuracyStats?.correctCorners || 0,
    overallAccuracy: accuracyStats?.overallAccuracy || 0,
    recentAccuracy: {
      last10: accuracyStats?.recentAccuracy?.last10 || 0,
      last20: accuracyStats?.recentAccuracy?.last20 || 0,
      last50: accuracyStats?.recentAccuracy?.last50 || 0
    }
  };

  // Authentication handler
  const handleAuth = () => {
    if (authInput === ADMIN_KEY) {
      setIsAuthenticated(true);
      setShowAuthPrompt(false);
      setAuthInput('');
      setError(null);
    } else {
      setError('❌ Invalid authorization key');
      setAuthInput('');
    }
  };

  // Check if user wants to force check
  const handleForceCheckRequest = () => {
    if (!isAuthenticated) {
      setShowAuthPrompt(true);
      setError(null);
    } else {
      handleForceCheck();
    }
  };

  // Force check results (SECURED API call)
  const handleForceCheck = async () => {
    if (!isAuthenticated) {
      setError('❌ Unauthorized: Admin access required');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      console.log('🔄 Authorized manual force check triggered...');
      
      // Call the actual automation API with admin context
      const response = await fetch('/api/update-results', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer fixturecast-lambda-secure-2024-key',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          trigger: 'manual_force_check_authorized',
          timestamp: new Date().toISOString(),
          source: 'accuracy_dashboard',
          admin_authorized: true,
          auth_level: 'admin'
        })
      });
      
      if (!response.ok) {
        throw new Error(`Force check failed: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Authorized force check completed successfully:', result.results);
        setError(null); // Clear any previous errors
        // Show success message
        setError('✅ Force check completed successfully!');
        setTimeout(() => setError(null), 3000); // Clear after 3 seconds
      } else {
        throw new Error(result.message || 'Force check returned an error');
      }
      
    } catch (err) {
      console.error('❌ Error during authorized force check:', err?.message || String(err));
      setError(`Failed to check results: ${err?.message || 'Please try again.'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Format time
  const formatTime = (timestamp: number) => {
    if (timestamp === 0) return 'Never';
    return new Date(timestamp).toLocaleTimeString();
  };

  // Format percentage
  const formatPercentage = (value: number) => {
    const numValue = Number(value) || 0;
    return `${numValue.toFixed(1)}%`;
  };

  // Get accuracy color
  const getAccuracyColor = (accuracy: number) => {
    const numAccuracy = Number(accuracy) || 0;
    if (numAccuracy >= 80) return 'text-green-400';
    if (numAccuracy >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  // Get accuracy badge color
  const getAccuracyBadgeColor = (accuracy: number) => {
    const numAccuracy = Number(accuracy) || 0;
    if (numAccuracy >= 80) return 'bg-green-500/20 text-green-400 border-green-500/30';
    if (numAccuracy >= 60) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    return 'bg-red-500/20 text-red-400 border-red-500/30';
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className={`bg-gray-900 rounded-lg p-6 ${className}`}>
        <div className="flex flex-col items-center justify-center py-12">
          <LoadingSpinner />
          <p className="mt-4 text-gray-300">Checking results...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className={`bg-gray-900 rounded-lg p-6 ${className}`}>
        <div className="flex flex-col items-center justify-center py-12">
          <div className="text-red-400 text-6xl mb-4">⚠️</div>
          <h3 className="text-xl font-semibold text-white mb-2">Error Loading Data</h3>
          <p className="text-gray-300 mb-6 text-center max-w-md">{error}</p>
          <button
            onClick={() => setError(null)}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gray-900 rounded-lg p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Prediction Accuracy</h2>
          <p className="text-gray-400 mt-1">Track and analyze prediction performance</p>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Authentication Status */}
          {isAuthenticated && (
            <div className="flex items-center space-x-2 px-3 py-1 bg-green-500/20 text-green-400 border border-green-500/30 rounded-md text-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span>Admin</span>
            </div>
          )}
          
          {/* Force Check Button */}
          <button
            onClick={handleForceCheckRequest}
            disabled={isLoading}
            className={`px-4 py-2 ${isAuthenticated ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'} disabled:bg-gray-600 text-white rounded-lg transition-colors flex items-center space-x-2`}
          >
            {isLoading && (
              <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            {!isAuthenticated && !isLoading && (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H10m4-6V9a2 2 0 00-2-2H8a2 2 0 00-2 2v2m8 0V9a2 2 0 00-2-2H8a2 2 0 00-2 2v2m8 0H6" />
              </svg>
            )}
            <span>
              {isLoading ? 'Checking Results...' : 
               isAuthenticated ? '🔄 Manual Update' : '🔒 Admin Update'}
            </span>
          </button>
        </div>
      </div>

      {/* Status Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Last Check</p>
              <p className="text-lg font-semibold text-white">Never</p>
            </div>
            <div className="w-3 h-3 rounded-full bg-gray-400" />
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Next Check</p>
              <p className="text-lg font-semibold text-white">Not scheduled</p>
            </div>
            <div className="w-3 h-3 rounded-full bg-green-400" />
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Total Predictions</p>
              <p className="text-lg font-semibold text-white">{safeAccuracyStats.totalPredictions}</p>
            </div>
            <div className="w-3 h-3 rounded-full bg-purple-400" />
          </div>
        </div>
      </div>


      {/* Current Accuracy Stats */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-4">
          Current Accuracy Statistics
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-800 rounded-lg p-4">
            <p className="text-sm text-gray-400">Total Predictions</p>
            <p className="text-2xl font-bold text-white">{safeAccuracyStats.totalPredictions}</p>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-4">
            <p className="text-sm text-gray-400">Correct Outcomes</p>
            <p className="text-2xl font-bold text-white">{safeAccuracyStats.correctOutcomes}</p>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-4">
            <p className="text-sm text-gray-400">Overall Accuracy</p>
            <p className={`text-2xl font-bold ${getAccuracyColor(safeAccuracyStats.overallAccuracy)}`}>
              {formatPercentage(safeAccuracyStats.overallAccuracy)}
            </p>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-4">
            <p className="text-sm text-gray-400">Recent Accuracy (Last 10)</p>
            <p className={`text-2xl font-bold ${getAccuracyColor(safeAccuracyStats.recentAccuracy.last10)}`}>
              {formatPercentage(safeAccuracyStats.recentAccuracy.last10)}
            </p>
          </div>
        </div>

        {/* Category Accuracy */}
        <div className="mb-6">
          <h4 className="text-lg font-semibold text-white mb-4">Category Accuracy</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-800 rounded-lg p-4">
              <p className="text-sm text-gray-400">Winner Predictions</p>
              <p className={`text-xl font-bold ${getAccuracyColor(safeAccuracyStats.totalPredictions > 0 ? (safeAccuracyStats.correctOutcomes / safeAccuracyStats.totalPredictions) * 100 : 0)}`}>
                {formatPercentage(safeAccuracyStats.totalPredictions > 0 ? (safeAccuracyStats.correctOutcomes / safeAccuracyStats.totalPredictions) * 100 : 0)}
              </p>
            </div>
            <div className="bg-gray-800 rounded-lg p-4">
              <p className="text-sm text-gray-400">Scoreline Predictions</p>
              <p className={`text-xl font-bold ${getAccuracyColor(safeAccuracyStats.totalPredictions > 0 ? (safeAccuracyStats.correctScorelines / safeAccuracyStats.totalPredictions) * 100 : 0)}`}>
                {formatPercentage(safeAccuracyStats.totalPredictions > 0 ? (safeAccuracyStats.correctScorelines / safeAccuracyStats.totalPredictions) * 100 : 0)}
              </p>
            </div>
            <div className="bg-gray-800 rounded-lg p-4">
              <p className="text-sm text-gray-400">BTTS Predictions</p>
              <p className={`text-xl font-bold ${getAccuracyColor(safeAccuracyStats.totalPredictions > 0 ? (safeAccuracyStats.correctBtts / safeAccuracyStats.totalPredictions) * 100 : 0)}`}>
                {formatPercentage(safeAccuracyStats.totalPredictions > 0 ? (safeAccuracyStats.correctBtts / safeAccuracyStats.totalPredictions) * 100 : 0)}
              </p>
            </div>
            <div className="bg-gray-800 rounded-lg p-4">
              <p className="text-sm text-gray-400">Goal Line Predictions</p>
              <p className={`text-xl font-bold ${getAccuracyColor(safeAccuracyStats.totalPredictions > 0 ? (safeAccuracyStats.correctGoalLine / safeAccuracyStats.totalPredictions) * 100 : 0)}`}>
                {formatPercentage(safeAccuracyStats.totalPredictions > 0 ? (safeAccuracyStats.correctGoalLine / safeAccuracyStats.totalPredictions) * 100 : 0)}
              </p>
            </div>
          </div>
        </div>

        {/* Recent Performance */}
        <div className="mb-6">
          <h4 className="text-lg font-semibold text-white mb-4">Recent Performance</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-800 rounded-lg p-4">
              <p className="text-sm text-gray-400">Last 10 Predictions</p>
              <p className={`text-2xl font-bold ${getAccuracyColor(safeAccuracyStats.recentAccuracy.last10)}`}>
                {formatPercentage(safeAccuracyStats.recentAccuracy.last10)}
              </p>
            </div>
            <div className="bg-gray-800 rounded-lg p-4">
              <p className="text-sm text-gray-400">Last 20 Predictions</p>
              <p className={`text-2xl font-bold ${getAccuracyColor(safeAccuracyStats.recentAccuracy.last20)}`}>
                {formatPercentage(safeAccuracyStats.recentAccuracy.last20)}
              </p>
            </div>
            <div className="bg-gray-800 rounded-lg p-4">
              <p className="text-sm text-gray-400">Last 50 Predictions</p>
              <p className={`text-2xl font-bold ${getAccuracyColor(safeAccuracyStats.recentAccuracy.last50)}`}>
                {formatPercentage(safeAccuracyStats.recentAccuracy.last50)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Validation History */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">
          Validation History
        </h3>
        
        <div className="bg-gray-800 rounded-lg p-6 text-center">
          <div className="text-gray-400 text-4xl mb-2">📊</div>
          <p className="text-gray-300">No validation history available yet</p>
          <p className="text-sm text-gray-500 mt-1">Results will appear here after matches are completed</p>
        </div>
      </div>

      {/* Authentication Modal */}
      {showAuthPrompt && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white flex items-center">
                <svg className="w-5 h-5 mr-2 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H10m4-6V9a2 2 0 00-2-2H8a2 2 0 00-2 2v2m8 0V9a2 2 0 00-2-2H8a2 2 0 00-2 2v2m8 0H6" />
                </svg>
                Admin Authorization Required
              </h3>
              <button
                onClick={() => setShowAuthPrompt(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            
            <div className="mb-4">
              <p className="text-gray-300 mb-3">
                🔒 The Force Check feature is restricted to authorized administrators only.
              </p>
              <p className="text-sm text-gray-400 mb-4">
                This prevents unauthorized manual updates and protects system integrity.
              </p>
              
              <input
                type="password"
                placeholder="Enter admin authorization key"
                value={authInput}
                onChange={(e) => setAuthInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAuth()}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handleAuth}
                disabled={!authInput.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-md transition-colors flex items-center justify-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                </svg>
                Authorize
              </button>
              <button
                onClick={() => {
                  setShowAuthPrompt(false);
                  setAuthInput('');
                  setError(null);
                }}
                className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md transition-colors"
              >
                Cancel
              </button>
            </div>

            {error && error.includes('Invalid') && (
              <div className="mt-3 p-3 bg-red-500/20 border border-red-500/30 rounded-md">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AccuracyDashboard;
