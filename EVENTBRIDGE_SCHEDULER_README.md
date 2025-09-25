# EventBridge Scheduler Implementation for FixtureCast

## Overview

This implementation adds Amazon EventBridge Scheduler capabilities to your FixtureCast application, enabling automated scheduling of predictions, match updates, analytics reports, and cleanup tasks.

## 🚀 Features

### ✅ Core Scheduler Service
- **EventBridge Scheduler Service** (`services/eventBridgeSchedulerService.ts`)
- **AWS Configuration** (`config/awsSchedulerConfig.ts`)
- **React Hooks** (`hooks/useEventBridgeScheduler.ts`)
- **Dashboard Component** (`components/EventBridgeSchedulerDashboard.tsx`)

### ✅ Automated Tasks
- **Prediction Updates**: Hourly and daily prediction updates
- **Match Status Checks**: Real-time match status monitoring
- **Analytics Reports**: Daily, weekly, and monthly analytics
- **Data Cleanup**: Automated old data cleanup
- **Custom Schedules**: Create custom scheduling tasks

### ✅ Lambda Functions
- **Prediction Update** (`aws-lambda/prediction-update.js`)
- **Match Status Check** (`aws-lambda/match-check.js`)
- Error handling and retry logic
- CloudWatch logging and monitoring

## 📦 What's Included

### Services
```typescript
// Main scheduler service
import { eventBridgeSchedulerService } from './services/eventBridgeSchedulerService';

// Configuration
import { awsSchedulerConfig } from './config/awsSchedulerConfig';
```

### React Components
```typescript
// Dashboard for managing schedules
import EventBridgeSchedulerDashboard from './components/EventBridgeSchedulerDashboard';

// Integration example
import SchedulerIntegration from './components/SchedulerIntegration';
```

### React Hooks
```typescript
// Main scheduler hook
import { useEventBridgeScheduler } from './hooks/useEventBridgeScheduler';

// Specialized hooks
import { 
  useMatchScheduling,
  usePredictionScheduling,
  useAnalyticsScheduling 
} from './hooks/useEventBridgeScheduler';
```

## 🔧 Quick Setup

### 1. Environment Variables

Add these to your `.env` file:

```bash
# AWS Configuration
VITE_AWS_REGION=us-east-1
VITE_AWS_ACCESS_KEY_ID=your_access_key
VITE_AWS_SECRET_ACCESS_KEY=your_secret_key
VITE_AWS_SCHEDULE_GROUP=fixturecast-schedules

# IAM Roles
VITE_AWS_SCHEDULER_ROLE_ARN=arn:aws:iam::account:role/FixtureCastSchedulerRole
VITE_AWS_LAMBDA_EXECUTION_ROLE=arn:aws:iam::account:role/FixtureCastLambdaRole

# Lambda Functions
VITE_LAMBDA_PREDICTION_UPDATE=arn:aws:lambda:region:account:function:fixturecast-prediction-update
VITE_LAMBDA_MATCH_CHECK=arn:aws:lambda:region:account:function:fixturecast-match-check
VITE_LAMBDA_ANALYTICS=arn:aws:lambda:region:account:function:fixturecast-analytics
```

### 2. Basic Usage

```typescript
import React from 'react';
import { useEventBridgeScheduler } from './hooks/useEventBridgeScheduler';

function MyComponent() {
  const {
    scheduledTasks,
    createSchedule,
    scheduleMatchUpdate,
    loading,
    error
  } = useEventBridgeScheduler();

  const handleCreateSchedule = async () => {
    const config = {
      name: 'my-custom-schedule',
      description: 'Custom prediction update',
      scheduleExpression: 'rate(1 hour)',
      target: {
        arn: 'arn:aws:lambda:us-east-1:account:function:my-function',
        roleArn: 'arn:aws:iam::account:role/MyRole',
        input: JSON.stringify({ type: 'custom-task' })
      }
    };

    const success = await createSchedule(config);
    console.log('Schedule created:', success);
  };

  if (loading) return <div>Loading scheduler...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h2>Scheduled Tasks: {scheduledTasks.length}</h2>
      <button onClick={handleCreateSchedule}>
        Create Schedule
      </button>
    </div>
  );
}
```

