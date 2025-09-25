/**
 * Scheduler Quick Control Panel
 * A compact component to show scheduler status and provide quick controls
 */

import React from 'react';
import { useEventBridgeScheduler } from '../hooks/useEventBridgeScheduler';
import { getConfigurationStatus } from '../config/awsSchedulerConfig';

interface SchedulerControlPanelProps {
  className?: string;
  onOpenDashboard?: () => void;
}

export const SchedulerControlPanel: React.FC<SchedulerControlPanelProps> = ({ 
  className = '',
  onOpenDashboard
}) => {
  const {
    scheduledTasks,
    serviceStatus,
    loading,
    error
  } = useEventBridgeScheduler();

  const configStatus = getConfigurationStatus();
  
  if (loading) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow p-4 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  const activeTasks = scheduledTasks.filter(task => task.enabled && task.status === 'ACTIVE').length;
  const errorTasks = scheduledTasks.filter(task => task.status === 'ERROR').length;

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow border-l-4 ${
      configStatus.configured 
        ? 'border-green-500' 
        : 'border-yellow-500'
    } ${className}`}>
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <span className="text-xl">📅</span>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              EventBridge Scheduler
            </h3>
            <span className={`px-2 py-1 rounded text-xs font-medium ${
              configStatus.mode === 'PRODUCTION' 
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                : configStatus.mode === 'DEVELOPMENT'
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
            }`}>
              {configStatus.mode}
            </span>
          </div>
          
          {onOpenDashboard && (
            <button
              onClick={onOpenDashboard}
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 text-xs font-medium"
            >
              Manage →
            </button>
          )}
        </div>

        {/* Status Grid */}
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div className="text-center">
            <div className="text-lg font-bold text-gray-900 dark:text-white">
              {scheduledTasks.length}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              Total
            </div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-green-600 dark:text-green-400">
              {activeTasks}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              Active
            </div>
          </div>
          <div className="text-center">
            <div className={`text-lg font-bold ${
              errorTasks > 0 
                ? 'text-red-600 dark:text-red-400' 
                : 'text-gray-400 dark:text-gray-500'
            }`}>
              {errorTasks}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              Errors
            </div>
          </div>
        </div>

        {/* Status Messages */}
        {!configStatus.configured && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded p-2 mb-2">
            <p className="text-xs text-yellow-800 dark:text-yellow-200">
              🔧 AWS not configured - running in mock mode
            </p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-2 mb-2">
            <p className="text-xs text-red-800 dark:text-red-200">
              ❌ {error}
            </p>
          </div>
        )}

        {configStatus.configured && activeTasks > 0 && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded p-2">
            <p className="text-xs text-green-800 dark:text-green-200">
              ✅ {activeTasks} automated tasks running
            </p>
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex space-x-2 mt-3">
          <button
            onClick={() => window.open('/scheduler', '_blank')}
            className="flex-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Open Scheduler
          </button>
          <button
            onClick={() => window.open('/scheduler/dashboard', '_blank')}
            className="flex-1 px-2 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
          >
            Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default SchedulerControlPanel;