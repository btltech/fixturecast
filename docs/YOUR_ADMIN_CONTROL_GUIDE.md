# Your Complete Admin Control Setup Guide

## Overview
This guide shows you exactly how to maintain full control over the EventBridge Scheduler for your public FixtureCast site.

## 🎯 Your Control Strategy

### Public Site (Read-Only)
- Users can **view** schedules and their status
- Users **cannot** create, modify, or delete schedules
- All schedule management is controlled by you

### Your Admin Access (Full Control)
- Complete control via AWS Console
- Command-line access via AWS CLI
- Private admin interface (optional)
- Full monitoring and alerting capabilities

## 🔧 Setup Steps

### 1. AWS IAM Configuration

#### Create Read-Only Role for Public Site
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "scheduler:GetSchedule",
        "scheduler:ListSchedules"
      ],
      "Resource": "arn:aws:scheduler:*:YOUR-ACCOUNT-ID:schedule/fixturecast/*"
    }
  ]
}
```

#### Create Admin Role for Your Access
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "scheduler:*",
        "eventbridge:*",
        "lambda:*",
        "logs:*",
        "cloudwatch:*",
        "iam:PassRole"
      ],
      "Resource": "*"
    }
  ]
}
```

### 2. Environment Configuration

#### Deploy Public Site with Read-Only Config
```bash
# Use the .env.production file we created
VITE_SCHEDULER_READ_ONLY=true
VITE_AWS_ACCESS_KEY_ID=your-readonly-key
VITE_AWS_SECRET_ACCESS_KEY=your-readonly-secret
```

#### Your Admin Environment
```bash
# Use the .env.admin file we created
AWS_ACCESS_KEY_ID=your-admin-key
AWS_SECRET_ACCESS_KEY=your-admin-secret
SCHEDULER_ADMIN=true
```

## 🎮 Your Control Methods

### Method 1: AWS Console (Recommended)
**URL**: https://console.aws.amazon.com/scheduler/home

**What You Can Do**:
- ✅ View all schedules created by your app
- ✅ Create new schedules for predictions, match checks, etc.
- ✅ Pause/resume any schedule
- ✅ Delete unwanted schedules
- ✅ Modify schedule timing and frequency
- ✅ Monitor execution history and success rates

**Best For**: Daily management, quick changes, visual overview

### Method 2: AWS CLI
**Setup**:
```bash
aws configure
# Enter your admin credentials
```

**Common Commands**:
```bash
# List all your schedules
aws scheduler list-schedules --group-name fixturecast-schedules

# Get details of a specific schedule
aws scheduler get-schedule --name "prediction-update-daily"

# Create a new schedule
aws scheduler create-schedule \
  --name "new-prediction-schedule" \
  --schedule-expression "rate(6 hours)" \
  --target file://target-config.json \
  --group-name fixturecast-schedules

# Delete a schedule
aws scheduler delete-schedule --name "unwanted-schedule"

# Pause a schedule
aws scheduler update-schedule \
  --name "schedule-name" \
  --state DISABLED

# Resume a schedule
aws scheduler update-schedule \
  --name "schedule-name" \
  --state ENABLED
```

**Best For**: Automation, bulk operations, scripting

### Method 3: CloudWatch Monitoring
**URL**: https://console.aws.amazon.com/cloudwatch/home

**What You Can Monitor**:
- ✅ Schedule execution logs
- ✅ Success/failure rates
- ✅ Performance metrics
- ✅ Set up alerts for failures
- ✅ Cost monitoring

**Key Log Groups**:
- `/aws/lambda/fixturecast-prediction-update`
- `/aws/lambda/fixturecast-match-check`
- `/aws/events/schedule/fixturecast-schedules`

## 📊 Monitoring Dashboard Setup

### CloudWatch Alarms
```bash
# Create alarm for failed executions
aws cloudwatch put-metric-alarm \
  --alarm-name "FixtureCast-Schedule-Failures" \
  --alarm-description "Alert when schedules fail" \
  --metric-name "FailedInvocations" \
  --namespace "AWS/Events" \
  --statistic "Sum" \
  --period 300 \
  --threshold 1 \
  --comparison-operator "GreaterThanOrEqualToThreshold"
```

### SNS Notifications
Set up SNS topics to receive alerts via:
- Email notifications
- SMS alerts
- Slack webhooks

## 🔒 Security Best Practices

### 1. Separate Credentials
- **Public Site**: Limited read-only credentials
- **Your Access**: Full admin credentials
- **Never** use admin credentials in public code

### 2. Resource Tagging
Tag all resources with:
```json
{
  "Project": "FixtureCast",
  "Environment": "Production",
  "Owner": "YourName",
  "ManagedBy": "EventBridge"
}
```

### 3. Cost Controls
- Set up billing alerts
- Use AWS Cost Explorer to monitor EventBridge costs
- Implement schedule cleanup for old/unused schedules

### 4. Access Logging
- Enable CloudTrail for audit logs
- Monitor who accesses what resources
- Set up alerts for unauthorized access attempts

## 🚀 Deployment Checklist

### Pre-Deployment
- [ ] AWS IAM roles created
- [ ] Read-only credentials generated for public site
- [ ] Admin credentials configured for your access
- [ ] Lambda functions deployed
- [ ] Schedule group `fixturecast-schedules` created

### Deployment
- [ ] Public site deployed with read-only environment variables
- [ ] Test that public users cannot create/delete schedules
- [ ] Verify you can access AWS Console
- [ ] Test schedule creation via AWS Console
- [ ] Confirm monitoring is working

### Post-Deployment
- [ ] Set up CloudWatch alarms
- [ ] Configure SNS notifications
- [ ] Test emergency schedule deletion
- [ ] Document your admin procedures
- [ ] Create backup/restore procedures

## 🆘 Emergency Procedures

### Stop All Schedules Immediately
```bash
# List all schedules
aws scheduler list-schedules --group-name fixturecast-schedules --query 'Schedules[].Name' --output text

# Disable all schedules (replace with actual names)
for schedule in $(aws scheduler list-schedules --group-name fixturecast-schedules --query 'Schedules[].Name' --output text); do
  aws scheduler update-schedule --name "$schedule" --state DISABLED
done
```

### Delete Problematic Schedule
```bash
aws scheduler delete-schedule --name "problematic-schedule-name"
```

### Check Recent Failures
```bash
aws logs filter-log-events \
  --log-group-name "/aws/lambda/fixturecast-prediction-update" \
  --start-time 1640995200000 \
  --filter-pattern "ERROR"
```

## 📞 Support Contacts

### AWS Support Resources
- AWS Console: https://console.aws.amazon.com/
- AWS Documentation: https://docs.aws.amazon.com/scheduler/
- AWS Support Center: https://console.aws.amazon.com/support/

### Your Admin URLs
- **EventBridge Console**: https://console.aws.amazon.com/scheduler/home
- **CloudWatch Logs**: https://console.aws.amazon.com/cloudwatch/home#logsV2:log-groups
- **IAM Roles**: https://console.aws.amazon.com/iam/home#/roles
- **Billing Dashboard**: https://console.aws.amazon.com/billing/home

---

**Remember**: You have complete control! The public site can only view schedules, but you can create, modify, and delete anything via the AWS Console or CLI.