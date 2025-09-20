import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Match } from '../types';
import { useScopedRefresh } from '../hooks/useScopedRefresh';

interface ScopedRefreshContainerProps {
  children: React.ReactNode;
  containerId: string;
  data: Match[];
  onDataUpdate?: (newData: Match[]) => void;
  refreshInterval?: number;
  preserveScroll?: boolean;
  preserveReading?: boolean;
  className?: string;
}

const ScopedRefreshContainer: React.FC<ScopedRefreshContainerProps> = ({
  children,
  containerId,
  data,
  onDataUpdate,
  refreshInterval = 30000,
  preserveScroll = true,
  preserveReading = true,
  className = ''
}) => {
  const [localData, setLocalData] = useState<Match[]>(data);
  const [isUserInteracting, setIsUserInteracting] = useState(false);
  const [lastInteraction, setLastInteraction] = useState<Date | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const interactionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Use scoped refresh hook
  const {
    isRefreshing,
    lastRefresh,
    refreshCount,
    manualRefresh,
    pauseRefresh,
    resumeRefresh,
    getRefreshStatus
  } = useScopedRefresh(containerId, {
    interval: refreshInterval,
    preserveScroll,
    preserveReading,
    diffOnly: true,
    enabled: true
  });

  // Track user interactions
  const handleUserInteraction = useCallback(() => {
    setIsUserInteracting(true);
    setLastInteraction(new Date());
    
    // Clear existing timeout
    if (interactionTimeoutRef.current) {
      clearTimeout(interactionTimeoutRef.current);
    }
    
    // Set timeout to reset interaction state
    interactionTimeoutRef.current = setTimeout(() => {
      setIsUserInteracting(false);
    }, 2000);
  }, []);

  // Track scrolling
  const handleScroll = useCallback(() => {
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    scrollTimeoutRef.current = setTimeout(() => {
      // User stopped scrolling
    }, 150);
  }, []);

  // Handle data updates
  const handleDataUpdate = useCallback((newData: Match[]) => {
    setLocalData(newData);
    if (onDataUpdate) {
      onDataUpdate(newData);
    }
  }, [onDataUpdate]);

  // Update local data when props change
  useEffect(() => {
    setLocalData(data);
  }, [data]);

  // Set up event listeners
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Track user interactions
    const events = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'click'];
    
    events.forEach(event => {
      container.addEventListener(event, handleUserInteraction, { passive: true });
    });

    // Track scrolling
    container.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      events.forEach(event => {
        container.removeEventListener(event, handleUserInteraction);
      });
      container.removeEventListener('scroll', handleScroll);
      
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      if (interactionTimeoutRef.current) {
        clearTimeout(interactionTimeoutRef.current);
      }
    };
  }, [handleUserInteraction, handleScroll]);

  // Handle refresh state changes
  useEffect(() => {
    if (isRefreshing) {
      console.log('Scoped refresh started for container:', containerId);
    } else {
      console.log('Scoped refresh completed for container:', containerId);
    }
  }, [isRefreshing, containerId]);

  // Pause refresh when user is interacting
  useEffect(() => {
    if (isUserInteracting) {
      pauseRefresh();
    } else {
      resumeRefresh();
    }
  }, [isUserInteracting, pauseRefresh, resumeRefresh]);

  // Manual refresh handler
  const handleManualRefresh = useCallback(async () => {
    try {
      await manualRefresh();
    } catch (error) {
      console.error('Manual refresh failed:', error);
    }
  }, [manualRefresh]);

  // Get refresh status
  const refreshStatus = getRefreshStatus();

  return (
    <div
      ref={containerRef}
      id={containerId}
      className={`scoped-refresh-container ${className}`}
      data-refresh-enabled={!isUserInteracting}
      data-last-refresh={lastRefresh?.toISOString()}
      data-refresh-count={refreshCount}
    >
      {/* Refresh Status Indicator */}
      {isRefreshing && (
        <div className="refresh-indicator">
          <div className="refresh-spinner"></div>
          <span>Updating...</span>
        </div>
      )}
      
      {/* Manual Refresh Button */}
      <div className="refresh-controls">
        <button
          onClick={handleManualRefresh}
          disabled={isRefreshing}
          className="refresh-button"
          title="Refresh data"
        >
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </button>
        
        {lastRefresh && (
          <span className="last-refresh-time">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </span>
        )}
      </div>

      {/* Container Content */}
      <div className="refresh-content">
        {children}
      </div>

      {/* Debug Info (only in development) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="refresh-debug">
          <details>
            <summary>Refresh Debug Info</summary>
            <pre>{JSON.stringify(refreshStatus, null, 2)}</pre>
          </details>
        </div>
      )}
    </div>
  );
};

export default ScopedRefreshContainer;
