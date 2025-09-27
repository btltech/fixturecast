import { Match, Prediction } from '../types';

/**
 * Smart prediction caching service
 * Checks if prediction already exists before generating new ones
 */
export class PredictionCacheService {
  private static instance: PredictionCacheService;
  
  static getInstance(): PredictionCacheService {
    if (!PredictionCacheService.instance) {
      PredictionCacheService.instance = new PredictionCacheService();
    }
    return PredictionCacheService.instance;
  }

  /**
   * Check if we already have a prediction for this match today
   */
  async getExistingPrediction(matchId: string): Promise<Prediction | null> {
    try {
      // First check local storage for quick access
      const localPrediction = this.getFromLocalStorage(matchId);
      if (localPrediction) {
        console.log(`🎯 Found cached prediction locally for match ${matchId}`);
        return localPrediction;
      }

      // Then check cloud storage via API
      const response = await fetch(`/api/predictions?matchId=${matchId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.prediction) {
          console.log(`🎯 Found cached prediction in cloud for match ${matchId}`);
          // Cache locally for faster future access
          this.saveToLocalStorage(matchId, data.prediction.prediction);
          return data.prediction.prediction;
        }
      }

      return null;
    } catch (error) {
      console.warn('Error checking existing prediction:', error);
      return null;
    }
  }

  /**
   * Save prediction to both local and cloud storage
   */
  async savePrediction(match: Match, prediction: Prediction): Promise<void> {
    try {
      // Save to local storage immediately
      this.saveToLocalStorage(match.id, prediction);

      // Save to cloud storage (existing logic will handle this)
      const payload = {
        matchId: match.id,
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        league: match.league,
        matchDate: match.date,
        prediction: prediction,
        clientFingerprint: this.generateClientFingerprint()
      };

      await fetch('/api/predictions/store', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'fixturecast_secure_key_2024' // This will be handled by the server
        },
        body: JSON.stringify(payload)
      });

      console.log(`✅ Prediction saved for ${match.homeTeam} vs ${match.awayTeam}`);
    } catch (error) {
      console.warn('Error saving prediction:', error);
    }
  }

  /**
   * Get predictions for today from cache/storage
   */
  async getTodaysPredictions(): Promise<Prediction[]> {
    const today = new Date().toISOString().split('T')[0];
    
    try {
      const response = await fetch(`/api/predictions?date=${today}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        return data.predictions.map((p: any) => p.prediction);
      }
    } catch (error) {
      console.warn('Error fetching today\'s predictions:', error);
    }

    return [];
  }

  /**
   * Check if match prediction should be regenerated (e.g., if match is starting soon)
   */
  shouldRegeneratePrediction(match: Match, existingPrediction: any): boolean {
    const matchDate = new Date(match.date);
    const now = new Date();
    const hoursUntilMatch = (matchDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    // If match is in less than 2 hours and prediction is older than 4 hours, regenerate
    if (hoursUntilMatch < 2 && existingPrediction.predictionTime) {
      const predictionAge = (now.getTime() - new Date(existingPrediction.predictionTime).getTime()) / (1000 * 60 * 60);
      return predictionAge > 4;
    }

    return false;
  }

  private getFromLocalStorage(matchId: string): Prediction | null {
    try {
      const key = `prediction_${matchId}`;
      const stored = localStorage.getItem(key);
      if (stored) {
        const data = JSON.parse(stored);
        // Check if prediction is for today
        const predictionDate = new Date(data.timestamp).toDateString();
        const today = new Date().toDateString();
        
        if (predictionDate === today) {
          return data.prediction;
        } else {
          // Remove old prediction
          localStorage.removeItem(key);
        }
      }
    } catch (error) {
      console.warn('Error reading from localStorage:', error);
    }
    return null;
  }

  private saveToLocalStorage(matchId: string, prediction: Prediction): void {
    try {
      const key = `prediction_${matchId}`;
      const data = {
        prediction,
        timestamp: new Date().toISOString(),
        matchId
      };
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.warn('Error saving to localStorage:', error);
    }
  }

  private generateClientFingerprint(): string {
    // Simple fingerprint based on browser/screen info
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx!.textBaseline = 'top';
    ctx!.font = '14px Arial';
    ctx!.fillText('FixtureCast', 2, 2);
    
    const fingerprint = [
      navigator.userAgent,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset(),
      canvas.toDataURL().slice(-50)
    ].join('|');
    
    return btoa(fingerprint).slice(0, 16);
  }
}

export const predictionCacheService = PredictionCacheService.getInstance();