### 3. Add Dashboard to Your App

```typescript
import React from 'react';
import EventBridgeSchedulerDashboard from './components/EventBridgeSchedulerDashboard';
import SchedulerIntegration from './components/SchedulerIntegration';

function App() {
  return (
    <div>
      {/* Quick integration with stats */}
      <SchedulerIntegration />
      
      {/* Full dashboard */}
      <EventBridgeSchedulerDashboard />
    </div>
  );
}
```

## 🎯 Common Use Cases

### Schedule Match Updates

```typescript
import { useMatchScheduling } from './hooks/useEventBridgeScheduler';

function MatchComponent({ match }) {
  const { schedulePreMatchUpdate } = useMatchScheduling();
  
  const handleScheduleUpdate = async () => {
    const success = await schedulePreMatchUpdate(
      match.id, 
      new Date(match.date), 
      30 // 30 minutes before
    );
    
    if (success) {
      console.log('Match update scheduled');
    }
  };

  return (
    <button onClick={handleScheduleUpdate}>
      Schedule Pre-match Update
    </button>
  );
}
```

### Create Analytics Schedules

```typescript
import { useAnalyticsScheduling } from './hooks/useEventBridgeScheduler';

function AnalyticsComponent() {
  const { createAnalyticsSchedule } = useAnalyticsScheduling();
  
  const handleCreateDailyReport = async () => {
    const success = await createAnalyticsSchedule(
      'daily-accuracy-report',
      'cron(0 6 * * ? *)', // Daily at 6 AM
      'daily'
    );
    
    console.log('Analytics schedule created:', success);
  };

  return (
    <button onClick={handleCreateDailyReport}>
      Create Daily Analytics
    </button>
  );
}
```

## 🏗️ AWS Infrastructure Setup

### Prerequisites
- AWS CLI configured
- Appropriate IAM permissions
- EventBridge Scheduler enabled in your region

### Quick Deploy Commands

```bash
# 1. Create IAM roles
aws iam create-role --role-name FixtureCastSchedulerRole --assume-role-policy-document file://scheduler-trust-policy.json

# 2. Create Lambda functions
aws lambda create-function --function-name fixturecast-prediction-update --runtime nodejs18.x --role arn:aws:iam::account:role/FixtureCastLambdaRole --handler prediction-update.handler --zip-file fileb://prediction-update.zip

# 3. Create schedule group
aws scheduler create-schedule-group --name fixturecast-schedules

# 4. Create default schedules
aws scheduler create-schedule --name hourly-predictions --group-name fixturecast-schedules --schedule-expression "rate(1 hour)" --target file://prediction-target.json
```

See [AWS EventBridge Scheduler Setup Guide](./docs/AWS_EVENTBRIDGE_SCHEDULER_SETUP.md) for detailed instructions.

## 📊 Monitoring & Analytics

### Built-in Features
- **Execution Logging**: All schedule executions are logged
- **Error Tracking**: Failed executions trigger alerts
- **Performance Metrics**: Duration and success rates tracked
- **CloudWatch Integration**: Logs and metrics sent to CloudWatch

### Dashboard Features
- **Real-time Status**: View active, paused, and error schedules
- **Task Statistics**: Breakdown by type and status
- **Quick Actions**: Pause, resume, delete schedules
- **Create Wizard**: Easy schedule creation interface

## 🔒 Security Features

- **IAM Role-based Access**: Least privilege permissions
- **Encrypted Payloads**: Sensitive data encrypted in transit
- **Audit Logging**: All scheduler actions logged
- **Error Isolation**: Failed tasks don't affect others

## 🚦 Operating Modes

### 1. Production Mode
- Full AWS EventBridge Scheduler integration
- Real Lambda function execution
- CloudWatch monitoring
- SNS alerts

### 2. Development Mode
- Local AWS credentials
- Test Lambda functions
- Reduced logging
- Development alerts

### 3. Mock Mode
- No AWS dependencies
- Simulated scheduling
- Local testing
- Console logging

