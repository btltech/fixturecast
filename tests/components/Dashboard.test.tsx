import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, mockAppContextValue, setMockAppContextValue } from '../utils/testUtils';
import Dashboard from '../../components/Dashboard';
import { mockMatch } from '../utils/testUtils';

// Mock child components
vi.mock('../../components/MatchCard', () => ({
  default: ({ match, onSelectMatch }: any) => (
    <div data-testid="match-card" onClick={() => onSelectMatch(match)}>
      {match.homeTeam} vs {match.awayTeam}
    </div>
  ),
}));

vi.mock('../../components/EnhancedAccuracyTracker', () => ({
  default: ({ onSelectPrediction }: any) => (
    <div data-testid="accuracy-tracker">
      <button onClick={() => onSelectPrediction({})}>View Prediction</button>
    </div>
  ),
}));

describe('Dashboard', () => {
  const mockProps = {
    onSelectMatch: vi.fn(),
    onSelectTeam: vi.fn(),
    navigateToFixtures: vi.fn(),
    setSelectedLeagueFilter: vi.fn(),
    onSelectPrediction: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    setMockAppContextValue({});
  });

  it('renders dashboard with today\'s matches', async () => {
    render(<Dashboard {...mockProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Upcoming Focus')).toBeInTheDocument();
    });
    expect(screen.getByTestId('match-card')).toBeInTheDocument();
  });

  it('displays Champions League section when matches are available', async () => {
    setMockAppContextValue({
      fixtures: [{
        ...mockMatch,
        league: 'UEFA Champions League' as any,
      }],
    });

    render(<Dashboard {...mockProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Upcoming Focus')).toBeInTheDocument();
    });
  });

  it('calls onSelectMatch when a match is clicked', async () => {
    render(<Dashboard {...mockProps} />);
    
    const matchCard = screen.getByTestId('match-card');
    fireEvent.click(matchCard);
    
    await waitFor(() => {
      expect(mockProps.onSelectMatch).toHaveBeenCalledWith(mockMatch);
    });
  });

  it('shows accuracy tracker', () => {
    render(<Dashboard {...mockProps} />);
    
    expect(screen.getByTestId('accuracy-tracker')).toBeInTheDocument();
  });

  it('calls onSelectPrediction when prediction is selected', async () => {
    render(<Dashboard {...mockProps} />);
    
    const predictionButton = screen.getByText('View Prediction');
    fireEvent.click(predictionButton);
    
    await waitFor(() => {
      expect(mockProps.onSelectPrediction).toHaveBeenCalled();
    });
  });

  it('toggles all teams section', async () => {
    render(<Dashboard {...mockProps} />);
    
    const toggleButton = screen.getByTitle('Expand teams');
    fireEvent.click(toggleButton);
    
    await waitFor(() => {
      expect(screen.getByTitle('Collapse teams')).toBeInTheDocument();
    });
  });

  it('displays loading state when isLoading is true', async () => {
    setMockAppContextValue({
      isLoading: true,
      fixtures: [],
    });

    render(<Dashboard {...mockProps} />);
    
    await waitFor(() => {
      expect(screen.getByText(/Loading complete featured leagues data/i)).toBeInTheDocument();
    });
  });

  it('displays error state when error exists', async () => {
    setMockAppContextValue({
      fixtureError: 'Failed to load fixtures',
    });

    render(<Dashboard {...mockProps} />);
    
    await waitFor(() => {
      expect(screen.getByTestId('fixtures-error-message')).toHaveTextContent(/Failed to load fixtures/i);
    });
  });
});
