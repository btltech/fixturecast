import { describe, it, expect, vi, beforeEach } from 'vitest';
import { realTimeDataService } from '../services/realTimeDataService';
import { Match, League } from '../types';

// Mock the football API service
vi.mock('../services/footballApiService', () => ({
  getTeamStats: vi.fn(),
  getInjuries: vi.fn(),
  getHeadToHead: vi.fn(),
  getRecentTeamForm: vi.fn(),
  getTeamDetails: vi.fn(),
  getApiUsage: vi.fn(() => ({ totalCalls: 100, callsToday: 50 })),
  hasBudget: vi.fn(() => true)
}));

describe('RealTimeDataService', () => {
  const mockMatch: Match = {
    id: 'test-match-1',
    homeTeam: 'Manchester United',
    awayTeam: 'Arsenal',
    homeTeamId: 33,
    awayTeamId: 42,
    league: 'Premier League' as League,
    date: '2025-01-15T15:30:00Z',
    status: 'TBD',
    homeScore: undefined,
    awayScore: undefined
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('gatherEnhancedContext', () => {
    it('should gather comprehensive real-time data when API budget is available', async () => {
      const mockTeamStats = {
        response: [{
          fixtures: { played: { total: 20 } },
          goals: { 
            for: { total: { total: 35 } },
            against: { total: { total: 15 } }
          },
          clean_sheet: { total: 8 },
          failed_to_score: { total: 2 }
        }]
      };

      const mockInjuries = [
        {
          player: { name: 'Marcus Rashford', position: 'Attacker' },
          reason: 'Muscle injury',
          type: 'injury'
        }
      ];

      const mockH2H = [
        {
          teams: { home: { id: 33 }, away: { id: 42 } },
          goals: { home: 2, away: 1 }
        },
        {
          teams: { home: { id: 42 }, away: { id: 33 } },
          goals: { home: 1, away: 1 }
        }
      ];

      const mockForm = ['W', 'L', 'W', 'D', 'W'];

      // Mock API responses
      const { getTeamStats, getInjuries, getHeadToHead, getRecentTeamForm, getTeamDetails } = await import('../services/footballApiService');
      
      vi.mocked(getTeamDetails).mockResolvedValueOnce({ id: 33, name: 'Manchester United' } as any);
      vi.mocked(getTeamDetails).mockResolvedValueOnce({ id: 42, name: 'Arsenal' } as any);
      
      vi.mocked(getTeamStats).mockResolvedValue(mockTeamStats);
      vi.mocked(getInjuries).mockResolvedValue(mockInjuries);
      vi.mocked(getHeadToHead).mockResolvedValue(mockH2H);
      vi.mocked(getRecentTeamForm).mockResolvedValue(mockForm as any);

      const result = await realTimeDataService.gatherEnhancedContext(mockMatch);

      // Verify data structure
      expect(result).toHaveProperty('homeTeamDetailedStats');
      expect(result).toHaveProperty('awayTeamDetailedStats');
      expect(result).toHaveProperty('homeTeamAbsences');
      expect(result).toHaveProperty('awayTeamAbsences');
      expect(result).toHaveProperty('historicalMatchups');
      expect(result).toHaveProperty('formAnalysis');
      expect(result).toHaveProperty('contextualFactors');
      expect(result).toHaveProperty('dataQuality');

      // Verify data quality assessment
      expect(result.dataQuality.overall).toBeGreaterThan(70);
      expect(result.dataQuality.statsAvailability).toBe(100);

      // Verify team stats processing
      expect(result.homeTeamDetailedStats.averageGoalsScored).toBeCloseTo(1.75, 1);
      expect(result.homeTeamDetailedStats.averageGoalsConceded).toBeCloseTo(0.75, 1);
      expect(result.homeTeamDetailedStats.cleanSheets).toBe(8);

      // Verify injury impact assessment
      expect(result.homeTeamAbsences.keyPlayersOut).toHaveLength(1);
      expect(result.homeTeamAbsences.keyPlayersOut[0].name).toBe('Marcus Rashford');
      expect(result.homeTeamAbsences.totalImpactScore).toBeGreaterThan(0);

      // Verify head-to-head analysis
      expect(result.historicalMatchups.totalGames).toBe(2);
      expect(result.historicalMatchups.bttsPercentage).toBe(50);

      // Verify form analysis
      expect(result.formAnalysis.homeTeamMomentum.last5Games).toHaveLength(5);
      expect(result.formAnalysis.homeTeamMomentum.points).toBe(10); // 3W + 1D = 10 points
      expect(result.formAnalysis.homeTeamMomentum.trend).toBe('improving');
    });

    it('should handle API failures gracefully and return fallback context', async () => {
      const { hasBudget } = await import('../services/footballApiService');
      vi.mocked(hasBudget).mockReturnValue(false);

      const result = await realTimeDataService.gatherEnhancedContext(mockMatch);

      expect(result.dataQuality.overall).toBe(20);
      expect(result.homeTeamDetailedStats.attackStrength).toBe(0);
      expect(result.awayTeamDetailedStats.attackStrength).toBe(0);
      expect(result.homeTeamAbsences.keyPlayersOut).toHaveLength(0);
      expect(result.historicalMatchups.totalGames).toBe(0);
    });

    it('should correctly assess player importance for injury impact', async () => {
      const mockInjuries = [
        {
          player: { name: 'David de Gea', position: 'Goalkeeper' },
          reason: 'Finger injury',
          type: 'injury'
        },
        {
          player: { name: 'Harry Maguire', position: 'Defender' },
          reason: 'Calf strain',
          type: 'injury'  
        },
        {
          player: { name: 'Bench Player', position: 'Midfielder' },
          reason: 'Minor knock',
          type: 'injury'
        }
      ];

      const { getTeamStats, getInjuries, getHeadToHead, getRecentTeamForm, getTeamDetails, hasBudget } = await import('../services/footballApiService');
      
      vi.mocked(hasBudget).mockReturnValue(true);
      vi.mocked(getTeamDetails).mockResolvedValue({ id: 33, name: 'Test Team' } as any);
      vi.mocked(getTeamStats).mockResolvedValue({});
      vi.mocked(getInjuries).mockResolvedValue(mockInjuries);
      vi.mocked(getHeadToHead).mockResolvedValue([]);
      vi.mocked(getRecentTeamForm).mockResolvedValue([]);

      const result = await realTimeDataService.gatherEnhancedContext(mockMatch);

      const homeAbsences = result.homeTeamAbsences;
      
      // Find the goalkeeper injury
      const goalkeeperInjury = homeAbsences.keyPlayersOut.find(p => p.name === 'David de Gea');
      expect(goalkeeperInjury?.importance).toBe('critical');
      
      // Find the defender injury
      const defenderInjury = homeAbsences.keyPlayersOut.find(p => p.name === 'Harry Maguire');
      expect(defenderInjury?.importance).toBe('important');
      
      // Verify total impact score reflects severity
      expect(homeAbsences.totalImpactScore).toBeGreaterThan(40); // Critical + Important players
    });

    it('should analyze head-to-head statistics correctly', async () => {
      const mockH2HExtensive = [
        { teams: { home: { id: 33 }, away: { id: 42 } }, goals: { home: 3, away: 1 } }, // Home win, BTTS
        { teams: { home: { id: 42 }, away: { id: 33 } }, goals: { home: 0, away: 2 } }, // Away win, no BTTS
        { teams: { home: { id: 33 }, away: { id: 42 } }, goals: { home: 1, away: 1 } }, // Draw, BTTS
        { teams: { home: { id: 42 }, away: { id: 33 } }, goals: { home: 2, away: 0 } }, // Away win, no BTTS
        { teams: { home: { id: 33 }, away: { id: 42 } }, goals: { home: 4, away: 2 } }  // Home win, BTTS, over 2.5
      ];

      const { getTeamStats, getInjuries, getHeadToHead, getRecentTeamForm, getTeamDetails, hasBudget } = await import('../services/footballApiService');
      
      vi.mocked(hasBudget).mockReturnValue(true);
      vi.mocked(getTeamDetails).mockResolvedValueOnce({ id: 33, name: 'Team A' } as any);
      vi.mocked(getTeamDetails).mockResolvedValueOnce({ id: 42, name: 'Team B' } as any);
      vi.mocked(getTeamStats).mockResolvedValue({});
      vi.mocked(getInjuries).mockResolvedValue([]);
      vi.mocked(getHeadToHead).mockResolvedValue(mockH2HExtensive);
      vi.mocked(getRecentTeamForm).mockResolvedValue([]);

      const result = await realTimeDataService.gatherEnhancedContext(mockMatch);

      const h2h = result.historicalMatchups;
      
      expect(h2h.totalGames).toBe(5);
      expect(h2h.homeTeamWins).toBe(2);
      expect(h2h.draws).toBe(1);
      expect(h2h.awayTeamWins).toBe(2);
      expect(h2h.bttsPercentage).toBe(60); // 3 out of 5 games
      expect(h2h.over25Percentage).toBe(80); // 4 out of 5 games
      expect(h2h.homeTeamWinPercentage).toBe(40);
      expect(h2h.highScoringTendency).toBe(true);
    });

    it('should calculate form momentum and trends accurately', async () => {
      const improvingForm = ['L', 'L', 'D', 'W', 'W']; // Getting better
      const decliningForm = ['W', 'W', 'D', 'L', 'L']; // Getting worse
      const stableForm = ['W', 'D', 'W', 'D', 'W']; // Consistent

      const { getTeamStats, getInjuries, getHeadToHead, getRecentTeamForm, getTeamDetails, hasBudget } = await import('../services/footballApiService');
      
      vi.mocked(hasBudget).mockReturnValue(true);
      vi.mocked(getTeamDetails).mockResolvedValueOnce({ id: 33, name: 'Team A' } as any);
      vi.mocked(getTeamDetails).mockResolvedValueOnce({ id: 42, name: 'Team B' } as any);
      vi.mocked(getTeamStats).mockResolvedValue({});
      vi.mocked(getInjuries).mockResolvedValue([]);
      vi.mocked(getHeadToHead).mockResolvedValue([]);
      vi.mocked(getRecentTeamForm)
        .mockResolvedValueOnce(improvingForm as any)
        .mockResolvedValueOnce(decliningForm as any);

      const result = await realTimeDataService.gatherEnhancedContext(mockMatch);

      expect(result.formAnalysis.homeTeamMomentum.trend).toBe('improving');
      expect(result.formAnalysis.homeTeamMomentum.points).toBe(7); // 2W + 1D = 7 points
      expect(result.formAnalysis.homeTeamMomentum.momentumScore).toBeGreaterThan(50);

      expect(result.formAnalysis.awayTeamMomentum.trend).toBe('declining');  
      expect(result.formAnalysis.awayTeamMomentum.points).toBe(7); // 2W + 1D = 7 points
      expect(result.formAnalysis.awayTeamMomentum.momentumScore).toBeLessThan(50);
    });
  });

  describe('formatForPrompt', () => {
    it('should format enhanced context for AI prompt correctly', () => {
      const mockContext = {
        homeTeamDetailedStats: {
          attackStrength: 8.5,
          defenseStrength: 7.2,
          averageGoalsScored: 2.1,
          averageGoalsConceded: 0.8,
          cleanSheets: 12,
          homeAdvantage: 65
        },
        awayTeamDetailedStats: {
          attackStrength: 7.8,
          defenseStrength: 6.9,
          averageGoalsScored: 1.9,
          averageGoalsConceded: 1.1,
          cleanSheets: 8,
          awayForm: 55
        },
        homeTeamAbsences: {
          keyPlayersOut: [{ name: 'Test Player', position: 'Forward', importance: 'important' as const, reason: 'Injury' }],
          totalImpactScore: 20,
          defensiveImpact: 0,
          attackingImpact: 20
        },
        awayTeamAbsences: {
          keyPlayersOut: [],
          totalImpactScore: 0,
          defensiveImpact: 0,
          attackingImpact: 0
        },
        historicalMatchups: {
          totalGames: 10,
          homeTeamWinPercentage: 50,
          bttsPercentage: 60,
          over25Percentage: 70,
          averageHomeGoals: 1.8,
          averageAwayGoals: 1.3,
          homeTeamWins: 0,
          draws: 0,
          awayTeamWins: 0,
          recentFormH2H: [],
          goalVariance: 0,
          highScoringTendency: false
        },
        formAnalysis: {
          homeTeamMomentum: {
            trend: 'improving' as const,
            points: 12,
            last5Games: [],
            goalsScored: 0,
            goalsConceded: 0,
            momentumScore: 0
          },
          awayTeamMomentum: {
            trend: 'declining' as const,
            points: 8,
            last5Games: [],
            goalsScored: 0,
            goalsConceded: 0,
            momentumScore: 0
          }
        },
        contextualFactors: {
          restDays: { homeTeam: 0, awayTeam: 0, advantage: 'neutral' as const },
          motivation: {
            homeTeamMotivation: 'high' as const,
            awayTeamMotivation: 'medium' as const,
            homeReasons: [],
            awayReasons: []
          },
          pressureSituation: { level: 'medium' as const, factors: [] }
        },
        dataQuality: {
          overall: 85,
          statsAvailability: 100,
          injuryDataFreshness: 90,
          formDataCompleteness: 100,
          historicalDataDepth: 100
        }
      } as any;

      const formatted = realTimeDataService.formatForPrompt(mockContext);

      expect(formatted).toContain('ENHANCED REAL-TIME DATA ANALYSIS');
      expect(formatted).toContain('Quality Score: 85%');
      expect(formatted).toContain('Home Attack Strength: 8.5/10');
      expect(formatted).toContain('Away Defense Strength: 6.9/10');
      expect(formatted).toContain('Home Team Impact Score: 20');
      expect(formatted).toContain('Head-to-Head Analysis (10 games)');
      expect(formatted).toContain('Home Win Rate: 50.0%');
      expect(formatted).toContain('improving (12/15 pts in last 5)');
      expect(formatted).toContain('declining (8/15 pts in last 5)');
    });

    it('should include data quality warnings for low quality data', () => {
      const mockLowQualityContext = {
        dataQuality: { overall: 45 }
      } as any;

      const formatted = realTimeDataService.formatForPrompt(mockLowQualityContext);

      expect(formatted).toContain('⚠️ Data Quality Notice');
      expect(formatted).toContain('45% complete');
      expect(formatted).toContain('adjusted for uncertainty');
    });
  });

  describe('getApiUsageStats', () => {
    it('should return comprehensive API usage statistics', () => {
      const stats = realTimeDataService.getApiUsageStats();

      expect(stats).toHaveProperty('totalCalls');
      expect(stats).toHaveProperty('callsToday');
      expect(stats).toHaveProperty('enhancedDataCalls');
      expect(stats).toHaveProperty('maxCallsPerPrediction');
      expect(typeof stats.enhancedDataCalls).toBe('number');
      expect(typeof stats.maxCallsPerPrediction).toBe('number');
    });
  });
});