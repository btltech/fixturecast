import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../utils/testUtils';
import App from '../../App';
import { mockMatch, mockTeams, mockPrediction } from '../utils/testUtils';

// Mock services
vi.mock('../../services/footballApiService');
vi.mock('../../services/geminiService');
vi.mock('../../services/newsService');

// Mock context with realistic data
const mockContextValue = {
  fixtures: [mockMatch],
  teams: mockTeams,
  leagueTables: {},
  news: [],
  predictions: { [mockMatch.id]: mockPrediction },
  isLoading: false,
  error: null,
  lastUpdated: { fixtures: Date.now() },
  refetchFixtures: vi.fn(),
  refetchTeams: vi.fn(),
  refetchLeagueTables: vi.fn(),
  refetchNews: vi.fn(),
  generatePrediction: vi.fn(),
  clearError: vi.fn(),
};

vi.mock('../../contexts/AppContext', () => ({
  useAppContext: () => mockContextValue,
  AppContextProvider: ({ children }: any) => children,
}));

// Mock performance and theme services
vi.mock('../../services/performanceService', () => ({
  performanceService: {
    initialize: vi.fn(),
  },
}));

vi.mock('../../services/themeService', () => ({
  themeService: {
    initialize: vi.fn(),
    getEffectiveTheme: () => 'light',
  },
}));

vi.mock('../../services/calendarService', () => ({
  calendarService: {
    initialize: vi.fn(),
  },
}));

describe('User Flow Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock window.location.hash
    Object.defineProperty(window, 'location', {
      value: {
        hash: '',
        href: 'http://localhost:3000',
      },
      writable: true,
    });
  });

  it('loads dashboard and navigates to match detail', async () => {
    render(<App />);

    // Should show dashboard initially
    await waitFor(() => {
      expect(screen.getByText("Today's Matches")).toBeInTheDocument();
    });

    // Should show match card
    expect(screen.getByText('Manchester United vs Liverpool')).toBeInTheDocument();

    // Click on match to navigate to detail
    const matchCard = screen.getByText('Manchester United vs Liverpool');
    fireEvent.click(matchCard);

    // Should navigate to match detail view
    await waitFor(() => {
      expect(screen.getByText('Match Details')).toBeInTheDocument();
    });
  });

  it('navigates between different views', async () => {
    render(<App />);

    // Start on dashboard
    await waitFor(() => {
      expect(screen.getByText("Today's Matches")).toBeInTheDocument();
    });

    // Navigate to fixtures
    const fixturesButton = screen.getByText('Fixtures');
    fireEvent.click(fixturesButton);

    await waitFor(() => {
      expect(screen.getByText('Football Fixtures')).toBeInTheDocument();
    });

    // Navigate to my teams
    const myTeamsButton = screen.getByText('My Teams');
    fireEvent.click(myTeamsButton);

    await waitFor(() => {
      expect(screen.getByText('My Teams')).toBeInTheDocument();
    });

    // Navigate back to dashboard
    const dashboardButton = screen.getByText('Dashboard');
    fireEvent.click(dashboardButton);

    await waitFor(() => {
      expect(screen.getByText("Today's Matches")).toBeInTheDocument();
    });
  });

  it('searches for teams and navigates to results', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("Today's Matches")).toBeInTheDocument();
    });

    // Find and use search input
    const searchInput = screen.getByPlaceholderText('Search teams, leagues...');
    fireEvent.change(searchInput, { target: { value: 'Manchester' } });

    // Should show search results
    await waitFor(() => {
      expect(screen.getByText('Search Results')).toBeInTheDocument();
    });

    // Click on a search result
    const searchResult = screen.getByText('Manchester United');
    fireEvent.click(searchResult);

    // Should navigate to team page
    await waitFor(() => {
      expect(screen.getByText('Team Details')).toBeInTheDocument();
    });
  });

  it('handles prediction generation flow', async () => {
    const mockGeneratePrediction = vi.fn().mockResolvedValue(mockPrediction);
    mockContextValue.generatePrediction = mockGeneratePrediction;

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("Today's Matches")).toBeInTheDocument();
    });

    // Should show match with prediction
    expect(screen.getByText('2-1')).toBeInTheDocument();

    // Click on prediction to view details
    const predictionButton = screen.getByText('View Details');
    fireEvent.click(predictionButton);

    await waitFor(() => {
      expect(screen.getByText('Prediction Analysis')).toBeInTheDocument();
    });

    // Should show prediction details
    expect(screen.getByText('Strong home form')).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  it('handles error states gracefully', async () => {
    const errorContextValue = {
      ...mockContextValue,
      error: 'Failed to load fixtures',
    };

    vi.mocked(require('../../contexts/AppContext').useAppContext)
      .mockReturnValue(errorContextValue);

    render(<App />);

    // Should show error message
    await waitFor(() => {
      expect(screen.getByText('Failed to load fixtures')).toBeInTheDocument();
    });

    // Should show retry button
    const retryButton = screen.getByText('Retry');
    fireEvent.click(retryButton);

    // Should call clearError
    expect(errorContextValue.clearError).toHaveBeenCalled();
  });

  it('handles loading states correctly', async () => {
    const loadingContextValue = {
      ...mockContextValue,
      isLoading: true,
      fixtures: [],
    };

    vi.mocked(require('../../contexts/AppContext').useAppContext)
      .mockReturnValue(loadingContextValue);

    render(<App />);

    // Should show loading spinner
    await waitFor(() => {
      expect(screen.getByText('Loading all featured leagues...')).toBeInTheDocument();
    });

    // Should show loading message
    expect(screen.getByText(/Fetching data for 3 European Championships/)).toBeInTheDocument();
  });

  it('handles mobile navigation flow', async () => {
    // Mock mobile viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("Today's Matches")).toBeInTheDocument();
    });

    // Should show mobile navigation
    const menuButton = screen.getByLabelText('Open navigation menu');
    fireEvent.click(menuButton);

    // Should show mobile menu
    await waitFor(() => {
      expect(screen.getByText('Navigation')).toBeInTheDocument();
    });

    // Navigate using mobile menu
    const mobileFixturesButton = screen.getAllByText('Fixtures')[1]; // Second one is in mobile menu
    fireEvent.click(mobileFixturesButton);

    await waitFor(() => {
      expect(screen.getByText('Football Fixtures')).toBeInTheDocument();
    });
  });

  it('maintains state during navigation', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("Today's Matches")).toBeInTheDocument();
    });

    // Select a team filter
    const teamFilter = screen.getByDisplayValue('All Teams');
    fireEvent.change(teamFilter, { target: { value: 'Manchester United' } });

    // Navigate to fixtures
    const fixturesButton = screen.getByText('Fixtures');
    fireEvent.click(fixturesButton);

    await waitFor(() => {
      expect(screen.getByText('Football Fixtures')).toBeInTheDocument();
    });

    // Filter should be maintained
    expect(screen.getByDisplayValue('Manchester United')).toBeInTheDocument();
  });
});
