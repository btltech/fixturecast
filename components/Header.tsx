import React, { useEffect, useState } from 'react';
import { View } from '../types';
import AlertsBell from './AlertsBell';
import { useAppContext } from '../contexts/AppContext';

interface HeaderProps {
    onNavigate: (view: View) => void;
}

const Header: React.FC<HeaderProps> = ({ onNavigate }) => {
  const { unreadAlertsCount, markAlertsAsRead, refreshRealTimeData } = useAppContext();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleNavigation = (view: View) => {
    if (view === View.MyTeams) {
        markAlertsAsRead();
    }
    setIsMobileMenuOpen(false); // Close mobile menu on navigation
    onNavigate(view);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <header className="bg-gray-800/80 backdrop-blur-sm shadow-lg sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo */}
          <div className="flex items-center space-x-2 sm:space-x-3 cursor-pointer" onClick={() => handleNavigation(View.Dashboard)}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 sm:h-8 sm:w-8 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15H9v-2h2v2zm0-4H9V7h2v6zm4-2h-2V7h2v6z"/>
            </svg>
            <h1 className="text-lg sm:text-2xl font-bold text-white tracking-wider">FixtureCast</h1>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <button onClick={() => onNavigate(View.Dashboard)} className="text-gray-300 hover:text-white transition-colors duration-200 font-medium">Dashboard</button>
            <button onClick={() => onNavigate(View.Fixtures)} className="text-gray-300 hover:text-white transition-colors duration-200 font-medium">Fixtures</button>
            <button onClick={() => onNavigate(View.News)} className="text-gray-300 hover:text-white transition-colors duration-200 font-medium">News</button>
            <button onClick={() => handleNavigation(View.MyTeams)} className="text-gray-300 hover:text-white transition-colors duration-200 font-medium">My Teams</button>
          </nav>

          {/* Desktop Action Buttons */}
          <div className="hidden md:flex items-center space-x-3">
            {/* AI API Status Indicator */}
            <div className="flex items-center space-x-1 px-2 py-1 bg-gray-700/50 rounded-md text-xs">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-gray-300">
                {typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 'DeepSeek' : 'Gemini'}
              </span>
            </div>
            <button
              onClick={() => refreshRealTimeData()}
              className="p-2 text-gray-300 hover:text-white transition-colors duration-200"
              title="Refresh real-time data"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <AlertsBell 
                count={unreadAlertsCount} 
                onClick={() => handleNavigation(View.MyTeams)}
            />
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center space-x-2">
            <AlertsBell 
                count={unreadAlertsCount} 
                onClick={() => handleNavigation(View.MyTeams)}
            />
            <button
              onClick={toggleMobileMenu}
              className="p-2 text-gray-300 hover:text-white transition-colors duration-200"
              title="Menu"
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

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-gray-700 py-4">
            <nav className="flex flex-col space-y-3">
              <button onClick={() => handleNavigation(View.Dashboard)} className="text-left text-gray-300 hover:text-white transition-colors duration-200 font-medium py-2">Dashboard</button>
              <button onClick={() => handleNavigation(View.Fixtures)} className="text-left text-gray-300 hover:text-white transition-colors duration-200 font-medium py-2">Fixtures</button>
              <button onClick={() => handleNavigation(View.News)} className="text-left text-gray-300 hover:text-white transition-colors duration-200 font-medium py-2">News</button>
              <button onClick={() => handleNavigation(View.MyTeams)} className="text-left text-gray-300 hover:text-white transition-colors duration-200 font-medium py-2">My Teams</button>
              <button
                onClick={() => {
                  refreshRealTimeData();
                  setIsMobileMenuOpen(false);
                }}
                className="text-left text-gray-300 hover:text-white transition-colors duration-200 font-medium py-2 flex items-center space-x-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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

export default Header;
