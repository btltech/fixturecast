/**
 * React Hook for Advanced Prediction Sync
 * Provides real-time sync status and conflict resolution
 */

import { useState, useEffect, useCallback } from 'react';
import { advancedPredictionSyncService, SyncStatus, SyncConflict, PredictionSyncRecord } from '../services/advancedPredictionSyncService';

export interface UsePredictionSyncReturn {
  syncStatus: SyncStatus;
  isOnline: boolean;
  pendingSync: number;
  conflicts: number;
  errors: string[];
  forceSync: () => Promise<void>;
  registerConflictResolver: (matchId: string, resolver: (conflict: SyncConflict) => Promise<PredictionSyncRecord>) => void;
  clearErrors: () => void;
}

export const usePredictionSync = (): UsePredictionSyncReturn => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(() => 
    advancedPredictionSyncService.getSyncStatus()
  );

  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    // Subscribe to sync status updates
    const unsubscribe = advancedPredictionSyncService.addSyncListener((status) => {
      setSyncStatus(status);
    });

    // Listen for sync errors
    const handleSyncError = (event: CustomEvent) => {
      setErrors(prev => [...prev, event.detail.message]);
    };

    window.addEventListener('fixturecast:sync-error', handleSyncError as EventListener);

    return () => {
      unsubscribe();
      window.removeEventListener('fixturecast:sync-error', handleSyncError as EventListener);
    };
  }, []);

  const forceSync = useCallback(async () => {
    try {
      await advancedPredictionSyncService.forceSync();
    } catch (error) {
      setErrors(prev => [...prev, `Force sync failed: ${error.message}`]);
    }
  }, []);

  const registerConflictResolver = useCallback((
    matchId: string, 
    resolver: (conflict: SyncConflict) => Promise<PredictionSyncRecord>
  ) => {
    advancedPredictionSyncService.registerConflictResolver(matchId, resolver);
  }, []);

  const clearErrors = useCallback(() => {
    setErrors([]);
  }, []);

  return {
    syncStatus,
    isOnline: syncStatus.isOnline,
    pendingSync: syncStatus.pendingSync,
    conflicts: syncStatus.conflicts,
    errors,
    forceSync,
    registerConflictResolver,
    clearErrors
  };
};

