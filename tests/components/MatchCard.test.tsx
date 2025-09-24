import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, setMockAppContextValue } from '../utils/testUtils';
import MatchCard from '../../components/MatchCard';
import { mockMatch, mockPrediction } from '../utils/testUtils';

// Mock child components
vi.mock('../../components/TeamLogo', () => ({
  default: ({ teamName }: any) => <img data-testid={`logo-${teamName}`} alt={teamName} />,
}));

vi.mock('../../components/ProbabilityBar', () => ({
  default: ({ homeWin, draw, awayWin }: any) => (
    <div data-testid="probability-bar">
      {homeWin}% - {draw}% - {awayWin}%
    </div>
  ),
}));

describe('MatchCard', () => {
  const mockProps = {
    match: mockMatch,
    onSelectMatch: vi.fn(),
    onSelectTeam: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    setMockAppContextValue({
      getPrediction: vi.fn(() => mockPrediction),
      fetchPrediction: vi.fn().mockResolvedValue(mockPrediction),
    });
  });

  it('renders match information correctly', async () => {
    render(<MatchCard {...mockProps} />);
    
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Manchester United' })).toBeInTheDocument();
    });
    expect(screen.getByRole('heading', { name: 'Liverpool' })).toBeInTheDocument();
    expect(screen.getByText('vs')).toBeInTheDocument();
  });

  it('displays team logos', () => {
    render(<MatchCard {...mockProps} />);
    
    expect(screen.getByTestId('logo-Manchester United')).toBeInTheDocument();
    expect(screen.getByTestId('logo-Liverpool')).toBeInTheDocument();
  });

  it('shows match time', async () => {
    render(<MatchCard {...mockProps} />);
    
    await waitFor(() => {
      expect(screen.getByText(/15:00/)).toBeInTheDocument();
    });
  });

  it('displays prediction when available and showPrediction is true', async () => {
    render(<MatchCard {...mockProps} />);
    
    const scoreline = await screen.findByTestId('predicted-scoreline');
    expect(scoreline).toHaveTextContent('2-1');
    expect(screen.getByTestId('probability-bar')).toBeInTheDocument();
    expect(screen.getByText(/Medium/i)).toBeInTheDocument();
  });

  it('does not display prediction when getPrediction returns null', async () => {
    setMockAppContextValue({ getPrediction: vi.fn(() => null) });
    render(<MatchCard {...mockProps} />);
    
    await waitFor(() => {
      expect(screen.queryByTestId('probability-bar')).not.toBeInTheDocument();
    });
  });

  it('calls onSelectMatch when card is clicked', async () => {
    render(<MatchCard {...mockProps} />);
    
    const card = await screen.findByTestId('match-card');
    fireEvent.click(card);
    
    await waitFor(() => {
      expect(mockProps.onSelectMatch).toHaveBeenCalledWith(mockMatch);
    });
  });

  it('calls onSelectTeam when team name is clicked', async () => {
    render(<MatchCard {...mockProps} />);
    
    const homeTeam = await screen.findByRole('heading', { name: 'Manchester United' });
    fireEvent.click(homeTeam);
    
    await waitFor(() => {
      expect(mockProps.onSelectTeam).toHaveBeenCalledWith('Manchester United');
    });
  });

  it('handles keyboard navigation', async () => {
    render(<MatchCard {...mockProps} />);
    
    const card = await screen.findByTestId('match-card');
    fireEvent.keyDown(card, { key: 'Enter' });
    
    await waitFor(() => {
      expect(mockProps.onSelectMatch).toHaveBeenCalledWith(mockMatch);
    });
  });

  it('displays live match indicators for live matches', async () => {
    const liveMatch = {
      ...mockMatch,
      status: 'LIVE',
      minute: 45,
    };

    render(<MatchCard {...mockProps} match={liveMatch} />);
    
    expect(await screen.findByText(/LIVE · 45'/i)).toBeInTheDocument();
    expect(screen.getByText(/45'/)).toBeInTheDocument();
  });

  it('shows confidence level when prediction is available', async () => {
    render(<MatchCard {...mockProps} />);
    
    expect(await screen.findByText(/Medium/i)).toBeInTheDocument();
  });

  it('handles missing prediction gracefully', async () => {
    setMockAppContextValue({ getPrediction: vi.fn(() => null) });
    render(<MatchCard {...mockProps} />);
    
    expect(await screen.findByRole('heading', { name: 'Manchester United' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Liverpool' })).toBeInTheDocument();
    expect(screen.queryByTestId('probability-bar')).not.toBeInTheDocument();
  });
});
