import { View } from '../types';

// Process routes immediately on first paint
export const processFirstPaintRoute = (): View => {
  if (typeof window === 'undefined') return View.Dashboard;

  // Get hash immediately
  const hash = window.location.hash.slice(1);
  
  // Check if it's a valid view
  if (hash && Object.values(View).includes(hash as View)) {
    const view = hash as View;
    
    // Handle fixtures route immediately
    if (view === View.Fixtures) {
      handleFixturesFirstPaint();
    }
    
    return view;
  }
  
  return View.Dashboard;
};

// Handle fixtures route on first paint
const handleFixturesFirstPaint = (): void => {
  if (typeof window === 'undefined') return;

  // Schedule scroll to fixtures after DOM is ready
  const scheduleScroll = () => {
    // Try multiple strategies to find fixtures container
    const findFixturesContainer = () => {
      return document.querySelector('[data-fixtures-container]') ||
             document.querySelector('#fixtures-list') ||
             document.querySelector('.fixtures-container') ||
             document.querySelector('.fixtures-list');
    };

    const scrollToFixtures = () => {
      const container = findFixturesContainer();
      
      if (container) {
        container.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
        console.log('Scrolled to fixtures container');
      } else {
        // Fallback: scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
        console.log('Scrolled to top (fixtures container not found)');
      }
    };

    // Try immediate scroll
    requestAnimationFrame(scrollToFixtures);
    
    // Try again after a short delay
    setTimeout(scrollToFixtures, 100);
    
    // Try again after DOM is fully ready
    setTimeout(scrollToFixtures, 500);
  };

  // Schedule scroll
  scheduleScroll();
};

// Check if current route is fixtures
export const isFixturesRoute = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  const hash = window.location.hash.slice(1);
  return hash === View.Fixtures;
};

// Get current route
export const getCurrentRoute = (): string => {
  if (typeof window === 'undefined') return '';
  
  return window.location.hash.slice(1);
};

// Set route without triggering navigation
export const setRoute = (view: View): void => {
  if (typeof window === 'undefined') return;
  
  const path = `#${view}`;
  if (window.location.hash !== path) {
    window.history.replaceState({ view }, '', path);
  }
};

// Initialize first paint router
export const initializeFirstPaintRouter = (): View => {
  const initialView = processFirstPaintRoute();
  
  // Set up hash change listener for immediate processing
  if (typeof window !== 'undefined') {
    const handleHashChange = () => {
      const view = processFirstPaintRoute();
      if (view === View.Fixtures) {
        handleFixturesFirstPaint();
      }
    };

    window.addEventListener('hashchange', handleHashChange);
  }
  
  return initialView;
};
