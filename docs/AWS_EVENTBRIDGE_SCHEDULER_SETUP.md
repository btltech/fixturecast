# AWS EventBridge Scheduler Setup Guide for FixtureCast

## Overview

This guide will help you set up Amazon EventBridge Scheduler for your FixtureCast application, enabling automated scheduling of prediction updates, match status checks, analytics reports, and data cleanup tasks.

## Prerequisites

- AWS CLI configured with appropriate permissions
- Terraform or AWS CDK (optional, for infrastructure as code)
- FixtureCast application deployed and running

## Required AWS Services

1. **Amazon EventBridge Scheduler** - For scheduling tasks
2. **AWS Lambda** - For executing scheduled tasks
3. **Amazon DynamoDB** - For storing match and prediction data
4. **Amazon SNS** - For error alerts and notifications
5. **AWS IAM** - For permissions and roles

## Step 1: Create IAM Roles

### 1.1 EventBridge Scheduler Execution Role

```bash
# Create the scheduler role
aws iam create-role \
  --role-name FixtureCastSchedulerRole \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": { "Service": "scheduler.amazonaws.com" },
      "Action": "sts:AssumeRole"
    }]
  }'

# Attach necessary policies
aws iam attach-role-policy \
  --role-name FixtureCastSchedulerRole \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonEventBridgeSchedulerFullAccess

# Create custom policy for Lambda invocation
aws iam put-role-policy \
  --role-name FixtureCastSchedulerRole \
  --policy-name LambdaInvokePolicy \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Action": [
        "lambda:InvokeFunction"
      ],
      "Resource": "arn:aws:lambda:*:*:function:fixturecast-*"
    }]
  }'
```

### 1.2 Lambda Execution Role

```bash
# Create the Lambda execution role
aws iam create-role \
  --role-name FixtureCastLambdaRole \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": { "Service": "lambda.amazonaws.com" },
      "Action": "sts:AssumeRole"
    }]
  }'

# Attach basic Lambda execution policy
aws iam attach-role-policy \
  --role-name FixtureCastLambdaRole \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

# Create custom policy for DynamoDB and EventBridge access
aws iam put-role-policy \
  --role-name FixtureCastLambdaRole \
  --policy-name FixtureCastLambdaPolicy \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan",
          "dynamodb:BatchGetItem",
          "dynamodb:BatchWriteItem"
        ],
        "Resource": [
          "arn:aws:dynamodb:*:*:table/FixtureCast-*",
          "arn:aws:dynamodb:*:*:table/FixtureCast-*/index/*"
        ]
      },
      {
        "Effect": "Allow",
        "Action": [
          "events:PutEvents"
        ],
        "Resource": "*"
      },
      {
        "Effect": "Allow",
        "Action": [
          "sns:Publish"
        ],
        "Resource": "arn:aws:sns:*:*:FixtureCast-*"
      },
      {
        "Effect": "Allow",
        "Action": [
          "scheduler:CreateSchedule",
          "scheduler:UpdateSchedule",
          "scheduler:DeleteSchedule",
          "scheduler:GetSchedule",
          "scheduler:ListSchedules"
        ],
        "Resource": "*"
      }
    ]
  }'
```

## Step 2: Create DynamoDB Tables

### 2.1 Matches Table

```bash
aws dynamodb create-table \
  --table-name FixtureCast-Matches \
  --attribute-definitions \
    AttributeName=id,AttributeType=S \
    AttributeName=date,AttributeType=S \
    AttributeName=leagueId,AttributeType=S \
  --key-schema \
    AttributeName=id,KeyType=HASH \
  --global-secondary-indexes \
    'IndexName=DateIndex,KeySchema=[{AttributeName=date,KeyType=HASH}],Projection={ProjectionType=ALL},ProvisionedThroughput={ReadCapacityUnits=5,WriteCapacityUnits=5}' \
    'IndexName=LeagueIndex,KeySchema=[{AttributeName=leagueId,KeyType=HASH},{AttributeName=date,KeyType=RANGE}],Projection={ProjectionType=ALL},ProvisionedThroughput={ReadCapacityUnits=5,WriteCapacityUnits=5}' \
  --provisioned-throughput \
    ReadCapacityUnits=10,WriteCapacityUnits=10 \
  --billing-mode PROVISIONED
```

