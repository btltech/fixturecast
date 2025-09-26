import React, { useState, useEffect } from 'react';
import { getAllRateLimitStatuses } from '../services/rateLimitService';

interface RateLimitStatusProps {
  className?: string;
}

const RateLimitStatus: React.FC<RateLimitStatusProps> = ({ className = '' }) => {
  const [statuses, setStatuses] = useState<Record<string, any>>({});
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    const updateStatuses = () => {
      const currentStatuses = getAllRateLimitStatuses();
      setStatuses(currentStatuses);
      setLastUpdated(new Date());
    };

    // Update immediately
    updateStatuses();

    // Update every 10 seconds
    const interval = setInterval(updateStatuses, 10000);

    return () => clearInterval(interval);
  }, []);

  const formatWaitTime = (waitTimeMs: number): string => {
    if (waitTimeMs <= 0) return '';
    
    const seconds = Math.ceil(waitTimeMs / 1000);
    if (seconds < 60) return `${seconds}s`;
    
    const minutes = Math.ceil(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    
    const hours = Math.ceil(minutes / 60);
    return `${hours}h`;
  };

  const getStatusColor = (status: any): string => {
    if (!status.canMakeRequest) return 'red';
    if (status.requestsThisMinute > 10 || status.requestsToday > 800) return 'yellow';
    return 'green';
  };

  const getStatusIcon = (status: any): string => {
    if (!status.canMakeRequest) return '🚫';
    if (status.requestsThisMinute > 10 || status.requestsToday > 800) return '⚠️';
    return '✅';
  };

  const hasAnyLimits = Object.values(statuses).some((status: any) => !status.canMakeRequest);

  if (!hasAnyLimits && Object.keys(statuses).length === 0) {
    return null; // Don't show if no limits and no data
  }

  return (
    <div className={`bg-gray-800 rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-bold text-white">🚦 API Rate Limits</h3>
        <div className="text-xs text-gray-400">
          Updated: {lastUpdated.toLocaleTimeString()}
        </div>
      </div>

      <div className="space-y-3">
        {Object.entries(statuses).map(([service, status]: [string, any]) => {
          const color = getStatusColor(status);
          const icon = getStatusIcon(status);
          
          return (
            <div key={service} className="bg-gray-700/50 rounded-md p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">{icon}</span>
                  <span className="font-semibold text-white capitalize">
                    {service === 'gemini' ? 'Gemini 2.5 Flash' : 'DeepSeek V3.1'}
                  </span>
                </div>
                {status.waitTimeMs > 0 && (
                  <span className="text-red-400 font-bold">
                    Wait: {formatWaitTime(status.waitTimeMs)}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">This Minute:</span>
                  <span className={`text-${color}-400 font-bold`}>
                    {status.requestsThisMinute}/15
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Today:</span>
                  <span className={`text-${color}-400 font-bold`}>
                    {status.requestsToday}/1000
                  </span>
                </div>
              </div>

              {!status.canMakeRequest && (
                <div className="mt-2 p-2 bg-red-900/30 rounded text-red-300 text-xs">
                  <div className="font-semibold">Rate limit exceeded</div>
                  {status.blockedUntil && (
                    <div>Available at: {new Date(status.blockedUntil).toLocaleTimeString()}</div>
                  )}
                </div>
              )}

              {status.canMakeRequest && (status.requestsThisMinute > 10 || status.requestsToday > 800) && (
                <div className="mt-2 p-2 bg-yellow-900/30 rounded text-yellow-300 text-xs">
                  <div className="font-semibold">Approaching limit</div>
                  <div>Consider reducing request frequency</div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {hasAnyLimits && (
        <div className="mt-3 p-3 bg-red-900/20 rounded-md">
          <div className="text-red-300 text-sm">
            <div className="font-semibold mb-1">💡 Rate Limit Tips:</div>
            <div>• Wait for the specified time before retrying</div>
            <div>• Consider using fewer predictions per minute</div>
            <div>• Switch to the available model if one is blocked</div>
            <div>• Rate limits reset every minute and daily</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RateLimitStatus;