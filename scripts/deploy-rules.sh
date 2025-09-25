#!/bin/bash

# EventBridge Rules Deployment Script (Simpler & FREE)
# This uses EventBridge Rules instead of EventBridge Scheduler

set -e  # Exit on any error

echo "🚀 FixtureCast EventBridge Rules Setup (FREE Version)"
echo "==================================================="

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

# Get AWS account ID and region
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REGION=${AWS_DEFAULT_REGION:-us-east-1}

echo "📋 Account ID: $ACCOUNT_ID"
echo "📋 Region: $REGION"

# Step 1: Create Lambda Execution Role (Simpler - only one role needed)
echo ""
echo "🔐 Step 1: Creating Lambda Execution Role..."

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

# Attach basic Lambda execution policy
aws iam attach-role-policy \
  --role-name FixtureCastLambdaRole \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

echo "✅ IAM role created"

# Step 2: Deploy Lambda Functions
echo ""
echo "⚙️  Step 2: Deploying Lambda Functions..."

cd aws-lambda

# Package and deploy prediction update function
zip -q -r prediction-update.zip prediction-update.js

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
  }' 2>/dev/null || {
    echo "⚠️  Function exists, updating code..."
    aws lambda update-function-code \
      --function-name fixturecast-prediction-update \
      --zip-file fileb://prediction-update.zip
  }

# Package and deploy match check function  
zip -q -r match-check.zip match-check.js

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
  }' 2>/dev/null || {
    echo "⚠️  Function exists, updating code..."
    aws lambda update-function-code \
      --function-name fixturecast-match-check \
      --zip-file fileb://match-check.zip
  }

cd ..

echo "✅ Lambda functions deployed"

# Step 3: Create EventBridge Rules (Much simpler than Scheduler)
echo ""
echo "📅 Step 3: Creating EventBridge Rules..."

# Rule 1: Prediction updates every 6 hours
aws events put-rule \
  --name "fixturecast-prediction-update" \
  --schedule-expression "rate(6 hours)" \
  --description "Update predictions every 6 hours" \
  --state ENABLED

# Add Lambda target to prediction rule
aws events put-targets \
  --rule "fixturecast-prediction-update" \
  --targets "Id"="1","Arn"="arn:aws:lambda:$REGION:$ACCOUNT_ID:function:fixturecast-prediction-update"

# Give EventBridge permission to invoke prediction Lambda
aws lambda add-permission \
  --function-name fixturecast-prediction-update \
  --statement-id fixturecast-prediction-rule \
  --action lambda:InvokeFunction \
  --principal events.amazonaws.com \
  --source-arn arn:aws:events:$REGION:$ACCOUNT_ID:rule/fixturecast-prediction-update 2>/dev/null || echo "⚠️  Permission already exists"

echo "✅ Prediction update rule created"

# Rule 2: Match checks every hour
aws events put-rule \
  --name "fixturecast-match-check" \
  --schedule-expression "rate(1 hour)" \
  --description "Check match results every hour" \
  --state ENABLED

# Add Lambda target to match check rule  
aws events put-targets \
  --rule "fixturecast-match-check" \
  --targets "Id"="1","Arn"="arn:aws:lambda:$REGION:$ACCOUNT_ID:function:fixturecast-match-check"

# Give EventBridge permission to invoke match check Lambda
aws lambda add-permission \
  --function-name fixturecast-match-check \
  --statement-id fixturecast-match-rule \
  --action lambda:InvokeFunction \
  --principal events.amazonaws.com \
  --source-arn arn:aws:events:$REGION:$ACCOUNT_ID:rule/fixturecast-match-check 2>/dev/null || echo "⚠️  Permission already exists"

echo "✅ Match check rule created"

# Optional: Daily analytics at 2 AM UTC
aws events put-rule \
  --name "fixturecast-daily-analytics" \
  --schedule-expression "cron(0 2 * * ? *)" \
  --description "Daily analytics update at 2 AM UTC" \
  --state DISABLED  # Start disabled, enable when you create the analytics function

echo "✅ Daily analytics rule created (disabled)"

# Step 4: Setup Complete
echo ""
echo "🎉 EventBridge Rules Setup Complete! (FREE VERSION)"
echo "=================================================="
echo ""
echo "📅 Rules Created:"
echo "   • Prediction updates: Every 6 hours (rate(6 hours))"
echo "   • Match checks: Every hour (rate(1 hour))" 
echo "   • Daily analytics: 2 AM UTC (disabled, enable when ready)"
echo ""
echo "💰 Cost: FREE! (No execution charges for your usage volume)"
echo ""
echo "🎮 Control Your Rules:"
echo "   • AWS Console: https://console.aws.amazon.com/events/home"
echo "   • List rules: aws events list-rules --name-prefix fixturecast"
echo "   • Disable rule: aws events disable-rule --name RULE_NAME"
echo "   • Enable rule: aws events enable-rule --name RULE_NAME"
echo ""
echo "📊 Monitor Execution:"
echo "   • CloudWatch Logs: https://console.aws.amazon.com/cloudwatch/home#logsV2:log-groups"
echo "   • Function logs: /aws/lambda/fixturecast-prediction-update"
echo "   • Rule metrics: CloudWatch → Events → Rules"
echo ""
echo "⚠️  Next Steps:"
echo "   1. Update Lambda environment variables:"
echo "      aws lambda update-function-configuration \\"
echo "        --function-name fixturecast-prediction-update \\"
echo "        --environment Variables='{\"FIXTURECAST_DOMAIN\":\"https://your-domain.com\",\"FIXTURECAST_API_KEY\":\"your-key\"}'"
echo ""
echo "   2. Create API endpoints in your app:"
echo "      • POST /api/update-predictions"
echo "      • POST /api/update-results"
echo ""
echo "   3. Test functions manually:"
echo "      aws lambda invoke --function-name fixturecast-prediction-update response.json"
echo ""
echo "   4. Monitor first executions in CloudWatch logs"
echo ""
echo "🚀 Your FixtureCast app will now stay automatically updated - FOR FREE!"