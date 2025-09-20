import { Match } from '../types';

export interface PerformanceMetrics {
  loadTime: number;
  renderTime: number;
  memoryUsage: number;
  networkRequests: number;
  cacheHitRate: number;
  userInteractions: number;
  errors: number;
}

export interface AccessibilityMetrics {
  screenReaderCompatible: boolean;
  keyboardNavigation: boolean;
  colorContrast: number;
  focusManagement: boolean;
  ariaLabels: number;
  semanticHTML: boolean;
}

export interface OptimizationSettings {
  lazyLoading: boolean;
  imageOptimization: boolean;
  codeSplitting: boolean;
  caching: boolean;
  compression: boolean;
  preloading: boolean;
  serviceWorker: boolean;
}

class PerformanceService {
  private metrics: PerformanceMetrics;
  private accessibilityMetrics: AccessibilityMetrics;
  private optimizationSettings: OptimizationSettings;
  private observers: Map<string, PerformanceObserver> = new Map();
  private startTime: number;

  constructor() {
    this.startTime = typeof performance !== 'undefined' ? performance.now() : 0;
    this.metrics = this.initializeMetrics();
    this.accessibilityMetrics = this.initializeAccessibilityMetrics();
    this.optimizationSettings = this.loadOptimizationSettings();
    
    if (typeof window !== 'undefined') {
      try {
        this.initializePerformanceMonitoring();
        this.initializeAccessibilityMonitoring();
      } catch (error) {
        console.warn('Failed to initialize performance monitoring:', error);
      }
    }
  }

  // Initialize performance metrics
  private initializeMetrics(): PerformanceMetrics {
    return {
      loadTime: 0,
      renderTime: 0,
      memoryUsage: 0,
      networkRequests: 0,
      cacheHitRate: 0,
      userInteractions: 0,
      errors: 0
    };
  }

  // Initialize accessibility metrics
  private initializeAccessibilityMetrics(): AccessibilityMetrics {
    return {
      screenReaderCompatible: false,
      keyboardNavigation: false,
      colorContrast: 0,
      focusManagement: false,
      ariaLabels: 0,
      semanticHTML: false
    };
  }

  // Load optimization settings from localStorage
  private loadOptimizationSettings(): OptimizationSettings {
    const defaultSettings: OptimizationSettings = {
      lazyLoading: true,
      imageOptimization: true,
      codeSplitting: true,
      caching: true,
      compression: true,
      preloading: true,
      serviceWorker: true
    };

    if (typeof window === 'undefined') {
      return defaultSettings;
    }

    try {
      const saved = localStorage.getItem('fixturecast_optimization_settings');
      if (saved) {
        return { ...defaultSettings, ...JSON.parse(saved) };
      }
    } catch (error) {
      console.warn('Failed to load optimization settings:', error);
    }

    return defaultSettings;
  }

