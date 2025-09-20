interface PerformanceMetrics {
  renderTime: number;
  memoryUsage: number;
  domNodes: number;
  scrollPerformance: number;
  interactionLatency: number;
  dataLoadTime: number;
}

interface PerformanceThresholds {
  maxRenderTime: number;
  maxMemoryUsage: number;
  maxDomNodes: number;
  maxScrollLatency: number;
  maxInteractionLatency: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics = {
    renderTime: 0,
    memoryUsage: 0,
    domNodes: 0,
    scrollPerformance: 0,
    interactionLatency: 0,
    dataLoadTime: 0
  };

  private thresholds: PerformanceThresholds = {
    maxRenderTime: 100, // ms
    maxMemoryUsage: 50 * 1024 * 1024, // 50MB
    maxDomNodes: 10000,
    maxScrollLatency: 16, // 60fps
    maxInteractionLatency: 100 // ms
  };

  private observers: Map<string, PerformanceObserver> = new Map();
  private isMonitoring: boolean = false;

  // Start performance monitoring
  startMonitoring(): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.setupPerformanceObservers();
    this.startMemoryMonitoring();
    this.startRenderMonitoring();
    
    console.log('Performance monitoring started');
  }

  // Stop performance monitoring
  stopMonitoring(): void {
    this.isMonitoring = false;
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
    
    console.log('Performance monitoring stopped');
  }

  // Setup performance observers
  private setupPerformanceObservers(): void {
    // Long task observer
    if ('PerformanceObserver' in window) {
      const longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 50) { // Tasks longer than 50ms
            console.warn('Long task detected:', {
              duration: entry.duration,
              startTime: entry.startTime
            });
          }
        }
      });
      
      try {
        longTaskObserver.observe({ entryTypes: ['longtask'] });
        this.observers.set('longtask', longTaskObserver);
      } catch (error) {
        console.warn('Long task observer not supported:', error);
      }
    }

    // Layout shift observer
    if ('PerformanceObserver' in window) {
      const layoutShiftObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const layoutShiftEntry = entry as any;
          if (layoutShiftEntry.value > 0.1) { // Significant layout shift
            console.warn('Layout shift detected:', {
              value: layoutShiftEntry.value,
              startTime: entry.startTime
            });
          }
        }
      });
      
      try {
        layoutShiftObserver.observe({ entryTypes: ['layout-shift'] });
        this.observers.set('layout-shift', layoutShiftObserver);
      } catch (error) {
        console.warn('Layout shift observer not supported:', error);
      }
    }
  }

  // Start memory monitoring
  private startMemoryMonitoring(): void {
    if (!('memory' in performance)) return;

    const monitorMemory = () => {
      const memory = (performance as any).memory;
      if (memory) {
        this.metrics.memoryUsage = memory.usedJSHeapSize;
        
        if (this.metrics.memoryUsage > this.thresholds.maxMemoryUsage) {
          console.warn('High memory usage detected:', {
            used: this.metrics.memoryUsage,
            total: memory.totalJSHeapSize,
            limit: memory.jsHeapSizeLimit
          });
        }
      }
    };

    monitorMemory();
    setInterval(monitorMemory, 5000); // Check every 5 seconds
  }

  // Start render monitoring
  private startRenderMonitoring(): void {
    let frameCount = 0;
    let lastTime = performance.now();

    const measureFPS = () => {
      frameCount++;
      const currentTime = performance.now();
      
      if (currentTime - lastTime >= 1000) {
        const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
        this.metrics.scrollPerformance = fps;
        
        if (fps < 30) {
          console.warn('Low FPS detected:', fps);
        }
        
        frameCount = 0;
        lastTime = currentTime;
      }
      
      requestAnimationFrame(measureFPS);
    };

    requestAnimationFrame(measureFPS);
  }

  // Measure render time
  measureRenderTime<T>(fn: () => T): T {
    const start = performance.now();
    const result = fn();
    const end = performance.now();
    
    this.metrics.renderTime = end - start;
    
    if (this.metrics.renderTime > this.thresholds.maxRenderTime) {
      console.warn('Slow render detected:', {
        renderTime: this.metrics.renderTime,
        threshold: this.thresholds.maxRenderTime
      });
    }
    
    return result;
  }

  // Measure interaction latency
  measureInteraction<T>(fn: () => T): T {
    const start = performance.now();
    const result = fn();
    const end = performance.now();
    
    this.metrics.interactionLatency = end - start;
    
    if (this.metrics.interactionLatency > this.thresholds.maxInteractionLatency) {
      console.warn('Slow interaction detected:', {
        latency: this.metrics.interactionLatency,
        threshold: this.thresholds.maxInteractionLatency
      });
    }
    
    return result;
  }

  // Measure data load time
  measureDataLoad<T>(fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    return fn().then(result => {
      const end = performance.now();
      this.metrics.dataLoadTime = end - start;
      
      if (this.metrics.dataLoadTime > 1000) { // 1 second threshold
        console.warn('Slow data load detected:', {
          loadTime: this.metrics.dataLoadTime
        });
      }
      
      return result;
    });
  }

  // Count DOM nodes
  countDomNodes(container: HTMLElement): number {
    const count = container.querySelectorAll('*').length;
    this.metrics.domNodes = count;
    
    if (count > this.thresholds.maxDomNodes) {
      console.warn('High DOM node count detected:', {
        nodes: count,
        threshold: this.thresholds.maxDomNodes
      });
    }
    
    return count;
  }

  // Get current metrics
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  // Get performance score
  getPerformanceScore(): number {
    const metrics = this.getMetrics();
    let score = 100;

    // Deduct points for poor performance
    if (metrics.renderTime > this.thresholds.maxRenderTime) {
      score -= 20;
    }
    
    if (metrics.memoryUsage > this.thresholds.maxMemoryUsage) {
      score -= 20;
    }
    
    if (metrics.domNodes > this.thresholds.maxDomNodes) {
      score -= 20;
    }
    
    if (metrics.scrollPerformance < 30) {
      score -= 20;
    }
    
    if (metrics.interactionLatency > this.thresholds.maxInteractionLatency) {
      score -= 20;
    }

    return Math.max(0, score);
  }

  // Get performance recommendations
  getRecommendations(): string[] {
    const recommendations: string[] = [];
    const metrics = this.getMetrics();

    if (metrics.renderTime > this.thresholds.maxRenderTime) {
      recommendations.push('Consider using virtualization or pagination to reduce render time');
    }
    
    if (metrics.memoryUsage > this.thresholds.maxMemoryUsage) {
      recommendations.push('Implement lazy loading to reduce memory usage');
    }
    
    if (metrics.domNodes > this.thresholds.maxDomNodes) {
      recommendations.push('Use virtual scrolling to reduce DOM nodes');
    }
    
    if (metrics.scrollPerformance < 30) {
      recommendations.push('Optimize scroll performance with requestAnimationFrame');
    }
    
    if (metrics.interactionLatency > this.thresholds.maxInteractionLatency) {
      recommendations.push('Debounce user interactions to improve responsiveness');
    }

    return recommendations;
  }

  // Export performance data
  exportPerformanceData(): string {
    const data = {
      metrics: this.getMetrics(),
      score: this.getPerformanceScore(),
      recommendations: this.getRecommendations(),
      timestamp: new Date().toISOString()
    };
    
    return JSON.stringify(data, null, 2);
  }
}

export const performanceMonitor = new PerformanceMonitor();
