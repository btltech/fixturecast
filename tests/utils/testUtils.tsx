import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { vi } from 'vitest';
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

export const mockAppContextValue = {
  // Data
  fixtures: mockFixtures,
  teams: mockTeams,
  leagueTables: mockLeagueTables,
  news: mockNews,
  predictions: { [mockMatch.id]: mockPrediction },
  
  // State
  isLoading: false,
  error: null,
  lastUpdated: { fixtures: Date.now() },
  
  // Actions
  refetchFixtures: vi.fn(),
  refetchTeams: vi.fn(),
  refetchLeagueTables: vi.fn(),
  refetchNews: vi.fn(),
  generatePrediction: vi.fn(),
  clearError: vi.fn(),
};

// Mock the AppProvider to prevent context errors
vi.mock('../../contexts/AppContext', () => ({
  AppProvider: ({ children }: { children: React.ReactNode }) => children,
  useAppContext: () => mockAppContextValue,
}));

// Custom render function that includes providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

export * from '@testing-library/react';
export { customRender as render };
