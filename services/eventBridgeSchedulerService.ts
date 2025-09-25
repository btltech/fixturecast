/**
 * Amazon EventBridge Scheduler Service
 * Handles scheduled tasks for FixtureCast application
 * 
 * Features:
 * - Schedule prediction updates
 * - Automated match result checking
 * - Daily/weekly analytics reports
 * - Performance monitoring alerts
 * - Data cleanup tasks
 * 
 * Security Model:
 * - Public site: Read-only access (view schedules only)
 * - Admin control: Full CRUD via AWS Console/CLI
 */

export interface ScheduleConfig {
  name: string;
  description?: string;
  scheduleExpression: string; // Rate or cron expression
  timezone?: string;
  flexibleTimeWindow?: {
    mode: 'OFF' | 'FLEXIBLE';
    maximumWindowInMinutes?: number;
  };
  target: ScheduleTarget;
  startDate?: Date;
  endDate?: Date;
  state?: 'ENABLED' | 'DISABLED';
}

export interface ScheduleTarget {
  arn: string; // Target ARN (Lambda function, SQS queue, etc.)
  roleArn: string; // IAM role for execution
  input?: string; // JSON payload
  retryPolicy?: {
    maximumRetryAttempts: number;
    maximumEventAge: number;
  };
  deadLetterConfig?: {
    arn: string;
  };
}

export interface ScheduledTask {
  id: string;
  name: string;
  type: 'PREDICTION_UPDATE' | 'MATCH_CHECK' | 'ANALYTICS' | 'CLEANUP' | 'ALERT';
  schedule: string;
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
  status: 'ACTIVE' | 'PAUSED' | 'ERROR' | 'COMPLETED';
  metadata?: Record<string, any>;
}

export class EventBridgeSchedulerService {
  private scheduler: any; // AWS Scheduler client
  private eventBridge: any; // AWS EventBridge client
  private config: {
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    scheduleGroupName: string;
    defaultRoleArn: string;
  } | null = null;
  private isInitialized = false;
  private readOnlyMode = false; // Public site runs in read-only mode
  private scheduledTasks = new Map<string, ScheduledTask>();

  constructor() {
    this.initialize();
  }

  /**
   * Initialize the EventBridge Scheduler service
   */
  private async initialize(): Promise<void> {
    try {
      // Load AWS configuration from environment variables
      const region = (import.meta as any).env?.VITE_AWS_REGION || 'us-east-1';
      const accessKeyId = (import.meta as any).env?.VITE_AWS_ACCESS_KEY_ID;
      const secretAccessKey = (import.meta as any).env?.VITE_AWS_SECRET_ACCESS_KEY;
      const scheduleGroupName = (import.meta as any).env?.VITE_AWS_SCHEDULE_GROUP || 'fixturecast-schedules';
      const defaultRoleArn = (import.meta as any).env?.VITE_AWS_SCHEDULER_ROLE_ARN;
      
      // Check if running in read-only mode (for public site)
      this.readOnlyMode = (import.meta as any).env?.VITE_SCHEDULER_READ_ONLY === 'true';
      
      if (this.readOnlyMode) {
        console.info('EventBridge Scheduler running in READ-ONLY mode for public site.');
      }

      if (!accessKeyId || !secretAccessKey) {
        console.warn('AWS credentials not found. EventBridge Scheduler will run in mock mode.');
        this.initializeMockMode();
        return;
      }

      this.config = {
        region,
        accessKeyId,
        secretAccessKey,
        scheduleGroupName,
        defaultRoleArn: defaultRoleArn || ''
      };

      // Initialize AWS clients (would normally import from AWS SDK)
      await this.initializeAWSClients();
      
      this.isInitialized = true;
      console.log('📅 EventBridge Scheduler service initialized');
      
      // Setup default schedules
      await this.setupDefaultSchedules();
      
    } catch (error) {
      console.error('Failed to initialize EventBridge Scheduler service:', error);
      this.initializeMockMode();
    }
  }

  /**
   * Initialize AWS clients (placeholder for actual AWS SDK implementation)
   */
  private async initializeAWSClients(): Promise<void> {
    if (typeof window !== 'undefined') {
      // Client-side: Use AWS SDK for JavaScript
      console.log('Initializing client-side AWS SDK...');
      // Actual implementation would use:
      // import { SchedulerClient } from '@aws-sdk/client-scheduler';
      // import { EventBridgeClient } from '@aws-sdk/client-eventbridge';
      // this.scheduler = new SchedulerClient({ region: this.config!.region, credentials: {...} });
      // this.eventBridge = new EventBridgeClient({ region: this.config!.region, credentials: {...} });
    } else {
      // Server-side: Use AWS SDK for Node.js
      console.log('Initializing server-side AWS SDK...');
      // Actual implementation would use AWS SDK v3
    }
  }

  /**
   * Initialize mock mode for development/testing
   */
  private initializeMockMode(): void {
    console.log('🧪 EventBridge Scheduler running in mock mode');
    this.isInitialized = true;
    this.scheduler = new MockSchedulerClient();
    this.eventBridge = new MockEventBridgeClient();
    this.config = {
      region: 'us-east-1',
      accessKeyId: 'mock-key',
      secretAccessKey: 'mock-secret',
      scheduleGroupName: 'fixturecast-schedules-mock',
      defaultRoleArn: 'arn:aws:iam::123456789012:role/mock-scheduler-role'
    };
  }

  /**
   * Create a new schedule
   */
  public async createSchedule(config: ScheduleConfig): Promise<boolean> {
    if (!this.isInitialized) {
      throw new Error('EventBridge Scheduler service not initialized');
    }

    if (this.readOnlyMode) {
      throw new Error('Schedule creation not allowed in read-only mode. Contact administrator.');
    }

    try {
      const scheduleInput: any = {
        Name: config.name,
        Description: config.description,
        ScheduleExpression: config.scheduleExpression,
        State: config.state || 'ENABLED',
        GroupName: this.config!.scheduleGroupName,
        FlexibleTimeWindow: config.flexibleTimeWindow || { Mode: 'OFF' },
        Target: {
          Arn: config.target.arn,
          RoleArn: config.target.roleArn,
          Input: config.target.input,
          RetryPolicy: config.target.retryPolicy,
          DeadLetterConfig: config.target.deadLetterConfig
        }
      };

      if (config.startDate) {
        scheduleInput.StartDate = config.startDate;
      }

      if (config.endDate) {
        scheduleInput.EndDate = config.endDate;
      }

      // Create the schedule using AWS SDK
      const result = await this.scheduler.createSchedule(scheduleInput);
      
      // Track the scheduled task
      const task: ScheduledTask = {
        id: config.name,
        name: config.name,
        type: this.inferTaskType(config.name),
        schedule: config.scheduleExpression,
        enabled: config.state !== 'DISABLED',
        nextRun: this.calculateNextRun(config.scheduleExpression),
        status: 'ACTIVE',
        metadata: { targetArn: config.target.arn }
      };

      this.scheduledTasks.set(config.name, task);
      
      console.log(`✅ Schedule created: ${config.name}`);
      return true;
      
    } catch (error) {
      console.error(`Failed to create schedule ${config.name}:`, error);
      return false;
    }
  }

  /**
   * Update an existing schedule
   */
  public async updateSchedule(name: string, config: Partial<ScheduleConfig>): Promise<boolean> {
    if (!this.isInitialized) {
      throw new Error('EventBridge Scheduler service not initialized');
    }

    if (this.readOnlyMode) {
      throw new Error('Schedule modification not allowed in read-only mode. Contact administrator.');
    }

    try {
      const updateInput = {
        Name: name,
        GroupName: this.config!.scheduleGroupName,
        ...config
      };

      await this.scheduler.updateSchedule(updateInput);
      
      // Update local tracking
      const task = this.scheduledTasks.get(name);
      if (task) {
        if (config.scheduleExpression) {
          task.schedule = config.scheduleExpression;
          task.nextRun = this.calculateNextRun(config.scheduleExpression);
        }
        if (config.state !== undefined) {
          task.enabled = config.state !== 'DISABLED';
        }
        this.scheduledTasks.set(name, task);
      }
      
      console.log(`✅ Schedule updated: ${name}`);
      return true;
      
    } catch (error) {
      console.error(`Failed to update schedule ${name}:`, error);
      return false;
    }
  }

  /**
   * Delete a schedule
   */
  public async deleteSchedule(name: string): Promise<boolean> {
    if (!this.isInitialized) {
      throw new Error('EventBridge Scheduler service not initialized');
    }

    if (this.readOnlyMode) {
      throw new Error('Schedule deletion not allowed in read-only mode. Contact administrator.');
    }

    try {
      await this.scheduler.deleteSchedule({
        Name: name,
        GroupName: this.config!.scheduleGroupName
      });
      
      this.scheduledTasks.delete(name);
      
      console.log(`✅ Schedule deleted: ${name}`);
      return true;
      
    } catch (error) {
      console.error(`Failed to delete schedule ${name}:`, error);
      return false;
    }
  }

  /**
   * Get schedule details
   */
  public async getSchedule(name: string): Promise<any> {
    if (!this.isInitialized) {
      throw new Error('EventBridge Scheduler service not initialized');
    }

    try {
      const result = await this.scheduler.getSchedule({
        Name: name,
        GroupName: this.config!.scheduleGroupName
      });
      
      return result;
      
    } catch (error) {
      console.error(`Failed to get schedule ${name}:`, error);
      return null;
    }
  }

  /**
   * List all schedules
   */
  public async listSchedules(): Promise<any[]> {
    if (!this.isInitialized) {
      throw new Error('EventBridge Scheduler service not initialized');
    }

    try {
      const result = await this.scheduler.listSchedules({
        GroupName: this.config!.scheduleGroupName
      });
      
      return result.Schedules || [];
      
    } catch (error) {
      console.error('Failed to list schedules:', error);
      return [];
    }
  }

  /**
   * Setup default schedules for FixtureCast
   */
  private async setupDefaultSchedules(): Promise<void> {
    const defaultSchedules: ScheduleConfig[] = [
      {
        name: 'daily-predictions-update',
        description: 'Update predictions for upcoming matches daily at 6 AM UTC',
        scheduleExpression: 'cron(0 6 * * ? *)', // Daily at 6 AM UTC
        target: {
          arn: 'arn:aws:lambda:us-east-1:123456789012:function:fixturecast-prediction-update',
          roleArn: this.config!.defaultRoleArn,
          input: JSON.stringify({ type: 'daily-prediction-update', automated: true }),
          retryPolicy: {
            maximumRetryAttempts: 3,
            maximumEventAge: 86400 // 24 hours
          }
        }
      },
      {
        name: 'hourly-match-check',
        description: 'Check for live match updates every hour',
        scheduleExpression: 'rate(1 hour)',
        target: {
          arn: 'arn:aws:lambda:us-east-1:123456789012:function:fixturecast-match-check',
          roleArn: this.config!.defaultRoleArn,
          input: JSON.stringify({ type: 'match-status-check', automated: true }),
          retryPolicy: {
            maximumRetryAttempts: 2,
            maximumEventAge: 3600 // 1 hour
          }
        }
      },
      {
        name: 'weekly-analytics-report',
        description: 'Generate weekly analytics report every Sunday at midnight',
        scheduleExpression: 'cron(0 0 ? * SUN *)', // Every Sunday at midnight
        target: {
          arn: 'arn:aws:lambda:us-east-1:123456789012:function:fixturecast-analytics',
          roleArn: this.config!.defaultRoleArn,
          input: JSON.stringify({ type: 'weekly-analytics', automated: true }),
          retryPolicy: {
            maximumRetryAttempts: 1,
            maximumEventAge: 86400 // 24 hours
          }
        }
      },
      {
        name: 'daily-cleanup',
        description: 'Clean up old prediction data daily at 2 AM UTC',
        scheduleExpression: 'cron(0 2 * * ? *)', // Daily at 2 AM UTC
        target: {
          arn: 'arn:aws:lambda:us-east-1:123456789012:function:fixturecast-cleanup',
          roleArn: this.config!.defaultRoleArn,
          input: JSON.stringify({ type: 'data-cleanup', automated: true, daysToKeep: 90 }),
          retryPolicy: {
            maximumRetryAttempts: 2,
            maximumEventAge: 86400 // 24 hours
          }
        }
      }
    ];

    for (const schedule of defaultSchedules) {
      // Check if schedule already exists
      const existing = await this.getSchedule(schedule.name);
      if (!existing) {
        await this.createSchedule(schedule);
      }
    }
  }