### 2.2 Predictions Table

```bash
aws dynamodb create-table \
  --table-name FixtureCast-Predictions \
  --attribute-definitions \
    AttributeName=id,AttributeType=S \
    AttributeName=matchId,AttributeType=S \
    AttributeName=timestamp,AttributeType=S \
  --key-schema \
    AttributeName=id,KeyType=HASH \
  --global-secondary-indexes \
    'IndexName=MatchIndex,KeySchema=[{AttributeName=matchId,KeyType=HASH},{AttributeName=timestamp,KeyType=RANGE}],Projection={ProjectionType=ALL},ProvisionedThroughput={ReadCapacityUnits=5,WriteCapacityUnits=5}' \
  --provisioned-throughput \
    ReadCapacityUnits=10,WriteCapacityUnits=10 \
  --billing-mode PROVISIONED
```

### 2.3 Execution Log Table

```bash
aws dynamodb create-table \
  --table-name FixtureCast-ExecutionLog \
  --attribute-definitions \
    AttributeName=id,AttributeType=S \
    AttributeName=executionType,AttributeType=S \
    AttributeName=timestamp,AttributeType=S \
  --key-schema \
    AttributeName=id,KeyType=HASH \
  --global-secondary-indexes \
    'IndexName=TypeIndex,KeySchema=[{AttributeName=executionType,KeyType=HASH},{AttributeName=timestamp,KeyType=RANGE}],Projection={ProjectionType=ALL},ProvisionedThroughput={ReadCapacityUnits=2,WriteCapacityUnits=2}' \
  --provisioned-throughput \
    ReadCapacityUnits=5,WriteCapacityUnits=5 \
  --billing-mode PROVISIONED
```

## Step 3: Create SNS Topics for Alerts

```bash
# Create error alert topic
aws sns create-topic --name FixtureCast-ErrorAlerts

# Create general notification topic
aws sns create-topic --name FixtureCast-Notifications

# Subscribe to error alerts (replace with your email)
aws sns subscribe \
  --topic-arn arn:aws:sns:us-east-1:YOUR_ACCOUNT_ID:FixtureCast-ErrorAlerts \
  --protocol email \
  --notification-endpoint your-email@example.com
```

## Step 4: Deploy Lambda Functions

### 4.1 Package and Deploy Prediction Update Lambda

```bash
# Create deployment package
cd aws-lambda
zip -r prediction-update.zip prediction-update.js

# Create Lambda function
aws lambda create-function \
  --function-name fixturecast-prediction-update \
  --runtime nodejs18.x \
  --role arn:aws:iam::YOUR_ACCOUNT_ID:role/FixtureCastLambdaRole \
  --handler prediction-update.handler \
  --zip-file fileb://prediction-update.zip \
  --timeout 300 \
  --memory-size 512 \
  --environment Variables='{
    "MATCHES_TABLE":"FixtureCast-Matches",
    "PREDICTIONS_TABLE":"FixtureCast-Predictions",
    "EXECUTION_LOG_TABLE":"FixtureCast-ExecutionLog",
    "ERROR_ALERT_TOPIC_ARN":"arn:aws:sns:us-east-1:YOUR_ACCOUNT_ID:FixtureCast-ErrorAlerts",
    "FIXTURECAST_API_KEY":"your-api-key",
    "FIXTURECAST_API_HOST":"api.fixturecast.com"
  }'
```

### 4.2 Package and Deploy Match Check Lambda

```bash
# Create deployment package
zip -r match-check.zip match-check.js

# Create Lambda function
aws lambda create-function \
  --function-name fixturecast-match-check \
  --runtime nodejs18.x \
  --role arn:aws:iam::YOUR_ACCOUNT_ID:role/FixtureCastLambdaRole \
  --handler match-check.handler \
  --zip-file fileb://match-check.zip \
  --timeout 300 \
  --memory-size 512 \
  --environment Variables='{
    "MATCHES_TABLE":"FixtureCast-Matches",
    "EXECUTION_LOG_TABLE":"FixtureCast-ExecutionLog",
    "ERROR_ALERT_TOPIC_ARN":"arn:aws:sns:us-east-1:YOUR_ACCOUNT_ID:FixtureCast-ErrorAlerts",
    "FOOTBALL_API_KEY":"your-football-api-key",
    "EVENT_BUS_NAME":"default"
  }'
```

