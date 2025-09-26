import React, { ReactElement } from 'react';
import { render, RenderOptions, fireEvent } from '@testing-library/react';
import { vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AppProvider } from '../../contexts/AppContext';

// Mock all API services to prevent real network calls
vi.mock('../../services/footballApiService', () => ({
  getTodaysFixtures: vi.fn().mockResolvedValue([]),
  getUpcomingFixtures: vi.fn().mockResolvedValue([]),
  getLiveMatches: vi.fn().mockResolvedValue([]),
  getTeamDetails: vi.fn().mockResolvedValue(null),
  getAllLeagueTables: vi.fn().mockResolvedValue({}),
  getApiUsage: vi.fn().mockResolvedValue({ requests: 0, limit: 100 }),
}));

vi.mock('../../services/liveMatchService', () => ({
  getLiveMatches: vi.fn().mockResolvedValue([]),
}));

vi.mock('../../services/newsService', () => ({
  getNews: vi.fn().mockResolvedValue([]),
}));

vi.mock('../../services/predictionService', () => ({
  generatePrediction: vi.fn().mockResolvedValue(null),
  generatePredictionsForMatches: vi.fn().mockResolvedValue([]),
}));

// Mock data for testing
export const mockMatch = {
  id: '1',
  homeTeam: 'Manchester United',
  awayTeam: 'Liverpool',
  homeTeamId: 33,
  awayTeamId: 40,
  league: 'Premier League' as any,
  date: '2024-01-15T15:00:00.000Z',
  venue: 'Old Trafford',
  status: 'NS' as any,
};

export const mockTeam = {
  id: 33,
  logo: '/logos/manchester-united.png',
  shortName: 'Man United',
  jerseyColors: {
    primary: '#DA020E',
    secondary: '#FBE122',
  },
  country: 'England',
  league: 'Premier League' as any,
  founded: 1878,
  venue: 'Old Trafford',
};

export const mockPrediction = {
  homeWinProbability: 45,
  drawProbability: 25,
  awayWinProbability: 30,
  predictedScoreline: '2-1',
  confidence: 'medium' as any,
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
  confidenceReason: 'Strong home form and recent results',
};

export const mockFixtures = [mockMatch];

export const mockTeams = {
  33: mockTeam,
  40: {
    id: 40,
    logo: '/logos/liverpool.png',
    shortName: 'Liverpool',
    jerseyColors: {
      primary: '#C8102E',
      secondary: '#F6EB61',
    },
    country: 'England',
    league: 'Premier League' as any,
    founded: 1892,
    venue: 'Anfield',
  },
};

export const mockLeagueTables = {
  'Premier League': [
    {
      position: 1,
      team: mockTeam,
      played: 20,
      won: 15,
      drawn: 3,
      lost: 2,
      goalsFor: 45,
      goalsAgainst: 15,
      goalDifference: 30,
      points: 48,
      form: ['W', 'W', 'D', 'W', 'W'],
    },
  ],
};

export const mockNews = [
  {
    title: 'Manchester United vs Liverpool Preview',
    link: 'https://example.com/news/1',
    description: 'A preview of the upcoming match',
    pubDate: '2024-01-14T10:00:00Z',
    source: 'BBC Sport' as any,
  },
];

type AppContextShape = ReturnType<typeof createMockAppContextValue>;

const createAccuracyStats = () => ({
  totalPredictions: 1,
  correctOutcomes: 1,
  correctScorelines: 0,
  correctBtts: 0,
  correctGoalLine: 0,
  correctHtft: 0,
  correctScoreRange: 0,
  correctFirstGoalscorer: 0,
  correctCleanSheet: 0,
  correctCorners: 0,
  recentAccuracy: { last10: 70, last20: 68, last50: 65 },
  overallAccuracy: 70,
  verifiedPredictions: 1,
});

