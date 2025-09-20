import { Match } from '../types';

// Real-time match status types
export type MatchStatus = 'live' | 'ht' | 'ft' | 'upcoming' | 'postponed' | 'cancelled';

export interface LiveMatchData {
  matchId: string;
  status: MatchStatus;
  minute?: number;
  homeScore?: number;
  awayScore?: number;
  isLive: boolean;
  lastUpdated: string;
  events?: MatchEvent[];
}

export interface MatchEvent {
  id: string;
  type: 'goal' | 'card' | 'substitution' | 'var';
  minute: number;
  team: 'home' | 'away';
  player: string;
  description: string;
  timestamp: string;
}

export interface TVBroadcast {
  broadcaster: string;
  channel: string;
  country: string;
  language: string;
  isLive: boolean;
  startTime?: string;
  endTime?: string;
}

export interface StreamingInfo {
  platform: string;
  url?: string;
  isFree: boolean;
  requiresSubscription: boolean;
  country: string;
}

export interface MatchContext {
  matchId: string;
  venue: {
    name: string;
    city: string;
    capacity: number;
    weather: string;
    temperature: number;
    timezone: string;
  };
  broadcasters: TVBroadcast[];
  streaming: StreamingInfo[];
  tickets: {
    available: boolean;
    priceRange: { min: number; max: number };
    currency: string;
    officialSeller: string;
    lastUpdated: string;
  };
  lineups: {
    home: TeamLineup;
    away: TeamLineup;
  };
  form: {
    home: TeamForm;
    away: TeamForm;
  };
  headToHead: {
    last5: string[];
    homeAdvantage: boolean;
    averageGoals: number;
  };
}

export interface TeamLineup {
  formation: string;
  keyPlayers: string[];
  missing: string[];
  captain?: string;
  goalkeeper?: string;
}

export interface TeamForm {
  last5: string[];
  homeRecord?: string;
  awayRecord?: string;
  goalsFor: number;
  goalsAgainst: number;
  cleanSheets: number;
  wins: number;
  draws: number;
  losses: number;
}

class RealTimeService {
  private liveMatches: Map<string, LiveMatchData> = new Map();
  private matchContexts: Map<string, MatchContext> = new Map();
  private updateInterval: NodeJS.Timeout | null = null;
  private listeners: Set<(matches: LiveMatchData[]) => void> = new Set();

  constructor() {
    this.startRealTimeUpdates();
  }

  // Start real-time updates
  private startRealTimeUpdates() {
    // Update every 30 seconds
    this.updateInterval = setInterval(() => {
      this.updateLiveMatches();
    }, 30000);

    // Initial update
    this.updateLiveMatches();
  }

  // Update live matches data
  private async updateLiveMatches() {
    try {
      // Simulate fetching live data (replace with actual API calls)
      const liveData = await this.fetchLiveMatchData();
      
      // Update internal state
      liveData.forEach(match => {
        this.liveMatches.set(match.matchId, match);
      });

      // Notify listeners
      this.notifyListeners();
    } catch (error) {
      console.error('Failed to update live matches:', error);
    }
  }

  // Simulate fetching live match data
  private async fetchLiveMatchData(): Promise<LiveMatchData[]> {
    // This would be replaced with actual API calls
    const now = new Date();
    const liveMatches: LiveMatchData[] = [];

    // Simulate some live matches
    const mockLiveMatches = [
      {
        matchId: 'live-1',
        status: 'live' as MatchStatus,
        minute: Math.floor(Math.random() * 90) + 1,
        homeScore: Math.floor(Math.random() * 3),
        awayScore: Math.floor(Math.random() * 3),
        isLive: true,
        lastUpdated: now.toISOString(),
        events: this.generateMockEvents()
      },
      {
        matchId: 'live-2',
        status: 'ht' as MatchStatus,
        minute: 45,
        homeScore: Math.floor(Math.random() * 2),
        awayScore: Math.floor(Math.random() * 2),
        isLive: true,
        lastUpdated: now.toISOString(),
        events: this.generateMockEvents()
      }
    ];

    return mockLiveMatches;
  }

  // Generate mock match events
  private generateMockEvents(): MatchEvent[] {
    const events: MatchEvent[] = [];
    const eventTypes: MatchEvent['type'][] = ['goal', 'card', 'substitution', 'var'];
    const players = ['Player A', 'Player B', 'Player C', 'Player D'];

    for (let i = 0; i < Math.floor(Math.random() * 5) + 1; i++) {
      events.push({
        id: `event-${i}`,
        type: eventTypes[Math.floor(Math.random() * eventTypes.length)],
        minute: Math.floor(Math.random() * 90) + 1,
        team: Math.random() > 0.5 ? 'home' : 'away',
        player: players[Math.floor(Math.random() * players.length)],
        description: this.generateEventDescription(eventTypes[Math.floor(Math.random() * eventTypes.length)]),
        timestamp: new Date().toISOString()
      });
    }

    return events.sort((a, b) => a.minute - b.minute);
  }