## Step 5: Create Schedule Group

```bash
aws scheduler create-schedule-group \
  --name fixturecast-schedules \
  --description "FixtureCast application schedules"
```

## Step 6: Create Schedules

### 6.1 Hourly Prediction Updates

```bash
aws scheduler create-schedule \
  --name hourly-predictions \
  --group-name fixturecast-schedules \
  --schedule-expression "rate(1 hour)" \
  --flexible-time-window Mode=FLEXIBLE,MaximumWindowInMinutes=15 \
  --target '{
    "Arn": "arn:aws:lambda:us-east-1:YOUR_ACCOUNT_ID:function:fixturecast-prediction-update",
    "RoleArn": "arn:aws:iam::YOUR_ACCOUNT_ID:role/FixtureCastSchedulerRole",
    "Input": "{\"type\":\"hourly-prediction-update\",\"automated\":true}",
    "RetryPolicy": {
      "MaximumRetryAttempts": 3,
      "MaximumEventAgeInSeconds": 3600
    }
  }' \
  --description "Update predictions for upcoming matches every hour"
```

### 6.2 Match Status Checks

```bash
aws scheduler create-schedule \
  --name match-status-check \
  --group-name fixturecast-schedules \
  --schedule-expression "rate(15 minutes)" \
  --flexible-time-window Mode=OFF \
  --target '{
    "Arn": "arn:aws:lambda:us-east-1:YOUR_ACCOUNT_ID:function:fixturecast-match-check",
    "RoleArn": "arn:aws:iam::YOUR_ACCOUNT_ID:role/FixtureCastSchedulerRole",
    "Input": "{\"type\":\"scheduled-match-check\",\"automated\":true}",
    "RetryPolicy": {
      "MaximumRetryAttempts": 2,
      "MaximumEventAgeInSeconds": 1800
    }
  }' \
  --description "Check live match status every 15 minutes"
```

### 6.3 Daily Analytics Report

```bash
aws scheduler create-schedule \
  --name daily-analytics \
  --group-name fixturecast-schedules \
  --schedule-expression "cron(0 6 * * ? *)" \
  --flexible-time-window Mode=FLEXIBLE,MaximumWindowInMinutes=30 \
  --target '{
    "Arn": "arn:aws:lambda:us-east-1:YOUR_ACCOUNT_ID:function:fixturecast-analytics",
    "RoleArn": "arn:aws:iam::YOUR_ACCOUNT_ID:role/FixtureCastSchedulerRole",
    "Input": "{\"type\":\"daily-analytics\",\"automated\":true}",
    "RetryPolicy": {
      "MaximumRetryAttempts": 1,
      "MaximumEventAgeInSeconds": 86400
    }
  }' \
  --description "Generate daily analytics report at 6 AM UTC"
```

## Step 7: Environment Configuration

Add the following environment variables to your FixtureCast application:

```bash
# AWS Configuration
export VITE_AWS_REGION="us-east-1"
export VITE_AWS_ACCESS_KEY_ID="your-access-key"
export VITE_AWS_SECRET_ACCESS_KEY="your-secret-key"
export VITE_AWS_SCHEDULE_GROUP="fixturecast-schedules"

# IAM Roles
export VITE_AWS_SCHEDULER_ROLE_ARN="arn:aws:iam::YOUR_ACCOUNT_ID:role/FixtureCastSchedulerRole"
export VITE_AWS_LAMBDA_EXECUTION_ROLE="arn:aws:iam::YOUR_ACCOUNT_ID:role/FixtureCastLambdaRole"

# Lambda Functions
export VITE_LAMBDA_PREDICTION_UPDATE="arn:aws:lambda:us-east-1:YOUR_ACCOUNT_ID:function:fixturecast-prediction-update"
export VITE_LAMBDA_MATCH_CHECK="arn:aws:lambda:us-east-1:YOUR_ACCOUNT_ID:function:fixturecast-match-check"
export VITE_LAMBDA_ANALYTICS="arn:aws:lambda:us-east-1:YOUR_ACCOUNT_ID:function:fixturecast-analytics"
export VITE_LAMBDA_CLEANUP="arn:aws:lambda:us-east-1:YOUR_ACCOUNT_ID:function:fixturecast-cleanup"
```

