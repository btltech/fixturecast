import React, { useState, useEffect } from 'react';

interface AdminControlPanelProps {
  isAuthenticated: boolean;
  onAuthenticate: (password: string) => boolean;
}

export const AdminControlPanel: React.FC<AdminControlPanelProps> = ({
  isAuthenticated,
  onAuthenticate
}) => {
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showLogin, setShowLogin] = useState(!isAuthenticated);
  const [awsStatus, setAwsStatus] = useState<'checking' | 'connected' | 'error'>('checking');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate authentication check
    setTimeout(() => {
      const isValid = onAuthenticate(password);
      if (isValid) {
        setShowLogin(false);
      } else {
        alert('Invalid admin password');
      }
      setIsLoading(false);
    }, 1000);
  };

  const checkAwsConnection = async () => {
    try {
      // In a real implementation, you'd check AWS connection here
      // For now, simulate the check
      await new Promise(resolve => setTimeout(resolve, 1500));
      setAwsStatus('connected');
    } catch (error) {
      setAwsStatus('error');
    }
  };

  useEffect(() => {
    if (!showLogin) {
      checkAwsConnection();
    }
  }, [showLogin]);

  if (showLogin) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
          <div className="text-center mb-6">
            <div className="mx-auto h-12 w-12 text-indigo-600 mb-4 flex items-center justify-center text-2xl">🛡️</div>
            <h2 className="text-2xl font-bold text-gray-900">Admin Access</h2>
            <p className="text-gray-600">EventBridge Scheduler Administration</p>
          </div>
          
          <form onSubmit={handleLogin}>
            <div className="mb-4">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Admin Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Enter admin password"
                required
              />
            </div>
            
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <>
                  <span className="mr-2">🔓</span>
                  Access Admin Panel
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow">
                  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <span className="text-2xl mr-3">🛡️</span>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Admin Control Panel</h1>
                <p className="text-gray-600">EventBridge Scheduler Administration</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {awsStatus === 'connected' && (
                <div className="flex items-center text-green-600">
                  <span className="mr-1">✅</span>
                  <span className="text-sm">AWS Connected</span>
                </div>
              )}
              {awsStatus === 'error' && (
                <div className="flex items-center text-red-600">
                  <span className="mr-1">⚠️</span>
                  <span className="text-sm">AWS Error</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <AdminActionCard
            title="AWS Console"
            description="Open EventBridge Scheduler in AWS Console"
            icon="⚙️"
            action={() => window.open('https://console.aws.amazon.com/scheduler/home', '_blank')}
            buttonText="Open Console"
          />
          
          <AdminActionCard
            title="CloudWatch Logs"
            description="View Lambda execution logs"
            icon="📊"
            action={() => window.open('https://console.aws.amazon.com/cloudwatch/home#logsV2:log-groups', '_blank')}
            buttonText="View Logs"
          />
          
          <AdminActionCard
            title="Schedule Group"
            description="Manage fixturecast-schedules group"
            icon="🔒"
            action={() => window.open('https://console.aws.amazon.com/scheduler/home#/schedule-groups', '_blank')}
            buttonText="Manage Group"
          />
          
          <AdminActionCard
            title="IAM Roles"
            description="Configure scheduler permissions"
            icon="🛡️"
            action={() => window.open('https://console.aws.amazon.com/iam/home#/roles', '_blank')}
            buttonText="Manage IAM"
          />
        </div>

        {/* Your Control Methods */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Control Methods</h2>
          
          <div className="space-y-4">
            <div className="border-l-4 border-blue-500 pl-4">
              <h3 className="font-medium text-gray-900">AWS Console (Recommended)</h3>
              <p className="text-gray-600">Full control via AWS EventBridge Scheduler console. Create, modify, delete, and monitor all schedules.</p>
            </div>
            
            <div className="border-l-4 border-green-500 pl-4">
              <h3 className="font-medium text-gray-900">AWS CLI</h3>
              <p className="text-gray-600">Command-line access for automation and bulk operations.</p>
              <code className="block bg-gray-100 p-2 mt-2 text-sm rounded">
                aws scheduler list-schedules --group-name fixturecast-schedules
              </code>
            </div>
            
            <div className="border-l-4 border-purple-500 pl-4">
              <h3 className="font-medium text-gray-900">CloudWatch Monitoring</h3>
              <p className="text-gray-600">Monitor schedule executions, set up alerts, and view performance metrics.</p>
            </div>
            
            <div className="border-l-4 border-orange-500 pl-4">
              <h3 className="font-medium text-gray-900">Public Site Status</h3>
              <p className="text-gray-600">Your public site runs in read-only mode. Users can view schedules but cannot modify them.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface AdminActionCardProps {
  title: string;
  description: string;
  icon: string;
  action: () => void;
  buttonText: string;
}

const AdminActionCard: React.FC<AdminActionCardProps> = ({
  title,
  description,
  icon,
  action,
  buttonText
}) => {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center mb-4">
        <span className="text-2xl mr-3">{icon}</span>
        <h3 className="text-lg font-medium text-gray-900">{title}</h3>
      </div>
      <p className="text-gray-600 text-sm mb-4">{description}</p>
      <button
        onClick={action}
        className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 text-sm"
      >
        {buttonText}
      </button>
    </div>
  );
};

export default AdminControlPanel;