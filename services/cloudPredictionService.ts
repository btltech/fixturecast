import { Match, Prediction, PredictionAccuracy, AccuracyStats } from '../types';

// Cloud-based prediction integrity service using Cloudflare
export class CloudPredictionService {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = (import.meta as any).env?.VITE_PREDICTION_API_KEY || 'fixturecast_secure_key_2024';
    
    // Detect if running on Cloudflare Pages
    const isCloudflare = typeof window !== 'undefined' && (
      window.location.hostname.includes('.pages.dev') || 
      window.location.hostname.includes('cloudflare')
    );
    
    this.baseUrl = isCloudflare || typeof window === 'undefined' 
      ? '/api/predictions/store'
      : `${window.location.origin}/api/predictions/store`;
  }

  private async makeRequest(method: string, data?: any, params?: Record<string, string>): Promise<any> {
    const url = new URL(this.baseUrl);
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }

    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey,
      },
    };

    if (data && (method === 'POST' || method === 'PUT')) {
      options.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url.toString(), options);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(`Cloud prediction service error: ${errorData.message || response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Cloud prediction service request failed:', error);
      throw error;
    }
  }

  /**
   * Store a prediction in the cloud with integrity protection
   */
  async storePrediction(match: Match, prediction: Prediction): Promise<{ success: boolean; predictionId: string; integrityHash: string }> {
    const clientFingerprint = this.generateClientFingerprint();
    
    const data = {
      matchId: match.id,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      league: match.league,
      matchDate: match.date,
      prediction,
      clientFingerprint
    };

    console.log(`🔒 Storing prediction in cloud: ${match.homeTeam} vs ${match.awayTeam}`);
    
    const result = await this.makeRequest('POST', data);
    
    // Also store locally as backup
    this.storeLocalBackup(match, prediction, result.predictionId);
    
    return result;
  }

  /**
   * Verify a prediction with actual match result
   */
  async verifyPrediction(matchId: string, actualResult: { homeScore: number; awayScore: number }, source: string = 'api-sports'): Promise<{ success: boolean; accuracy: any }> {
    const data = {
      matchId,
      actualResult,
      source
    };

    console.log(`✅ Verifying prediction in cloud: Match ${matchId}`);
    
    const result = await this.makeRequest('PUT', data);
    
    // Update local backup with verification
    this.updateLocalBackupVerification(matchId, actualResult, result.accuracy);
    
    return result;
  }

  /**
   * Retrieve prediction by match ID
   */
  async getPrediction(matchId: string): Promise<any> {
    return await this.makeRequest('GET', null, { matchId });
  }

  /**
   * Get predictions for a specific date
   */
  async getPredictionsForDate(date: string): Promise<{ predictions: any[]; date: string; count: number }> {
    return await this.makeRequest('GET', null, { date });
  }

  /**
   * Get today's predictions
   */
  async getTodaysPredictions(): Promise<any[]> {
    const today = new Date().toISOString().split('T')[0];
    const result = await this.getPredictionsForDate(today);
    return result.predictions;
  }

  /**
   * Get accuracy statistics from cloud
   */
  async getAccuracyStats(): Promise<AccuracyStats> {
    return await this.makeRequest('GET', null, { stats: 'true' });
  }

  /**
   * Bulk verify multiple predictions
   */
  async bulkVerifyPredictions(matchResults: { id: string; homeScore: number; awayScore: number; status: string }[]): Promise<{ verified: number; failed: number }> {
    let verified = 0;
    let failed = 0;

    for (const result of matchResults) {
      if (result.status !== 'FT') continue;

      try {
        await this.verifyPrediction(result.id, {
          homeScore: result.homeScore,
          awayScore: result.awayScore
        });
        verified++;
      } catch (error) {
        console.warn(`Failed to verify prediction for match ${result.id}:`, error);
        failed++;
      }
    }

    console.log(`🔍 Bulk verification complete: ${verified} verified, ${failed} failed`);
    return { verified, failed };
  }

  /**
   * Sync local predictions to cloud (for migration)
   */
  async syncLocalToCloud(): Promise<{ synced: number; failed: number }> {
    console.log('🔄 Starting sync of local predictions to cloud...');
    
    let synced = 0;
    let failed = 0;

    try {
      // Get local daily predictions
      const localDailyData = JSON.parse(localStorage.getItem('fixturecast_daily_predictions') || '{}');
      
      for (const [date, predictions] of Object.entries(localDailyData)) {
        for (const pred of predictions as any[]) {
          try {
            // Check if already exists in cloud
            try {
              await this.getPrediction(pred.matchId);
              console.log(`⏭️ Prediction ${pred.matchId} already exists in cloud`);
              continue;
            } catch (e) {
              // Doesn't exist, proceed with sync
            }

            // Create match object for sync
            const match: Match = {
              id: pred.matchId,
              homeTeam: pred.homeTeam,
              awayTeam: pred.awayTeam,
              league: pred.league,
              date: pred.matchDate,
              homeTeamId: 0,
              awayTeamId: 0,
              status: 'NS',
              venue: ''
            };

            // Store in cloud
            await this.storePrediction(match, pred.prediction);
            
            // If already verified locally, verify in cloud too
            if (pred.verified && pred.actualResult) {
              await this.verifyPrediction(pred.matchId, pred.actualResult);
            }
            
            synced++;
            console.log(`✅ Synced prediction: ${pred.homeTeam} vs ${pred.awayTeam}`);
            
            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));
            
          } catch (error) {
            console.error(`Failed to sync prediction ${pred.matchId}:`, error);
            failed++;
          }
        }
      }

    } catch (error) {
      console.error('Error during sync:', error);
    }

    console.log(`🔄 Sync complete: ${synced} synced, ${failed} failed`);
    return { synced, failed };
  }

  /**
   * Generate client fingerprint for integrity
   */
  private generateClientFingerprint(): string {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('FixtureCast Integrity Check', 2, 2);
    }
    
    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset(),
      canvas.toDataURL()
    ].join('|');
    
    return btoa(fingerprint).substring(0, 32);
  }

  /**
   * Store local backup of cloud predictions
   */
  private storeLocalBackup(match: Match, prediction: Prediction, predictionId: string): void {
    try {
      const backupKey = 'fixturecast_cloud_backup';
      const existing = JSON.parse(localStorage.getItem(backupKey) || '{}');
      const today = new Date().toISOString().split('T')[0];
      
      if (!existing[today]) {
        existing[today] = [];
      }
      
      existing[today].push({
        predictionId,
        matchId: match.id,
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        prediction,
        storedAt: new Date().toISOString(),
        cloudStored: true
      });
      
      localStorage.setItem(backupKey, JSON.stringify(existing));
    } catch (error) {
      console.warn('Failed to store local backup:', error);
    }
  }

  /**
   * Update local backup with verification status
   */
  private updateLocalBackupVerification(matchId: string, actualResult: any, accuracy: any): void {
    try {
      const backupKey = 'fixturecast_cloud_backup';
      const existing = JSON.parse(localStorage.getItem(backupKey) || '{}');
      
      for (const [date, predictions] of Object.entries(existing)) {
        const predictionIndex = (predictions as any[]).findIndex(p => p.matchId === matchId);
        if (predictionIndex >= 0) {
          (predictions as any[])[predictionIndex].verified = true;
          (predictions as any[])[predictionIndex].verifiedAt = new Date().toISOString();
          (predictions as any[])[predictionIndex].actualResult = actualResult;
          (predictions as any[])[predictionIndex].accuracy = accuracy;
          break;
        }
      }
      
      localStorage.setItem(backupKey, JSON.stringify(existing));
    } catch (error) {
      console.warn('Failed to update local backup verification:', error);
    }
  }
}

// Create singleton instance
export const cloudPredictionService = new CloudPredictionService();
