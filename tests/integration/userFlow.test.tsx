import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, setMockAppContextValue, openSearchModal, within } from '../utils/testUtils';
import { View } from '../../types';
import App from '../../App';
import { mockMatch, mockTeams, mockPrediction } from '../utils/testUtils';

// Mock services
vi.mock('../../services/footballApiService');
vi.mock('../../services/geminiService');
vi.mock('../../services/newsService');

// Mock context with realistic data
setMockAppContextValue({
  fixtures: [mockMatch],
  teams: mockTeams,
});

vi.mock('../../components/EnhancedNavigation', () => {
  const navItems = [
    { view: View.Dashboard, label: 'Dashboard' },
    { view: View.Fixtures, label: 'Fixtures' },
    { view: View.MyTeams, label: 'My Teams' },
    { view: View.News, label: 'News' },
    { view: View.Predictions, label: "Today's Predictions" },
  ];

  const EnhancedNavigationMock = ({ onNavigate, currentView }: { onNavigate: (view: View) => void; currentView: View; }) => {
    const [isSearchOpen, setIsSearchOpen] = React.useState(false);

    React.useEffect(() => {
      const handleKeyDown = (event: KeyboardEvent) => {
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
          event.preventDefault();
          setIsSearchOpen(true);
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    return (
      <header>
        <nav data-testid="enhanced-navigation">
          {navItems.map((item) => (
            <a
              key={item.label}
              href="#"
              data-testid={`nav-link-${item.label}`}
              aria-current={currentView === item.view ? 'page' : undefined}
              onClick={(event) => {
                event.preventDefault();
                onNavigate(item.view);
              }}
            >
              {item.label}
            </a>
          ))}
          <button
            type="button"
            data-testid="nav-search-button"
            onClick={() => setIsSearchOpen(true)}
          >
            Search
          </button>
        </nav>
        {isSearchOpen && (
          <div data-testid="global-search-modal">
            <input placeholder="Search for teams, leagues or matches" aria-label="Search" />
            <button type="button" onClick={() => setIsSearchOpen(false)}>
              Close
            </button>
          </div>
        )}
      </header>
    );
  };

  return {
    __esModule: true,
    default: EnhancedNavigationMock,
  };
});

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
      setMockAppContextValue({
        fixtures: [mockMatch],
        teams: mockTeams,
        generatePrediction: vi.fn().mockResolvedValue(mockPrediction),
        clearError: vi.fn(),
        isLoading: false,
        fixtureError: null,
      });
  });

  it('loads dashboard and navigates to match detail', async () => {
    render(<App />);

    // Click first match card (could be Match of the Day wrapper or standard card)
    const matchCards = await screen.findAllByTestId('match-card');
    fireEvent.click(matchCards[0]);

    // Instead of ambiguous league text (multiple occurrences), assert team heading appears in detail view
    expect(await screen.findByText(/Manchester United/i)).toBeInTheDocument();
  });

  it('navigates between different views', async () => {
    render(<App />);

    const fixturesNavLinks = await screen.findAllByTestId('nav-link-Fixtures');
    fireEvent.click(fixturesNavLinks[0]);
    expect(await screen.findByText(/Upcoming - Premier League/i)).toBeInTheDocument();

    const myTeamsNavLinks = screen.getAllByTestId('nav-link-My Teams');
    fireEvent.click(myTeamsNavLinks[0]);
    expect(await screen.findByText(/On-Demand Prediction/i)).toBeInTheDocument();

    const dashboardNavLinks = screen.getAllByTestId('nav-link-Dashboard');
    fireEvent.click(dashboardNavLinks[0]);
    expect(await screen.findByText('Upcoming Focus')).toBeInTheDocument();
  });

  it('searches for teams and navigates to results', async () => {
    render(<App />);

    openSearchModal();

    const searchModal = await screen.findByTestId('global-search-modal');
    const searchInput = within(searchModal).getByPlaceholderText('Search for teams, leagues or matches');
    fireEvent.change(searchInput, { target: { value: 'Manchester' } });

    const searchResult = await screen.findAllByText('Manchester United');
    fireEvent.click(searchResult[0]);

    expect(await screen.findByText('Manchester United')).toBeInTheDocument();
  });

  it('handles prediction generation flow', async () => {
    const mockGeneratePrediction = vi.fn().mockResolvedValue(mockPrediction);
    setMockAppContextValue({ generatePrediction: mockGeneratePrediction });

    render(<App />);

    expect(await screen.findByText('2-1')).toBeInTheDocument();

    // When on dashboard only summary is present; open full prediction by clicking scoreline (or card)
    const scorelineEl = await screen.findByText('2-1');
    fireEvent.click(scorelineEl);
    // Expect navigation to prediction detail (confidence text)
    expect(await screen.findByText(/Prediction Confidence/i)).toBeInTheDocument();
  });

  it('handles error states gracefully', async () => {
    setMockAppContextValue({ fixtureError: 'Failed to load fixtures' });

    render(<App />);

    expect(await screen.findByText('Failed to load fixtures')).toBeInTheDocument();
  });

  it('handles loading states correctly', async () => {
    setMockAppContextValue({ isLoading: true, fixtures: [] });

    render(<App />);

    expect(await screen.findByText(/Loading.../i)).toBeInTheDocument();
  });

  it.skip('handles mobile navigation flow', async () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    });

    render(<App />);

    const fixturesNavLinks = await screen.findAllByText('Fixtures');
    fireEvent.click(fixturesNavLinks[1]);

    await waitFor(() => {
      expect(screen.getByText('Football Fixtures')).toBeInTheDocument();
    });
  });

  it('maintains state during navigation', async () => {
    render(<App />);

    const viewAllFixturesButton = await screen.findAllByText('View All Fixtures');
    fireEvent.click(viewAllFixturesButton[0]);

    const fixturesNavLinks = screen.getAllByTestId('nav-link-Fixtures');
  fireEvent.click(fixturesNavLinks[0]);

    expect(await screen.findByText(/Upcoming - Premier League/i)).toBeInTheDocument();
    expect(await screen.findAllByText('Manchester United')).not.toHaveLength(0);
  });
});
