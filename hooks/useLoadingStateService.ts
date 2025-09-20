import { useState, useEffect, useCallback } from 'react';
import { loadingStateService, LoadingState } from '../services/loadingStateService';

interface UseLoadingStateServiceOptions {
  key: string;
  initialLoading?: boolean;
  onStateChange?: (state: LoadingState) => void;
}

export const useLoadingStateService = (options: UseLoadingStateServiceOptions) => {
  const { key, initialLoading = false, onStateChange } = options;
  
  const [state, setState] = useState<LoadingState>(() => {
    const existingState = loadingStateService.getState(key);
    return existingState || {
      isLoading: initialLoading,
      error: null,
      retryCount: 0,
      lastUpdated: Date.now()
    };
  });

  useEffect(() => {
    const unsubscribe = loadingStateService.subscribe((stateKey, newState) => {
      if (stateKey === key || stateKey === '*') {
        setState(newState);
        if (onStateChange) {
          onStateChange(newState);
        }
      }
    });

    return unsubscribe;
  }, [key, onStateChange]);

  const setLoading = useCallback((loading: boolean) => {
    loadingStateService.setLoading(key, loading);
  }, [key]);

  const setError = useCallback((error: string) => {
    loadingStateService.setError(key, error);
  }, [key]);

  const clearError = useCallback(() => {
    loadingStateService.clearError(key);
  }, [key]);

  const reset = useCallback(() => {
    loadingStateService.reset(key);
  }, [key]);

  return {
    ...state,
    setLoading,
    setError,
    clearError,
    reset
  };
};

export default useLoadingStateService;
