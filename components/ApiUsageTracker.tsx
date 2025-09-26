import React, { useState, useEffect } from 'react';
import { getApiUsage } from '../services/footballApiService';
import { getGeminiApiUsage } from '../services/geminiService';

interface ApiUsageStats {
  football: {
    callsUsed: number;
    callsRemaining: number;
    percentageUsed: number;
    dailyLimit: number;
    isConfigured: boolean;
  };
  gemini: {
    totalCalls: number;
    callsToday: number;
    lastResetDate: string;
    isConfigured: boolean;
  };
}

interface Props {
  className?: string;
  compact?: boolean;
}

const ApiUsageTracker: React.FC<Props> = ({ className = '', compact = false }) => {
  const [usage, setUsage] = useState<ApiUsageStats>({
    football: { callsUsed: 0, callsRemaining: 0, percentageUsed: 0, dailyLimit: 0, isConfigured: false },
    gemini: { totalCalls: 0, callsToday: 0, lastResetDate: '', isConfigured: false }
  });
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const refreshUsage = () => {
    try {
      const footballUsage = getApiUsage();
      const geminiUsage = getGeminiApiUsage();
      
      setUsage({
        football: footballUsage,
        gemini: geminiUsage
      });
      setLastUpdated(new Date());
    } catch (error) {
      console.warn('Failed to fetch API usage:', error);
    }
  };

  useEffect(() => {
    refreshUsage();
    // Refresh every 30 seconds
    const interval = setInterval(refreshUsage, 30000);
    return () => clearInterval(interval);
  }, []);

  const getUsageColor = (percentage: number) => {
    if (percentage < 50) return 'text-green-400';
    if (percentage < 80) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getProgressBarColor = (percentage: number) => {
    if (percentage < 50) return 'bg-green-500';
    if (percentage < 80) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  if (compact) {
    return (
      <div className={`bg-gray-800 rounded-lg p-4 ${className}`}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold text-white">API Usage</h3>
          <button
            onClick={refreshUsage}
            className="text-gray-400 hover:text-white transition-colors text-sm"
            title="Refresh usage stats"
          >
            🔄
          </button>
        </div>
        
        <div className="space-y-3">
          {/* Football API */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Football API</span>
            <div className="flex items-center space-x-2">
              <span className={`text-sm font-bold ${getUsageColor(usage.football.percentageUsed)}`}>
                {usage.football.callsUsed.toLocaleString()}
              </span>
              <span className="text-xs text-gray-500">
                ({usage.football.percentageUsed}%)
              </span>
            </div>
          </div>
          
          {/* Gemini API */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Gemini API</span>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-bold text-blue-400">
                {usage.gemini.callsToday}
              </span>
              <span className="text-xs text-gray-500">today</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gray-900 rounded-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">API Usage Tracking</h2>
        <div className="flex items-center space-x-3">
          <span className="text-xs text-gray-400">
            Updated: {lastUpdated.toLocaleTimeString()}
          </span>
          <button
            onClick={refreshUsage}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm transition-colors"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Football API Usage */}
        <div className="bg-gray-800 rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white">Football API</h3>
            <div className={`w-3 h-3 rounded-full ${usage.football.isConfigured ? 'bg-green-500' : 'bg-red-500'}`} />
          </div>
          
          {usage.football.isConfigured ? (
            <>
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-400">Daily Usage</span>
                  <span className={`font-bold ${getUsageColor(usage.football.percentageUsed)}`}>
                    {usage.football.percentageUsed}%
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${getProgressBarColor(usage.football.percentageUsed)}`}
                    style={{ width: `${Math.min(usage.football.percentageUsed, 100)}%` }}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-400 block">Calls Used</span>
                  <span className={`font-bold text-lg ${getUsageColor(usage.football.percentageUsed)}`}>
                    {usage.football.callsUsed.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block">Remaining</span>
                  <span className="text-white font-bold text-lg">
                    {usage.football.callsRemaining.toLocaleString()}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-400 block">Daily Limit</span>
                  <span className="text-white font-bold">
                    {usage.football.dailyLimit.toLocaleString()}
                  </span>
                </div>
              </div>
            </>
          ) : (
            <div className="text-red-400 text-sm">
              ❌ API Key not configured
            </div>
          )}
        </div>

        {/* Gemini API Usage */}
        <div className="bg-gray-800 rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white">Gemini API</h3>
            <div className={`w-3 h-3 rounded-full ${usage.gemini.isConfigured ? 'bg-green-500' : 'bg-red-500'}`} />
          </div>
          
          {usage.gemini.isConfigured ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-400 block">Today</span>
                  <span className="text-blue-400 font-bold text-2xl">
                    {usage.gemini.callsToday}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block">Total</span>
                  <span className="text-white font-bold text-2xl">
                    {usage.gemini.totalCalls.toLocaleString()}
                  </span>
                </div>
              </div>
              
              <div className="border-t border-gray-600 pt-3">
                <span className="text-gray-400 text-xs">Last reset: {usage.gemini.lastResetDate}</span>
              </div>
              
              <div className="bg-blue-900/20 border border-blue-500/30 rounded-md p-3">
                <div className="text-xs text-blue-300">
                  <div className="font-bold mb-1">💡 Gemini Usage Info</div>
                  <div>• Automated predictions: Every 6 hours</div>
                  <div>• On-demand predictions: User requests</div>
                  <div>• Daily counter resets at midnight</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-red-400 text-sm">
              ❌ API Key not configured
            </div>
          )}
        </div>
      </div>

      {/* Status Summary */}
      <div className="mt-6 p-4 bg-gray-800 rounded-lg">
        <h4 className="font-bold text-white mb-2">System Status</h4>
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${usage.football.isConfigured && usage.gemini.isConfigured ? 'bg-green-500' : 'bg-yellow-500'}`} />
            <span className="text-gray-300">
              {usage.football.isConfigured && usage.gemini.isConfigured ? 'All APIs Configured' : 'Partial Configuration'}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${usage.football.percentageUsed < 80 ? 'bg-green-500' : 'bg-yellow-500'}`} />
            <span className="text-gray-300">
              Football API: {usage.football.percentageUsed < 80 ? 'Healthy' : 'High Usage'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApiUsageTracker;