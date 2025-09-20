import { useState, useEffect, useCallback, useMemo } from 'react';
import { performanceMonitor } from '../services/performanceMonitor';
import { lazyLoadingService } from '../services/lazyLoadingService';

interface PerformanceOptimizationOptions {
  enableVirtualization: boolean;
  enableLazyLoading: boolean;
  enablePagination: boolean;
  maxItems: number;
  itemsPerPage: number;
  virtualizationThreshold: number;
  paginationThreshold: number;
}

interface PerformanceState {
  score: number;
  recommendations: string[];
  metrics: {
    renderTime: number;
    memoryUsage: number;
    domNodes: number;
    scrollPerformance: number;
    interactionLatency: number;
  };
  isOptimized: boolean;
}

export const usePerformanceOptimization = (
  dataSize: number,
  options: Partial<PerformanceOptimizationOptions> = {}
) => {
  const defaultOptions: PerformanceOptimizationOptions = {
    enableVirtualization: true,
    enableLazyLoading: true,
    enablePagination: true,
    maxItems: 1000,
    itemsPerPage: 20,
    virtualizationThreshold: 100,
    paginationThreshold: 50
  };

  const config = { ...defaultOptions, ...options };
  
  const [performanceState, setPerformanceState] = useState<PerformanceState>({
    score: 100,
    recommendations: [],
    metrics: {
      renderTime: 0,
      memoryUsage: 0,
      domNodes: 0,
      scrollPerformance: 0,
      interactionLatency: 0
    },
    isOptimized: false
  });

  // Determine optimal display mode
  const displayMode = useMemo(() => {
    if (dataSize >= config.virtualizationThreshold) {
      return 'virtualized';
    } else if (dataSize >= config.paginationThreshold) {
      return 'paginated';
    } else {
      return 'simple';
    }
  }, [dataSize, config.virtualizationThreshold, config.paginationThreshold]);

  // Check if optimization is needed
  const needsOptimization = useMemo(() => {
    return dataSize > config.maxItems || performanceState.score < 70;
  }, [dataSize, config.maxItems, performanceState.score]);

  // Update performance state
  const updatePerformanceState = useCallback(() => {
    const score = performanceMonitor.getPerformanceScore();
    const recommendations = performanceMonitor.getRecommendations();
    const metrics = performanceMonitor.getMetrics();
    
    setPerformanceState({
      score,
      recommendations,
      metrics,
      isOptimized: score >= 80
    });
  }, []);

  // Initialize performance monitoring
  useEffect(() => {
    performanceMonitor.startMonitoring();
    updatePerformanceState();
    
    // Update performance state every 5 seconds
    const interval = setInterval(updatePerformanceState, 5000);
    
    return () => {
      clearInterval(interval);
      performanceMonitor.stopMonitoring();
    };
  }, [updatePerformanceState]);

  // Initialize lazy loading if enabled
  useEffect(() => {
    if (config.enableLazyLoading) {
      lazyLoadingService.initialize({
        threshold: 0.1,
        rootMargin: '100px',
        delay: 100,
        batchSize: 10,
        maxConcurrent: 3
      });
    }
    
    return () => {
      lazyLoadingService.destroy();
    };
  }, [config.enableLazyLoading]);

  // Optimize performance
  const optimizePerformance = useCallback(() => {
    const optimizations: string[] = [];
    
    if (dataSize > config.virtualizationThreshold) {
      optimizations.push('Enable virtualization for large datasets');
    }
    
    if (dataSize > config.paginationThreshold) {
      optimizations.push('Enable pagination for medium datasets');
    }
    
    if (performanceState.metrics.memoryUsage > 50 * 1024 * 1024) {
      optimizations.push('Enable lazy loading to reduce memory usage');
    }
    
    if (performanceState.metrics.domNodes > 10000) {
      optimizations.push('Use virtual scrolling to reduce DOM nodes');
    }
    
    if (performanceState.metrics.scrollPerformance < 30) {
      optimizations.push('Optimize scroll performance with requestAnimationFrame');
    }
    
    return optimizations;
  }, [dataSize, config, performanceState.metrics]);

  // Get performance recommendations
  const getRecommendations = useCallback(() => {
    const recommendations = performanceMonitor.getRecommendations();
    const optimizations = optimizePerformance();
    
    return [...recommendations, ...optimizations];
  }, [optimizePerformance]);

  // Check if specific optimization is needed
  const needsVirtualization = useCallback(() => {
    return dataSize >= config.virtualizationThreshold || performanceState.metrics.domNodes > 10000;
  }, [dataSize, config.virtualizationThreshold, performanceState.metrics.domNodes]);

  const needsPagination = useCallback(() => {
    return dataSize >= config.paginationThreshold || performanceState.metrics.memoryUsage > 50 * 1024 * 1024;
  }, [dataSize, config.paginationThreshold, performanceState.metrics.memoryUsage]);

  const needsLazyLoading = useCallback(() => {
    return dataSize > 100 || performanceState.metrics.memoryUsage > 30 * 1024 * 1024;
  }, [dataSize, performanceState.metrics.memoryUsage]);

  // Get optimal configuration
  const getOptimalConfig = useCallback(() => {
    return {
      enableVirtualization: needsVirtualization(),
      enableLazyLoading: needsLazyLoading(),
      enablePagination: needsPagination(),
      maxItems: Math.min(config.maxItems, dataSize),
      itemsPerPage: Math.min(config.itemsPerPage, Math.ceil(dataSize / 10))
    };
  }, [needsVirtualization, needsLazyLoading, needsPagination, config, dataSize]);

  // Measure performance of a function
  const measurePerformance = useCallback(<T>(fn: () => T, label: string): T => {
    const start = performance.now();
    const result = fn();
    const end = performance.now();
    
    const duration = end - start;
    
    if (duration > 100) {
      console.warn(`Slow ${label} detected:`, {
        duration,
        label
      });
    }
    
    return result;
  }, []);

  // Debounce function for performance
  const debounce = useCallback(<T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): T => {
    let timeoutId: NodeJS.Timeout;
    
    return ((...args: Parameters<T>) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    }) as T;
  }, []);

  // Throttle function for performance
  const throttle = useCallback(<T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): T => {
    let lastCall = 0;
    
    return ((...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastCall >= delay) {
        lastCall = now;
        return func(...args);
      }
    }) as T;
  }, []);

  return {
    // State
    performanceState,
    displayMode,
    needsOptimization,
    
    // Configuration
    config,
    getOptimalConfig,
    
    // Optimization checks
    needsVirtualization,
    needsPagination,
    needsLazyLoading,
    
    // Performance utilities
    measurePerformance,
    debounce,
    throttle,
    
    // Recommendations
    getRecommendations,
    optimizePerformance
  };
};
