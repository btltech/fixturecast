import { useState, useEffect, useCallback } from 'react';

interface LoadingState {
  isLoading: boolean;
  error: string | null;
  retryCount: number;
}

interface UseLoadingStateOptions {
  initialLoading?: boolean;
  maxRetries?: number;
  retryDelay?: number;
  onError?: (error: string) => void;
  onRetry?: (retryCount: number) => void;
}

export const useLoadingState = (options: UseLoadingStateOptions = {}) => {
  const {
    initialLoading = false,
    maxRetries = 3,
    retryDelay = 1000,
    onError,
    onRetry
  } = options;

  const [state, setState] = useState<LoadingState>({
    isLoading: initialLoading,
    error: null,
    retryCount: 0
  });

  const setLoading = useCallback((loading: boolean) => {
    setState(prev => ({
      ...prev,
      isLoading: loading,
      error: loading ? null : prev.error
    }));
  }, []);

  const setError = useCallback((error: string) => {
    setState(prev => ({
      ...prev,
      isLoading: false,
      error,
      retryCount: prev.retryCount + 1
    }));
    
    if (onError) {
      onError(error);
    }
  }, [onError]);

  const clearError = useCallback(() => {
    setState(prev => ({
      ...prev,
      error: null
    }));
  }, []);

  const retry = useCallback(async (retryFn: () => Promise<void>) => {
    if (state.retryCount >= maxRetries) {
      setError('Maximum retry attempts reached');
      return;
    }

    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null
    }));

    if (onRetry) {
      onRetry(state.retryCount + 1);
    }

    try {
      await new Promise(resolve => setTimeout(resolve, retryDelay));
      await retryFn();
      setState(prev => ({
        ...prev,
        isLoading: false,
        retryCount: 0
      }));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Retry failed');
    }
  }, [state.retryCount, maxRetries, retryDelay, onRetry, setError]);

  const reset = useCallback(() => {
    setState({
      isLoading: false,
      error: null,
      retryCount: 0
    });
  }, []);

  return {
    ...state,
    setLoading,
    setError,
    clearError,
    retry,
    reset,
    canRetry: state.retryCount < maxRetries
  };
};

export default useLoadingState;