  /**
   * Create match-specific schedule
   */
  public async scheduleMatchUpdate(matchId: string, matchDate: Date): Promise<boolean> {
    const scheduleName = `match-update-${matchId}`;
    
    // Schedule check 30 minutes before match
    const checkTime = new Date(matchDate.getTime() - 30 * 60 * 1000);
    
    const config: ScheduleConfig = {
      name: scheduleName,
      description: `Pre-match update for match ${matchId}`,
      scheduleExpression: `at(${checkTime.toISOString()})`,
      endDate: new Date(matchDate.getTime() + 3 * 60 * 60 * 1000), // 3 hours after match
      target: {
        arn: 'arn:aws:lambda:us-east-1:123456789012:function:fixturecast-match-update',
        roleArn: this.config!.defaultRoleArn,
        input: JSON.stringify({ type: 'pre-match-update', matchId, matchDate: matchDate.toISOString() })
      }
    };

    return await this.createSchedule(config);
  }

  /**
   * Get all scheduled tasks
   */
  public getScheduledTasks(): ScheduledTask[] {
    return Array.from(this.scheduledTasks.values());
  }

  /**
   * Get tasks by type
   */
  public getTasksByType(type: ScheduledTask['type']): ScheduledTask[] {
    return Array.from(this.scheduledTasks.values()).filter(task => task.type === type);
  }

  /**
   * Pause a schedule
   */
  public async pauseSchedule(name: string): Promise<boolean> {
    return await this.updateSchedule(name, { state: 'DISABLED' });
  }

  /**
   * Resume a schedule
   */
  public async resumeSchedule(name: string): Promise<boolean> {
    return await this.updateSchedule(name, { state: 'ENABLED' });
  }

  /**
   * Get service status
   */
  public getStatus(): {
    initialized: boolean;
    mode: 'AWS' | 'MOCK';
    region?: string;
    scheduledTasks: number;
    activeTasks: number;
  } {
    const tasks = Array.from(this.scheduledTasks.values());
    return {
      initialized: this.isInitialized,
      mode: this.config?.accessKeyId === 'mock-key' ? 'MOCK' : 'AWS',
      region: this.config?.region,
      scheduledTasks: tasks.length,
      activeTasks: tasks.filter(t => t.enabled && t.status === 'ACTIVE').length
    };
  }

  /**
   * Private helper methods
   */
  private inferTaskType(name: string): ScheduledTask['type'] {
    if (name.includes('prediction')) return 'PREDICTION_UPDATE';
    if (name.includes('match')) return 'MATCH_CHECK';
    if (name.includes('analytics')) return 'ANALYTICS';
    if (name.includes('cleanup')) return 'CLEANUP';
    if (name.includes('alert')) return 'ALERT';
    return 'PREDICTION_UPDATE';
  }

  private calculateNextRun(scheduleExpression: string): Date {
    // Simplified next run calculation
    // In a real implementation, you'd use a proper cron parser
    const now = new Date();
    if (scheduleExpression.startsWith('rate(')) {
      const match = scheduleExpression.match(/rate\((\d+) (minute|hour|day)s?\)/);
      if (match) {
        const [, amount, unit] = match;
        const multiplier = unit === 'minute' ? 60000 : unit === 'hour' ? 3600000 : 86400000;
        return new Date(now.getTime() + parseInt(amount) * multiplier);
      }
    }
    // Default to 1 hour from now
    return new Date(now.getTime() + 3600000);
  }
}

/**
 * Mock clients for development/testing
 */
class MockSchedulerClient {
  private schedules = new Map<string, any>();

  async createSchedule(input: any): Promise<any> {
    console.log('🧪 Mock: Creating schedule', input.Name);
    this.schedules.set(input.Name, input);
    return { ScheduleArn: `arn:aws:scheduler:us-east-1:123456789012:schedule/mock/${input.Name}` };
  }

  async updateSchedule(input: any): Promise<any> {
    console.log('🧪 Mock: Updating schedule', input.Name);
    const existing = this.schedules.get(input.Name);
    if (existing) {
      this.schedules.set(input.Name, { ...existing, ...input });
    }
    return {};
  }

  async deleteSchedule(input: any): Promise<any> {
    console.log('🧪 Mock: Deleting schedule', input.Name);
    this.schedules.delete(input.Name);
    return {};
  }

  async getSchedule(input: any): Promise<any> {
    return this.schedules.get(input.Name) || null;
  }

  async listSchedules(input: any): Promise<any> {
    return {
      Schedules: Array.from(this.schedules.values())
    };
  }
}

class MockEventBridgeClient {
  async putEvents(input: any): Promise<any> {
    console.log('🧪 Mock: Putting events', input);
    return { Entries: input.Entries.map(() => ({ EventId: 'mock-event-id' })) };
  }
}

// Create singleton instance
export const eventBridgeSchedulerService = new EventBridgeSchedulerService();