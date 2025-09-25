/**
 * AWS EventBridge Scheduler Configuration
 * Environment variables and settings for EventBridge Scheduler integration
 */

export interface AWSSchedulerConfig {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  scheduleGroupName: string;
  defaultRoleArn: string;
  defaultLambdaExecutionRole: string;
  enabled: boolean;
}

export interface ScheduleTemplate {
  name: string;
  description: string;
  scheduleExpression: string;
  targetType: 'LAMBDA' | 'SQS' | 'SNS' | 'EVENTBRIDGE' | 'STEP_FUNCTIONS';
  defaultTarget?: string;
  category: 'PREDICTION' | 'MATCH_UPDATE' | 'ANALYTICS' | 'CLEANUP' | 'MONITORING';
  retryPolicy: {
    maximumRetryAttempts: number;
    maximumEventAge: number;
  };
}

/**
 * AWS EventBridge Scheduler Configuration
 */
export const awsSchedulerConfig = {
  // AWS Configuration
  aws: {
    region: (import.meta as any).env?.VITE_AWS_REGION || 'us-east-1',
    accessKeyId: (import.meta as any).env?.VITE_AWS_ACCESS_KEY_ID || '',
    secretAccessKey: (import.meta as any).env?.VITE_AWS_SECRET_ACCESS_KEY || '',
    sessionToken: (import.meta as any).env?.VITE_AWS_SESSION_TOKEN || '',
    scheduleGroupName: (import.meta as any).env?.VITE_AWS_SCHEDULE_GROUP || 'fixturecast-schedules',
    enabled: !!(import.meta as any).env?.VITE_AWS_ACCESS_KEY_ID
  },

  // IAM Roles
  roles: {
    defaultSchedulerRole: (import.meta as any).env?.VITE_AWS_SCHEDULER_ROLE_ARN || 'arn:aws:iam::123456789012:role/FixtureCastSchedulerRole',
    lambdaExecutionRole: (import.meta as any).env?.VITE_AWS_LAMBDA_EXECUTION_ROLE || 'arn:aws:iam::123456789012:role/FixtureCastLambdaRole'
  },

  // Default Lambda Functions
  lambdaFunctions: {
    predictionUpdate: (import.meta as any).env?.VITE_LAMBDA_PREDICTION_UPDATE || 'arn:aws:lambda:us-east-1:123456789012:function:fixturecast-prediction-update',
    matchCheck: (import.meta as any).env?.VITE_LAMBDA_MATCH_CHECK || 'arn:aws:lambda:us-east-1:123456789012:function:fixturecast-match-check',
    analyticsReport: (import.meta as any).env?.VITE_LAMBDA_ANALYTICS || 'arn:aws:lambda:us-east-1:123456789012:function:fixturecast-analytics',
    dataCleanup: (import.meta as any).env?.VITE_LAMBDA_CLEANUP || 'arn:aws:lambda:us-east-1:123456789012:function:fixturecast-cleanup',
    alerting: (import.meta as any).env?.VITE_LAMBDA_ALERTING || 'arn:aws:lambda:us-east-1:123456789012:function:fixturecast-alerting'
  },

  // Schedule Templates
  scheduleTemplates: [
    {
      name: 'hourly-predictions',
      description: 'Update predictions for upcoming matches every hour',
      scheduleExpression: 'rate(1 hour)',
      targetType: 'LAMBDA' as const,
      defaultTarget: 'predictionUpdate',
      category: 'PREDICTION' as const,
      retryPolicy: {
        maximumRetryAttempts: 3,
        maximumEventAge: 3600 // 1 hour
      }
    },
    {
      name: 'daily-predictions',
      description: 'Daily prediction update at 6 AM UTC',
      scheduleExpression: 'cron(0 6 * * ? *)',
      targetType: 'LAMBDA' as const,
      defaultTarget: 'predictionUpdate',
      category: 'PREDICTION' as const,
      retryPolicy: {
        maximumRetryAttempts: 3,
        maximumEventAge: 86400 // 24 hours
      }
    },
    {
      name: 'match-status-check',
      description: 'Check live match status every 15 minutes',
      scheduleExpression: 'rate(15 minutes)',
      targetType: 'LAMBDA' as const,
      defaultTarget: 'matchCheck',
      category: 'MATCH_UPDATE' as const,
      retryPolicy: {
        maximumRetryAttempts: 2,
        maximumEventAge: 1800 // 30 minutes
      }
    },
    {
      name: 'pre-match-update',
      description: 'Update predictions 30 minutes before match start',
      scheduleExpression: 'dynamic', // Will be calculated based on match time
      targetType: 'LAMBDA' as const,
      defaultTarget: 'predictionUpdate',
      category: 'MATCH_UPDATE' as const,
      retryPolicy: {
        maximumRetryAttempts: 2,
        maximumEventAge: 3600 // 1 hour
      }
    },
    {
      name: 'weekly-analytics',
      description: 'Generate weekly analytics report every Sunday',
      scheduleExpression: 'cron(0 0 ? * SUN *)',
      targetType: 'LAMBDA' as const,
      defaultTarget: 'analyticsReport',
      category: 'ANALYTICS' as const,
      retryPolicy: {
        maximumRetryAttempts: 1,
        maximumEventAge: 86400 // 24 hours
      }
    },
    {
      name: 'monthly-analytics',
      description: 'Generate monthly analytics report on the 1st of each month',
      scheduleExpression: 'cron(0 2 1 * ? *)',
      targetType: 'LAMBDA' as const,
      defaultTarget: 'analyticsReport',
      category: 'ANALYTICS' as const,
      retryPolicy: {
        maximumRetryAttempts: 1,
        maximumEventAge: 172800 // 48 hours
      }
    },
    {
      name: 'daily-cleanup',
      description: 'Clean up old data daily at 2 AM UTC',
      scheduleExpression: 'cron(0 2 * * ? *)',
      targetType: 'LAMBDA' as const,
      defaultTarget: 'dataCleanup',
      category: 'CLEANUP' as const,
      retryPolicy: {
        maximumRetryAttempts: 2,
        maximumEventAge: 86400 // 24 hours
      }
    },
    {
      name: 'performance-monitoring',
      description: 'Monitor application performance every 5 minutes',
      scheduleExpression: 'rate(5 minutes)',
      targetType: 'LAMBDA' as const,
      defaultTarget: 'alerting',
      category: 'MONITORING' as const,
      retryPolicy: {
        maximumRetryAttempts: 1,
        maximumEventAge: 600 // 10 minutes
      }
    }
  ] as ScheduleTemplate[],

  // Schedule Expression Helpers
  scheduleExpressions: {
    // Rate expressions
    rates: {
      '1_minute': 'rate(1 minute)',
      '5_minutes': 'rate(5 minutes)',
      '15_minutes': 'rate(15 minutes)',
      '30_minutes': 'rate(30 minutes)',
      '1_hour': 'rate(1 hour)',
      '6_hours': 'rate(6 hours)',
      '12_hours': 'rate(12 hours)',
      '1_day': 'rate(1 day)',
      '7_days': 'rate(7 days)'
    },
    // Cron expressions
    crons: {
      'daily_6am': 'cron(0 6 * * ? *)',
      'daily_midnight': 'cron(0 0 * * ? *)',
      'weekdays_9am': 'cron(0 9 ? * MON-FRI *)',
      'weekend_10am': 'cron(0 10 ? * SAT,SUN *)',
      'weekly_sunday': 'cron(0 0 ? * SUN *)',
      'monthly_1st': 'cron(0 0 1 * ? *)',
      'match_day_morning': 'cron(0 8 * * ? *)', // 8 AM on match days
      'pre_match_30min': 'dynamic' // Calculated based on match time
    }
  },

  // Default retry policies by category
  defaultRetryPolicies: {
    PREDICTION: {
      maximumRetryAttempts: 3,
      maximumEventAge: 86400 // 24 hours
    },
    MATCH_UPDATE: {
      maximumRetryAttempts: 2,
      maximumEventAge: 3600 // 1 hour
    },
    ANALYTICS: {
      maximumRetryAttempts: 1,
      maximumEventAge: 172800 // 48 hours
    },
    CLEANUP: {
      maximumRetryAttempts: 2,
      maximumEventAge: 86400 // 24 hours
    },
    MONITORING: {
      maximumRetryAttempts: 1,
      maximumEventAge: 600 // 10 minutes
    }
  },

  // Cost optimization settings
  costOptimization: {
    // Use flexible time windows to reduce costs
    flexibleTimeWindows: {
      PREDICTION: {
        mode: 'FLEXIBLE' as const,
        maximumWindowInMinutes: 15
      },
      ANALYTICS: {
        mode: 'FLEXIBLE' as const,
        maximumWindowInMinutes: 60
      },
      CLEANUP: {
        mode: 'FLEXIBLE' as const,
        maximumWindowInMinutes: 30
      },
      MATCH_UPDATE: {
        mode: 'OFF' as const // Critical timing
      },
      MONITORING: {
        mode: 'OFF' as const // Critical timing
      }
    },
    // Automatic cleanup of completed schedules
    autoCleanup: {
      enabled: true,
      retentionDays: 30,
      cleanupSchedule: 'cron(0 3 * * ? *)' // 3 AM daily
    }
  }
};

