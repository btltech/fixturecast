# How to Implement EventBridge Scheduler - Complete Guide 🚀

## Overview
You'll implement the EventBridge Scheduler as a **backend automation system** that you control via AWS Console, not through the public website.

## 🎯 **Implementation Strategy**

### **What You're Building**
```
AWS EventBridge Scheduler → Lambda Functions → Your FixtureCast App
     (You control)          (Auto-runs)        (Gets fresh data)
```

### **What It Does**
- Automatically updates predictions every 6 hours
- Checks for new match results hourly  
- Updates league tables daily
- Sends you alerts if anything fails

## 📋 **Step-by-Step Implementation**

### **Phase 1: AWS Setup (30 minutes)**

#### **1.1 Create AWS Account & Configure**
```bash
# Install AWS CLI
brew install awscli  # macOS
# or
npm install -g aws-cli

# Configure with your credentials
aws configure
# Enter your AWS Access Key ID
# Enter your AWS Secret Access Key  
# Default region: us-east-1
# Default output format: json
```

#### **1.2 Create IAM Roles**
```bash
# Create EventBridge Scheduler execution role
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
  }'

# Attach necessary policies
aws iam attach-role-policy \
  --role-name FixtureCastSchedulerRole \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonEventBridgeSchedulerExecutionRole
```

### **Phase 2: Lambda Functions (45 minutes)**

#### **2.1 Create Prediction Update Function**
```javascript
// prediction-update-lambda.js
exports.handler = async (event) => {
    console.log('Starting prediction update...');
    
    try {
        // Call your FixtureCast API to trigger prediction updates
        const response = await fetch('https://your-fixturecast-domain.com/api/update-predictions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                trigger: 'scheduled',
                timestamp: new Date().toISOString()
            })
        });
        
        if (response.ok) {
            console.log('Predictions updated successfully');
            return {
                statusCode: 200,
                body: JSON.stringify({ message: 'Predictions updated successfully' })
            };
        } else {
            throw new Error(`API call failed: ${response.status}`);
        }
        
    } catch (error) {
        console.error('Error updating predictions:', error);
        
        // Send alert to SNS (optional)
        // await sendAlert('Prediction update failed', error.message);
        
        throw error;
    }
};
```

#### **2.2 Create Match Results Function**
```javascript
// match-results-lambda.js
exports.handler = async (event) => {
    console.log('Starting match results update...');
    
    try {
        // Call your API to update match results
        const response = await fetch('https://your-fixturecast-domain.com/api/update-results', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.API_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            console.log('Match results updated successfully');
            return { statusCode: 200, body: 'Results updated' };
        }
        
    } catch (error) {
        console.error('Error updating match results:', error);
        throw error;
    }
};
```

#### **2.3 Deploy Lambda Functions**
```bash
# Create deployment package
zip -r prediction-update.zip prediction-update-lambda.js

# Deploy to AWS
aws lambda create-function \
  --function-name fixturecast-prediction-update \
  --runtime nodejs18.x \
  --role arn:aws:iam::YOUR-ACCOUNT:role/FixtureCastLambdaRole \
  --handler prediction-update-lambda.handler \
  --zip-file fileb://prediction-update.zip

# Repeat for match-results function
zip -r match-results.zip match-results-lambda.js

aws lambda create-function \
  --function-name fixturecast-match-results \
  --runtime nodejs18.x \
  --role arn:aws:iam::YOUR-ACCOUNT:role/FixtureCastLambdaRole \
  --handler match-results-lambda.handler \
  --zip-file fileb://match-results.zip
```

### **Phase 3: EventBridge Scheduler Setup (20 minutes)**

#### **3.1 Create Schedule Group**
```bash
aws scheduler create-schedule-group \
  --name fixturecast-schedules \
  --description "Automated schedules for FixtureCast app"
```

#### **3.2 Create Prediction Update Schedule**
```bash
aws scheduler create-schedule \
  --name "prediction-update-every-6-hours" \
  --schedule-expression "rate(6 hours)" \
  --group-name "fixturecast-schedules" \
  --target '{
    "Arn": "arn:aws:lambda:us-east-1:YOUR-ACCOUNT:function:fixturecast-prediction-update",
    "RoleArn": "arn:aws:iam::YOUR-ACCOUNT:role/FixtureCastSchedulerRole"
  }' \
  --flexible-time-window '{
    "Mode": "FLEXIBLE",
    "MaximumWindowInMinutes": 15
  }' \
  --description "Updates predictions every 6 hours"
```

#### **3.3 Create Match Results Schedule**
```bash
aws scheduler create-schedule \
  --name "match-results-hourly" \
  --schedule-expression "rate(1 hour)" \
  --group-name "fixturecast-schedules" \
  --target '{
    "Arn": "arn:aws:lambda:us-east-1:YOUR-ACCOUNT:function:fixturecast-match-results",
    "RoleArn": "arn:aws:iam::YOUR-ACCOUNT:role/FixtureCastSchedulerRole"
  }' \
  --flexible-time-window '{
    "Mode": "OFF"
  }' \
  --description "Checks for new match results every hour"
```

## 🎮 **Your Control Methods**

### **Method 1: AWS Console (Easiest)**
1. Go to: https://console.aws.amazon.com/scheduler/home
2. View all your schedules in the "fixturecast-schedules" group
3. Enable/disable schedules with one click
4. Modify timing and frequency
5. View execution history and logs

