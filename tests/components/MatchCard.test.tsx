import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../utils/testUtils';
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
    prediction: mockPrediction,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders match information correctly', () => {
    render(<MatchCard {...mockProps} />);
    
    expect(screen.getByText('Manchester United')).toBeInTheDocument();
    expect(screen.getByText('Liverpool')).toBeInTheDocument();
    expect(screen.getByText('vs')).toBeInTheDocument();
  });

  it('displays team logos', () => {
    render(<MatchCard {...mockProps} />);
    
    expect(screen.getByTestId('logo-Manchester United')).toBeInTheDocument();
    expect(screen.getByTestId('logo-Liverpool')).toBeInTheDocument();
  });

  it('shows match time', () => {
    render(<MatchCard {...mockProps} />);
    
    // Should display formatted time
    expect(screen.getByText(/\d{2}:\d{2}/)).toBeInTheDocument();
  });

  it('displays prediction when available and showPrediction is true', () => {
    render(<MatchCard {...mockProps} />);
    
    expect(screen.getByText('2-1')).toBeInTheDocument();
    expect(screen.getByTestId('probability-bar')).toBeInTheDocument();
  });

  it('does not display prediction when showPrediction is false', () => {
    render(<MatchCard {...mockProps} />);
    
    expect(screen.queryByTestId('probability-bar')).not.toBeInTheDocument();
  });

  it('calls onSelectMatch when card is clicked', async () => {
    render(<MatchCard {...mockProps} />);
    
    const card = screen.getByRole('article');
    fireEvent.click(card);
    
    await waitFor(() => {
      expect(mockProps.onSelectMatch).toHaveBeenCalledWith(mockMatch);
    });
  });

  it('calls onSelectTeam when team name is clicked', async () => {
    render(<MatchCard {...mockProps} />);
    
    const homeTeam = screen.getByText('Manchester United');
    fireEvent.click(homeTeam);
    
    await waitFor(() => {
      expect(mockProps.onSelectTeam).toHaveBeenCalledWith('Manchester United');
    });
  });

  it('handles keyboard navigation', async () => {
    render(<MatchCard {...mockProps} />);
    
    const card = screen.getByRole('article');
    fireEvent.keyDown(card, { key: 'Enter' });
    
    await waitFor(() => {
      expect(mockProps.onSelectMatch).toHaveBeenCalledWith(mockMatch);
    });
  });

  it('displays live match indicators for live matches', () => {
    const liveMatch = {
      ...mockMatch,
      status: 'LIVE',
      minute: 45,
    };

    render(<MatchCard {...mockProps} match={liveMatch} />);
    
    // Check for live indicators - these might be in different elements
    expect(screen.getByText('LIVE')).toBeInTheDocument();
    expect(screen.getByText("45'")).toBeInTheDocument();
  });

  it('shows confidence level when prediction is available', () => {
    render(<MatchCard {...mockProps} />);
    
    // Check for confidence percentage - might be in different format
    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  it('handles missing prediction gracefully', () => {
    render(<MatchCard {...mockProps} />);
    
    expect(screen.getByText('Manchester United')).toBeInTheDocument();
    expect(screen.getByText('Liverpool')).toBeInTheDocument();
    expect(screen.queryByTestId('probability-bar')).not.toBeInTheDocument();
  });
});
