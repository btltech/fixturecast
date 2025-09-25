# AWS EventBridge Scheduler - Admin Control Setup

## Overview
This setup gives you (the site owner) full administrative control over the EventBridge Scheduler while limiting public access to read-only operations.

## 1. AWS Account Setup

### Create IAM Roles

#### Admin Role (Your Control)
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
        "iam:PassRole",
        "logs:*",
        "cloudwatch:*"
      ],
      "Resource": "*"
    }
  ]
}
```

#### Public App Role (Limited Access)
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
      "Resource": "arn:aws:scheduler:*:*:schedule/fixturecast/*"
    }
  ]
}
```

## 2. Environment Configuration

### Production Environment Variables
```bash
# Public app - read-only access
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-public-read-only-key
AWS_SECRET_ACCESS_KEY=your-public-read-only-secret
VITE_AWS_MOCK_MODE=false
VITE_SCHEDULER_READ_ONLY=true
```

### Your Admin Environment Variables
```bash
# Your admin access - full control
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-admin-key
AWS_SECRET_ACCESS_KEY=your-admin-secret
AWS_SCHEDULER_ADMIN=true
```

## 3. Your Control Methods

### AWS Console Access
1. Log into AWS Console → EventBridge → Schedules
2. View all schedules created by the app
3. Create, modify, pause, or delete any schedule
4. Monitor execution history and logs

### AWS CLI Control
```bash
# List all schedules
aws scheduler list-schedules --group-name fixturecast-schedules

# Get specific schedule
aws scheduler get-schedule --name "prediction-update-daily"

# Delete a schedule
aws scheduler delete-schedule --name "schedule-name"

# Create a new schedule
aws scheduler create-schedule --cli-input-json file://schedule.json
```

### CloudWatch Monitoring
- View execution logs: `/aws/lambda/fixturecast-prediction-update`
- Set up alerts for failed executions
- Monitor scheduler performance metrics

## 4. Public Site Restrictions

The public site will be configured for:
- **Read-only access**: Users can view schedules but not modify them
- **No creation**: Only you can create new schedules via AWS Console/CLI
- **Display only**: Show schedule status and next execution times

## 5. Security Best Practices

1. **Separate AWS Accounts**: Consider using separate AWS accounts for production
2. **Resource Tagging**: Tag all resources with `Project: FixtureCast` for easy management
3. **CloudTrail Logging**: Enable CloudTrail to audit all scheduler actions
4. **Budget Alerts**: Set up billing alerts for EventBridge usage

## 6. Your Admin Dashboard Access

Create a private admin URL for your control:
- `https://yoursite.com/admin/scheduler` (password protected)
- Only accessible with admin credentials
- Full create/edit/delete capabilities

## 7. Deployment Steps

1. Set up AWS IAM roles and policies
2. Deploy Lambda functions with your admin credentials
3. Configure production app with read-only credentials
4. Test public site has limited access
5. Verify your admin access through AWS Console

This setup ensures you maintain complete control while providing a safe public interface.