/**
 * Helper function to get schedule template by name
 */
export function getScheduleTemplate(name: string): ScheduleTemplate | undefined {
  return awsSchedulerConfig.scheduleTemplates.find(template => template.name === name);
}

/**
 * Helper function to get schedule templates by category
 */
export function getScheduleTemplatesByCategory(category: ScheduleTemplate['category']): ScheduleTemplate[] {
  return awsSchedulerConfig.scheduleTemplates.filter(template => template.category === category);
}

/**
 * Helper function to build Lambda ARN from function name
 */
export function buildLambdaArn(functionName: string, region?: string, accountId?: string): string {
  const awsRegion = region || awsSchedulerConfig.aws.region;
  const awsAccountId = accountId || '123456789012'; // Should be from environment
  return `arn:aws:lambda:${awsRegion}:${awsAccountId}:function:${functionName}`;
}

/**
 * Helper function to validate schedule expression
 */
export function validateScheduleExpression(expression: string): { valid: boolean; error?: string } {
  // Basic validation for rate and cron expressions
  if (expression.startsWith('rate(')) {
    const rateMatch = expression.match(/^rate\((\d+)\s+(minute|minutes|hour|hours|day|days)\)$/);
    if (!rateMatch) {
      return { valid: false, error: 'Invalid rate expression format' };
    }
    const [, amount, unit] = rateMatch;
    const value = parseInt(amount);
    
    if (unit.startsWith('minute') && value > 1440) {
      return { valid: false, error: 'Rate cannot exceed 1440 minutes (24 hours)' };
    }
    if (unit.startsWith('hour') && value > 168) {
      return { valid: false, error: 'Rate cannot exceed 168 hours (7 days)' };
    }
    if (unit.startsWith('day') && value > 365) {
      return { valid: false, error: 'Rate cannot exceed 365 days' };
    }
  } else if (expression.startsWith('cron(')) {
    const cronMatch = expression.match(/^cron\(.+\)$/);
    if (!cronMatch) {
      return { valid: false, error: 'Invalid cron expression format' };
    }
    // Additional cron validation would go here
  } else if (expression.startsWith('at(')) {
    const atMatch = expression.match(/^at\(.+\)$/);
    if (!atMatch) {
      return { valid: false, error: 'Invalid one-time schedule expression format' };
    }
  } else {
    return { valid: false, error: 'Schedule expression must start with rate(), cron(), or at()' };
  }

  return { valid: true };
}

