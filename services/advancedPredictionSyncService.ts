/**
 * Advanced Cross-Platform Prediction Sync Service
 * Implements offline-first, real-time sync with conflict resolution
 * Ensures predictions are generated once and synced across all platforms
 */

import { Prediction, Match } from '../types';
import { cloudPredictionService } from './cloudPredictionService';

export interface SyncStatus {
  isOnline: boolean;
  lastSyncTime: number;
  pendingSync: number;
  conflicts: number;
  errors: string[];
}

export interface PredictionSyncRecord {
  id: string;
  matchId: string;
  prediction: Prediction;
  metadata: {
    created: number;
    modified: number;
    deviceId: string;
    version: number;
    checksum: string;
    platform: 'web' | 'mobile' | 'desktop';
  };
  syncStatus: {
    local: boolean;
    cloud: boolean;
    pending: boolean;
    conflicted: boolean;
  };
}

export interface SyncConflict {
  matchId: string;
  localVersion: PredictionSyncRecord;
  cloudVersion: PredictionSyncRecord;
  resolution: 'local' | 'cloud' | 'merge' | 'manual';
}

export class AdvancedPredictionSyncService {
  private static instance: AdvancedPredictionSyncService;
  private deviceId: string;
  private platform: 'web' | 'mobile' | 'desktop';
  private syncQueue: Set<string> = new Set();
  private conflictResolver: Map<string, (conflict: SyncConflict) => Promise<PredictionSyncRecord>> = new Map();
  private syncListeners: Set<(status: SyncStatus) => void> = new Set();
  private isOnline: boolean = navigator.onLine;
  private syncInProgress: boolean = false;
  private backgroundSyncInterval: number | null = null;

  private constructor() {
    this.deviceId = this.generateDeviceId();
    this.platform = this.detectPlatform();
    this.setupEventListeners();
    this.startBackgroundSync();
  }

  public static getInstance(): AdvancedPredictionSyncService {
    if (!AdvancedPredictionSyncService.instance) {
      AdvancedPredictionSyncService.instance = new AdvancedPredictionSyncService();
    }
    return AdvancedPredictionSyncService.instance;
  }

  /**
   * Generate unique device identifier for conflict resolution
   */
  private generateDeviceId(): string {
    const stored = localStorage.getItem('fixturecast_device_id');
    if (stored) return stored;
    
    const deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('fixturecast_device_id', deviceId);
    return deviceId;
  }

  /**
   * Detect platform type for sync optimization
   */
  private detectPlatform(): 'web' | 'mobile' | 'desktop' {
    if (typeof window === 'undefined') return 'web';
    
    const userAgent = navigator.userAgent.toLowerCase();
    if (/mobile|android|iphone|ipad/.test(userAgent)) return 'mobile';
    if (/electron|nwjs/.test(userAgent)) return 'desktop';
    return 'web';
  }

