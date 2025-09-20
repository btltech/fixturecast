import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getMatchPrediction } from '../../services/geminiService';
import { mockMatch, mockTeams } from '../utils/testUtils';

// Mock fetch
global.fetch = vi.fn();

// Mock environment variables
vi.mock('../../constants', () => ({
  GEMINI_API_KEY: 'test-api-key',
}));

describe('GeminiService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        candidates: [{
          content: {
            parts: [{
              text: JSON.stringify({
                homeWinProbability: 45,
                drawProbability: 25,
                awayWinProbability: 30,
                predictedScoreline: '2-1',
                confidence: 'medium',
                keyFactors: [
                  {
                    factor: 'Home advantage',
                    impact: 0.8,
                    description: 'Playing at home gives advantage',
                  },
                ],
                goalLine: {
                  over25: 65,
                  under25: 35,
                  prediction: 'over',
                },
                confidencePercentage: 75,
                confidenceReason: 'Strong home form',
              }),
            }],
          },
        }],
      }),
    } as Response);
  });

  it('generates a prediction successfully', async () => {
    const context = {
      match: mockMatch,
      homeTeam: mockTeams[33],
      awayTeam: mockTeams[40],
      homeTeamForm: ['W', 'W', 'D', 'W', 'L'],
      awayTeamForm: ['W', 'L', 'W', 'D', 'W'],
      headToHead: [],
    };

    const prediction = await getMatchPrediction(context);

    expect(prediction).toBeDefined();
    expect(prediction.homeWinProbability).toBe(45);
    expect(prediction.drawProbability).toBe(25);
    expect(prediction.awayWinProbability).toBe(30);
    expect(prediction.predictedScoreline).toBe('2-1');
    expect(prediction.confidence).toBe('medium');
    expect(prediction.confidencePercentage).toBe(75);
  });

  it('makes correct API call to Gemini', async () => {
    const context = {
      match: mockMatch,
      homeTeam: mockTeams[33],
      awayTeam: mockTeams[40],
      homeTeamForm: ['W', 'W', 'D'],
      awayTeamForm: ['W', 'L', 'W'],
      headToHead: [],
    };

    await getMatchPrediction(context);

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('generativelanguage.googleapis.com'),
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: expect.stringContaining('Manchester United'),
      })
    );
  });

  it('handles API errors gracefully', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    } as Response);

    const context = {
      match: mockMatch,
      homeTeam: mockTeams[33],
      awayTeam: mockTeams[40],
      homeTeamForm: ['W', 'W', 'D'],
      awayTeamForm: ['W', 'L', 'W'],
      headToHead: [],
    };

    await expect(getMatchPrediction(context)).rejects.toThrow();
  });

  it('handles malformed response data', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        candidates: [{
          content: {
            parts: [{
              text: 'Invalid JSON response',
            }],
          },
        }],
      }),
    } as Response);

    const context = {
      match: mockMatch,
      homeTeam: mockTeams[33],
      awayTeam: mockTeams[40],
      homeTeamForm: ['W', 'W', 'D'],
      awayTeamForm: ['W', 'L', 'W'],
      headToHead: [],
    };

    await expect(getMatchPrediction(context)).rejects.toThrow();
  });

  it('includes team form in the context', async () => {
    const context = {
      match: mockMatch,
      homeTeam: mockTeams[33],
      awayTeam: mockTeams[40],
      homeTeamForm: ['W', 'W', 'D', 'W', 'L'],
      awayTeamForm: ['L', 'L', 'D', 'W', 'W'],
      headToHead: [
        { homeTeam: 'Manchester United', awayTeam: 'Liverpool', result: '2-1' },
      ],
    };

    await getMatchPrediction(context);

    const callBody = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string);
    const prompt = callBody.contents[0].parts[0].text;

    expect(prompt).toContain('Home team form: W-W-D-W-L');
    expect(prompt).toContain('Away team form: L-L-D-W-W');
    expect(prompt).toContain('Head-to-head');
  });

  it('validates prediction probabilities sum to 100', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        candidates: [{
          content: {
            parts: [{
              text: JSON.stringify({
                homeWinProbability: 45,
                drawProbability: 25,
                awayWinProbability: 30, // Sum = 100
                predictedScoreline: '2-1',
                confidence: 'medium',
                keyFactors: [],
                goalLine: { over25: 65, under25: 35, prediction: 'over' },
              }),
            }],
          },
        }],
      }),
    } as Response);

    const context = {
      match: mockMatch,
      homeTeam: mockTeams[33],
      awayTeam: mockTeams[40],
      homeTeamForm: ['W'],
      awayTeamForm: ['W'],
      headToHead: [],
    };

    const prediction = await getMatchPrediction(context);
    const total = prediction.homeWinProbability + prediction.drawProbability + prediction.awayWinProbability;
    
    expect(total).toBe(100);
  });
});
