import { describe, it, expect, vi, beforeEach } from 'vitest';
import { predictionCacheService } from '../services/predictionCacheService';
import { Match, Prediction, League, ConfidenceLevel } from '../types';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.localStorage = localStorageMock as any;

// Mock canvas for fingerprint generation
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: vi.fn().mockReturnValue({
    textBaseline: '',
    font: '',
    fillText: vi.fn(),
  }),
});

Object.defineProperty(HTMLCanvasElement.prototype, 'toDataURL', {
  value: vi.fn().mockReturnValue('mock-canvas-data'),
});

describe('PredictionCacheService', () => {
  const mockMatch: Match = {
    id: 'test-match-123',
    homeTeam: 'Arsenal',
    awayTeam: 'Chelsea',
    homeTeamId: 1,
    awayTeamId: 2,
    league: League.PremierLeague,
    date: '2025-09-27T15:00:00Z',
    status: 'NS'
  };

  const mockPrediction: Prediction = {
    homeWinProbability: 45,
    drawProbability: 30,
    awayWinProbability: 25,
    predictedScoreline: '2-1',
    confidence: ConfidenceLevel.High,
    keyFactors: [
      {
        category: 'Form Analysis',
        points: ['Arsenal in good form', 'Chelsea struggling away']
      }
    ],
    goalLine: {
      line: 2.5,
      overProbability: 60,
      underProbability: 40
    },
    btts: {
      yesProbability: 65,
      noProbability: 35
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getExistingPrediction', () => {
    it('should return cached prediction from localStorage if available', async () => {
      // Setup: Mock localStorage to return a cached prediction
      const cachedData = {
        prediction: mockPrediction,
        timestamp: new Date().toISOString(),
        matchId: mockMatch.id
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(cachedData));

      // Act
      const result = await predictionCacheService.getExistingPrediction(mockMatch.id);

      // Assert
      expect(result).toEqual(mockPrediction);
      expect(localStorageMock.getItem).toHaveBeenCalledWith(`prediction_${mockMatch.id}`);
      expect(mockFetch).not.toHaveBeenCalled(); // Should not call API if local cache hits
    });

    it('should return null if no prediction found', async () => {
      // Setup: Mock both local and cloud to return empty
      localStorageMock.getItem.mockReturnValue(null);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ prediction: null })
      } as Response);

      // Act
      const result = await predictionCacheService.getExistingPrediction(mockMatch.id);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('shouldRegeneratePrediction', () => {
    it('should return true if match is soon and prediction is old', () => {
      const soonMatch: Match = {
        ...mockMatch,
        date: new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString() // 1 hour from now
      };

      const oldPrediction = {
        predictionTime: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString() // 5 hours ago
      };

      const result = predictionCacheService.shouldRegeneratePrediction(soonMatch, oldPrediction);
      expect(result).toBe(true);
    });

    it('should return false if prediction is recent', () => {
      const soonMatch: Match = {
        ...mockMatch,
        date: new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString() // 1 hour from now
      };

      const recentPrediction = {
        predictionTime: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString() // 1 hour ago
      };

      const result = predictionCacheService.shouldRegeneratePrediction(soonMatch, recentPrediction);
      expect(result).toBe(false);
    });
  });
});