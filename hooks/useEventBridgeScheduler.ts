/**
 * EventBridge Scheduler Integration Hook
 * Provides React hooks for managing EventBridge Scheduler from FixtureCast components
 */

import { useState, useEffect, useCallback } from 'react';
import { eventBridgeSchedulerService, ScheduledTask, ScheduleConfig } from '../services/eventBridgeSchedulerService';
import { awsSchedulerConfig, getScheduleTemplate, generateMatchScheduleExpression } from '../config/awsSchedulerConfig';

interface UseEventBridgeSchedulerReturn {
  // State
  scheduledTasks: ScheduledTask[];
  serviceStatus: any;
  loading: boolean;
  error: string | null;
  
  // Actions
  createSchedule: (config: ScheduleConfig) => Promise<boolean>;
  updateSchedule: (name: string, config: Partial<ScheduleConfig>) => Promise<boolean>;
  deleteSchedule: (name: string) => Promise<boolean>;
  pauseSchedule: (name: string) => Promise<boolean>;
  resumeSchedule: (name: string) => Promise<boolean>;
  scheduleMatchUpdate: (matchId: string, matchDate: Date) => Promise<boolean>;
  
  // Queries
  getTasksByType: (type: ScheduledTask['type']) => ScheduledTask[];
  getActiveTasksCount: () => number;
  isSchedulerReady: () => boolean;
  refreshTasks: () => Promise<void>;
}

/**
 * Main EventBridge Scheduler hook
 */
