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
vi.mock('../../services/teamDataService', () => ({
  resolveTeamName: (name: string) => name,
  getTeamData: vi.fn(() => null),
  isKnownTeam: vi.fn(() => false),
}));

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
import { League } from '../../types';
import type { Match } from '../../types';

const createFetchResponse = (payload: any, overrides: Partial<Response> = {}): Response => ({
  ok: true,
  status: 200,
  statusText: 'OK',
  json: async () => payload,
  text: async () => JSON.stringify(payload),
  ...overrides,
} as Response);

let footballApiService: typeof import('../../services/footballApiService');
const fetchMock = vi.fn();

beforeEach(async () => {
  vi.resetModules();
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock as any);
  footballApiService = await import('../../services/footballApiService');
});

      const callUrl = vi.mocked(fetch).mock.calls[0][0] as string;
      expect(callUrl).toContain('date=2024-01-15');
      expect(callUrl).toContain('league=39'); // Premier League ID
    });
  });
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('FootballApiService', () => {
  describe('getTeamsByLeague', () => {
    it('fetches teams successfully', async () => {
      const mockResponse = {
    it('maps API response to a team dictionary', async () => {
      const apiResponse = {
        response: [
          {
            team: {
              id: 33,
              name: 'Manchester United',
              logo: 'https://example.com/logo.png',
              code: 'MUN',
              country: 'England',
              founded: 1878,
            },
            venue: {
              name: 'Old Trafford',
            },
            venue: { name: 'Old Trafford' },
          },
        ],
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);
      fetchMock.mockResolvedValueOnce(createFetchResponse(apiResponse));

      const teams = await footballApiService.getTeamsByLeague(League.PremierLeague);

      const teams = await getTeamsByLeague(League.PremierLeague);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url] = fetchMock.mock.calls[0];
      expect(url).toContain('/teams');
      expect(url).toContain('league=39');

      expect(teams).toHaveProperty('33');
      expect(teams[33]).toMatchObject({
      expect(teams['Manchester United']).toEqual({
        id: 33,
        shortName: 'Manchester United',
        logo: 'https://example.com/logo.png',
        shortName: 'MUN',
        jerseyColors: { primary: '#1f2937', secondary: '#ffffff' },
        country: 'England',
        league: League.PremierLeague,
        founded: 1878,
        venue: 'Old Trafford',
      });
    });

    it('handles malformed team data', async () => {
      const mockResponse = {
        response: [
    it('returns an empty map when the API request fails', async () => {
      fetchMock.mockResolvedValueOnce(
        createFetchResponse(
          {},
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
            ok: false,
            status: 500,
            statusText: 'Server Error',
            json: async () => ({}),
            text: async () => 'Server Error',
          }
        )
      );

      const teams = await getTeamsByLeague(League.PremierLeague);
      const teams = await footballApiService.getTeamsByLeague(League.LaLiga);

      // Should handle gracefully and not include malformed team
      expect(Object.keys(teams)).toHaveLength(0);
      expect(teams).toEqual({});
    });
  });

    it('resolves team names correctly', async () => {
      const mockResponse = {
  describe('getUpcomingFixtures', () => {
    it('normalizes fixture data and respects the provided limit', async () => {
      const apiResponse = {
        response: [
          {
            team: {
              id: 33,
              name: 'Manchester United FC',
              logo: 'https://example.com/logo.png',
            fixture: { id: 101, date: '2024-01-15T12:00:00Z' },
            teams: {
              home: { id: 1, name: 'Arsenal' },
              away: { id: 2, name: 'Chelsea' },
            },
          },
          {
            fixture: { id: 102, date: '2024-01-16T12:00:00Z' },
            teams: {
              home: { id: 3, name: 'Liverpool' },
              away: { id: 4, name: 'Everton' },
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
      fetchMock.mockResolvedValueOnce(createFetchResponse(apiResponse));

      const fixtures = await footballApiService.getUpcomingFixtures(League.PremierLeague, 1);

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url] = fetchMock.mock.calls[0];
      expect(url).toContain('/fixtures');
      expect(url).toContain('league=39');
      expect(url).toContain('status=NS');

      expect(fixtures).toEqual([
        {
          id: '101',
          homeTeam: 'Arsenal',
          awayTeam: 'Chelsea',
          homeTeamId: 1,
          awayTeamId: 2,
          league: League.PremierLeague,
          date: '2024-01-15T12:00:00Z',
        },
      ]);
    });
  });

  describe('Error handling', () => {
    it('handles network errors', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('Network error'));
    it('filters out fixtures that are missing required data', async () => {
      fetchMock.mockResolvedValueOnce(
        createFetchResponse({
          response: [
            {
              fixture: { id: 201, date: '2024-01-15T12:00:00Z' },
              teams: {
                home: { id: 5, name: 'Tottenham' },
                // Missing away team
              },
            },
            {
              fixture: null,
            },
          ],
        })
      );

      const fixtures = await footballApiService.getUpcomingFixtures(League.LaLiga);

      await expect(getFixtures(League.PremierLeague)).rejects.toThrow('Network error');
      expect(fixtures).toEqual([]);
    });

    it('handles timeout errors', async () => {
      vi.mocked(fetch).mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 100)
    it('returns an empty array when the API request fails', async () => {
      fetchMock.mockResolvedValueOnce(
        createFetchResponse(
          {},
          {
            ok: false,
            status: 503,
            statusText: 'Service Unavailable',
            json: async () => ({}),
            text: async () => 'Service Unavailable',
          }
        )
      );

      await expect(getFixtures(League.PremierLeague)).rejects.toThrow();
      const fixtures = await footballApiService.getUpcomingFixtures(League.NWSL);

      expect(fixtures).toEqual([]);
    });
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
  describe('getAllUpcomingFixtures', () => {
    it("combines today's fixtures with upcoming fixtures", async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-15T12:00:00Z'));

      const todaysFixture: Match = {
        id: '1',
        homeTeam: 'Arsenal',
        awayTeam: 'Chelsea',
        homeTeamId: 1,
        awayTeamId: 2,
        league: League.PremierLeague,
        date: '2024-01-15T15:00:00Z',
      };

      const upcomingFixture: Match = {
        id: '2',
        homeTeam: 'Barcelona',
        awayTeam: 'Real Madrid',
        homeTeamId: 3,
        awayTeamId: 4,
        league: League.LaLiga,
        date: '2024-01-16T20:00:00Z',
      };

      const emptyFixtures = { response: [] };

      fetchMock
        // Today's fixtures for five priority leagues
        .mockResolvedValueOnce(
          createFetchResponse({ response: [
            {
              fixture: { id: Number(todaysFixture.id), date: todaysFixture.date },
              teams: {
                home: { id: todaysFixture.homeTeamId, name: todaysFixture.homeTeam },
                away: { id: todaysFixture.awayTeamId, name: todaysFixture.awayTeam },
              },
            },
          ] })
        )
        .mockResolvedValueOnce(createFetchResponse(emptyFixtures))
        .mockResolvedValueOnce(createFetchResponse(emptyFixtures))
        .mockResolvedValueOnce(createFetchResponse(emptyFixtures))
        .mockResolvedValueOnce(createFetchResponse(emptyFixtures))
        // International competitions (4 calls)
        .mockResolvedValueOnce(createFetchResponse(emptyFixtures))
        .mockResolvedValueOnce(createFetchResponse(emptyFixtures))
        .mockResolvedValueOnce(createFetchResponse(emptyFixtures))
        .mockResolvedValueOnce(createFetchResponse(emptyFixtures))
        // Upcoming fixtures for featured leagues (11 calls)
        .mockResolvedValueOnce(createFetchResponse(emptyFixtures)) // Premier League
        .mockResolvedValueOnce(createFetchResponse(emptyFixtures)) // Championship
        .mockResolvedValueOnce(
          createFetchResponse({
            response: [
              {
                fixture: { id: Number(upcomingFixture.id), date: upcomingFixture.date },
                teams: {
                  home: { id: upcomingFixture.homeTeamId, name: upcomingFixture.homeTeam },
                  away: { id: upcomingFixture.awayTeamId, name: upcomingFixture.awayTeam },
                },
              },
            ],
          })
        )
        .mockResolvedValueOnce(createFetchResponse(emptyFixtures))
        .mockResolvedValueOnce(createFetchResponse(emptyFixtures))
        .mockResolvedValueOnce(createFetchResponse(emptyFixtures))
        .mockResolvedValueOnce(createFetchResponse(emptyFixtures))
        .mockResolvedValueOnce(createFetchResponse(emptyFixtures))
        .mockResolvedValueOnce(createFetchResponse(emptyFixtures))
        .mockResolvedValueOnce(createFetchResponse(emptyFixtures))
        .mockResolvedValueOnce(createFetchResponse(emptyFixtures));

      const fixturesPromise = footballApiService.getAllUpcomingFixtures();
      await vi.runAllTimersAsync();
      const fixtures = await fixturesPromise;

      expect(fixtures[0]).toEqual(todaysFixture);
      expect(fixtures).toEqual(expect.arrayContaining([todaysFixture, upcomingFixture]));
      expect(fixtures.length).toBe(2);
    });
  });
});