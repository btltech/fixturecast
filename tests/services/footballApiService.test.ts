import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { League } from '../../types';

type FetchResponseInit = {
  status?: number;
  statusText?: string;
  headers?: Record<string, string>;
};

const createFetchResponse = (payload: any, init: FetchResponseInit = {}) => ({
  ok: (init.status ?? 200) < 400,
  status: init.status ?? 200,
  statusText: init.statusText ?? 'OK',
  headers: {
    get: (key: string) => init.headers?.[key.toLowerCase()] ?? null,
  },
  json: async () => payload,
  text: async () => JSON.stringify(payload),
}) as Response;

const fetchMock = vi.fn();

type TeamDataServiceExports = typeof import('../../services/teamDataService');
const teamDataServiceMock: Partial<TeamDataServiceExports> = {
  resolveTeamName: (name: string) => name,
  getTeamData: vi.fn(() => null),
  isKnownTeam: vi.fn(() => false),
};

vi.mock('../../services/teamDataService', () => teamDataServiceMock);

describe('footballApiService', () => {
  beforeEach(() => {
    vi.resetModules();
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('getUpcomingFixtures', () => {
    it('normalizes fixture data and respects the provided limit', async () => {
      fetchMock.mockResolvedValueOnce(createFetchResponse({
        response: [
          {
            fixture: { id: 101, date: '2024-01-15T12:00:00Z' },
            teams: {
              home: { id: 1, name: 'Arsenal' },
              away: { id: 2, name: 'Chelsea' },
            },
          },
        ],
      }));

      const { getUpcomingFixtures } = await import('../../services/footballApiService');
      const fixtures = await getUpcomingFixtures(League.PremierLeague, 1);

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

    it('returns an empty array when the API request fails', async () => {
      fetchMock.mockResolvedValueOnce(createFetchResponse({}, { status: 503, statusText: 'Service Unavailable' }));

      const { getUpcomingFixtures } = await import('../../services/footballApiService');
      const fixtures = await getUpcomingFixtures(League.MLS);

      expect(fixtures).toEqual([]);
    });
  });

  describe('getTeamsByLeague', () => {
    it('maps API response to a team dictionary', async () => {
      fetchMock.mockResolvedValueOnce(createFetchResponse({
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
          },
        ],
      }));

      const { getTeamsByLeague } = await import('../../services/footballApiService');
      const teams = await getTeamsByLeague(League.PremierLeague);

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url] = fetchMock.mock.calls[0];
      expect(url).toContain('/teams');
      expect(url).toContain('league=39');

      expect(teams).toHaveProperty('Manchester United');
      expect(teams['Manchester United']).toMatchObject({
        id: 33,
        shortName: 'MUN',
        league: League.PremierLeague,
      });
    });

    it('returns empty map on API failure', async () => {
      fetchMock.mockResolvedValueOnce(createFetchResponse({}, { status: 500, statusText: 'Server error' }));

      const { getTeamsByLeague } = await import('../../services/footballApiService');
      const teams = await getTeamsByLeague(League.PremierLeague);

      expect(teams).toEqual({});
    });
  });
});
