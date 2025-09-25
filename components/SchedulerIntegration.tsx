/**
 * EventBridge Scheduler Integration Example
 * Demonstrates how to integrate AWS EventBridge Scheduler with FixtureCast
 */

import React, { useState, useEffect } from 'react';
import EventBridgeSchedulerDashboard from '../components/EventBridgeSchedulerDashboard';
import { useEventBridgeScheduler, useSchedulerStats } from '../hooks/useEventBridgeScheduler';
import { awsSchedulerConfig, getConfigurationStatus } from '../config/awsSchedulerConfig';

interface SchedulerIntegrationProps {
  className?: string;
}

export const SchedulerIntegration: React.FC<SchedulerIntegrationProps> = ({ 
  className = '' 
}) => {
  const [showDashboard, setShowDashboard] = useState(false);
  const [configStatus, setConfigStatus] = useState<any>(null);
  
  const {
    scheduledTasks,
    serviceStatus,
    loading,
    error,
    createSchedule,
    scheduleMatchUpdate
  } = useEventBridgeScheduler();
  
  const { stats } = useSchedulerStats();

  useEffect(() => {
    // Check configuration status on mount
    const status = getConfigurationStatus();
    setConfigStatus(status);
  }, []);

  // Example: Schedule a match update
  const handleScheduleMatchUpdate = async (matchId: string, matchDate: Date) => {
    try {
      const success = await scheduleMatchUpdate(matchId, matchDate);
      if (success) {
        console.log(`Successfully scheduled update for match ${matchId}`);
      } else {
        console.error(`Failed to schedule update for match ${matchId}`);
      }
    } catch (error) {
      console.error('Error scheduling match update:', error);
    }
  };

  // Example: Create a custom prediction schedule
  const handleCreateCustomSchedule = async () => {
    const config = {
      name: `custom-prediction-${Date.now()}`,
      description: 'Custom prediction update schedule',
      scheduleExpression: 'rate(30 minutes)',
      target: {
        arn: awsSchedulerConfig.lambdaFunctions.predictionUpdate,
        roleArn: awsSchedulerConfig.roles.defaultSchedulerRole,
        input: JSON.stringify({
          type: 'custom-prediction-update',
          automated: true,
          customSettings: {
            highPriority: true,
            includeAllLeagues: true
          }
        }),
        retryPolicy: {
          maximumRetryAttempts: 3,
          maximumEventAge: 3600
        }
      }
    };

    try {
      const success = await createSchedule(config);
      if (success) {
        console.log('Custom schedule created successfully');
      }
    } catch (error) {
      console.error('Error creating custom schedule:', error);
    }
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600 dark:text-gray-400">Loading scheduler...</span>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Configuration Status */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          EventBridge Scheduler Configuration
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center">
            <div className={`text-2xl mb-2 ${configStatus?.configured ? '✅' : '❌'}`}>
              {configStatus?.configured ? '✅' : '❌'}
            </div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Overall Status
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {configStatus?.configured ? 'Configured' : 'Not Configured'}
            </p>
          </div>
          
          <div className="text-center">
            <div className={`text-2xl mb-2 ${configStatus?.hasCredentials ? '🔑' : '🚫'}`}>
              {configStatus?.hasCredentials ? '🔑' : '🚫'}
            </div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              AWS Credentials
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {configStatus?.hasCredentials ? 'Available' : 'Missing'}
            </p>
          </div>
          
          <div className="text-center">
            <div className={`text-2xl mb-2 ${configStatus?.hasRoles ? '🎭' : '🚫'}`}>
              {configStatus?.hasRoles ? '🎭' : '🚫'}
            </div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              IAM Roles
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {configStatus?.hasRoles ? 'Configured' : 'Missing'}
            </p>
          </div>
          
          <div className="text-center">
            <div className={`text-2xl mb-2 ${configStatus?.mode === 'PRODUCTION' ? '🚀' : configStatus?.mode === 'DEVELOPMENT' ? '🧪' : '🎭'}`}>
              {configStatus?.mode === 'PRODUCTION' ? '🚀' : configStatus?.mode === 'DEVELOPMENT' ? '🧪' : '🎭'}
            </div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Mode
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {configStatus?.mode || 'Unknown'}
            </p>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
            <p className="text-red-800 dark:text-red-200 text-sm">
              Error: {error}
            </p>
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
          <div className="flex items-center">
            <span className="text-2xl mr-3">📊</span>
            <div>
              <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Total Schedules</p>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{stats.totalTasks}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
          <div className="flex items-center">
            <span className="text-2xl mr-3">✅</span>
            <div>
              <p className="text-sm font-medium text-green-600 dark:text-green-400">Active</p>
              <p className="text-2xl font-bold text-green-900 dark:text-green-100">{stats.activeTasks}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
          <div className="flex items-center">
            <span className="text-2xl mr-3">⏸️</span>
            <div>
              <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">Paused</p>
              <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">{stats.pausedTasks}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
          <div className="flex items-center">
            <span className="text-2xl mr-3">❌</span>
            <div>
              <p className="text-sm font-medium text-red-600 dark:text-red-400">Errors</p>
              <p className="text-2xl font-bold text-red-900 dark:text-red-100">{stats.errorTasks}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Quick Actions
        </h3>
        
        <div className="flex flex-wrap gap-4">
          <button
            onClick={() => setShowDashboard(!showDashboard)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            {showDashboard ? 'Hide' : 'Show'} Dashboard
          </button>
          
          <button
            onClick={handleCreateCustomSchedule}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            Create Custom Schedule
          </button>
          
          <button
            onClick={() => handleScheduleMatchUpdate('test-match-123', new Date(Date.now() + 24 * 60 * 60 * 1000))}
            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
          >
            Schedule Test Match Update
          </button>
        </div>
      </div>

      {/* Upcoming Tasks Preview */}
      {stats.upcomingTasks.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Upcoming Tasks
          </h3>
          
          <div className="space-y-3">
            {stats.upcomingTasks.map((task) => (
              <div key={task.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{task.name}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{task.type}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {task.nextRun?.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {task.schedule}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Full Dashboard */}
      {showDashboard && (
        <EventBridgeSchedulerDashboard className="mt-6" />
      )}

      {/* Setup Instructions */}
      {!configStatus?.configured && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
            EventBridge Scheduler Setup Required
          </h3>
          <p className="text-yellow-700 dark:text-yellow-300 mb-4">
            To use EventBridge Scheduler features, you need to configure AWS credentials and set up the required resources.
          </p>
          
          <div className="space-y-2 text-sm">
            <p className="text-yellow-600 dark:text-yellow-400">
              <strong>Required Environment Variables:</strong>
            </p>
            <ul className="list-disc list-inside space-y-1 text-yellow-600 dark:text-yellow-400 ml-4">
              <li>VITE_AWS_ACCESS_KEY_ID</li>
              <li>VITE_AWS_SECRET_ACCESS_KEY</li>
              <li>VITE_AWS_REGION</li>
              <li>VITE_AWS_SCHEDULER_ROLE_ARN</li>
              <li>VITE_LAMBDA_PREDICTION_UPDATE</li>
              <li>VITE_LAMBDA_MATCH_CHECK</li>
            </ul>
          </div>
          
          <div className="mt-4">
            <a
              href="/docs/AWS_EVENTBRIDGE_SCHEDULER_SETUP.md"
              className="inline-flex items-center px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors"
            >
              📖 View Setup Guide
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export default SchedulerIntegration;