### **Method 2: AWS CLI (For Automation)**
```bash
# List all your schedules
aws scheduler list-schedules --group-name fixturecast-schedules

# Disable a schedule
aws scheduler update-schedule \
  --name "prediction-update-every-6-hours" \
  --state DISABLED

# Enable a schedule
aws scheduler update-schedule \
  --name "prediction-update-every-6-hours" \
  --state ENABLED

# Delete a schedule
aws scheduler delete-schedule \
  --name "unwanted-schedule"

# Create new schedule
aws scheduler create-schedule \
  --name "daily-analytics" \
  --schedule-expression "cron(0 2 * * ? *)" \
  --group-name "fixturecast-schedules" \
  --target '{
    "Arn": "arn:aws:lambda:us-east-1:YOUR-ACCOUNT:function:analytics-function",
    "RoleArn": "arn:aws:iam::YOUR-ACCOUNT:role/FixtureCastSchedulerRole"
  }'
```

### **Method 3: Monitoring & Alerts**
```bash
# View execution logs
aws logs filter-log-events \
  --log-group-name "/aws/lambda/fixturecast-prediction-update" \
  --start-time 1640995200000

# Set up CloudWatch alarm for failures
aws cloudwatch put-metric-alarm \
  --alarm-name "FixtureCast-Schedule-Failures" \
  --alarm-description "Alert when schedules fail" \
  --metric-name "Errors" \
  --namespace "AWS/Lambda" \
  --statistic "Sum" \
  --period 300 \
  --threshold 1 \
  --comparison-operator "GreaterThanOrEqualToThreshold"
```

## 🔧 **Integration with Your FixtureCast App**

### **4.1 Create API Endpoints**
Add these endpoints to your FixtureCast app:

```typescript
// /api/update-predictions
export async function POST(request: Request) {
  try {
    const { trigger, timestamp } = await request.json();
    
    // Verify this is coming from your Lambda (add API key check)
    const apiKey = request.headers.get('Authorization');
    if (!apiKey || !apiKey.includes(process.env.LAMBDA_API_KEY)) {
      return new Response('Unauthorized', { status: 401 });
    }
    
    // Trigger your prediction update logic
    await updateAllPredictions();
    
    return new Response(JSON.stringify({ 
      success: true, 
      updatedAt: new Date().toISOString() 
    }));
    
  } catch (error) {
    console.error('Prediction update failed:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
```

```typescript
// /api/update-results  
export async function POST(request: Request) {
  try {
    // Verify API key
    const apiKey = request.headers.get('Authorization');
    if (!apiKey || !apiKey.includes(process.env.LAMBDA_API_KEY)) {
      return new Response('Unauthorized', { status: 401 });
    }
    
    // Update match results
    await updateMatchResults();
    
    return new Response(JSON.stringify({ 
      success: true,
      resultsUpdated: new Date().toISOString()
    }));
    
  } catch (error) {
    console.error('Results update failed:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
```

### **4.2 Environment Variables**
Add to your `.env` file:
```bash
# Lambda Integration
LAMBDA_API_KEY=your-secure-api-key-here
AWS_REGION=us-east-1

# Football API (for updates)
RAPIDAPI_KEY=your-rapidapi-key
```

## 📊 **Monitoring Dashboard**

### **CloudWatch Logs**
- Function execution logs: `/aws/lambda/fixturecast-prediction-update`
- Error tracking and debugging
- Performance metrics

### **EventBridge Metrics**
- Schedule execution success/failure rates  
- Timing and duration metrics
- Cost tracking

## 🚨 **Emergency Controls**

### **Stop All Schedules Immediately**
```bash
# Get all schedule names
SCHEDULES=$(aws scheduler list-schedules --group-name fixturecast-schedules --query 'Schedules[].Name' --output text)

# Disable all schedules
for schedule in $SCHEDULES; do
  aws scheduler update-schedule --name "$schedule" --state DISABLED
  echo "Disabled: $schedule"
done
```

### **Emergency Schedule Deletion**
```bash
aws scheduler delete-schedule --name "problematic-schedule-name"
```

## 💰 **Cost Estimation**

### **AWS EventBridge Scheduler Pricing**
- **Schedule executions**: $1.00 per million executions
- **Your usage**: ~200 executions/month = ~$0.0002/month
- **Lambda executions**: First 1M requests free, then $0.20 per 1M
- **CloudWatch logs**: $0.50/GB (minimal usage)

**Total estimated cost: <$1/month**

## ✅ **Final Checklist**

### **Setup Complete When:**
- [ ] AWS CLI configured with your credentials
- [ ] IAM roles created for EventBridge and Lambda
- [ ] Lambda functions deployed and tested
- [ ] EventBridge schedules created and enabled
- [ ] API endpoints added to your FixtureCast app
- [ ] CloudWatch monitoring configured
- [ ] Emergency stop procedures documented

### **Test Your Implementation:**
1. **Manual trigger**: Test Lambda functions individually
2. **Schedule test**: Create a short-term test schedule
3. **API integration**: Verify Lambda can call your app APIs
4. **Monitoring**: Check CloudWatch logs for execution details
5. **Emergency stop**: Test disabling schedules

## 🎯 **Result**

You now have:
- ✅ **Automated background updates** every 6 hours
- ✅ **Full admin control** via AWS Console
- ✅ **Professional monitoring** and alerting
- ✅ **Emergency controls** for immediate action
- ✅ **Clean public interface** with no technical complexity

Your FixtureCast app will automatically stay fresh with the latest predictions and match results, while you maintain complete control through professional AWS tools! 🚀