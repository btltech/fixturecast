/**
 * Bundle Optimization Service
 * Handles dynamic imports, preloading, and performance optimizations
 */

export class BundleOptimizationService {
  private preloadedModules = new Set<string>();
  private importCache = new Map<string, Promise<any>>();

  /**
   * Preload a component module based on user interaction
   */
  async preloadComponent(componentName: string): Promise<void> {
    if (this.preloadedModules.has(componentName)) {
      return;
    }

    try {
      const moduleMap: Record<string, () => Promise<any>> = {
        'Dashboard': () => import('../components/Dashboard'),
        'Fixtures': () => import('../components/Fixtures'),
        'MatchDetail': () => import('../components/MatchDetail'),
        'MyTeams': () => import('../components/MyTeams'),
        'News': () => import('../components/News'),
        'TeamPage': () => import('../components/TeamPage'),
        'PredictionDetail': () => import('../components/PredictionDetail'),
        'MobileOptimizedFixtures': () => import('../components/MobileOptimizedFixtures'),
        'CalendarView': () => import('../components/CalendarView'),
        'PerformanceDashboard': () => import('../components/PerformanceDashboard'),
      };

      const importFunction = moduleMap[componentName];
      if (importFunction) {
        if (!this.importCache.has(componentName)) {
          this.importCache.set(componentName, importFunction());
        }
        await this.importCache.get(componentName);
        this.preloadedModules.add(componentName);
        console.log(`Preloaded component: ${componentName}`);
      }
    } catch (error) {
      console.warn(`Failed to preload component ${componentName}:`, error);
    }
  }

  /**
   * Preload components based on route prediction
   */
  async preloadRouteComponents(currentRoute: string): Promise<void> {
    const routePreloadMap: Record<string, string[]> = {
      'dashboard': ['Fixtures', 'MatchDetail', 'TeamPage'],
      'fixtures': ['MatchDetail', 'Dashboard', 'CalendarView'],
      'myteams': ['TeamPage', 'Fixtures', 'Dashboard'],
      'news': ['Dashboard', 'Fixtures'],
      'matchdetail': ['TeamPage', 'PredictionDetail'],
      'teampage': ['MatchDetail', 'Fixtures'],
    };

    const componentsToPreload = routePreloadMap[currentRoute.toLowerCase()] || [];
    
    // Preload with a small delay to not interfere with current page loading
    setTimeout(() => {
      componentsToPreload.forEach(component => {
        this.preloadComponent(component).catch(() => {
          // Silently fail - preloading is a performance enhancement, not critical
        });
      });
    }, 1000);
  }

  /**
   * Preload critical assets based on user behavior
   */
  async preloadCriticalAssets(): Promise<void> {
    // Preload commonly used team logos
    const criticalTeamLogos = [
      'Manchester United', 'Manchester City', 'Liverpool', 'Arsenal', 'Chelsea',
      'Real Madrid', 'Barcelona', 'Bayern Munich', 'PSG', 'Juventus'
    ];

    criticalTeamLogos.forEach(team => {
      this.preloadImage(`/logos/${team.toLowerCase().replace(/\s+/g, '-')}.png`);
    });

    // Preload league logos
    const leagueLogos = [
      'premier-league', 'la-liga', 'serie-a', 'bundesliga', 'ligue-1',
      'champions-league', 'europa-league'
    ];

    leagueLogos.forEach(league => {
      this.preloadImage(`/logos/leagues/${league}.png`);
    });
  }

  /**
   * Preload an image
   */
  private preloadImage(src: string): void {
    const img = new Image();
    img.src = src;
  }

  /**
   * Set up intersection observer for lazy loading components
   */
  setupLazyLoading(): void {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const target = entry.target as HTMLElement;
            const componentName = target.dataset.preload;
            if (componentName) {
              this.preloadComponent(componentName);
              observer.unobserve(target);
            }
          }
        });
      },
      {
        rootMargin: '50px',
        threshold: 0.1,
      }
    );

    // Observe elements with data-preload attribute
    document.querySelectorAll('[data-preload]').forEach((el) => {
      observer.observe(el);
    });
  }

  /**
   * Get bundle size information
   */
  getBundleInfo(): {
    preloadedModules: string[];
    cacheSize: number;
    estimatedMemoryUsage: string;
  } {
    const estimatedMemoryUsage = `${(this.preloadedModules.size * 50).toFixed(1)} KB`;
    
    return {
      preloadedModules: Array.from(this.preloadedModules),
      cacheSize: this.importCache.size,
      estimatedMemoryUsage,
    };
  }

  /**
   * Clear preload cache to free memory
   */
  clearCache(): void {
    this.importCache.clear();
    this.preloadedModules.clear();
    console.log('Bundle optimization cache cleared');
  }

  /**
   * Monitor bundle performance
   */
  monitorPerformance(): void {
    if (typeof window === 'undefined') return;

    // Monitor chunk loading times
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.name.includes('.js') && entry.name.includes('chunk')) {
          console.log(`Chunk loaded: ${entry.name} in ${entry.duration.toFixed(2)}ms`);
        }
      });
    });

    observer.observe({ entryTypes: ['resource'] });

    // Report large bundle warnings
    window.addEventListener('load', () => {
      setTimeout(() => {
        const resourceEntries = performance.getEntriesByType('resource');
        const jsEntries = resourceEntries.filter(entry => 
          entry.name.includes('.js') && 
          (entry as PerformanceResourceTiming).transferSize > 500 * 1024 // > 500KB
        );

        if (jsEntries.length > 0) {
          console.warn('Large JavaScript bundles detected:', 
            jsEntries.map(entry => ({
              name: entry.name,
              size: `${((entry as PerformanceResourceTiming).transferSize / 1024).toFixed(1)} KB`,
              loadTime: `${entry.duration.toFixed(2)}ms`
            }))
          );
        }
      }, 2000);
    });
  }
}

export const bundleOptimizationService = new BundleOptimizationService();

// Initialize on load
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    bundleOptimizationService.setupLazyLoading();
    bundleOptimizationService.monitorPerformance();
    bundleOptimizationService.preloadCriticalAssets();
  });
}
