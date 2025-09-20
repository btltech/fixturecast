import { useEffect, useRef, useCallback, useState } from 'react';
import { Match } from '../types';
import { scopedRefreshService } from '../services/scopedRefreshService';

interface UseScopedRefreshOptions {
  interval?: number;
  preserveScroll?: boolean;
  preserveReading?: boolean;
  diffOnly?: boolean;
  containerSelector?: string;
  enabled?: boolean;
}

interface DiffResult {
  added: Match[];
  removed: Match[];
  updated: Match[];
  unchanged: Match[];
}

export const useScopedRefresh = (
  containerId: string,
  options: UseScopedRefreshOptions = {}
) => {
  const {
    interval = 30000,
    preserveScroll = true,
    preserveReading = true,
    diffOnly = true,
    containerSelector = '[data-fixtures-container]',
    enabled = true
  } = options;

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [refreshCount, setRefreshCount] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle diffed updates
  const handleDiffedUpdate = useCallback((diff: DiffResult) => {
    console.log('Received diffed update:', {
      added: diff.added.length,
      removed: diff.removed.length,
      updated: diff.updated.length,
      unchanged: diff.unchanged.length
    });

    // Update refresh state
    setLastRefresh(new Date());
    setRefreshCount(prev => prev + 1);
    setIsRefreshing(false);
  }, []);

  // Start scoped refresh
  const startRefresh = useCallback(() => {
    if (!enabled) return;

    setIsRefreshing(true);
    scopedRefreshService.startScopedRefresh(
      containerId,
      {
        interval,
        preserveScroll,
        preserveReading,
        diffOnly,
        containerSelector
      },
      handleDiffedUpdate
    );
  }, [
    containerId,
    interval,
    preserveScroll,
    preserveReading,
    diffOnly,
    containerSelector,
    enabled,
    handleDiffedUpdate
  ]);

  // Stop scoped refresh
  const stopRefresh = useCallback(() => {
    scopedRefreshService.stopScopedRefresh(containerId);
    setIsRefreshing(false);
  }, [containerId]);

  // Manual refresh
  const manualRefresh = useCallback(async () => {
    if (!enabled) return;

    setIsRefreshing(true);
    
    try {
      // Perform manual refresh
      await scopedRefreshService.performScopedRefresh(containerId, {
        interval,
        preserveScroll,
        preserveReading,
        diffOnly,
        containerSelector
      });
    } catch (error) {
      console.error('Manual refresh failed:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [
    containerId,
    interval,
    preserveScroll,
    preserveReading,
    diffOnly,
    containerSelector,
    enabled
  ]);

  // Initialize scoped refresh
  useEffect(() => {
    if (enabled) {
      startRefresh();
    }

    return () => {
      stopRefresh();
    };
  }, [enabled, startRefresh, stopRefresh]);

  // Handle container changes
  useEffect(() => {
    if (containerRef.current) {
      // Container is ready, ensure refresh is started
      if (enabled) {
        startRefresh();
      }
    }
  }, [enabled, startRefresh]);

  // Get refresh status
  const getRefreshStatus = useCallback(() => {
    return {
      isRefreshing,
      lastRefresh,
      refreshCount,
      isEnabled: enabled,
      activeIntervals: scopedRefreshService.getActiveRefreshIntervals()
    };
  }, [isRefreshing, lastRefresh, refreshCount, enabled]);

  // Pause refresh (temporarily disable)
  const pauseRefresh = useCallback(() => {
    stopRefresh();
  }, [stopRefresh]);

  // Resume refresh
  const resumeRefresh = useCallback(() => {
    if (enabled) {
      startRefresh();
    }
  }, [enabled, startRefresh]);

  // Update refresh options
  const updateOptions = useCallback((newOptions: Partial<UseScopedRefreshOptions>) => {
    // Stop current refresh
    stopRefresh();
    
    // Start with new options
    if (enabled) {
      startRefresh();
    }
  }, [enabled, startRefresh, stopRefresh]);

  return {
    // State
    isRefreshing,
    lastRefresh,
    refreshCount,
    
    // Actions
    startRefresh,
    stopRefresh,
    manualRefresh,
    pauseRefresh,
    resumeRefresh,
    updateOptions,
    
    // Status
    getRefreshStatus,
    
    // Refs
    containerRef
  };
};
