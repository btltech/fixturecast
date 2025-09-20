import { useState, useEffect, useCallback } from 'react';
import { View } from '../types';
import { routerService } from '../services/routerService';

interface UseImmediateRouterOptions {
  onViewChange?: (view: View) => void;
  onFixturesRoute?: () => void;
  scrollToFixtures?: boolean;
}

export const useImmediateRouter = (options: UseImmediateRouterOptions = {}) => {
  const {
    onViewChange,
    onFixturesRoute,
    scrollToFixtures = true
  } = options;

  const [currentView, setCurrentView] = useState<View>(() => {
    // Get initial view immediately
    return routerService.getInitialView();
  });

  const [isRouterReady, setIsRouterReady] = useState(false);

  // Handle view changes
  const handleViewChange = useCallback((view: View) => {
    setCurrentView(view);
    
    // Call custom handler
    if (onViewChange) {
      onViewChange(view);
    }
    
    // Handle fixtures route
    if (view === View.Fixtures && onFixturesRoute) {
      onFixturesRoute();
    }
  }, [onViewChange, onFixturesRoute]);

  // Navigate to a view
  const navigateTo = useCallback((view: View, options?: { replace?: boolean; scroll?: boolean }) => {
    routerService.navigateTo(view, options);
  }, []);

  // Scroll to fixtures
  const handleScrollToFixtures = useCallback(() => {
    if (scrollToFixtures) {
      routerService.scrollToFixtures();
    }
  }, [scrollToFixtures]);

  // Initialize router
  useEffect(() => {
    // Add view change listener
    const unsubscribe = routerService.addViewListener(handleViewChange);
    
    // Set router as ready
    setIsRouterReady(true);
    
    // Handle initial view if it's fixtures
    if (currentView === View.Fixtures) {
      handleViewChange(View.Fixtures);
    }
    
    return unsubscribe;
  }, [handleViewChange, currentView]);

  // Handle fixtures route specifically
  useEffect(() => {
    if (currentView === View.Fixtures && isRouterReady) {
      // Schedule scroll to fixtures after render
      requestAnimationFrame(() => {
        const fixturesContainer = document.querySelector('[data-fixtures-container]') || 
                                 document.querySelector('#fixtures-list') ||
                                 document.querySelector('.fixtures-container');
        
        if (fixturesContainer) {
          fixturesContainer.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
          });
        }
      });
    }
  }, [currentView, isRouterReady]);

  // Handle hash changes
  useEffect(() => {
    const handleHashChange = () => {
      const view = routerService.getViewFromHash();
      if (view) {
        handleViewChange(view);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [handleViewChange]);

  return {
    currentView,
    isRouterReady,
    navigateTo,
    scrollToFixtures: handleScrollToFixtures,
    isFixturesView: currentView === View.Fixtures,
    getInitialView: routerService.getInitialView,
    getViewFromHash: routerService.getViewFromHash
  };
};