  // Generate event description
  private generateEventDescription(type: MatchEvent['type']): string {
    const descriptions = {
      goal: 'Goal scored!',
      card: 'Yellow card shown',
      substitution: 'Substitution made',
      var: 'VAR check in progress'
    };
    return descriptions[type];
  }

  // Get live matches
  getLiveMatches(): LiveMatchData[] {
    return Array.from(this.liveMatches.values());
  }

  // Get live match by ID
  getLiveMatch(matchId: string): LiveMatchData | undefined {
    return this.liveMatches.get(matchId);
  }

  // Check if match is live
  isMatchLive(matchId: string): boolean {
    const match = this.liveMatches.get(matchId);
    return match?.isLive || false;
  }

  // Get match context (venue, TV, tickets, etc.)
  async getMatchContext(matchId: string): Promise<MatchContext | null> {
    // Check if we have cached context
    if (this.matchContexts.has(matchId)) {
      return this.matchContexts.get(matchId)!;
    }

    try {
      // Fetch context data (replace with actual API calls)
      const context = await this.fetchMatchContext(matchId);
      this.matchContexts.set(matchId, context);
      return context;
    } catch (error) {
      console.error('Failed to fetch match context:', error);
      return null;
    }
  }

  // Simulate fetching match context
  private async fetchMatchContext(matchId: string): Promise<MatchContext> {
    // This would be replaced with actual API calls
    return {
      matchId,
      venue: {
        name: "Stadium Name",
        city: "City",
        capacity: Math.floor(Math.random() * 50000) + 20000,
        weather: "Sunny",
        temperature: Math.floor(Math.random() * 15) + 15,
        timezone: "UTC+1"
      },
      broadcasters: [
        {
          broadcaster: "Sky Sports",
          channel: "Sky Sports Premier League",
          country: "UK",
          language: "English",
          isLive: true,
          startTime: new Date().toISOString(),
          endTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
        },
        {
          broadcaster: "ESPN",
          channel: "ESPN+",
          country: "US",
          language: "English",
          isLive: true
        }
      ],
      streaming: [
        {
          platform: "Peacock",
          url: "https://peacock.tv",
          isFree: false,
          requiresSubscription: true,
          country: "US"
        },
        {
          platform: "DAZN",
          url: "https://dazn.com",
          isFree: false,
          requiresSubscription: true,
          country: "Global"
        }
      ],
      tickets: {
        available: Math.random() > 0.3,
        priceRange: { min: 25, max: 150 },
        currency: "GBP",
        officialSeller: "Stadium Direct",
        lastUpdated: new Date().toISOString()
      },
      lineups: {
        home: {
          formation: "4-3-3",
          keyPlayers: ["Player 1", "Player 2", "Player 3"],
          missing: ["Injured Player"],
          captain: "Captain A",
          goalkeeper: "Goalkeeper A"
        },
        away: {
          formation: "4-4-2",
          keyPlayers: ["Player A", "Player B", "Player C"],
          missing: ["Injured Player A"],
          captain: "Captain B",
          goalkeeper: "Goalkeeper B"
        }
      },
      form: {
        home: {
          last5: ["W", "D", "W", "L", "W"],
          homeRecord: "8W-2D-1L",
          goalsFor: 24,
          goalsAgainst: 12,
          cleanSheets: 5,
          wins: 8,
          draws: 2,
          losses: 1
        },
        away: {
          last5: ["L", "W", "D", "W", "D"],
          awayRecord: "5W-4D-2L",
          goalsFor: 18,
          goalsAgainst: 15,
          cleanSheets: 3,
          wins: 5,
          draws: 4,
          losses: 2
        }
      },
      headToHead: {
        last5: ["W", "D", "L", "W", "D"],
        homeAdvantage: true,
        averageGoals: 2.8
      }
    };
  }

  // Subscribe to live updates
  subscribe(listener: (matches: LiveMatchData[]) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // Notify all listeners
  private notifyListeners() {
    const matches = this.getLiveMatches();
    this.listeners.forEach(listener => {
      try {
        listener(matches);
      } catch (error) {
        console.error('Error in live match listener:', error);
      }
    });
  }

  // Get TV broadcasters for a match
  async getTVBroadcasters(matchId: string): Promise<TVBroadcast[]> {
    const context = await this.getMatchContext(matchId);
    return context?.broadcasters || [];
  }

  // Get streaming options for a match
  async getStreamingOptions(matchId: string): Promise<StreamingInfo[]> {
    const context = await this.getMatchContext(matchId);
    return context?.streaming || [];
  }

  // Get ticket information for a match
  async getTicketInfo(matchId: string) {
    const context = await this.getMatchContext(matchId);
    return context?.tickets || null;
  }

  // Cleanup
  destroy() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    this.listeners.clear();
    this.liveMatches.clear();
    this.matchContexts.clear();
  }
}

// Export singleton instance
export const realTimeService = new RealTimeService();