  // Save optimization settings to localStorage
  private saveOptimizationSettings() {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem('fixturecast_optimization_settings', JSON.stringify(this.optimizationSettings));
    } catch (error) {
      console.error('Failed to save optimization settings:', error);
    }
  }

  // Initialize performance monitoring
  private initializePerformanceMonitoring() {
    // Monitor navigation timing
    if ('PerformanceObserver' in window) {
      const navigationObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming;
            this.metrics.loadTime = navEntry.loadEventEnd - navEntry.loadEventStart;
            this.metrics.renderTime = navEntry.domContentLoadedEventEnd - navEntry.domContentLoadedEventStart;
          }
        });
      });
      
      navigationObserver.observe({ entryTypes: ['navigation'] });
      this.observers.set('navigation', navigationObserver);
    }

    // Monitor resource timing
    if ('PerformanceObserver' in window) {
      const resourceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.entryType === 'resource') {
            this.metrics.networkRequests++;
            
            // Check cache hit rate
            if (entry.transferSize === 0 && entry.decodedBodySize > 0) {
              this.metrics.cacheHitRate = (this.metrics.cacheHitRate + 1) / this.metrics.networkRequests;
            }
          }
        });
      });
      
      resourceObserver.observe({ entryTypes: ['resource'] });
      this.observers.set('resource', resourceObserver);
    }

    // Monitor memory usage
    if ('memory' in performance) {
      setInterval(() => {
        this.metrics.memoryUsage = (performance as any).memory.usedJSHeapSize;
      }, 5000);
    }

    // Monitor user interactions
    this.monitorUserInteractions();
  }

  // Initialize accessibility monitoring
  private initializeAccessibilityMonitoring() {
    // Check screen reader compatibility
    this.checkScreenReaderCompatibility();
    
    // Check keyboard navigation
    this.checkKeyboardNavigation();
    
    // Check color contrast
    this.checkColorContrast();
    
    // Check focus management
    this.checkFocusManagement();
    
    // Count ARIA labels
    this.countAriaLabels();
    
    // Check semantic HTML
    this.checkSemanticHTML();
  }

  // Monitor user interactions
  private monitorUserInteractions() {
    const interactionEvents = ['click', 'keydown', 'touchstart', 'scroll'];
    
    interactionEvents.forEach(eventType => {
      document.addEventListener(eventType, () => {
        this.metrics.userInteractions++;
      }, { passive: true });
    });
  }

  // Check screen reader compatibility
  private checkScreenReaderCompatibility() {
    // Check for screen reader specific attributes
    const hasAriaLive = document.querySelector('[aria-live]');
    const hasAriaLabel = document.querySelector('[aria-label]');
    const hasAriaDescribedBy = document.querySelector('[aria-describedby]');
    
    this.accessibilityMetrics.screenReaderCompatible = !!(hasAriaLive || hasAriaLabel || hasAriaDescribedBy);
  }

  // Check keyboard navigation
  private checkKeyboardNavigation() {
    // Check for focusable elements
    const focusableElements = document.querySelectorAll('button, input, select, textarea, a[href], [tabindex]');
    this.accessibilityMetrics.keyboardNavigation = focusableElements.length > 0;
  }

  // Check color contrast
  private checkColorContrast() {
    // This is a simplified check - in a real implementation, you'd use a proper contrast checker
    const textElements = document.querySelectorAll('p, span, div, h1, h2, h3, h4, h5, h6');
    let totalContrast = 0;
    let checkedElements = 0;

    textElements.forEach(element => {
      const styles = window.getComputedStyle(element);
      const color = styles.color;
      const backgroundColor = styles.backgroundColor;
      
      if (color && backgroundColor && color !== 'rgba(0, 0, 0, 0)' && backgroundColor !== 'rgba(0, 0, 0, 0)') {
        // Simplified contrast calculation (would need proper implementation)
        totalContrast += 4.5; // Placeholder value
        checkedElements++;
      }
    });

    this.accessibilityMetrics.colorContrast = checkedElements > 0 ? totalContrast / checkedElements : 0;
  }

  // Check focus management
  private checkFocusManagement() {
    // Check for focus management attributes
    const hasFocusTrap = document.querySelector('[data-focus-trap]');
    const hasFocusVisible = document.querySelector('[data-focus-visible]');
    
    this.accessibilityMetrics.focusManagement = !!(hasFocusTrap || hasFocusVisible);
  }

  // Count ARIA labels
  private countAriaLabels() {
    const ariaElements = document.querySelectorAll('[aria-label], [aria-labelledby], [aria-describedby]');
    this.accessibilityMetrics.ariaLabels = ariaElements.length;
  }

  // Check semantic HTML
  private checkSemanticHTML() {
    // Check for semantic HTML elements
    const semanticElements = document.querySelectorAll('main, nav, header, footer, section, article, aside, h1, h2, h3, h4, h5, h6');
    this.accessibilityMetrics.semanticHTML = semanticElements.length > 0;
  }

  // Optimize images
  optimizeImages() {
    if (!this.optimizationSettings.imageOptimization) return;

    const images = document.querySelectorAll('img');
    images.forEach(img => {
      // Add loading="lazy" for lazy loading
      if (this.optimizationSettings.lazyLoading && !img.hasAttribute('loading')) {
        img.setAttribute('loading', 'lazy');
      }

      // Add responsive images
      if (!img.hasAttribute('srcset')) {
        const src = img.getAttribute('src');
        if (src) {
          // Generate srcset for different sizes
          const baseSrc = src.replace(/\.(jpg|jpeg|png|webp)$/, '');
          const extension = src.match(/\.(jpg|jpeg|png|webp)$/)?.[0] || '.jpg';
          
          img.setAttribute('srcset', 
            `${baseSrc}-320w${extension} 320w, ` +
            `${baseSrc}-640w${extension} 640w, ` +
            `${baseSrc}-1024w${extension} 1024w, ` +
            `${baseSrc}-1920w${extension} 1920w`
          );
          img.setAttribute('sizes', '(max-width: 320px) 320px, (max-width: 640px) 640px, (max-width: 1024px) 1024px, 1920px');
        }
      }
    });
  }

  // Preload critical resources
  preloadCriticalResources() {
    if (!this.optimizationSettings.preloading) return;

    const criticalResources = [
      '/fonts/inter.woff2',
      '/icons/icon-192x192.png',
      '/manifest.json'
    ];

    criticalResources.forEach(resource => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = resource;
      link.as = resource.endsWith('.woff2') ? 'font' : resource.endsWith('.png') ? 'image' : 'fetch';
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
    });
  }

  // Enable service worker
  async enableServiceWorker() {
    if (!this.optimizationSettings.serviceWorker) return;

    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered successfully');
        return registration;
      } catch (error) {
        console.warn('Service Worker registration failed:', error);
      }
    }
  }

  // Optimize bundle loading
  optimizeBundleLoading() {
    if (!this.optimizationSettings.codeSplitting) return;

    // Implement code splitting for routes
    const routes = ['dashboard', 'fixtures', 'news', 'teams'];
    
    routes.forEach(route => {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = `/${route}`;
      document.head.appendChild(link);
    });
  }

  // Get performance metrics
  getPerformanceMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  // Get accessibility metrics
  getAccessibilityMetrics(): AccessibilityMetrics {
    return { ...this.accessibilityMetrics };
  }

  // Get optimization settings
  getOptimizationSettings(): OptimizationSettings {
    return { ...this.optimizationSettings };
  }

  // Update optimization settings
  updateOptimizationSettings(settings: Partial<OptimizationSettings>) {
    this.optimizationSettings = { ...this.optimizationSettings, ...settings };
    this.saveOptimizationSettings();
  }

  // Get performance score (0-100)
  getPerformanceScore(): number {
    const loadTimeScore = Math.max(0, 100 - (this.metrics.loadTime / 100));
    const renderTimeScore = Math.max(0, 100 - (this.metrics.renderTime / 50));
    const cacheHitScore = this.metrics.cacheHitRate * 100;
    const memoryScore = Math.max(0, 100 - (this.metrics.memoryUsage / 10000000));
    
    return Math.round((loadTimeScore + renderTimeScore + cacheHitScore + memoryScore) / 4);
  }

  // Get accessibility score (0-100)
  getAccessibilityScore(): number {
    let score = 0;
    
    if (this.accessibilityMetrics.screenReaderCompatible) score += 20;
    if (this.accessibilityMetrics.keyboardNavigation) score += 20;
    if (this.accessibilityMetrics.colorContrast >= 4.5) score += 20;
    if (this.accessibilityMetrics.focusManagement) score += 20;
    if (this.accessibilityMetrics.ariaLabels > 0) score += 10;
    if (this.accessibilityMetrics.semanticHTML) score += 10;
    
    return score;
  }

  // Report error
  reportError(error: Error, context?: string) {
    this.metrics.errors++;
    console.error(`Performance Error${context ? ` in ${context}` : ''}:`, error);
  }

  // Cleanup
  destroy() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
  }
}

// Export singleton instance
export const performanceService = new PerformanceService();
