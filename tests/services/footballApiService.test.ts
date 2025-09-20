import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAllUpcomingFixtures, getAllTeams } from '../../services/footballApiService';
import { League } from '../../types';

// Mock fetch
global.fetch = vi.fn();

describe('FootballApiService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getFixtures', () => {
    it('fetches fixtures successfully', async () => {
      const mockResponse = {
        response: [
          {
            fixture: {
              id: 1,
              date: '2024-01-15T15:00:00Z',
              venue: {
                name: 'Old Trafford',
              },
            },
            teams: {
              home: {
                id: 33,
                name: 'Manchester United',
              },
              away: {
                id: 40,
                name: 'Liverpool',
              },
            },
            league: {
              name: 'Premier League',
            },
          },
        ],
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      const fixtures = await getFixtures(League.PremierLeague);

      expect(fixtures).toHaveLength(1);
      expect(fixtures[0]).toMatchObject({
        id: '1',
        homeTeam: 'Manchester United',
        awayTeam: 'Liverpool',
        league: League.PremierLeague,
        venue: 'Old Trafford',
      });
    });

    it('handles API errors', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      } as Response);

      await expect(getFixtures(League.PremierLeague)).rejects.toThrow();
    });

    it('handles empty response', async () => {
      const mockResponse = {
        response: [],
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      const fixtures = await getFixtures(League.PremierLeague);

      expect(fixtures).toHaveLength(0);
    });

    it('makes request with correct parameters', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ response: [] }),
      } as Response);

      await getFixtures(League.PremierLeague, '2024-01-15');

      const callUrl = vi.mocked(fetch).mock.calls[0][0] as string;
      expect(callUrl).toContain('date=2024-01-15');
      expect(callUrl).toContain('league=39'); // Premier League ID
    });
  });

  describe('getTeamsByLeague', () => {
    it('fetches teams successfully', async () => {
      const mockResponse = {
        response: [
          {
            team: {
              id: 33,
              name: 'Manchester United',
              logo: 'https://example.com/logo.png',
              founded: 1878,
            },
            venue: {
              name: 'Old Trafford',
            },
          },
        ],
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      const teams = await getTeamsByLeague(League.PremierLeague);

      expect(teams).toHaveProperty('33');
      expect(teams[33]).toMatchObject({
        id: 33,
        shortName: 'Manchester United',
        logo: 'https://example.com/logo.png',
        founded: 1878,
        venue: 'Old Trafford',
      });
    });

    it('handles malformed team data', async () => {
      const mockResponse = {
        response: [
          {
            team: {
              id: 33,
              // Missing required fields
            },
          },
        ],
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      const teams = await getTeamsByLeague(League.PremierLeague);

      // Should handle gracefully and not include malformed team
      expect(Object.keys(teams)).toHaveLength(0);
    });

    it('resolves team names correctly', async () => {
      const mockResponse = {
        response: [
          {
            team: {
              id: 33,
              name: 'Manchester United FC',
              logo: 'https://example.com/logo.png',
            },
          },
        ],
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      const teams = await getTeamsByLeague(League.PremierLeague);

      // Should resolve to shorter name
      expect(teams[33].shortName).toBe('Manchester United');
    });
  });

  describe('Error handling', () => {
    it('handles network errors', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('Network error'));

      await expect(getFixtures(League.PremierLeague)).rejects.toThrow('Network error');
    });

    it('handles timeout errors', async () => {
      vi.mocked(fetch).mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 100)
        )
      );

      await expect(getFixtures(League.PremierLeague)).rejects.toThrow();
    });

    it('includes proper error context', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
      } as Response);

      try {
        await getFixtures(League.PremierLeague);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('429');
      }
    });
  });
});
