import React, { useEffect, useRef } from 'react';
import { View } from '../types';
import { routerService } from '../services/routerService';

interface ImmediateFixturesRouterProps {
  children: React.ReactNode;
  onFixturesRoute?: () => void;
}

const ImmediateFixturesRouter: React.FC<ImmediateFixturesRouterProps> = ({
  children,
  onFixturesRoute
}) => {
  const fixturesContainerRef = useRef<HTMLDivElement>(null);
  const hasScrolledRef = useRef(false);

  useEffect(() => {
    // Check if we're on fixtures route immediately
    const initialView = routerService.getInitialView();
    
    if (initialView === View.Fixtures) {
      // Handle fixtures route immediately
      handleFixturesRoute();
    }

    // Listen for route changes
    const unsubscribe = routerService.addViewListener((view) => {
      if (view === View.Fixtures) {
        handleFixturesRoute();
      }
    });

    return unsubscribe;
  }, []);

  const handleFixturesRoute = () => {
    // Call custom handler
    if (onFixturesRoute) {
      onFixturesRoute();
    }

    // Schedule scroll to fixtures
    scheduleScrollToFixtures();
  };

  const scheduleScrollToFixtures = () => {
    // Use multiple strategies to ensure scroll happens
    const scrollToFixtures = () => {
      const container = fixturesContainerRef.current || 
                      document.querySelector('[data-fixtures-container]') || 
                      document.querySelector('#fixtures-list') ||
                      document.querySelector('.fixtures-container');
      
      if (container) {
        container.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
        hasScrolledRef.current = true;
      } else {
        // Fallback: scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    };

    // Try immediate scroll
    requestAnimationFrame(scrollToFixtures);
    
    // Try again after a short delay
    setTimeout(scrollToFixtures, 100);
    
    // Try again after DOM is fully ready
    setTimeout(scrollToFixtures, 500);
  };

  // Handle scroll after render
  useEffect(() => {
    if (routerService.isFixturesView() && !hasScrolledRef.current) {
      scheduleScrollToFixtures();
    }
  });

  return (
    <div 
      ref={fixturesContainerRef}
      data-fixtures-container
      className="fixtures-container"
    >
      {children}
    </div>
  );
};

export default ImmediateFixturesRouter;