/**
 * Generate schedule expression for match-specific timing
 */
export function generateMatchScheduleExpression(matchDate: Date, minutesBefore: number = 30): string {
  const scheduleTime = new Date(matchDate.getTime() - minutesBefore * 60 * 1000);
  return `at(${scheduleTime.toISOString()})`;
}

/**
 * Check if the service is properly configured
 */
export function isSchedulerConfigured(): boolean {
  return !!(
    awsSchedulerConfig.aws.accessKeyId &&
    awsSchedulerConfig.aws.secretAccessKey &&
    awsSchedulerConfig.aws.region &&
    awsSchedulerConfig.roles.defaultSchedulerRole
  );
}

/**
 * Get configuration status
 */
export function getConfigurationStatus(): {
  configured: boolean;
  hasCredentials: boolean;
  hasRoles: boolean;
  hasLambdaFunctions: boolean;
  mode: 'PRODUCTION' | 'DEVELOPMENT' | 'MOCK';
} {
  const hasCredentials = !!(awsSchedulerConfig.aws.accessKeyId && awsSchedulerConfig.aws.secretAccessKey);
  const hasRoles = !!(awsSchedulerConfig.roles.defaultSchedulerRole && awsSchedulerConfig.roles.lambdaExecutionRole);
  const hasLambdaFunctions = Object.values(awsSchedulerConfig.lambdaFunctions).some(arn => arn && !arn.includes('123456789012'));
  
  let mode: 'PRODUCTION' | 'DEVELOPMENT' | 'MOCK' = 'MOCK';
  if (hasCredentials && hasRoles && hasLambdaFunctions) {
    mode = 'PRODUCTION';
  } else if (hasCredentials) {
    mode = 'DEVELOPMENT';
  }

  return {
    configured: hasCredentials && hasRoles,
    hasCredentials,
    hasRoles,
    hasLambdaFunctions,
    mode
  };
}

export default awsSchedulerConfig;