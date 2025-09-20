interface LoadingState {
  isLoading: boolean;
  error: string | null;
  retryCount: number;
  lastUpdated: number;
}

interface LoadingStateManager {
  states: Map<string, LoadingState>;
  listeners: Set<(key: string, state: LoadingState) => void>;
}

class LoadingStateService {
  private static instance: LoadingStateService;
  private manager: LoadingStateManager;

  constructor() {
    this.manager = {
      states: new Map(),
      listeners: new Set()
    };
  }

  static getInstance(): LoadingStateService {
    if (!LoadingStateService.instance) {
      LoadingStateService.instance = new LoadingStateService();
    }
    return LoadingStateService.instance;
  }

  private notifyListeners(key: string, state: LoadingState) {
    this.manager.listeners.forEach(listener => {
      try {
        listener(key, state);
      } catch (error) {
        console.error('Loading state listener error:', error);
      }
    });
  }

  setLoading(key: string, loading: boolean) {
    const currentState = this.manager.states.get(key) || {
      isLoading: false,
      error: null,
      retryCount: 0,
      lastUpdated: Date.now()
    };

    const newState: LoadingState = {
      ...currentState,
      isLoading: loading,
      error: loading ? null : currentState.error,
      lastUpdated: Date.now()
    };

    this.manager.states.set(key, newState);
    this.notifyListeners(key, newState);
  }

  setError(key: string, error: string) {
    const currentState = this.manager.states.get(key) || {
      isLoading: false,
      error: null,
      retryCount: 0,
      lastUpdated: Date.now()
    };

    const newState: LoadingState = {
      ...currentState,
      isLoading: false,
      error,
      retryCount: currentState.retryCount + 1,
      lastUpdated: Date.now()
    };

    this.manager.states.set(key, newState);
    this.notifyListeners(key, newState);
  }

  clearError(key: string) {
    const currentState = this.manager.states.get(key);
    if (!currentState) return;

    const newState: LoadingState = {
      ...currentState,
      error: null,
      lastUpdated: Date.now()
    };

    this.manager.states.set(key, newState);
    this.notifyListeners(key, newState);
  }

  reset(key: string) {
    const newState: LoadingState = {
      isLoading: false,
      error: null,
      retryCount: 0,
      lastUpdated: Date.now()
    };

    this.manager.states.set(key, newState);
    this.notifyListeners(key, newState);
  }

  getState(key: string): LoadingState | null {
    return this.manager.states.get(key) || null;
  }

  subscribe(listener: (key: string, state: LoadingState) => void) {
    this.manager.listeners.add(listener);
    
    return () => {
      this.manager.listeners.delete(listener);
    };
  }

  // Batch operations for multiple keys
  setMultipleLoading(keys: string[], loading: boolean) {
    keys.forEach(key => this.setLoading(key, loading));
  }

  setMultipleError(keys: string[], error: string) {
    keys.forEach(key => this.setError(key, error));
  }

  resetMultiple(keys: string[]) {
    keys.forEach(key => this.reset(key));
  }

  // Get all states
  getAllStates(): Map<string, LoadingState> {
    return new Map(this.manager.states);
  }

  // Clear all states
  clearAll() {
    this.manager.states.clear();
    this.manager.listeners.forEach(listener => {
      try {
        listener('*', {
          isLoading: false,
          error: null,
          retryCount: 0,
          lastUpdated: Date.now()
        });
      } catch (error) {
        console.error('Loading state clear listener error:', error);
      }
    });
  }
}

export const loadingStateService = LoadingStateService.getInstance();
export type { LoadingState };