export const useEventBridgeScheduler = (): UseEventBridgeSchedulerReturn => {
  const [scheduledTasks, setScheduledTasks] = useState<ScheduledTask[]>([]);
  const [serviceStatus, setServiceStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize and load data
  const refreshTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const tasks = eventBridgeSchedulerService.getScheduledTasks();
      const status = eventBridgeSchedulerService.getStatus();
      
      setScheduledTasks(tasks);
      setServiceStatus(status);
      
    } catch (err) {
      console.error('Error refreshing scheduler tasks:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load initial data
  useEffect(() => {
    refreshTasks();
  }, [refreshTasks]);

  // Create new schedule
  const createSchedule = useCallback(async (config: ScheduleConfig): Promise<boolean> => {
    try {
      setError(null);
      const success = await eventBridgeSchedulerService.createSchedule(config);
      if (success) {
        await refreshTasks();
      }
      return success;
    } catch (err) {
      console.error('Error creating schedule:', err);
      setError(err instanceof Error ? err.message : 'Failed to create schedule');
      return false;
    }
  }, [refreshTasks]);

  // Update existing schedule
  const updateSchedule = useCallback(async (name: string, config: Partial<ScheduleConfig>): Promise<boolean> => {
    try {
      setError(null);
      const success = await eventBridgeSchedulerService.updateSchedule(name, config);
      if (success) {
        await refreshTasks();
      }
      return success;
    } catch (err) {
      console.error('Error updating schedule:', err);
      setError(err instanceof Error ? err.message : 'Failed to update schedule');
      return false;
    }
  }, [refreshTasks]);

  // Delete schedule
  const deleteSchedule = useCallback(async (name: string): Promise<boolean> => {
    try {
      setError(null);
      const success = await eventBridgeSchedulerService.deleteSchedule(name);
      if (success) {
        await refreshTasks();
      }
      return success;
    } catch (err) {
      console.error('Error deleting schedule:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete schedule');
      return false;
    }
  }, [refreshTasks]);

  // Pause schedule
  const pauseSchedule = useCallback(async (name: string): Promise<boolean> => {
    try {
      setError(null);
      const success = await eventBridgeSchedulerService.pauseSchedule(name);
      if (success) {
        await refreshTasks();
      }
      return success;
    } catch (err) {
      console.error('Error pausing schedule:', err);
      setError(err instanceof Error ? err.message : 'Failed to pause schedule');
      return false;
    }
  }, [refreshTasks]);

  // Resume schedule
  const resumeSchedule = useCallback(async (name: string): Promise<boolean> => {
    try {
      setError(null);
      const success = await eventBridgeSchedulerService.resumeSchedule(name);
      if (success) {
        await refreshTasks();
      }
      return success;
    } catch (err) {
      console.error('Error resuming schedule:', err);
      setError(err instanceof Error ? err.message : 'Failed to resume schedule');
      return false;
    }
  }, [refreshTasks]);

  // Schedule match-specific update
  const scheduleMatchUpdate = useCallback(async (matchId: string, matchDate: Date): Promise<boolean> => {
    try {
      setError(null);
      const success = await eventBridgeSchedulerService.scheduleMatchUpdate(matchId, matchDate);
      if (success) {
        await refreshTasks();
      }
      return success;
    } catch (err) {
      console.error('Error scheduling match update:', err);
      setError(err instanceof Error ? err.message : 'Failed to schedule match update');
      return false;
    }
  }, [refreshTasks]);

  // Get tasks by type
  const getTasksByType = useCallback((type: ScheduledTask['type']): ScheduledTask[] => {
    return scheduledTasks.filter(task => task.type === type);
  }, [scheduledTasks]);

  // Get active tasks count
  const getActiveTasksCount = useCallback((): number => {
    return scheduledTasks.filter(task => task.enabled && task.status === 'ACTIVE').length;
  }, [scheduledTasks]);

  // Check if scheduler is ready
  const isSchedulerReady = useCallback((): boolean => {
    return serviceStatus?.initialized === true;
  }, [serviceStatus]);

  return {
    // State
    scheduledTasks,
    serviceStatus,
    loading,
    error,
    
    // Actions
    createSchedule,
    updateSchedule,
    deleteSchedule,
    pauseSchedule,
    resumeSchedule,
    scheduleMatchUpdate,
    
    // Queries
    getTasksByType,
    getActiveTasksCount,
    isSchedulerReady,
    refreshTasks
  };
};

/**
 * Hook for match-specific scheduling
 */
export const useMatchScheduling = () => {
  const { scheduleMatchUpdate, scheduledTasks, error } = useEventBridgeScheduler();

  const schedulePreMatchUpdate = useCallback(async (matchId: string, matchDate: Date, minutesBefore: number = 30): Promise<boolean> => {
    return await scheduleMatchUpdate(matchId, matchDate);
  }, [scheduleMatchUpdate]);

  const getMatchSchedules = useCallback((matchId: string): ScheduledTask[] => {
    return scheduledTasks.filter(task => 
      task.type === 'MATCH_CHECK' && 
      task.metadata?.matchId === matchId
    );
  }, [scheduledTasks]);

  return {
    schedulePreMatchUpdate,
    getMatchSchedules,
    error
  };
};

/**
 * Hook for prediction scheduling
 */
export const usePredictionScheduling = () => {
  const { createSchedule, getTasksByType, error } = useEventBridgeScheduler();

  const createPredictionSchedule = useCallback(async (
    name: string,
    scheduleExpression: string,
    description?: string
  ): Promise<boolean> => {
    const template = getScheduleTemplate('hourly-predictions');
    if (!template) {
      throw new Error('Prediction schedule template not found');
    }

    const config: ScheduleConfig = {
      name,
      description: description || template.description,
      scheduleExpression,
      target: {
        arn: awsSchedulerConfig.lambdaFunctions.predictionUpdate,
        roleArn: awsSchedulerConfig.roles.defaultSchedulerRole,
        input: JSON.stringify({ type: 'custom-prediction-update', automated: true }),
        retryPolicy: template.retryPolicy
      }
    };

    return await createSchedule(config);
  }, [createSchedule]);

  const getPredictionTasks = useCallback((): ScheduledTask[] => {
    return getTasksByType('PREDICTION_UPDATE');
  }, [getTasksByType]);

  return {
    createPredictionSchedule,
    getPredictionTasks,
    error
  };
};

/**
 * Hook for analytics scheduling
 */
export const useAnalyticsScheduling = () => {
  const { createSchedule, getTasksByType, error } = useEventBridgeScheduler();

  const createAnalyticsSchedule = useCallback(async (
    name: string,
    scheduleExpression: string,
    reportType: 'daily' | 'weekly' | 'monthly' = 'daily'
  ): Promise<boolean> => {
    const config: ScheduleConfig = {
      name,
      description: `Generate ${reportType} analytics report`,
      scheduleExpression,
      target: {
        arn: awsSchedulerConfig.lambdaFunctions.analyticsReport,
        roleArn: awsSchedulerConfig.roles.defaultSchedulerRole,
        input: JSON.stringify({ 
          type: `${reportType}-analytics`, 
          automated: true,
          reportType 
        }),
        retryPolicy: {
          maximumRetryAttempts: 1,
          maximumEventAge: reportType === 'monthly' ? 172800 : 86400
        }
      }
    };

    return await createSchedule(config);
  }, [createSchedule]);

  const getAnalyticsTasks = useCallback((): ScheduledTask[] => {
    return getTasksByType('ANALYTICS');
  }, [getTasksByType]);

  return {
    createAnalyticsSchedule,
    getAnalyticsTasks,
    error
  };
};

/**
 * Hook for scheduler statistics and monitoring
 */
export const useSchedulerStats = () => {
  const { scheduledTasks, serviceStatus } = useEventBridgeScheduler();

  const getStats = useCallback(() => {
    const totalTasks = scheduledTasks.length;
    const activeTasks = scheduledTasks.filter(task => task.enabled && task.status === 'ACTIVE').length;
    const pausedTasks = scheduledTasks.filter(task => !task.enabled).length;
    const errorTasks = scheduledTasks.filter(task => task.status === 'ERROR').length;

    const tasksByType = scheduledTasks.reduce((acc, task) => {
      acc[task.type] = (acc[task.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const upcomingTasks = scheduledTasks
      .filter(task => task.nextRun && task.enabled)
      .sort((a, b) => (a.nextRun!.getTime() - b.nextRun!.getTime()))
      .slice(0, 5);

    return {
      totalTasks,
      activeTasks,
      pausedTasks,
      errorTasks,
      tasksByType,
      upcomingTasks,
      serviceMode: serviceStatus?.mode || 'UNKNOWN',
      isInitialized: serviceStatus?.initialized || false
    };
  }, [scheduledTasks, serviceStatus]);

  return {
    stats: getStats(),
    scheduledTasks,
    serviceStatus
  };
};

/**
 * Hook for quick schedule creation with templates
 */
export const useScheduleTemplates = () => {
  const { createSchedule } = useEventBridgeScheduler();

  const createFromTemplate = useCallback(async (
    templateName: string,
    customName?: string,
    customInput?: Record<string, any>
  ): Promise<boolean> => {
    const template = getScheduleTemplate(templateName);
    if (!template) {
      throw new Error(`Template '${templateName}' not found`);
    }

    const targetArn = template.defaultTarget 
      ? awsSchedulerConfig.lambdaFunctions[template.defaultTarget as keyof typeof awsSchedulerConfig.lambdaFunctions]
      : '';

    if (!targetArn) {
      throw new Error(`Target ARN not configured for template '${templateName}'`);
    }

    const config: ScheduleConfig = {
      name: customName || `${templateName}-${Date.now()}`,
      description: template.description,
      scheduleExpression: template.scheduleExpression,
      target: {
        arn: targetArn,
        roleArn: awsSchedulerConfig.roles.defaultSchedulerRole,
        input: JSON.stringify({
          type: template.name,
          automated: true,
          ...customInput
        }),
        retryPolicy: template.retryPolicy
      }
    };

    return await createSchedule(config);
  }, [createSchedule]);

  const getAvailableTemplates = useCallback(() => {
    return awsSchedulerConfig.scheduleTemplates;
  }, []);

  return {
    createFromTemplate,
    getAvailableTemplates,
    scheduleExpressions: awsSchedulerConfig.scheduleExpressions
  };
};

export default useEventBridgeScheduler;