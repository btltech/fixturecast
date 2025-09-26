import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockMatch } from '../utils/testUtils';

// Minimal context mocks (unchanged behavior expectation)
vi.mock('../../utils/contextUtils', () => ({
  buildContextForMatch: vi.fn(() => ({
    leagueTableSnippet: 'Premier League Table'
  }))
}));

// Mock AppContext usage if imported indirectly
vi.mock('../../contexts/AppContext', () => ({
  useAppContext: () => ({
    getTeamForm: vi.fn(() => ({}))
  })
}));

// Helper to build fake proxy JSON payload
function buildProxyPayload(overrides: Partial<any> = {}) {
  return {
    prediction: {
      homeWinProbability: 45,
      drawProbability: 25,
      awayWinProbability: 30,
      predictedScoreline: '2-1',
      confidence: 'Medium',
      keyFactors: [],
      goalLine: { line: 2.5, overProbability: 60, underProbability: 40 },
      btts: { yesProbability: 55, noProbability: 45 },
      ...overrides
    },
    meta: { model: 'gemini-2.5-flash', durationMs: 123 }
  };
}

describe('geminiService (proxy version)', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    // Mock fetch for proxy endpoint
    global.fetch = vi.fn((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : (input as Request).url;
      if (url.includes('/api/ai/gemini/predict')) {
        return Promise.resolve(new Response(JSON.stringify(buildProxyPayload()), { status: 200 }));
      }
      return Promise.reject(new Error('Unexpected fetch: ' + url));
    }) as any;
  });

  it('generates and normalizes a prediction successfully', async () => {
    const { getMatchPrediction } = await import('../../services/geminiService');
    const match = { ...mockMatch, date: '2024-01-15T15:00:00.000Z' };
    const prediction = await getMatchPrediction(match);
    expect(prediction.predictedScoreline).toBe('2-1');
    expect(prediction.homeWinProbability + prediction.drawProbability + prediction.awayWinProbability).toBe(100);
  });

  it('bubbles proxy errors', async () => {
    (fetch as any).mockImplementationOnce(() => Promise.resolve(new Response('fail', { status: 500 })));
    const { getMatchPrediction } = await import('../../services/geminiService');
    const match = { ...mockMatch, date: '2024-01-15T15:00:00.000Z' };
    await expect(getMatchPrediction(match)).rejects.toThrow(/Gemini proxy error/);
  });
});

describe('GeminiService', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
    vi.stubGlobal('fetch', vi.fn());
  });

  it('generates a prediction successfully', async () => {
    (fetch as any).mockResolvedValueOnce(new Response(JSON.stringify({
      prediction: {
        homeWinProbability: 45,
        drawProbability: 25,
        awayWinProbability: 30,
        predictedScoreline: '2-1',
        confidence: 'medium',
        keyFactors: [],
        goalLine: { line: 2.5, overProbability: 60, underProbability: 40 },
        btts: { yesProbability: 55, noProbability: 45 }
      }
    }), { status: 200 }));

    const { getMatchPrediction } = await import('../../services/geminiService');
    const match = { ...mockMatch, date: '2024-01-15T15:00:00.000Z' };
    const prediction = await getMatchPrediction(match);

    expect(prediction.predictedScoreline).toBe('2-1');
    expect(prediction.homeWinProbability + prediction.drawProbability + prediction.awayWinProbability).toBe(100);
  });

  it('throws when the API returns invalid JSON', async () => {
    (fetch as any).mockResolvedValueOnce(new Response(JSON.stringify({ prediction: 'not-json-object' }), { status: 200 }));

    const { getMatchPrediction } = await import('../../services/geminiService');
    const match = { ...mockMatch, date: '2024-01-15T15:00:00.000Z' };

    await expect(getMatchPrediction(match)).rejects.toThrow();
  });

  it('normalizes probabilities returned by the model', async () => {
    (fetch as any).mockResolvedValueOnce(new Response(JSON.stringify({
      prediction: {
        homeWinProbability: 40,
        drawProbability: 30,
        awayWinProbability: 30,
        predictedScoreline: '1-1',
        confidence: 'medium',
        keyFactors: [],
        goalLine: { line: 2.5, overProbability: 55, underProbability: 45 },
        btts: { yesProbability: 50, noProbability: 50 }
      }
    }), { status: 200 }));

    const { getMatchPrediction } = await import('../../services/geminiService');
    const match = { ...mockMatch, date: '2024-01-15T15:00:00.000Z' };
    const prediction = await getMatchPrediction(match);

    expect(prediction.homeWinProbability + prediction.drawProbability + prediction.awayWinProbability).toBe(100);
  });
});
