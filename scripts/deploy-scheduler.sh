#!/bin/bash

# EventBridge Scheduler Deployment Script
# Run this script to set up your automated scheduling system

set -e  # Exit on any error

echo "🚀 FixtureCast EventBridge Scheduler Setup"
echo "========================================"

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI not found. Please install it first:"
    echo "   brew install awscli  # macOS"
    echo "   pip install awscli   # Python"
    exit 1
fi

# Check if AWS is configured
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ AWS CLI not configured. Please run 'aws configure' first"
    exit 1
fi

echo "✅ AWS CLI configured"

# Get AWS account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REGION=${AWS_DEFAULT_REGION:-us-east-1}

echo "📋 Account ID: $ACCOUNT_ID"
echo "📋 Region: $REGION"

# Step 1: Create IAM Roles
echo ""
echo "🔐 Step 1: Creating IAM Roles..."

# Create EventBridge Scheduler role
aws iam create-role \
  --role-name FixtureCastSchedulerRole \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Principal": {
          "Service": "scheduler.amazonaws.com"
        },
        "Action": "sts:AssumeRole"
      }
    ]
  }' 2>/dev/null || echo "⚠️  FixtureCastSchedulerRole already exists"

# Create Lambda execution role
aws iam create-role \
  --role-name FixtureCastLambdaRole \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Principal": {
          "Service": "lambda.amazonaws.com"
        },
        "Action": "sts:AssumeRole"
      }
    ]
  }' 2>/dev/null || echo "⚠️  FixtureCastLambdaRole already exists"

# Attach policies
aws iam attach-role-policy \
  --role-name FixtureCastSchedulerRole \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonEventBridgeSchedulerExecutionRole

aws iam attach-role-policy \
  --role-name FixtureCastLambdaRole \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

echo "✅ IAM roles created"

# Step 2: Deploy Lambda Functions
echo ""
echo "⚙️  Step 2: Deploying Lambda Functions..."

# Package and deploy prediction update function
cd aws-lambda
zip -r prediction-update.zip prediction-update.js 2>/dev/null

aws lambda create-function \
  --function-name fixturecast-prediction-update \
  --runtime nodejs18.x \
  --role arn:aws:iam::$ACCOUNT_ID:role/FixtureCastLambdaRole \
  --handler prediction-update.handler \
  --zip-file fileb://prediction-update.zip \
  --timeout 30 \
  --environment Variables='{
    "FIXTURECAST_DOMAIN":"https://your-domain.com",
    "FIXTURECAST_API_KEY":"your-api-key-here"
  }' 2>/dev/null || echo "⚠️  Updating existing function..."

# Update function if it already exists
aws lambda update-function-code \
  --function-name fixturecast-prediction-update \
  --zip-file fileb://prediction-update.zip 2>/dev/null || true

# Package and deploy match check function
zip -r match-check.zip match-check.js 2>/dev/null

aws lambda create-function \
  --function-name fixturecast-match-check \
  --runtime nodejs18.x \
  --role arn:aws:iam::$ACCOUNT_ID:role/FixtureCastLambdaRole \
  --handler match-check.handler \
  --zip-file fileb://match-check.zip \
  --timeout 30 \
  --environment Variables='{
    "FIXTURECAST_DOMAIN":"https://your-domain.com",
    "FIXTURECAST_API_KEY":"your-api-key-here"
  }' 2>/dev/null || echo "⚠️  Updating existing function..."

aws lambda update-function-code \
  --function-name fixturecast-match-check \
  --zip-file fileb://match-check.zip 2>/dev/null || true

cd ..

echo "✅ Lambda functions deployed"

# Step 3: Create Schedule Group
echo ""
echo "📅 Step 3: Creating Schedule Group..."

aws scheduler create-schedule-group \
  --name fixturecast-schedules \
  --description "Automated schedules for FixtureCast app" 2>/dev/null || echo "⚠️  Schedule group already exists"

echo "✅ Schedule group created"

# Step 4: Create Schedules
echo ""
echo "⏰ Step 4: Creating Schedules..."

# Prediction update schedule (every 6 hours)
aws scheduler create-schedule \
  --name "prediction-update-every-6-hours" \
  --schedule-expression "rate(6 hours)" \
  --group-name "fixturecast-schedules" \
  --target "{
    \"Arn\": \"arn:aws:lambda:$REGION:$ACCOUNT_ID:function:fixturecast-prediction-update\",
    \"RoleArn\": \"arn:aws:iam::$ACCOUNT_ID:role/FixtureCastSchedulerRole\"
  }" \
  --flexible-time-window '{
    "Mode": "FLEXIBLE",
    "MaximumWindowInMinutes": 15
  }' \
  --description "Updates predictions every 6 hours" 2>/dev/null || echo "⚠️  Prediction schedule already exists"

# Match check schedule (every hour)
aws scheduler create-schedule \
  --name "match-check-hourly" \
  --schedule-expression "rate(1 hour)" \
  --group-name "fixturecast-schedules" \
  --target "{
    \"Arn\": \"arn:aws:lambda:$REGION:$ACCOUNT_ID:function:fixturecast-match-check\",
    \"RoleArn\": \"arn:aws:iam::$ACCOUNT_ID:role/FixtureCastSchedulerRole\"
  }" \
  --flexible-time-window '{
    "Mode": "OFF"
  }' \
  --description "Checks for match updates every hour" 2>/dev/null || echo "⚠️  Match check schedule already exists"

echo "✅ Schedules created"

# Step 5: Setup Complete
echo ""
echo "🎉 Setup Complete!"
echo "=================="
echo ""
echo "Your EventBridge Scheduler is now configured:"
echo ""
echo "📅 Schedules Created:"
echo "   • Prediction updates: Every 6 hours"
echo "   • Match checks: Every hour"
echo ""
echo "🎮 Control Your Schedules:"
echo "   • AWS Console: https://console.aws.amazon.com/scheduler/home"
echo "   • View schedules: aws scheduler list-schedules --group-name fixturecast-schedules"
echo "   • Disable schedule: aws scheduler update-schedule --name SCHEDULE_NAME --state DISABLED"
echo ""
echo "📊 Monitor Execution:"
echo "   • CloudWatch Logs: https://console.aws.amazon.com/cloudwatch/home#logsV2:log-groups"
echo "   • Function logs: /aws/lambda/fixturecast-prediction-update"
echo ""
echo "⚠️  Next Steps:"
echo "   1. Update Lambda environment variables with your actual domain and API key"
echo "   2. Create API endpoints in your FixtureCast app (/api/update-predictions, /api/update-results)"
echo "   3. Test the functions manually to verify they work"
echo "   4. Monitor the first few scheduled executions"
echo ""
echo "🚀 Your FixtureCast app will now stay automatically updated!"