  /**
   * Setup network and storage event listeners
   */
  private setupEventListeners(): void {
    // Network status monitoring
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.triggerSync();
      this.notifyListeners();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.notifyListeners();
    });

    // Storage change detection (cross-tab sync)
    window.addEventListener('storage', (event) => {
      if (event.key?.startsWith('fixturecast_prediction_')) {
        this.handleStorageChange(event);
      }
    });

    // Visibility change (sync when tab becomes active)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.isOnline) {
        this.triggerSync();
      }
    });
  }

  /**
   * Start background sync process
   */
  private startBackgroundSync(): void {
    // Sync every 30 seconds when online
    this.backgroundSyncInterval = window.setInterval(() => {
      if (this.isOnline && !this.syncInProgress) {
        this.triggerSync();
      }
    }, 30000);

    // Initial sync on startup
    if (this.isOnline) {
      setTimeout(() => this.triggerSync(), 1000);
    }
  }

  /**
   * Store prediction with advanced sync capabilities
   */
  public async storePrediction(match: Match, prediction: Prediction): Promise<PredictionSyncRecord> {
    const record: PredictionSyncRecord = {
      id: `pred_${match.id}_${Date.now()}`,
      matchId: match.id,
      prediction,
      metadata: {
        created: Date.now(),
        modified: Date.now(),
        deviceId: this.deviceId,
        version: 1,
        checksum: this.calculateChecksum(prediction),
        platform: this.platform
      },
      syncStatus: {
        local: true,
        cloud: false,
        pending: true,
        conflicted: false
      }
    };

    // Store locally first (offline-first)
    await this.storeLocal(record);
    
    // Queue for cloud sync
    this.syncQueue.add(record.matchId);
    
    // Trigger immediate sync if online
    if (this.isOnline) {
      this.triggerSync();
    }

    return record;
  }

  /**
   * Get prediction with sync awareness
   */
  public async getPrediction(matchId: string): Promise<Prediction | null> {
    // Try local first
    const localRecord = await this.getLocal(matchId);
    if (localRecord) {
      // Check if we need to sync from cloud
      if (this.isOnline && !localRecord.syncStatus.cloud) {
        this.syncQueue.add(matchId);
        this.triggerSync();
      }
      return localRecord.prediction;
    }

    // If not local and online, try cloud
    if (this.isOnline) {
      try {
        const cloudRecord = await this.getFromCloud(matchId);
        if (cloudRecord) {
          await this.storeLocal(cloudRecord);
          return cloudRecord.prediction;
        }
      } catch (error) {
        console.warn('Failed to fetch from cloud:', error);
      }
    }

    return null;
  }

  /**
   * Store prediction locally with versioning
   */
  private async storeLocal(record: PredictionSyncRecord): Promise<void> {
    const key = `fixturecast_prediction_${record.matchId}`;
    const existing = await this.getLocal(record.matchId);
    
    if (existing) {
      // Version conflict detection
      if (existing.metadata.version !== record.metadata.version) {
        record.syncStatus.conflicted = true;
        await this.handleConflict(record, existing);
        return;
      }
    }

    localStorage.setItem(key, JSON.stringify(record));
    
    // Update prediction cache for immediate UI updates
    const cacheKey = 'fixturecast_prediction_cache';
    const cache = JSON.parse(localStorage.getItem(cacheKey) || '{}');
    cache[record.matchId] = record.prediction;
    localStorage.setItem(cacheKey, JSON.stringify(cache));
  }

  /**
   * Get prediction from local storage
   */
  private async getLocal(matchId: string): Promise<PredictionSyncRecord | null> {
    const key = `fixturecast_prediction_${matchId}`;
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : null;
  }

  /**
   * Get prediction from cloud
   */
  private async getFromCloud(matchId: string): Promise<PredictionSyncRecord | null> {
    try {
      const response = await fetch(`/api/predictions/${matchId}`);
      if (!response.ok) return null;
      
      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        console.error('❌ Invalid JSON response from prediction API:', jsonError);
        const responseText = await response.text();
        console.error('Raw response:', responseText.substring(0, 500));
        throw new Error(`Invalid JSON response from prediction API: ${jsonError.message}`);
      }
      
      return {
        id: `cloud_${matchId}`,
        matchId,
        prediction: data.numeric_predictions,
        metadata: {
          created: new Date(data.meta.last_updated).getTime(),
          modified: new Date(data.meta.last_updated).getTime(),
          deviceId: 'cloud',
          version: 1,
          checksum: this.calculateChecksum(data.numeric_predictions),
          platform: 'cloud'
        },
        syncStatus: {
          local: false,
          cloud: true,
          pending: false,
          conflicted: false
        }
      };
    } catch (error) {
      console.warn('Cloud fetch failed:', error);
      return null;
    }
  }

  /**
   * Trigger sync process
   */
  private async triggerSync(): Promise<void> {
    if (this.syncInProgress || !this.isOnline || this.syncQueue.size === 0) {
      return;
    }

    this.syncInProgress = true;
    const errors: string[] = [];

    try {
      // Process sync queue
      const queue = Array.from(this.syncQueue);
      this.syncQueue.clear();

      for (const matchId of queue) {
        try {
          await this.syncPrediction(matchId);
        } catch (error) {
          errors.push(`Failed to sync ${matchId}: ${error.message}`);
          this.syncQueue.add(matchId); // Retry later
        }
      }

      // Notify listeners
      this.notifyListeners();
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Sync individual prediction
   */
  private async syncPrediction(matchId: string): Promise<void> {
    const localRecord = await this.getLocal(matchId);
    if (!localRecord) return;

    // Check if already synced
    if (localRecord.syncStatus.cloud) return;

    try {
      // Upload to cloud
      const match: Match = {
        id: matchId,
        homeTeam: localRecord.prediction.homeTeam || '',
        awayTeam: localRecord.prediction.awayTeam || '',
        league: localRecord.prediction.league || 'Unknown',
        date: new Date().toISOString(),
        homeTeamId: 0,
        awayTeamId: 0,
        status: 'NS',
        venue: ''
      };

      await cloudPredictionService.storePrediction(match, localRecord.prediction);
      
      // Update local record
      localRecord.syncStatus.cloud = true;
      localRecord.syncStatus.pending = false;
      await this.storeLocal(localRecord);

      console.log(`✅ Synced prediction: ${matchId}`);
    } catch (error) {
      console.error(`❌ Sync failed for ${matchId}:`, error);
      throw error;
    }
  }

  /**
   * Handle sync conflicts
   */
  private async handleConflict(local: PredictionSyncRecord, existing: PredictionSyncRecord): Promise<void> {
    const conflict: SyncConflict = {
      matchId: local.matchId,
      localVersion: local,
      cloudVersion: existing,
      resolution: 'local' // Default to local
    };

    // Check if we have a custom resolver
    const resolver = this.conflictResolver.get(local.matchId);
    if (resolver) {
      const resolved = await resolver(conflict);
      await this.storeLocal(resolved);
      return;
    }

    // Default conflict resolution: use most recent
    const useLocal = local.metadata.modified > existing.metadata.modified;
    const winner = useLocal ? local : existing;
    
    winner.syncStatus.conflicted = false;
    await this.storeLocal(winner);
  }

  /**
   * Calculate prediction checksum for integrity
   */
  private calculateChecksum(prediction: Prediction): string {
    const data = JSON.stringify({
      homeWin: prediction.homeWinProbability,
      draw: prediction.drawProbability,
      awayWin: prediction.awayWinProbability,
      scoreline: prediction.predictedScoreline
    });
    
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Handle storage changes (cross-tab sync)
   */
  private handleStorageChange(event: StorageEvent): void {
    if (event.newValue && event.key?.startsWith('fixturecast_prediction_')) {
      const matchId = event.key.replace('fixturecast_prediction_', '');
      this.syncQueue.add(matchId);
      this.triggerSync();
    }
  }

  /**
   * Register conflict resolver for specific match
   */
  public registerConflictResolver(
    matchId: string, 
    resolver: (conflict: SyncConflict) => Promise<PredictionSyncRecord>
  ): void {
    this.conflictResolver.set(matchId, resolver);
  }

  /**
   * Add sync status listener
   */
  public addSyncListener(listener: (status: SyncStatus) => void): () => void {
    this.syncListeners.add(listener);
    return () => this.syncListeners.delete(listener);
  }

  /**
   * Notify all listeners of sync status
   */
  private notifyListeners(): void {
    const status: SyncStatus = {
      isOnline: this.isOnline,
      lastSyncTime: Date.now(),
      pendingSync: this.syncQueue.size,
      conflicts: 0, // TODO: Track conflicts
      errors: []
    };

    this.syncListeners.forEach(listener => {
      try {
        listener(status);
      } catch (error) {
        console.error('Sync listener error:', error);
      }
    });
  }

  /**
   * Get current sync status
   */
  public getSyncStatus(): SyncStatus {
    return {
      isOnline: this.isOnline,
      lastSyncTime: Date.now(),
      pendingSync: this.syncQueue.size,
      conflicts: 0,
      errors: []
    };
  }

  /**
   * Force sync all pending predictions
   */
  public async forceSync(): Promise<void> {
    if (!this.isOnline) {
      throw new Error('Cannot sync while offline');
    }

    // Get all local predictions
    const keys = Object.keys(localStorage).filter(key => 
      key.startsWith('fixturecast_prediction_')
    );

    for (const key of keys) {
      const matchId = key.replace('fixturecast_prediction_', '');
      this.syncQueue.add(matchId);
    }

    await this.triggerSync();
  }

  /**
   * Cleanup resources
   */
  public destroy(): void {
    if (this.backgroundSyncInterval) {
      clearInterval(this.backgroundSyncInterval);
    }
    this.syncListeners.clear();
    this.conflictResolver.clear();
  }
}

// Export singleton instance
export const advancedPredictionSyncService = AdvancedPredictionSyncService.getInstance();

