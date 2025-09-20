import { View } from '../types';

interface RouterState {
  currentView: View;
  isInitialized: boolean;
  pendingNavigation: View | null;
}

class RouterService {
  private state: RouterState = {
    currentView: View.Dashboard,
    isInitialized: false,
    pendingNavigation: null
  };

  private listeners: Set<(view: View) => void> = new Set();
  private scrollListeners: Set<() => void> = new Set();

  constructor() {
    this.initializeRouter();
  }

  // Initialize router immediately on first paint
  private initializeRouter(): void {
    if (typeof window === 'undefined') return;

    // Process initial hash immediately
    this.processInitialHash();

    // Set up hash change listener
    window.addEventListener('hashchange', this.handleHashChange.bind(this));

    // Set up popstate listener for browser navigation
    window.addEventListener('popstate', this.handlePopState.bind(this));

    this.state.isInitialized = true;
  }

  // Process initial hash on first paint
  private processInitialHash(): void {
    const hash = window.location.hash.slice(1);
    
    if (hash && Object.values(View).includes(hash as View)) {
      const view = hash as View;
      this.state.currentView = view;
      this.state.pendingNavigation = view;
      
      // Notify listeners immediately
      this.notifyListeners(view);
      
      // Handle special cases like fixtures
      if (view === View.Fixtures) {
        this.handleFixturesRoute();
      }
    }
  }

  // Handle hash changes
  private handleHashChange(): void {
    const hash = window.location.hash.slice(1);
    
    if (hash && Object.values(View).includes(hash as View)) {
      const view = hash as View;
      this.state.currentView = view;
      this.state.pendingNavigation = view;
      
      this.notifyListeners(view);
      
      // Handle special cases
      if (view === View.Fixtures) {
        this.handleFixturesRoute();
      }
    }
  }

  // Handle browser back/forward navigation
  private handlePopState(event: PopStateEvent): void {
    if (event.state && event.state.view) {
      const view = event.state.view as View;
      this.state.currentView = view;
      this.state.pendingNavigation = view;
      
      this.notifyListeners(view);
      
      if (view === View.Fixtures) {
        this.handleFixturesRoute();
      }
    } else {
      // Handle initial hash or direct navigation
      this.processInitialHash();
    }
  }

  // Handle fixtures route specifically
  private handleFixturesRoute(): void {
    // Scroll to fixtures after render
    this.scheduleScrollToFixtures();
  }

  // Schedule scroll to fixtures after render
  private scheduleScrollToFixtures(): void {
    // Use requestAnimationFrame to ensure DOM is ready
    requestAnimationFrame(() => {
      // Try to find fixtures container
      const fixturesContainer = document.querySelector('[data-fixtures-container]') || 
                               document.querySelector('#fixtures-list') ||
                               document.querySelector('.fixtures-container');
      
      if (fixturesContainer) {
        fixturesContainer.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
      } else {
        // Fallback: scroll to top of page
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  }

  // Get current view
  getCurrentView(): View {
    return this.state.currentView;
  }

  // Get pending navigation
  getPendingNavigation(): View | null {
    return this.state.pendingNavigation;
  }

  // Check if router is initialized
  isInitialized(): boolean {
    return this.state.isInitialized;
  }

  // Navigate to a view
  navigateTo(view: View, options?: { replace?: boolean; scroll?: boolean }): void {
    this.state.currentView = view;
    this.state.pendingNavigation = view;
    
    // Update URL
    const path = `#${view}`;
    if (window.location.hash !== path) {
      if (options?.replace) {
        window.history.replaceState({ view }, '', path);
      } else {
        window.history.pushState({ view }, '', path);
      }
    }
    
    // Notify listeners
    this.notifyListeners(view);
    
    // Handle special cases
    if (view === View.Fixtures) {
      this.handleFixturesRoute();
    }
    
    // Clear pending navigation
    this.state.pendingNavigation = null;
  }

  // Add listener for view changes
  addViewListener(listener: (view: View) => void): () => void {
    this.listeners.add(listener);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  // Add listener for scroll events
  addScrollListener(listener: () => void): () => void {
    this.scrollListeners.add(listener);
    
    return () => {
      this.scrollListeners.delete(listener);
    };
  }

  // Notify all listeners
  private notifyListeners(view: View): void {
    this.listeners.forEach(listener => {
      try {
        listener(view);
      } catch (error) {
        console.error('Error in router listener:', error);
      }
    });
  }

  // Notify scroll listeners
  private notifyScrollListeners(): void {
    this.scrollListeners.forEach(listener => {
      try {
        listener();
      } catch (error) {
        console.error('Error in scroll listener:', error);
      }
    });
  }

  // Force scroll to fixtures
  scrollToFixtures(): void {
    this.handleFixturesRoute();
  }

  // Get initial view from URL
  getInitialView(): View {
    if (typeof window === 'undefined') return View.Dashboard;
    
    const hash = window.location.hash.slice(1);
    if (hash && Object.values(View).includes(hash as View)) {
      return hash as View;
    }
    
    return View.Dashboard;
  }

  // Check if current view is fixtures
  isFixturesView(): boolean {
    return this.state.currentView === View.Fixtures;
  }

  // Get view from hash
  getViewFromHash(): View | null {
    if (typeof window === 'undefined') return null;
    
    const hash = window.location.hash.slice(1);
    if (hash && Object.values(View).includes(hash as View)) {
      return hash as View;
    }
    
    return null;
  }

  // Update URL without triggering navigation
  updateUrl(view: View, options?: { replace?: boolean }): void {
    if (typeof window === 'undefined') return;
    
    const path = `#${view}`;
    if (window.location.hash !== path) {
      if (options?.replace) {
        window.history.replaceState({ view }, '', path);
      } else {
        window.history.pushState({ view }, '', path);
      }
    }
  }

  // Cleanup
  destroy(): void {
    if (typeof window === 'undefined') return;
    
    window.removeEventListener('hashchange', this.handleHashChange.bind(this));
    window.removeEventListener('popstate', this.handlePopState.bind(this));
    
    this.listeners.clear();
    this.scrollListeners.clear();
  }
}

export const routerService = new RouterService();
