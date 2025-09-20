import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../utils/testUtils';
import Dashboard from '../../components/Dashboard';
import { mockMatch, mockAppContextValue } from '../utils/testUtils';

// Mock the AppContext
vi.mock('../../contexts/AppContext', () => ({
  useAppContext: () => mockAppContextValue,
}));

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
  });

  it('renders dashboard with today\'s matches', () => {
    render(<Dashboard {...mockProps} />);
    
    expect(screen.getByText('Today\'s Matches')).toBeInTheDocument();
    expect(screen.getByTestId('match-card')).toBeInTheDocument();
  });

  it('displays Champions League section when matches are available', () => {
    const championsMock = {
      ...mockAppContextValue,
      fixtures: [{
        ...mockMatch,
        league: 'UEFA Champions League' as any,
      }],
    };

    vi.mocked(require('../../contexts/AppContext').useAppContext).mockReturnValue(championsMock);

    render(<Dashboard {...mockProps} />);
    
    expect(screen.getByText('Today\'s UEFA Champions League')).toBeInTheDocument();
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

  it('displays loading state when isLoading is true', () => {
    const loadingMock = {
      ...mockAppContextValue,
      isLoading: true,
    };

    vi.mocked(require('../../contexts/AppContext').useAppContext).mockReturnValue(loadingMock);

    render(<Dashboard {...mockProps} />);
    
    expect(screen.getByText('Loading fixtures...')).toBeInTheDocument();
  });

  it('displays error state when error exists', () => {
    const errorMock = {
      ...mockAppContextValue,
      error: 'Failed to load fixtures',
    };

    vi.mocked(require('../../contexts/AppContext').useAppContext).mockReturnValue(errorMock);

    render(<Dashboard {...mockProps} />);
    
    expect(screen.getByText('Failed to load fixtures')).toBeInTheDocument();
  });
});
