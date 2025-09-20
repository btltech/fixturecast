import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const MobileBottomNavigation: React.FC = () => {
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  const navItems = [
    { path: '/', icon: '🏠', label: 'Home' },
    { path: '/fixtures', icon: '📅', label: 'Fixtures' },
    { path: '/my-teams', icon: '⭐', label: 'Teams' },
    { path: '/news', icon: '📰', label: 'News' }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-gray-800/95 backdrop-blur-lg border-t border-gray-700 z-50 pb-safe">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex flex-col items-center justify-center flex-1 py-1 px-2 rounded-lg transition-all duration-200 ${
              isActive(item.path)
                ? 'text-blue-400 bg-blue-500/10'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <span className="text-xl mb-1">{item.icon}</span>
            <span className="text-xs font-medium">{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
};

export default MobileBottomNavigation;
