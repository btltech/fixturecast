import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import AlertsBell from './AlertsBell';
import { useAppContext } from '../contexts/AppContext';

const Header: React.FC = () => {
  const { unreadAlertsCount, markAlertsAsRead, refreshRealTimeData } = useAppContext();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  const handleTeamsNavigation = () => {
    markAlertsAsRead();
    setIsMobileMenuOpen(false);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const navLinkClass = (path: string) => {
    const baseClass = "px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200";
    const activeClass = "bg-blue-600 text-white";
    const inactiveClass = "text-gray-300 hover:bg-gray-700 hover:text-white";
    
    return `${baseClass} ${isActive(path) ? activeClass : inactiveClass}`;
  };

  const mobileNavLinkClass = (path: string) => {
    const baseClass = "block px-3 py-2 rounded-md text-base font-medium transition-colors duration-200";
    const activeClass = "bg-blue-600 text-white";
    const inactiveClass = "text-gray-300 hover:bg-gray-700 hover:text-white";
    
    return `${baseClass} ${isActive(path) ? activeClass : inactiveClass}`;
  };

  return (
    <header className="bg-gray-800/80 backdrop-blur-sm shadow-lg sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo */}
          <div className="flex items-center">
            <Link 
              to="/" 
              className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
              onClick={closeMobileMenu}
            >
              <div className="text-2xl sm:text-3xl">⚽</div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-white">FixtureCast</h1>
                <p className="text-xs text-blue-400 hidden sm:block">AI-Powered Football Predictions</p>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            <Link to="/" className={navLinkClass('/')}>
              🏠 Dashboard
            </Link>
            <Link to="/fixtures" className={navLinkClass('/fixtures')}>
              📅 Fixtures
            </Link>
            <Link to="/teams" className={navLinkClass('/teams')} onClick={handleTeamsNavigation}>
              <div className="relative">
                ⭐ My Teams
                {unreadAlertsCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {unreadAlertsCount}
                  </span>
                )}
              </div>
            </Link>
            <Link to="/news" className={navLinkClass('/news')}>
              📰 News
            </Link>
          </nav>

          {/* Desktop Action Buttons */}
          <div className="hidden md:flex items-center space-x-3">
            <AlertsBell count={0} onClick={() => {}} />
            <button
              onClick={() => refreshRealTimeData()}
              className="p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-md transition-colors"
              title="Refresh Data"
            >
              🔄
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center space-x-2">
            <AlertsBell count={0} onClick={() => {}} />
            <button
              onClick={toggleMobileMenu}
              className="p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-md transition-colors"
              aria-label="Open mobile menu"
            >
              <div className="w-6 h-6 flex flex-col justify-center items-center">
                <span className={`bg-current block transition-all duration-300 h-0.5 w-6 ${
                  isMobileMenuOpen ? 'rotate-45 translate-y-1.5' : '-translate-y-0.5'
                }`}></span>
                <span className={`bg-current block transition-all duration-300 h-0.5 w-6 my-0.5 ${
                  isMobileMenuOpen ? 'opacity-0' : 'opacity-100'
                }`}></span>
                <span className={`bg-current block transition-all duration-300 h-0.5 w-6 ${
                  isMobileMenuOpen ? '-rotate-45 -translate-y-1.5' : 'translate-y-0.5'
                }`}></span>
              </div>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        <div className={`md:hidden transition-all duration-300 ease-in-out ${
          isMobileMenuOpen 
            ? 'max-h-64 opacity-100 border-t border-gray-700' 
            : 'max-h-0 opacity-0 overflow-hidden'
        }`}>
          <div className="px-2 pt-2 pb-3 space-y-1">
            <Link to="/" className={mobileNavLinkClass('/')} onClick={closeMobileMenu}>
              🏠 Dashboard
            </Link>
            <Link to="/fixtures" className={mobileNavLinkClass('/fixtures')} onClick={closeMobileMenu}>
              📅 Fixtures
            </Link>
            <Link 
              to="/teams" 
              className={mobileNavLinkClass('/teams')} 
              onClick={() => {
                handleTeamsNavigation();
              }}
            >
              <div className="flex items-center justify-between">
                <span>⭐ My Teams</span>
                {unreadAlertsCount > 0 && (
                  <span className="bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {unreadAlertsCount}
                  </span>
                )}
              </div>
            </Link>
            <Link to="/news" className={mobileNavLinkClass('/news')} onClick={closeMobileMenu}>
              📰 News
            </Link>
            <div className="pt-2 border-t border-gray-700">
              <button
                onClick={() => {
                  refreshRealTimeData();
                  closeMobileMenu();
                }}
                className="w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
              >
                🔄 Refresh Data
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