const createMockAppContextValue = () => ({
  fixtures: mockFixtures,
  teams: mockTeams,
  pastPredictions: [],
  leagueTables: mockLeagueTables,
  fixtureError: null,
  favoriteTeams: ['Manchester United'],
  favoriteLeagues: [],
  alerts: [],
  toasts: [],
  isLoading: false,
  unreadAlertsCount: 0,
  apiUsage: { callsUsed: 0, callsRemaining: 1000, percentageUsed: 0 },
  lastUpdated: { fixtures: Date.now() },
  accuracyRecords: [],
  accuracyStats: createAccuracyStats(),
  liveMatches: [],
  liveMatchUpdates: {},
  teamCache: {},
  todaysFixturesWithPredictions: mockFixtures.map(match => ({ match, prediction: mockPrediction, loading: false })),
  onSelectPrediction: vi.fn(),
  loadInitialData: vi.fn(),
  refreshRealTimeData: vi.fn(),
  addToast: vi.fn(),
  fetchPrediction: vi.fn().mockResolvedValue(mockPrediction),
  getPrediction: vi.fn(() => mockPrediction),
  toggleFavoriteTeam: vi.fn(),
  toggleFavoriteLeague: vi.fn(),
  addAlert: vi.fn(),
  markAlertsAsRead: vi.fn(),
  loadLeagueTable: vi.fn(),
  recordPredictionAccuracy: vi.fn(),
  getAccuracyDisplay: vi.fn(() => '70% overall accuracy'),
  generateTodaysPredictions: vi.fn().mockResolvedValue({ success: 1, failed: 0, total: 1 }),
  getLiveAccuracyStats: vi.fn(() => createAccuracyStats()),
  fetchLiveMatches: vi.fn(),
  getLiveMatch: vi.fn(() => null),
  updateLiveMatches: vi.fn(),
  updateDailyPredictions: vi.fn(),
  loadLeagueFixtures: vi.fn(),
  getTeamForm: vi.fn(() => ({
    overall: {
      teamId: 1,
      teamName: 'Manchester United',
      last10Results: ['W', 'D', 'L', 'W', 'W'],
      homeForm: ['W', 'W', 'D'],
      awayForm: ['L', 'W'],
      formTrend: 'improving',
      pointsLast10: 15,
      goalsFor: 18,
      goalsAgainst: 10,
      cleanSheets: 3,
      lastUpdated: new Date().toISOString(),
    },
    home: {
      teamId: 1,
      teamName: 'Manchester United',
      last10Results: ['W', 'W', 'D', 'W'],
      homeForm: ['W', 'W', 'D', 'W'],
      awayForm: ['L', 'W'],
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
      last10Results: ['L', 'W', 'D', 'L'],
      homeForm: ['W', 'W', 'D'],
      awayForm: ['L', 'W', 'L', 'D'],
      formTrend: 'declining',
      pointsLast10: 6,
      goalsFor: 8,
      goalsAgainst: 12,
      cleanSheets: 1,
      lastUpdated: new Date().toISOString(),
    },
    trend: {
      direction: 'up',
      strength: 60,
      description: 'Improving',
    },
  })),
  getCachedTeamData: vi.fn(() => null),
  setCachedTeamData: vi.fn(),
  clearTeamCache: vi.fn(),
  getTeamDetails: vi.fn().mockResolvedValue(mockTeam),
  refreshTeamDetails: vi.fn(),
  refreshAllTeamDetails: vi.fn(),
  getTeamDataStatus: vi.fn(() => ({ totalTeams: 2, cachedComplete: 2, percentageComplete: 100, needsRefresh: 0 })),
  news: mockNews,
  refetchFixtures: vi.fn(),
  refetchTeams: vi.fn(),
  refetchLeagueTables: vi.fn(),
  refetchNews: vi.fn(),
  generatePrediction: vi.fn().mockResolvedValue(mockPrediction),
  clearError: vi.fn(),
  error: null,
});

let mockAppContextValue: AppContextShape = createMockAppContextValue();

export const resetMockAppContextValue = () => {
  mockAppContextValue = createMockAppContextValue();
};

export const setMockAppContextValue = (overrides: Partial<AppContextShape>) => {
  mockAppContextValue = {
    ...mockAppContextValue,
    ...overrides,
    fixtureError: overrides.fixtureError ?? mockAppContextValue.fixtureError,
  };
};

export { mockAppContextValue };

// Mock the AppProvider to prevent context errors
vi.mock('../../contexts/AppContext', () => ({
  AppProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAppContext: () => mockAppContextValue,
}));

beforeEach(() => {
  resetMockAppContextValue();
});

const TestProviders = ({ children }: { children: React.ReactNode }) => (
  <AppProvider>
    {/* Start tests on /dashboard so they don't hang on hero landing expectations */}
    <MemoryRouter initialEntries={['/dashboard']}>{children}</MemoryRouter>
  </AppProvider>
);

const customRender = (ui: ReactElement, options: RenderOptions = {}) =>
  render(ui, { wrapper: TestProviders, ...options });

export * from '@testing-library/react';
export { customRender as render };

export const openSearchModal = () => {
  fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
  fireEvent.keyDown(window, { key: 'k', metaKey: true });
};
