import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockMatch } from '../utils/testUtils';

const mockGenerateContent = vi.fn();

vi.mock('../../utils/contextUtils', () => ({
  buildContextForMatch: vi.fn(() => ({
    leagueTableSnippet: 'Premier League Table',
    homeTeamFormSnippet: 'W-W-D',
    awayTeamFormSnippet: 'L-W-W',
    headToHeadSnippet: '3-2-1',
  })),
}));

vi.mock('../../contexts/AppContext', () => ({
  useAppContext: () => ({
    getTeamForm: vi.fn(() => ({
      overall: {
        teamId: 1,
        teamName: 'Manchester United',
        last10Results: ['W', 'D', 'L', 'W', 'W'],
        homeForm: ['W', 'W', 'D'],
        awayForm: ['L', 'W', 'W'],
        formTrend: 'improving',
        pointsLast10: 13,
        goalsFor: 15,
        goalsAgainst: 9,
        cleanSheets: 3,
        lastUpdated: new Date().toISOString(),
      },
      home: {
        teamId: 1,
        teamName: 'Manchester United',
        last10Results: ['W', 'W', 'D', 'W'],
        homeForm: ['W', 'W', 'D', 'W'],
        awayForm: ['L', 'W', 'D'],
        formTrend: 'stable',
        pointsLast10: 12,
        goalsFor: 10,
        goalsAgainst: 4,
        cleanSheets: 2,
        lastUpdated: new Date().toISOString(),
      },
      away: {
        teamId: 1,
        teamName: 'Manchester United',
        last10Results: ['L', 'W', 'W', 'D'],
        homeForm: ['W', 'W', 'D'],
        awayForm: ['L', 'W', 'W', 'D'],
        formTrend: 'declining',
        pointsLast10: 7,
        goalsFor: 7,
        goalsAgainst: 11,
        cleanSheets: 1,
        lastUpdated: new Date().toISOString(),
      },
      trend: {
        direction: 'up',
        strength: 60,
        description: 'Improving',
      },
    })),
  }),
}));

vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    models = {
      generateContent: mockGenerateContent,
    };
  },
  Type: {
    object: vi.fn(),
    string: vi.fn(),
    number: vi.fn(),
    array: vi.fn(),
  },
}));

describe('GeminiService', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal('fetch', vi.fn());
    mockGenerateContent.mockReset();
  });

  it('generates a prediction successfully', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify({
        homeWinProbability: 45,
        drawProbability: 25,
        awayWinProbability: 30,
        predictedScoreline: '2-1',
        confidence: 'medium',
        keyFactors: [],
        goalLine: { line: 2.5, overProbability: 60, underProbability: 40 },
      }),
    });

    const { getMatchPrediction } = await import('../../services/geminiService');
    const match = { ...mockMatch, date: '2024-01-15T15:00:00.000Z' };
    const prediction = await getMatchPrediction(match);

    expect(prediction.predictedScoreline).toBe('2-1');
    expect(prediction.homeWinProbability + prediction.drawProbability + prediction.awayWinProbability).toBe(100);
  });

  it('throws when the API returns invalid JSON', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: 'invalid json',
    });

    const { getMatchPrediction } = await import('../../services/geminiService');
    const match = { ...mockMatch, date: '2024-01-15T15:00:00.000Z' };

    await expect(getMatchPrediction(match)).rejects.toThrow();
  });

  it('normalizes probabilities returned by the model', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify({
        homeWinProbability: 40,
        drawProbability: 30,
        awayWinProbability: 30,
        predictedScoreline: '1-1',
        confidence: 'medium',
        keyFactors: [],
        goalLine: { line: 2.5, overProbability: 55, underProbability: 45 },
      }),
    });

    const { getMatchPrediction } = await import('../../services/geminiService');
    const match = { ...mockMatch, date: '2024-01-15T15:00:00.000Z' };
    const prediction = await getMatchPrediction(match);

    expect(prediction.homeWinProbability + prediction.drawProbability + prediction.awayWinProbability).toBe(100);
  });
});
