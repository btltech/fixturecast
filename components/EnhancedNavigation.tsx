import React, { useState, useEffect, useCallback } from 'react';
import { View } from '../types';
import { useAppContext } from '../contexts/AppContext';
import SettingsPanel from './SettingsPanel';

interface EnhancedNavigationProps {
  onNavigate: (view: View) => void;
  currentView: View;
  className?: string;
}

interface NavigationItem {
  id: View;
  label: string;
  icon: string;
  description: string;
  badge?: string;
  isNew?: boolean;
}

const EnhancedNavigation: React.FC<EnhancedNavigationProps> = ({
  onNavigate,
  currentView,
  className = ''
}) => {
  const { unreadAlertsCount, markAlertsAsRead, refreshRealTimeData } = useAppContext();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [breadcrumbs, setBreadcrumbs] = useState<View[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Navigation items with enhanced metadata
  const navigationItems: NavigationItem[] = [
    {
      id: View.Dashboard,
      label: 'Dashboard',
      icon: '🏠',
      description: 'Overview of today\'s matches and predictions',
      badge: 'Live'
    },
    {
      id: View.Fixtures,
      label: 'Fixtures',
      icon: '📅',
      description: 'Browse all upcoming matches with filters',
      badge: 'Enhanced'
    },
    {
      id: View.News,
      label: 'News',
      icon: '📰',
      description: 'Latest football news and updates',
      badge: 'Real-time'
    },
    {
      id: View.MyTeams,
      label: 'My Teams',
      icon: '⭐',
      description: 'Your favorite teams and alerts',
      badge: unreadAlertsCount > 0 ? `${unreadAlertsCount}` : undefined
    }
  ];

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('fixturecast_recent_searches');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (error) {
        console.warn('Failed to load recent searches:', error);
      }
    }
  }, []);

  // Save recent searches to localStorage
  const saveRecentSearch = useCallback((query: string) => {
    if (query.trim() && !recentSearches.includes(query.trim())) {
      const updated = [query.trim(), ...recentSearches.slice(0, 4)]; // Keep last 5
      setRecentSearches(updated);
      localStorage.setItem('fixturecast_recent_searches', JSON.stringify(updated));
    }
  }, [recentSearches]);

  // Handle navigation with breadcrumb tracking
  const handleNavigation = useCallback((view: View) => {
    if (view === View.MyTeams) {
      markAlertsAsRead();
    }
    
    // Update breadcrumbs
    setBreadcrumbs(prev => {
      const newBreadcrumbs = [...prev];
      if (newBreadcrumbs[newBreadcrumbs.length - 1] !== view) {
        newBreadcrumbs.push(view);
        // Keep only last 5 breadcrumbs
        return newBreadcrumbs.slice(-5);
      }
      return newBreadcrumbs;
    });
    
    setIsMobileMenuOpen(false);
    onNavigate(view);
  }, [onNavigate, markAlertsAsRead]);

  // Handle search
  const handleSearch = useCallback((query: string) => {
    if (query.trim()) {
      saveRecentSearch(query);
      // Implement search logic here
      console.log('Searching for:', query);
      setIsSearchOpen(false);
      setSearchQuery('');
    }
  }, [saveRecentSearch]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case '1':
            event.preventDefault();
            handleNavigation(View.Dashboard);
            break;
          case '2':
            event.preventDefault();
            handleNavigation(View.Fixtures);
            break;
          case '3':
            event.preventDefault();
            handleNavigation(View.News);
            break;
          case '4':
            event.preventDefault();
            handleNavigation(View.MyTeams);
            break;
          case 'k':
            event.preventDefault();
            setIsSearchOpen(true);
            break;
          case 'r':
            event.preventDefault();
            refreshRealTimeData();
            break;
          case ',':
            event.preventDefault();
            setIsSettingsOpen(true);
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNavigation, refreshRealTimeData]);

  return (
    <header className={`bg-gray-800/90 backdrop-blur-md shadow-xl sticky top-0 z-50 border-b border-gray-700/50 ${className}`}>
      <div className="container mx-auto px-4">
        {/* Main Navigation Bar */}
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo with enhanced branding */}
          <div 
            className="flex items-center space-x-3 cursor-pointer group" 
            onClick={() => handleNavigation(View.Dashboard)}
          >
            <div className="relative">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 sm:h-10 sm:w-10 text-blue-400 group-hover:text-blue-300 transition-colors duration-200" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15H9v-2h2v2zm0-4H9V7h2v6zm4-2h-2V7h2v6z"/>
              </svg>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-wider group-hover:text-blue-100 transition-colors duration-200">
                FixtureCast
              </h1>
              <p className="text-xs text-gray-400 hidden sm:block">AI-Powered Football Predictions</p>
            </div>
          </div>

          {/* Enhanced Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-1">
            {navigationItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavigation(item.id)}
                className={`relative px-4 py-2 rounded-lg font-medium transition-all duration-200 group ${
                  currentView === item.id
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'text-gray-300 hover:text-white hover:bg-gray-700/50'
                }`}
                title={item.description}
              >
                <span className="flex items-center space-x-2">
                  <span className="text-lg">{item.icon}</span>
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className={`px-2 py-0.5 text-xs rounded-full ${
                      item.badge === 'Live' ? 'bg-red-500 text-white animate-pulse' :
                      item.badge === 'Enhanced' ? 'bg-green-500 text-white' :
                      item.badge === 'Real-time' ? 'bg-blue-500 text-white' :
                      'bg-orange-500 text-white'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </span>
                {item.isNew && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-400 rounded-full"></div>
                )}
              </button>
            ))}
          </nav>

          {/* Enhanced Action Buttons */}
          <div className="hidden lg:flex items-center space-x-3">
            {/* Search Button */}
            <button
              onClick={() => setIsSearchOpen(true)}
              className="p-2 text-gray-300 hover:text-white transition-colors duration-200 rounded-lg hover:bg-gray-700/50"
              title="Search (Ctrl+K)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>

            {/* Refresh Button */}
            <button
              onClick={() => refreshRealTimeData()}
              className="p-2 text-gray-300 hover:text-white transition-colors duration-200 rounded-lg hover:bg-gray-700/50"
              title="Refresh Data (Ctrl+R)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>

            {/* Settings Button */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 text-gray-300 hover:text-white transition-colors duration-200 rounded-lg hover:bg-gray-700/50"
              title="Settings (Ctrl+,)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>

            {/* Alerts Bell */}
            <div className="relative">
              <button
                onClick={() => handleNavigation(View.MyTeams)}
                className="p-2 text-gray-300 hover:text-white transition-colors duration-200 rounded-lg hover:bg-gray-700/50"
                title="Alerts & Notifications"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5-5-5h5v-5a7.5 7.5 0 1 0-15 0v5h5l-5 5-5-5h5v-5a7.5 7.5 0 1 0 15 0v5z" />
                </svg>
              </button>
              {unreadAlertsCount > 0 && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center animate-pulse">
                  {unreadAlertsCount > 9 ? '9+' : unreadAlertsCount}
                </div>
              )}
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="lg:hidden flex items-center space-x-2">
            <button
              onClick={() => handleNavigation(View.MyTeams)}
              className="relative p-2 text-gray-300 hover:text-white transition-colors duration-200"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5-5-5h5v-5a7.5 7.5 0 1 0-15 0v5h5l-5 5-5-5h5v-5a7.5 7.5 0 1 0 15 0v5z" />
              </svg>
              {unreadAlertsCount > 0 && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {unreadAlertsCount}
                </div>
              )}
            </button>
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 text-gray-300 hover:text-white transition-colors duration-200"
            >
              {isMobileMenuOpen ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Breadcrumb Navigation */}
        {breadcrumbs.length > 0 && (
          <div className="hidden lg:flex items-center space-x-2 py-2 text-sm text-gray-400 border-t border-gray-700/50">
            <span>Navigation:</span>
            {breadcrumbs.map((view, index) => (
              <React.Fragment key={view}>
                <button
                  onClick={() => handleNavigation(view)}
                  className="hover:text-white transition-colors duration-200"
                >
                  {navigationItems.find(item => item.id === view)?.label}
                </button>
                {index < breadcrumbs.length - 1 && <span>→</span>}
              </React.Fragment>
            ))}
          </div>
        )}

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-700 py-4">
            <nav className="flex flex-col space-y-2">
              {navigationItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleNavigation(item.id)}
                  className={`flex items-center justify-between p-3 rounded-lg transition-all duration-200 ${
                    currentView === item.id
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:text-white hover:bg-gray-700/50'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-xl">{item.icon}</span>
                    <div className="text-left">
                      <div className="font-medium">{item.label}</div>
                      <div className="text-xs opacity-75">{item.description}</div>
                    </div>
                  </div>
                  {item.badge && (
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      item.badge === 'Live' ? 'bg-red-500 text-white' :
                      item.badge === 'Enhanced' ? 'bg-green-500 text-white' :
                      item.badge === 'Real-time' ? 'bg-blue-500 text-white' :
                      'bg-orange-500 text-white'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              ))}
              <button
                onClick={() => {
                  refreshRealTimeData();
                  setIsMobileMenuOpen(false);
                }}
                className="flex items-center space-x-3 p-3 text-gray-300 hover:text-white transition-colors duration-200 rounded-lg hover:bg-gray-700/50"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Refresh Data</span>
              </button>
            </nav>
          </div>
        )}
      </div>

      {/* Search Modal */}
      {isSearchOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center pt-20">
          <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl mx-4">
            <div className="p-4 border-b border-gray-700">
              <div className="flex items-center space-x-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSearch(searchQuery);
                    } else if (e.key === 'Escape') {
                      setIsSearchOpen(false);
                      setSearchQuery('');
                    }
                  }}
                  placeholder="Search teams, leagues, matches..."
                  className="flex-1 bg-transparent text-white placeholder-gray-400 outline-none"
                  autoFocus
                />
                <button
                  onClick={() => setIsSearchOpen(false)}
                  className="text-gray-400 hover:text-white transition-colors duration-200"
                  title="Close search"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            {recentSearches.length > 0 && (
              <div className="p-4 border-b border-gray-700">
                <h3 className="text-sm font-medium text-gray-400 mb-2">Recent Searches</h3>
                <div className="flex flex-wrap gap-2">
                  {recentSearches.map((search, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setSearchQuery(search);
                        handleSearch(search);
                      }}
                      className="px-3 py-1 bg-gray-700 text-gray-300 rounded-full text-sm hover:bg-gray-600 transition-colors duration-200"
                    >
                      {search}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            <div className="p-4">
              <div className="text-sm text-gray-400">
                <p className="mb-2">Search shortcuts:</p>
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <kbd className="px-2 py-1 bg-gray-700 rounded text-xs">Ctrl+K</kbd>
                    <span>Open search</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <kbd className="px-2 py-1 bg-gray-700 rounded text-xs">Ctrl+R</kbd>
                    <span>Refresh data</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <kbd className="px-2 py-1 bg-gray-700 rounded text-xs">Ctrl+1-4</kbd>
                    <span>Navigate pages</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Panel */}
      <SettingsPanel 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
      />
    </header>
  );
};

export default EnhancedNavigation;
