import React, { useState, useEffect, useCallback } from 'react';
import { themeService } from '../services/themeService';
import { calendarService } from '../services/calendarService';
import { performanceService } from '../services/performanceService';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({
  isOpen,
  onClose,
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState<'theme' | 'notifications' | 'performance' | 'accessibility'>('theme');
  const [themeSettings, setThemeSettings] = useState(themeService.getThemeSettings());
  const [timezoneSettings, setTimezoneSettings] = useState(themeService.getTimezoneSettings());
  const [notificationSettings, setNotificationSettings] = useState(calendarService.getNotificationSettings());
  const [performanceSettings, setPerformanceSettings] = useState(performanceService.getOptimizationSettings());
  const [accessibilitySettings, setAccessibilitySettings] = useState(themeService.getAccessibilitySettings());

  // Load settings on mount
  useEffect(() => {
    setThemeSettings(themeService.getThemeSettings());
    setTimezoneSettings(themeService.getTimezoneSettings());
    setNotificationSettings(calendarService.getNotificationSettings());
    setPerformanceSettings(performanceService.getOptimizationSettings());
    setAccessibilitySettings(themeService.getAccessibilitySettings());
  }, [isOpen]);

  // Handle theme changes
  const handleThemeChange = useCallback((updates: Partial<typeof themeSettings>) => {
    const newSettings = { ...themeSettings, ...updates };
    setThemeSettings(newSettings);
    themeService.updateThemeSettings(updates);
  }, [themeSettings]);

  // Handle timezone changes
  const handleTimezoneChange = useCallback((updates: Partial<typeof timezoneSettings>) => {
    const newSettings = { ...timezoneSettings, ...updates };
    setTimezoneSettings(newSettings);
    themeService.updateTimezoneSettings(updates);
  }, [timezoneSettings]);

  // Handle notification changes
  const handleNotificationChange = useCallback((updates: Partial<typeof notificationSettings>) => {
    const newSettings = { ...notificationSettings, ...updates };
    setNotificationSettings(newSettings);
    calendarService.updateNotificationSettings(updates);
  }, [notificationSettings]);

  // Handle performance changes
  const handlePerformanceChange = useCallback((updates: Partial<typeof performanceSettings>) => {
    const newSettings = { ...performanceSettings, ...updates };
    setPerformanceSettings(newSettings);
    performanceService.updateOptimizationSettings(updates);
  }, [performanceSettings]);

  // Handle accessibility changes
  const handleAccessibilityChange = useCallback((updates: Partial<typeof accessibilitySettings>) => {
    const newSettings = { ...accessibilitySettings, ...updates };
    setAccessibilitySettings(newSettings);
    themeService.updateAccessibilitySettings(updates);
  }, [accessibilitySettings]);

  // Get performance metrics
  const performanceMetrics = performanceService.getPerformanceMetrics();
  const performanceScore = performanceService.getPerformanceScore();
  const accessibilityScore = performanceService.getAccessibilityScore();

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 ${className}`}>
      <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-2xl font-bold text-white">⚙️ Settings</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white transition-colors duration-200 rounded-lg hover:bg-gray-700"
            aria-label="Close settings panel"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex h-[600px]">
          {/* Sidebar */}
          <div className="w-64 bg-gray-900 border-r border-gray-700 p-4">
            <nav className="space-y-2">
              {[
                { id: 'theme', label: '🎨 Theme & Display', icon: '🎨' },
                { id: 'notifications', label: '🔔 Notifications', icon: '🔔' },
                { id: 'performance', label: '⚡ Performance', icon: '⚡' },
                { id: 'accessibility', label: '♿ Accessibility', icon: '♿' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-colors duration-200 ${
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:text-white hover:bg-gray-700'
                  }`}
                >
                  <span className="mr-3">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 p-6 overflow-y-auto">
            {activeTab === 'theme' && (
              <div className="space-y-6">
                <h3 className="text-xl font-bold text-white mb-4">🎨 Theme & Display</h3>
                
                {/* Theme Mode */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">Theme Mode</label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { value: 'light', label: 'Light', icon: '☀️' },
                      { value: 'dark', label: 'Dark', icon: '🌙' },
                      { value: 'auto', label: 'Auto', icon: '🔄' }
                    ].map((mode) => (
                      <button
                        key={mode.value}
                        onClick={() => handleThemeChange({ mode: mode.value as any })}
                        className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                          themeSettings.mode === mode.value
                            ? 'border-blue-500 bg-blue-500/20 text-blue-400'
                            : 'border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500'
                        }`}
                      >
                        <div className="text-2xl mb-1">{mode.icon}</div>
                        <div className="text-sm font-medium">{mode.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Timezone */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">Timezone</label>
                  <select
                    value={timezoneSettings.timezone}
                    onChange={(e) => handleTimezoneChange({ timezone: e.target.value })}
                    className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    aria-label="Select timezone"
                  >
                    {themeService.getAvailableTimezones().slice(0, 20).map((tz) => (
                      <option key={tz} value={tz}>{tz}</option>
                    ))}
                  </select>
                </div>

                {/* Date/Time Format */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-3">Date Format</label>
                    <select
                      value={timezoneSettings.dateFormat}
                      onChange={(e) => handleTimezoneChange({ dateFormat: e.target.value as any })}
                      className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      aria-label="Select date format"
                    >
                      <option value="short">Short (12/31/2024)</option>
                      <option value="medium">Medium (Dec 31, 2024)</option>
                      <option value="long">Long (December 31, 2024)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-3">Time Format</label>
                    <select
                      value={timezoneSettings.timeFormat}
                      onChange={(e) => handleTimezoneChange({ timeFormat: e.target.value as any })}
                      className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      aria-label="Select time format"
                    >
                      <option value="12h">12-hour (2:30 PM)</option>
                      <option value="24h">24-hour (14:30)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <h3 className="text-xl font-bold text-white mb-4">🔔 Notifications</h3>
                
                {/* Notification Toggle */}
                <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                  <div>
                    <div className="font-medium text-white">Enable Notifications</div>
                    <div className="text-sm text-gray-400">Receive match reminders and updates</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notificationSettings.enabled}
                      onChange={(e) => handleNotificationChange({ enabled: e.target.checked })}
                      className="sr-only peer"
                      aria-label="Toggle notifications"
                    />
                    <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {/* Notification Types */}
                <div className="space-y-4">
                  {[
                    { key: 'matchReminders', label: 'Match Reminders', description: 'Get notified before matches start' },
                    { key: 'scoreUpdates', label: 'Score Updates', description: 'Receive live score notifications' },
                    { key: 'newsAlerts', label: 'News Alerts', description: 'Get notified about breaking news' }
                  ].map((type) => (
                    <div key={type.key} className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                      <div>
                        <div className="font-medium text-white">{type.label}</div>
                        <div className="text-sm text-gray-400">{type.description}</div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notificationSettings[type.key as keyof typeof notificationSettings] as boolean}
                          onChange={(e) => handleNotificationChange({ [type.key]: e.target.checked })}
                          className="sr-only peer"
                          aria-label={`Toggle ${type.label}`}
                        />
                        <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  ))}
                </div>

                {/* Reminder Times */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">Reminder Times</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[15, 30, 60, 120].map((minutes) => (
                      <button
                        key={minutes}
                        onClick={() => {
                          const currentMinutes = notificationSettings.reminderMinutes;
                          const newMinutes = currentMinutes.includes(minutes)
                            ? currentMinutes.filter(m => m !== minutes)
                            : [...currentMinutes, minutes].sort((a, b) => a - b);
                          handleNotificationChange({ reminderMinutes: newMinutes });
                        }}
                        className={`p-2 rounded-lg border-2 transition-all duration-200 ${
                          notificationSettings.reminderMinutes.includes(minutes)
                            ? 'border-blue-500 bg-blue-500/20 text-blue-400'
                            : 'border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500'
                        }`}
                        aria-label={`Toggle ${minutes} minute reminder`}
                      >
                        {minutes}m
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'performance' && (
              <div className="space-y-6">
                <h3 className="text-xl font-bold text-white mb-4">⚡ Performance</h3>
                
                {/* Performance Score */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-700 rounded-lg">
                    <div className="text-sm text-gray-400 mb-1">Performance Score</div>
                    <div className="text-2xl font-bold text-green-400">{performanceScore}/100</div>
                  </div>
                  <div className="p-4 bg-gray-700 rounded-lg">
                    <div className="text-sm text-gray-400 mb-1">Accessibility Score</div>
                    <div className="text-2xl font-bold text-blue-400">{accessibilityScore}/100</div>
                  </div>
                </div>

                {/* Performance Metrics */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-700 rounded-lg">
                    <div className="text-sm text-gray-400 mb-1">Load Time</div>
                    <div className="text-lg font-semibold text-white">{performanceMetrics.loadTime.toFixed(0)}ms</div>
                  </div>
                  <div className="p-4 bg-gray-700 rounded-lg">
                    <div className="text-sm text-gray-400 mb-1">Memory Usage</div>
                    <div className="text-lg font-semibold text-white">{(performanceMetrics.memoryUsage / 1024 / 1024).toFixed(1)}MB</div>
                  </div>
                </div>

                {/* Optimization Settings */}
                <div className="space-y-4">
                  {[
                    { key: 'lazyLoading', label: 'Lazy Loading', description: 'Load images and content as needed' },
                    { key: 'imageOptimization', label: 'Image Optimization', description: 'Optimize images for faster loading' },
                    { key: 'codeSplitting', label: 'Code Splitting', description: 'Split code for faster initial load' },
                    { key: 'caching', label: 'Caching', description: 'Cache data for faster subsequent loads' },
                    { key: 'preloading', label: 'Preloading', description: 'Preload critical resources' },
                    { key: 'serviceWorker', label: 'Service Worker', description: 'Enable offline functionality' }
                  ].map((setting) => (
                    <div key={setting.key} className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                      <div>
                        <div className="font-medium text-white">{setting.label}</div>
                        <div className="text-sm text-gray-400">{setting.description}</div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={performanceSettings[setting.key as keyof typeof performanceSettings] as boolean}
                          onChange={(e) => handlePerformanceChange({ [setting.key]: e.target.checked })}
                          className="sr-only peer"
                          aria-label={`Toggle ${setting.label}`}
                        />
                        <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'accessibility' && (
              <div className="space-y-6">
                <h3 className="text-xl font-bold text-white mb-4">♿ Accessibility</h3>
                
                {/* Accessibility Settings */}
                <div className="space-y-4">
                  {[
                    { key: 'reducedMotion', label: 'Reduce Motion', description: 'Minimize animations and transitions' },
                    { key: 'highContrast', label: 'High Contrast', description: 'Increase color contrast for better visibility' },
                    { key: 'colorBlindFriendly', label: 'Color Blind Friendly', description: 'Use colors accessible to color blind users' },
                    { key: 'screenReader', label: 'Screen Reader Support', description: 'Optimize for screen readers' },
                    { key: 'keyboardNavigation', label: 'Keyboard Navigation', description: 'Enable full keyboard navigation' }
                  ].map((setting) => (
                    <div key={setting.key} className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                      <div>
                        <div className="font-medium text-white">{setting.label}</div>
                        <div className="text-sm text-gray-400">{setting.description}</div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={accessibilitySettings[setting.key as keyof typeof accessibilitySettings] as boolean}
                          onChange={(e) => handleAccessibilityChange({ [setting.key]: e.target.checked })}
                          className="sr-only peer"
                          aria-label={`Toggle ${setting.label}`}
                        />
                        <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  ))}
                </div>

                {/* Font Size */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">Font Size</label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { value: 'small', label: 'Small', size: 'text-sm' },
                      { value: 'medium', label: 'Medium', size: 'text-base' },
                      { value: 'large', label: 'Large', size: 'text-lg' }
                    ].map((size) => (
                      <button
                        key={size.value}
                        onClick={() => handleAccessibilityChange({ fontSize: size.value as any })}
                        className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                          accessibilitySettings.fontSize === size.value
                            ? 'border-blue-500 bg-blue-500/20 text-blue-400'
                            : 'border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500'
                        }`}
                      >
                        <div className={`${size.size} font-medium`}>Aa</div>
                        <div className="text-sm">{size.label}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-700">
          <div className="text-sm text-gray-400">
            Settings are automatically saved
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;
