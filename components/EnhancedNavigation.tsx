import React, { useState, useEffect, useCallback } from 'react';
import { View } from '../types';
import { useAppContext } from '../contexts/AppContext';

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



  const [breadcrumbs, setBreadcrumbs] = useState<View[]>([]);


  // Navigation items with enhanced metadata
  const navigationItems: NavigationItem[] = [
    {
      id: View.Dashboard,
      label: 'Dashboard',
      icon: '',
      description: 'Overview of today\'s matches and predictions',
      badge: 'Live'
    },
    {
      id: View.Fixtures,
      label: 'Fixtures',
      icon: '',
      description: 'Browse all upcoming matches with filters',
      badge: 'Enhanced'
    },
    {
      id: View.News,
      label: 'News',
      icon: '',
      description: 'Latest football news and updates',
      badge: 'Real-time'
    },
    {
      id: View.MyTeams,
      label: 'My Teams',
      icon: '',
      description: 'Your favorite teams and alerts',
      badge: unreadAlertsCount > 0 ? `${unreadAlertsCount}` : undefined
    },
    {
      id: View.Accuracy,
      label: 'Accuracy',
      icon: '',
      description: 'Prediction accuracy tracking and analytics',
      badge: 'New',
      isNew: true
    }
    // Scheduler removed from public site - admin access via AWS Console only
  ];



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

          case 'r':
            event.preventDefault();
            refreshRealTimeData();
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
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full"></div>
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
                data-testid={`nav-link-${item.label}`}
              >
                <span className="flex items-center space-x-2">
                  <span className="text-lg">{item.icon}</span>
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                      item.badge === 'Live' ? 'bg-red-500 text-white' :
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
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
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




    </header>
  );
};

export default EnhancedNavigation;
