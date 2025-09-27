/**
 * Sync Status Indicator Component
 * Shows real-time sync status and allows manual sync control
 */

import React, { useState } from 'react';
import { usePredictionSync } from '../hooks/usePredictionSync';

interface SyncStatusIndicatorProps {
  className?: string;
  showDetails?: boolean;
}

const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({ 
  className = '', 
  showDetails = false 
}) => {
  const { 
    syncStatus, 
    isOnline, 
    pendingSync, 
    conflicts, 
    errors, 
    forceSync, 
    clearErrors 
  } = usePredictionSync();

  const [isSyncing, setIsSyncing] = useState(false);
  const [showErrorDetails, setShowErrorDetails] = useState(false);

  const handleForceSync = async () => {
    setIsSyncing(true);
    try {
      await forceSync();
    } catch (error) {
      console.error('Force sync failed:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const getStatusColor = () => {
    if (!isOnline) return 'text-red-400';
    if (conflicts > 0) return 'text-yellow-400';
    if (pendingSync > 0) return 'text-blue-400';
    if (errors.length > 0) return 'text-red-400';
    return 'text-green-400';
  };

  const getStatusText = () => {
    if (!isOnline) return 'Offline';
    if (conflicts > 0) return `${conflicts} conflicts`;
    if (pendingSync > 0) return `${pendingSync} pending`;
    if (errors.length > 0) return `${errors.length} errors`;
    return 'Synced';
  };

  const getStatusIcon = () => {
    if (!isOnline) return '📡';
    if (conflicts > 0) return '⚠️';
    if (pendingSync > 0) return '🔄';
    if (errors.length > 0) return '❌';
    return '✅';
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {/* Status Icon and Text */}
      <div className="flex items-center space-x-1">
        <span className="text-sm">{getStatusIcon()}</span>
        <span className={`text-xs font-medium ${getStatusColor()}`}>
          {getStatusText()}
        </span>
      </div>

      {/* Sync Button */}
      {isOnline && (pendingSync > 0 || errors.length > 0) && (
        <button
          onClick={handleForceSync}
          disabled={isSyncing}
          className={`px-2 py-1 text-xs rounded transition-colors ${
            isSyncing
              ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-500 text-white'
          }`}
        >
          {isSyncing ? 'Syncing...' : 'Sync'}
        </button>
      )}

      {/* Error Details Toggle */}
      {errors.length > 0 && (
        <button
          onClick={() => setShowErrorDetails(!showErrorDetails)}
          className="text-xs text-red-400 hover:text-red-300"
        >
          {showErrorDetails ? 'Hide' : 'Show'} Errors
        </button>
      )}

      {/* Detailed Status (when showDetails is true) */}
      {showDetails && (
        <div className="text-xs text-gray-400">
          <div>Last sync: {new Date(syncStatus.lastSyncTime).toLocaleTimeString()}</div>
          <div>Platform: {navigator.platform}</div>
        </div>
      )}

      {/* Error Details */}
      {showErrorDetails && errors.length > 0 && (
        <div className="absolute top-8 right-0 bg-gray-800 border border-gray-600 rounded-lg p-3 shadow-lg z-50 min-w-64">
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-sm font-semibold text-red-400">Sync Errors</h4>
            <button
              onClick={clearErrors}
              className="text-xs text-gray-400 hover:text-white"
            >
              Clear
            </button>
          </div>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {errors.map((error, index) => (
              <div key={index} className="text-xs text-gray-300 bg-gray-700 rounded p-2">
                {error}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SyncStatusIndicator;

