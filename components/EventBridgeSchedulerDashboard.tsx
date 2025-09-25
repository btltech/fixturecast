/**
 * EventBridge Scheduler Dashboard Component
 * Provides a UI for managing AWS EventBridge Scheduler tasks
 */

import React, { useState, useEffect } from 'react';
import { eventBridgeSchedulerService, ScheduledTask, ScheduleConfig } from '../services/eventBridgeSchedulerService';

interface SchedulerDashboardProps {
  className?: string;
}

export const EventBridgeSchedulerDashboard: React.FC<SchedulerDashboardProps> = ({ 
  className = '' 
}) => {
  const [scheduledTasks, setScheduledTasks] = useState<ScheduledTask[]>([]);
  const [serviceStatus, setServiceStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'create'>('overview');
  const [newSchedule, setNewSchedule] = useState<Partial<ScheduleConfig>>({
    name: '',
    description: '',
    scheduleExpression: 'rate(1 hour)',
    state: 'ENABLED',
    target: {
      arn: '',
      roleArn: '',
      input: '{}',
      retryPolicy: {
        maximumRetryAttempts: 3,
        maximumEventAge: 86400
      }
    }
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const tasks = eventBridgeSchedulerService.getScheduledTasks();
      const status = eventBridgeSchedulerService.getStatus();
      setScheduledTasks(tasks);
      setServiceStatus(status);
    } catch (error) {
      console.error('Failed to load scheduler data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSchedule = async () => {
    if (!newSchedule.name || !newSchedule.target?.arn || !newSchedule.target?.roleArn) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const success = await eventBridgeSchedulerService.createSchedule(newSchedule as ScheduleConfig);
      if (success) {
        alert('Schedule created successfully!');
        setNewSchedule({
          name: '',
          description: '',
          scheduleExpression: 'rate(1 hour)',
          state: 'ENABLED',
          target: {
            arn: '',
            roleArn: '',
            input: '{}',
            retryPolicy: {
              maximumRetryAttempts: 3,
              maximumEventAge: 86400
            }
          }
        });
        loadData();
        setActiveTab('tasks');
      } else {
        alert('Failed to create schedule');
      }
    } catch (error) {
      console.error('Error creating schedule:', error);
      alert('Error creating schedule');
    }
  };

  const handlePauseSchedule = async (name: string) => {
    try {
      const success = await eventBridgeSchedulerService.pauseSchedule(name);
      if (success) {
        loadData();
      }
    } catch (error) {
      console.error('Error pausing schedule:', error);
    }
  };

  const handleResumeSchedule = async (name: string) => {
    try {
      const success = await eventBridgeSchedulerService.resumeSchedule(name);
      if (success) {
        loadData();
      }
    } catch (error) {
      console.error('Error resuming schedule:', error);
    }
  };

  const handleDeleteSchedule = async (name: string) => {
    if (confirm(`Are you sure you want to delete schedule "${name}"?`)) {
      try {
        const success = await eventBridgeSchedulerService.deleteSchedule(name);
        if (success) {
          loadData();
        }
      } catch (error) {
        console.error('Error deleting schedule:', error);
      }
    }
  };

  if (loading) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow ${className}`}>
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
                <span className="mr-2">📅</span>
                EventBridge Scheduler
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Manage automated scheduling tasks
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                serviceStatus?.mode === 'AWS' 
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                  : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
              }`}>
                {serviceStatus?.mode || 'Unknown'} Mode
              </span>
              {serviceStatus?.region && (
                <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                  {serviceStatus.region}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6">
          <nav className="flex space-x-8" aria-label="Tabs">
            {[
              { id: 'overview', name: 'Overview', icon: '📊' },
              { id: 'tasks', name: 'Scheduled Tasks', icon: '📋' },
              { id: 'create', name: 'Create Schedule', icon: '➕' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <span className="mr-1">{tab.icon}</span>
                {tab.name}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <div className="flex items-center">
                  <div className="text-2xl mr-3">📅</div>
                  <div>
                    <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Total Schedules</p>
                    <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{serviceStatus?.scheduledTasks || 0}</p>
                  </div>
                </div>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                <div className="flex items-center">
                  <div className="text-2xl mr-3">✅</div>
                  <div>
                    <p className="text-sm font-medium text-green-600 dark:text-green-400">Active Tasks</p>
                    <p className="text-2xl font-bold text-green-900 dark:text-green-100">{serviceStatus?.activeTasks || 0}</p>
                  </div>
                </div>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                <div className="flex items-center">
                  <div className="text-2xl mr-3">🔄</div>
                  <div>
                    <p className="text-sm font-medium text-purple-600 dark:text-purple-400">Service Status</p>
                    <p className="text-lg font-bold text-purple-900 dark:text-purple-100">
                      {serviceStatus?.initialized ? 'Initialized' : 'Not Ready'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Task Type Breakdown */}
            <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Task Breakdown by Type</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {(['PREDICTION_UPDATE', 'MATCH_CHECK', 'ANALYTICS', 'CLEANUP', 'ALERT'] as const).map(type => {
                  const count = scheduledTasks.filter(task => task.type === type).length;
                  return (
                    <div key={type} className="text-center">
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{count}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{type.replace('_', ' ')}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'tasks' && (
          <div className="space-y-4">
            {scheduledTasks.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">📅</div>
                <p className="text-gray-500 dark:text-gray-400">No scheduled tasks found</p>
                <p className="text-sm text-gray-400 dark:text-gray-500">Create your first schedule to get started</p>
              </div>
            ) : (
              <div className="space-y-3">
                {scheduledTasks.map((task) => (
                  <div key={task.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            task.enabled
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                          }`}>
                            {task.enabled ? 'Active' : 'Paused'}
                          </span>
                          <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                            {task.type.replace('_', ' ')}
                          </span>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-2">{task.name}</h3>
                        <p className="text-gray-600 dark:text-gray-400">Schedule: {task.schedule}</p>
                        {task.nextRun && (
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Next run: {task.nextRun.toLocaleString()}
                          </p>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        {task.enabled ? (
                          <button
                            onClick={() => handlePauseSchedule(task.name)}
                            className="px-3 py-1 text-sm bg-yellow-500 text-white rounded hover:bg-yellow-600"
                          >
                            Pause
                          </button>
                        ) : (
                          <button
                            onClick={() => handleResumeSchedule(task.name)}
                            className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600"
                          >
                            Resume
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteSchedule(task.name)}
                          className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'create' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Schedule Name
                </label>
                <input
                  type="text"
                  value={newSchedule.name || ''}
                  onChange={(e) => setNewSchedule({ ...newSchedule, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="e.g., daily-predictions-update"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <input
                  type="text"
                  value={newSchedule.description || ''}
                  onChange={(e) => setNewSchedule({ ...newSchedule, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Brief description of the schedule"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Schedule Expression
              </label>
              <select
                value={newSchedule.scheduleExpression || 'rate(1 hour)'}
                onChange={(e) => setNewSchedule({ ...newSchedule, scheduleExpression: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="rate(15 minutes)">Every 15 minutes</option>
                <option value="rate(30 minutes)">Every 30 minutes</option>
                <option value="rate(1 hour)">Every hour</option>
                <option value="rate(6 hours)">Every 6 hours</option>
                <option value="rate(12 hours)">Every 12 hours</option>
                <option value="rate(1 day)">Daily</option>
                <option value="cron(0 6 * * ? *)">Daily at 6 AM UTC</option>
                <option value="cron(0 0 ? * SUN *)">Weekly (Sunday at midnight)</option>
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Target ARN
                </label>
                <input
                  type="text"
                  value={newSchedule.target?.arn || ''}
                  onChange={(e) => setNewSchedule({ 
                    ...newSchedule, 
                    target: { ...newSchedule.target!, arn: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="arn:aws:lambda:region:account:function:name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Role ARN
                </label>
                <input
                  type="text"
                  value={newSchedule.target?.roleArn || ''}
                  onChange={(e) => setNewSchedule({ 
                    ...newSchedule, 
                    target: { ...newSchedule.target!, roleArn: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="arn:aws:iam::account:role/scheduler-role"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Input JSON
              </label>
              <textarea
                value={newSchedule.target?.input || '{}'}
                onChange={(e) => setNewSchedule({ 
                  ...newSchedule, 
                  target: { ...newSchedule.target!, input: e.target.value }
                })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
                placeholder='{"type": "scheduled-task", "automated": true}'
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setActiveTab('tasks')}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSchedule}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Create Schedule
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EventBridgeSchedulerDashboard;