# EventBridge Scheduler Implementation Checklist ✅

## Quick Implementation Steps

### 🚀 **Option 1: Automated Setup (Recommended)**

Run the deployment script:
```bash
# Make sure you're in your project directory
cd /Users/mobolaji/google/fixturecast

# Run the automated setup
./scripts/deploy-scheduler.sh
```

This script will:
- ✅ Create IAM roles
- ✅ Deploy Lambda functions  
- ✅ Create EventBridge schedules
- ✅ Set up monitoring

### 🛠️ **Option 2: Manual Setup**

#### **Step 1: Configure AWS (5 minutes)**
```bash
# Install AWS CLI (if not installed)
brew install awscli

# Configure with your credentials
aws configure
# Enter: Access Key ID, Secret Access Key, Region (us-east-1), Format (json)
```

#### **Step 2: Deploy Lambda Functions (10 minutes)**  
```bash
# Package the functions
cd aws-lambda
zip prediction-update.zip prediction-update.js
zip match-check.zip match-check.js

# Deploy via AWS CLI (see full commands in deploy-scheduler.sh)
```

#### **Step 3: Create Schedules (5 minutes)**
```bash
# Create schedule group
aws scheduler create-schedule-group --name fixturecast-schedules

# Create prediction update schedule (every 6 hours)
aws scheduler create-schedule --name "prediction-update-every-6-hours" ...

# Create match check schedule (hourly)  
aws scheduler create-schedule --name "match-check-hourly" ...
```

## 📋 **Configuration Required**

### **Environment Variables**
Add to your `.env` file:
```bash
# Lambda Integration
LAMBDA_API_KEY=your-secure-random-key-here
FIXTURECAST_DOMAIN=https://your-actual-domain.com

# Football API (for data updates)
RAPIDAPI_KEY=your-rapidapi-key-here
```

### **Update Lambda Environment Variables**
After deployment, update the Lambda functions with your actual domain:
```bash
aws lambda update-function-configuration \
  --function-name fixturecast-prediction-update \
  --environment Variables='{
    "FIXTURECAST_DOMAIN":"https://your-actual-domain.com",
    "FIXTURECAST_API_KEY":"your-secure-api-key"
  }'
```

## 🎮 **Your Control Interface**

### **AWS Console (Primary Control)**
- **URL**: https://console.aws.amazon.com/scheduler/home
- **What you can do**:
  - ✅ View all schedules
  - ✅ Enable/disable schedules  
  - ✅ Modify timing and frequency
  - ✅ View execution history
  - ✅ Monitor success/failure rates

### **AWS CLI (Advanced Control)**
```bash
# List all schedules
aws scheduler list-schedules --group-name fixturecast-schedules

# Disable a schedule  
aws scheduler update-schedule --name "prediction-update-every-6-hours" --state DISABLED

# Enable a schedule
aws scheduler update-schedule --name "prediction-update-every-6-hours" --state ENABLED

# Delete a schedule
aws scheduler delete-schedule --name "schedule-name"
```

## 📊 **Monitoring Your System**

### **CloudWatch Logs**
- **Prediction updates**: `/aws/lambda/fixturecast-prediction-update`
- **Match checks**: `/aws/lambda/fixturecast-match-check`
- **Access**: https://console.aws.amazon.com/cloudwatch/home#logsV2:log-groups

### **EventBridge Metrics**
- Schedule execution success/failure rates
- Timing and performance metrics
- Cost tracking

## 🧪 **Testing Your Implementation**

### **1. Test Lambda Functions**
```bash
# Test prediction update function
aws lambda invoke \
  --function-name fixturecast-prediction-update \
  --payload '{}' \
  response.json && cat response.json

# Test match check function  
aws lambda invoke \
  --function-name fixturecast-match-check \
  --payload '{}' \
  response.json && cat response.json
```

### **2. Test API Endpoints**
```bash
# Test your API endpoints locally
curl -X POST http://localhost:5173/api/update-predictions \
  -H "Authorization: Bearer your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"trigger":"test","timestamp":"2025-01-01T00:00:00Z"}'
```

### **3. Test Schedule Execution**
```bash
# Create a test schedule that runs in 2 minutes
aws scheduler create-schedule \
  --name "test-schedule" \
  --schedule-expression "at($(date -u -d '+2 minutes' +'%Y-%m-%dT%H:%M:%S'))" \
  --group-name "fixturecast-schedules" \
  --target '...'
```

## ⚠️ **Important Notes**

### **Security**
- ✅ Use strong, random API keys
- ✅ Never expose Lambda API keys in public code
- ✅ Use IAM roles with minimal required permissions
- ✅ Monitor CloudWatch logs for unauthorized access attempts

### **Cost Management**
- Expected cost: <$1/month for typical usage
- Monitor AWS billing dashboard
- Set up billing alerts for unexpected costs

### **Error Handling**
- Lambda functions will retry failed executions automatically
- Check CloudWatch logs for detailed error information
- Set up SNS alerts for critical failures (optional)

## 🚨 **Emergency Procedures**

### **Stop All Schedules Immediately**
```bash
# Emergency stop script
SCHEDULES=$(aws scheduler list-schedules --group-name fixturecast-schedules --query 'Schedules[].Name' --output text)
for schedule in $SCHEDULES; do
  aws scheduler update-schedule --name "$schedule" --state DISABLED
  echo "Disabled: $schedule"
done
```

### **Delete Problematic Schedule**
```bash
aws scheduler delete-schedule --name "problematic-schedule-name"
```

## ✅ **Success Indicators**

Your implementation is working when:
- ✅ Lambda functions execute successfully (check CloudWatch logs)
- ✅ Your FixtureCast app receives API calls from Lambda
- ✅ Predictions and match data update automatically  
- ✅ No errors in CloudWatch logs
- ✅ AWS Console shows successful schedule executions

## 🎯 **Final Result**

Once implemented, you'll have:
- ✅ **Automated predictions**: Updated every 6 hours
- ✅ **Fresh match results**: Checked every hour
- ✅ **Professional control**: AWS Console and CLI access
- ✅ **Clean public site**: No technical complexity for users
- ✅ **Cost-effective**: <$1/month operational cost
- ✅ **Scalable**: Easy to add more schedules or modify timing

Your FixtureCast app will automatically stay updated with fresh data while you maintain complete administrative control! 🚀