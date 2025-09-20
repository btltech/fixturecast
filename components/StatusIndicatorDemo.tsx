import React from 'react';
import { StatusIndicator, StatusIndicatorShowcase, MatchStatus } from './MatchStatusIndicator';

const StatusIndicatorDemo: React.FC = () => {
  const demoStatuses: MatchStatus[] = ['upcoming', 'live', 'postponed', 'completed', 'cancelled', 'suspended', 'abandoned'];

  const statusDescriptions = {
    upcoming: 'Matches that are scheduled to play in the future',
    live: 'Currently playing matches (with pulsing animation)',
    postponed: 'Matches that have been delayed to a later date',
    completed: 'Matches that have finished playing (FT = Full Time)',
    cancelled: 'Matches that have been cancelled and will not be played',
    suspended: 'Matches that have been temporarily stopped',
    abandoned: 'Matches that were stopped and will not resume'
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Match Status Indicators
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          Enhanced visual status indicators for football fixtures with color coding and subtle icons for quick scanning
        </p>
      </div>

      {/* Main Showcase */}
      <StatusIndicatorShowcase />

      {/* Detailed Examples */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Status Meanings */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Status Meanings & Colors
          </h2>
          <div className="space-y-3">
            {demoStatuses.map(status => (
              <div key={status} className="flex items-center space-x-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <StatusIndicator
                  status={status}
                  variant="badge"
                  size="medium"
                  showLabel={true}
                />
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900 dark:text-white capitalize">
                    {status}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {statusDescriptions[status]}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Usage Examples */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Usage Examples
          </h2>

          {/* Dot Indicators */}
          <div className="space-y-3">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Dot Indicators</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Perfect for compact spaces where you just need visual status cues
            </p>
            <div className="flex space-x-2">
              {demoStatuses.map(status => (
                <div key={`dot-${status}`} className="text-center">
                  <StatusIndicator
                    status={status}
                    variant="dot"
                    size="large"
                    showLabel={false}
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 capitalize">
                    {status}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Card Variants */}
          <div className="space-y-3">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Card Variants</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              More prominent status display with full styling and larger text
            </p>
            <div className="space-y-2">
              <StatusIndicator
                status="live"
                variant="card"
                size="medium"
                showLabel={true}
              />
              <StatusIndicator
                status="postponed"
                variant="card"
                size="medium"
                showLabel={true}
              />
            </div>
          </div>

          {/* Minimal Badges */}
          <div className="space-y-3">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Minimal Badges</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Compact badges with short abbreviations for space efficiency
            </p>
            <div className="flex flex-wrap gap-2">
              {demoStatuses.map(status => (
                <StatusIndicator
                  key={`minimal-${status}`}
                  status={status}
                  variant="badge"
                  size="small"
                  showLabel={true}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Integration Instructions */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
        <h2 className="text-xl font-semibold text-blue-900 dark:text-blue-100 mb-4">
          How to Use in Your Components
        </h2>
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded p-4 border border-blue-200 dark:border-blue-700">
            <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Basic Usage</h3>
            <pre className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 p-3 rounded overflow-x-auto">
{`import { StatusIndicator } from './components/MatchStatusIndicator';

<StatusIndicator
  status="live"
  variant="badge"
  size="medium"
  showLabel={true}
/>`}
            </pre>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded p-4 border border-blue-200 dark:border-blue-700">
            <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">With Match Data</h3>
            <pre className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 p-3 rounded overflow-x-auto">
{`import MatchStatusIndicator from './components/MatchStatusIndicator';

<MatchStatusIndicator
  match={match}
  size="small"
  showIcon={true}
  showText={true}
  variant="minimal"
/>`}
            </pre>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded p-4 border border-blue-200 dark:border-blue-700">
            <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Available Props</h3>
            <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
              <li><strong>status:</strong> 'upcoming' | 'live' | 'postponed' | 'completed' | 'cancelled' | 'suspended' | 'abandoned'</li>
              <li><strong>variant:</strong> 'badge' | 'dot' | 'card'</li>
              <li><strong>size:</strong> 'small' | 'medium' | 'large'</li>
              <li><strong>showLabel:</strong> boolean (whether to show text labels)</li>
              <li><strong>className:</strong> string (additional CSS classes)</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Live Demo */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg p-6 border border-green-200 dark:border-green-800">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          🎯 Live Demo - Try the Enhanced View!
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Switch to the "Enhanced" view mode in the Fixtures page to see these status indicators in action with real match data.
        </p>
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Quick Access:</span>
          <a
            href="/fixtures"
            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
          >
            Go to Fixtures →
          </a>
        </div>
      </div>
    </div>
  );
};

export default StatusIndicatorDemo;
