import React, { useState, useEffect } from 'react';
import { notificationService, type NotificationSettings, NotificationTopic } from '../services/notificationService';

interface NotificationSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

const NotificationSettings: React.FC<NotificationSettingsProps> = ({ isOpen, onClose }) => {
  const [settings, setSettings] = useState<NotificationSettings>(notificationService.getSettings());
  const [topics, setTopics] = useState<NotificationTopic[]>(notificationService.getTopics());
  const [permissionStatus, setPermissionStatus] = useState(notificationService.getPermissionStatus());
  const [followedTeams, setFollowedTeams] = useState<string[]>([]);
  const [followedLeagues, setFollowedLeagues] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      setSettings(notificationService.getSettings());
      setTopics(notificationService.getTopics());
      setPermissionStatus(notificationService.getPermissionStatus());
      setFollowedTeams(notificationService.getFollowedTeams());
      setFollowedLeagues(notificationService.getFollowedLeagues());
    }
  }, [isOpen]);

  const handlePermissionRequest = async () => {
    const granted = await notificationService.requestPermission();
    setPermissionStatus(notificationService.getPermissionStatus());
    
    if (granted) {
      // Show success message
      console.log('Notification permission granted');
    }
  };

  const handleSettingChange = (key: keyof NotificationSettings, value: any) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    notificationService.updateSettings(newSettings);
  };

  const handleQuietHoursChange = (key: keyof NotificationSettings['quietHours'], value: any) => {
    const newSettings = {
      ...settings,
      quietHours: { ...settings.quietHours, [key]: value }
    };
    setSettings(newSettings);
    notificationService.updateSettings(newSettings);
  };

  const handleTopicToggle = (topicId: string, enabled: boolean) => {
    notificationService.updateTopic(topicId, enabled);
    setTopics(notificationService.getTopics());
  };

  const handleUnfollowTeam = (teamName: string) => {
    notificationService.unfollowTeam(teamName);
    setFollowedTeams(notificationService.getFollowedTeams());
  };

  const handleUnfollowLeague = (leagueName: string) => {
    notificationService.unfollowLeague(leagueName);
    setFollowedLeagues(notificationService.getFollowedLeagues());
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              🔔
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Notification Settings</h2>
              <p className="text-sm text-gray-600">Customize your notification preferences</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            title="Close notification settings"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Permission Status */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900">Notification Permission</h3>
                <p className="text-sm text-gray-600">
                  {permissionStatus.granted ? '✅ Enabled' : 
                   permissionStatus.denied ? '❌ Blocked' : '⚠️ Not requested'}
                </p>
              </div>
              {!permissionStatus.granted && !permissionStatus.denied && (
                <button
                  onClick={handlePermissionRequest}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Enable Notifications
                </button>
              )}
            </div>
          </div>

          {/* Notification Types */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">What to notify you about</h3>
            <div className="space-y-4">
              {topics.map((topic) => (
                <div key={topic.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900">{topic.name}</h4>
                    <p className="text-sm text-gray-600">{topic.description}</p>
                  </div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={topic.enabled}
                      onChange={(e) => handleTopicToggle(topic.id, e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      aria-label={`Toggle ${topic.name} notifications`}
                    />
                    <span className="sr-only">Toggle {topic.name} notifications</span>
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Specific Settings */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Notification Settings</h3>
            <div className="space-y-4">
              {/* Match Start */}
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div>
                  <h4 className="font-medium text-gray-900">Match Start</h4>
                  <p className="text-sm text-gray-600">Get notified when matches begin</p>
                </div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.matchStart}
                    onChange={(e) => handleSettingChange('matchStart', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    aria-label="Toggle match start notifications"
                  />
                  <span className="sr-only">Toggle match start notifications</span>
                </label>
              </div>

              {/* Goals */}
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div>
                  <h4 className="font-medium text-gray-900">Goals</h4>
                  <p className="text-sm text-gray-600">Get notified when goals are scored</p>
                </div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.goals}
                    onChange={(e) => handleSettingChange('goals', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    aria-label="Toggle goals notifications"
                  />
                  <span className="sr-only">Toggle goals notifications</span>
                </label>
              </div>

              {/* Full Time */}
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div>
                  <h4 className="font-medium text-gray-900">Full Time</h4>
                  <p className="text-sm text-gray-600">Get notified when matches end</p>
                </div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.fullTime}
                    onChange={(e) => handleSettingChange('fullTime', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    aria-label="Toggle full time notifications"
                  />
                  <span className="sr-only">Toggle full time notifications</span>
                </label>
              </div>
            </div>
          </div>

          {/* Quiet Hours */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quiet Hours</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div>
                  <h4 className="font-medium text-gray-900">Enable Quiet Hours</h4>
                  <p className="text-sm text-gray-600">Pause notifications during specified hours</p>
                </div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.quietHours.enabled}
                    onChange={(e) => handleQuietHoursChange('enabled', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    aria-label="Toggle quiet hours"
                  />
                  <span className="sr-only">Toggle quiet hours</span>
                </label>
              </div>

              {settings.quietHours.enabled && (
                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={settings.quietHours.start}
                      onChange={(e) => handleQuietHoursChange('start', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      aria-label="Quiet hours start time"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Time
                    </label>
                    <input
                      type="time"
                      value={settings.quietHours.end}
                      onChange={(e) => handleQuietHoursChange('end', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      aria-label="Quiet hours end time"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Followed Items */}
          {(followedTeams.length > 0 || followedLeagues.length > 0) && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Followed Items</h3>
              
              {followedTeams.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-medium text-gray-900 mb-2">Teams</h4>
                  <div className="flex flex-wrap gap-2">
                    {followedTeams.map((team) => (
                      <span
                        key={team}
                        className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                      >
                        {team}
                        <button
                          onClick={() => handleUnfollowTeam(team)}
                          className="ml-2 text-blue-600 hover:text-blue-800"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {followedLeagues.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Leagues</h4>
                  <div className="flex flex-wrap gap-2">
                    {followedLeagues.map((league) => (
                      <span
                        key={league}
                        className="inline-flex items-center px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm"
                      >
                        {league}
                        <button
                          onClick={() => handleUnfollowLeague(league)}
                          className="ml-2 text-green-600 hover:text-green-800"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationSettings;