## Step 8: Monitoring and Logging

### 8.1 CloudWatch Dashboards

Create a CloudWatch dashboard to monitor your scheduled tasks:

```bash
aws cloudwatch put-dashboard \
  --dashboard-name "FixtureCast-Scheduler" \
  --dashboard-body '{
    "widgets": [
      {
        "type": "metric",
        "properties": {
          "metrics": [
            [ "AWS/Lambda", "Invocations", "FunctionName", "fixturecast-prediction-update" ],
            [ "...", "fixturecast-match-check" ]
          ],
          "period": 300,
          "stat": "Sum",
          "region": "us-east-1",
          "title": "Lambda Invocations"
        }
      },
      {
        "type": "metric",
        "properties": {
          "metrics": [
            [ "AWS/Lambda", "Errors", "FunctionName", "fixturecast-prediction-update" ],
            [ "...", "fixturecast-match-check" ]
          ],
          "period": 300,
          "stat": "Sum",
          "region": "us-east-1",
          "title": "Lambda Errors"
        }
      }
    ]
  }'
```

### 8.2 CloudWatch Alarms

```bash
# Create alarm for high error rate
aws cloudwatch put-metric-alarm \
  --alarm-name "FixtureCast-HighErrorRate" \
  --alarm-description "High error rate in FixtureCast Lambda functions" \
  --metric-name Errors \
  --namespace AWS/Lambda \
  --statistic Sum \
  --period 900 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  --alarm-actions arn:aws:sns:us-east-1:YOUR_ACCOUNT_ID:FixtureCast-ErrorAlerts
```

## Step 9: Testing and Validation

### 9.1 Test Lambda Functions

```bash
# Test prediction update function
aws lambda invoke \
  --function-name fixturecast-prediction-update \
  --payload '{"type":"test-prediction-update","automated":false,"matchIds":["12345"]}' \
  response.json

# Test match check function
aws lambda invoke \
  --function-name fixturecast-match-check \
  --payload '{"type":"test-match-check","automated":false}' \
  response.json
```

### 9.2 Verify Schedules

```bash
# List all schedules
aws scheduler list-schedules --group-name fixturecast-schedules

# Get schedule details
aws scheduler get-schedule \
  --name hourly-predictions \
  --group-name fixturecast-schedules
```

## Step 10: Cost Optimization

### 10.1 Use Flexible Time Windows

For non-critical tasks, use flexible time windows to reduce costs:

```bash
# Update schedule with flexible time window
aws scheduler update-schedule \
  --name daily-analytics \
  --group-name fixturecast-schedules \
  --flexible-time-window Mode=FLEXIBLE,MaximumWindowInMinutes=60
```

### 10.2 Monitor Costs

Set up billing alerts and use AWS Cost Explorer to monitor EventBridge Scheduler costs.

## Troubleshooting

### Common Issues

1. **Permission Denied Errors**
   - Verify IAM roles and policies
   - Check resource ARNs

2. **Schedule Not Triggering**
   - Verify schedule expression format
   - Check target configuration
   - Review CloudWatch logs

3. **Lambda Timeouts**
   - Increase timeout settings
   - Optimize function code
   - Consider processing in smaller batches

### Useful Commands

```bash
# View schedule execution history
aws logs filter-log-events \
  --log-group-name "/aws/events/scheduler/fixturecast-schedules/hourly-predictions" \
  --start-time $(date -d '1 hour ago' +%s)000

# Check Lambda function logs
aws logs tail /aws/lambda/fixturecast-prediction-update --follow

# List failed executions
aws scheduler list-schedules \
  --group-name fixturecast-schedules \
  --state DISABLED
```

## Security Best Practices

1. **Use IAM roles with least privilege**
2. **Enable CloudTrail for audit logging**
3. **Encrypt sensitive data in transit and at rest**
4. **Regularly rotate access keys**
5. **Monitor for unauthorized access**

## Next Steps

1. **Set up Infrastructure as Code** using AWS CDK or Terraform
2. **Implement automated deployment** with CI/CD pipelines
3. **Add more sophisticated monitoring** with custom metrics
4. **Create backup and disaster recovery** procedures
5. **Scale based on usage patterns** and performance metrics

For more information, refer to the [AWS EventBridge Scheduler documentation](https://docs.aws.amazon.com/scheduler/).