## 📈 Performance Optimization

### Cost Optimization
- **Flexible Time Windows**: Reduce costs for non-critical tasks
- **Batch Processing**: Process multiple items per execution
- **Smart Scheduling**: Avoid peak hours for non-urgent tasks
- **Auto-cleanup**: Remove completed one-time schedules

### Performance Tips
- Use appropriate retry policies
- Set realistic timeout values
- Monitor execution metrics
- Optimize Lambda memory allocation

## 🧪 Testing

### Unit Tests
```bash
npm run test:scheduler
```

### Integration Tests
```bash
# Test with mock AWS services
npm run test:scheduler:integration

# Test with real AWS (requires credentials)
npm run test:scheduler:aws
```

### Manual Testing
```typescript
// Test schedule creation
const testConfig = {
  name: 'test-schedule',
  scheduleExpression: 'rate(5 minutes)',
  target: { /* ... */ }
};

await eventBridgeSchedulerService.createSchedule(testConfig);
```

## 📚 API Reference

### EventBridgeSchedulerService

```typescript
interface EventBridgeSchedulerService {
  createSchedule(config: ScheduleConfig): Promise<boolean>;
  updateSchedule(name: string, config: Partial<ScheduleConfig>): Promise<boolean>;
  deleteSchedule(name: string): Promise<boolean>;
  pauseSchedule(name: string): Promise<boolean>;
  resumeSchedule(name: string): Promise<boolean>;
  scheduleMatchUpdate(matchId: string, matchDate: Date): Promise<boolean>;
  getScheduledTasks(): ScheduledTask[];
  getStatus(): ServiceStatus;
}
```

### Schedule Configuration

```typescript
interface ScheduleConfig {
  name: string;
  description?: string;
  scheduleExpression: string; // 'rate(1 hour)' or 'cron(0 6 * * ? *)'
  timezone?: string;
  target: ScheduleTarget;
  startDate?: Date;
  endDate?: Date;
  state?: 'ENABLED' | 'DISABLED';
}
```

## 🤝 Contributing

### Adding New Schedule Types

1. Add template to `awsSchedulerConfig.ts`
2. Create corresponding Lambda function
3. Add UI components if needed
4. Update tests and documentation

### Example: Adding Custom Schedule Type

```typescript
// 1. Add to config
const newTemplate: ScheduleTemplate = {
  name: 'custom-task',
  description: 'Custom scheduled task',
  scheduleExpression: 'rate(2 hours)',
  targetType: 'LAMBDA',
  category: 'CUSTOM',
  retryPolicy: { maximumRetryAttempts: 2, maximumEventAge: 7200 }
};

// 2. Create Lambda function
// aws-lambda/custom-task.js

// 3. Add to hooks
export const useCustomScheduling = () => {
  // Implementation
};
```

## 📞 Support

### Common Issues

1. **"Schedule not triggering"**
   - Check IAM permissions
   - Verify target ARN
   - Review schedule expression

2. **"Lambda timeout errors"**
   - Increase timeout setting
   - Optimize function code
   - Check memory allocation

3. **"Permission denied"**
   - Verify IAM roles
   - Check resource policies
   - Review cross-account permissions

### Getting Help

- Check the [Setup Guide](./docs/AWS_EVENTBRIDGE_SCHEDULER_SETUP.md)
- Review CloudWatch logs
- Test with mock mode first
- Contact AWS support for service issues

## 🎉 What's Next?

This EventBridge Scheduler implementation provides:

✅ **Complete scheduling infrastructure**  
✅ **Production-ready Lambda functions**  
✅ **React dashboard and hooks**  
✅ **Comprehensive monitoring**  
✅ **Security best practices**  
✅ **Cost optimization features**

You can now:
1. **Schedule automated prediction updates**
2. **Monitor match status in real-time**  
3. **Generate analytics reports automatically**
4. **Clean up old data systematically**
5. **Create custom scheduling workflows**

The implementation is designed to scale with your application and provides enterprise-grade reliability for your FixtureCast scheduling needs! 🚀