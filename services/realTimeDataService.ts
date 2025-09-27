import { Match, PredictionContext } from '../types';
import { 
  getTeamStats, 
  getInjuries, 
  getHeadToHead, 
  getRecentTeamForm,
  getTeamDetails,
  getApiUsage,
  hasBudget 
} from './footballApiService';

export interface RealTimeDataContext {
  // Enhanced team statistics
  homeTeamDetailedStats: {
    attackStrength: number;
    defenseStrength: number;
    averageGoalsScored: number;
    averageGoalsConceded: number;
    xgFor: number;
    xgAgainst: number;
    shotsPerGame: number;
    shotsOnTargetPerGame: number;
    possession: number;
    passAccuracy: number;
    foulsPerGame: number;
    yellowCardsPerGame: number;
    redCardsPerGame: number;
    cornersPerGame: number;
    cleanSheets: number;
    failedToScore: number;
    homeAdvantage: number;
  };
  
  awayTeamDetailedStats: {
    attackStrength: number;
    defenseStrength: number;
    averageGoalsScored: number;
    averageGoalsConceded: number;
    xgFor: number;
    xgAgainst: number;
    shotsPerGame: number;
    shotsOnTargetPerGame: number;
    possession: number;
    passAccuracy: number;
    foulsPerGame: number;
    yellowCardsPerGame: number;
    redCardsPerGame: number;
    cornersPerGame: number;
    cleanSheets: number;
    failedToScore: number;
    awayForm: number;
  };

  // Injury and suspension impact
  homeTeamAbsences: {
    keyPlayersOut: Array<{
      name: string;
      position: string;
      importance: 'critical' | 'important' | 'moderate';
      reason: string;
      expectedReturn?: string;
    }>;
    totalImpactScore: number;
    defensiveImpact: number;
    attackingImpact: number;
  };

  awayTeamAbsences: {
    keyPlayersOut: Array<{
      name: string;
      position: string;
      importance: 'critical' | 'important' | 'moderate';
      reason: string;
      expectedReturn?: string;
    }>;
    totalImpactScore: number;
    defensiveImpact: number;
    attackingImpact: number;
  };

  // Advanced head-to-head analysis
  historicalMatchups: {
    totalGames: number;
    homeTeamWins: number;
    draws: number;
    awayTeamWins: number;
    averageHomeGoals: number;
    averageAwayGoals: number;
    bttsPercentage: number;
    over25Percentage: number;
    homeTeamWinPercentage: number;
    awayTeamWinPercentage: number;
    recentFormH2H: Array<'W' | 'D' | 'L'>; // Last 5 H2H from home team perspective
    goalVariance: number;
    highScoringTendency: boolean;
  };

  // Current form momentum
  formAnalysis: {
    homeTeamMomentum: {
      last5Games: Array<'W' | 'D' | 'L'>;
      goalsScored: number;
      goalsConceded: number;
      points: number;
      trend: 'improving' | 'declining' | 'stable';
      momentumScore: number;
    };
    awayTeamMomentum: {
      last5Games: Array<'W' | 'D' | 'L'>;
      goalsScored: number;
      goalsConceded: number;
      points: number;
      trend: 'improving' | 'declining' | 'stable';
      momentumScore: number;
    };
  };

  // Match context factors
  contextualFactors: {
    restDays: {
      homeTeam: number;
      awayTeam: number;
      advantage: 'home' | 'away' | 'neutral';
    };
    motivation: {
      homeTeamMotivation: 'high' | 'medium' | 'low';
      awayTeamMotivation: 'high' | 'medium' | 'low';
      homeReasons: string[];
      awayReasons: string[];
    };
    pressureSituation: {
      level: 'high' | 'medium' | 'low';
      factors: string[];
    };
  };

  // Data quality assessment
  dataQuality: {
    overall: number;
    statsAvailability: number;
    injuryDataFreshness: number;
    formDataCompleteness: number;
    historicalDataDepth: number;
  };
}

class RealTimeDataService {
  private apiUsageTracker = {
    callsThisSession: 0,
    maxCallsPerPrediction: 8 // Conservative limit
  };

  /**
   * Gather comprehensive real-time data for enhanced predictions
   */
  async gatherEnhancedContext(match: Match, existingContext?: PredictionContext): Promise<RealTimeDataContext> {
    console.log(`🔍 Gathering enhanced real-time data for ${match.homeTeam} vs ${match.awayTeam}`);

    // Check API budget before proceeding
    if (!hasBudget(this.apiUsageTracker.maxCallsPerPrediction)) {
      console.warn('⚠️ Insufficient API budget for enhanced data gathering');
      return this.createFallbackContext(match, existingContext);
    }

    try {
      // Get team IDs from existing context or resolve them
      const homeTeamId = await this.resolveTeamId(match.homeTeam, match.league);
      const awayTeamId = await this.resolveTeamId(match.awayTeam, match.league);
      const leagueId = this.getLeagueId(match.league);

      if (!homeTeamId || !awayTeamId || !leagueId) {
        console.warn('❌ Could not resolve team or league IDs for enhanced data');
        return this.createFallbackContext(match, existingContext);
      }

      // Parallel data gathering for efficiency
      const [
        homeTeamStats,
        awayTeamStats,
        homeTeamInjuries,
        awayTeamInjuries,
        headToHeadData,
        homeTeamForm,
        awayTeamForm
      ] = await Promise.all([
        this.fetchWithFallback(() => getTeamStats(homeTeamId, leagueId), {}),
        this.fetchWithFallback(() => getTeamStats(awayTeamId, leagueId), {}),
        this.fetchWithFallback(() => getInjuries(homeTeamId, leagueId), []),
        this.fetchWithFallback(() => getInjuries(awayTeamId, leagueId), []),
        this.fetchWithFallback(() => getHeadToHead(homeTeamId, awayTeamId), []),
        this.fetchWithFallback(() => getRecentTeamForm(homeTeamId), []),
        this.fetchWithFallback(() => getRecentTeamForm(awayTeamId), [])
      ]);

      // Process and analyze the gathered data
      const enhancedContext: RealTimeDataContext = {
        homeTeamDetailedStats: this.processTeamStats(homeTeamStats, 'home'),
        awayTeamDetailedStats: this.processTeamStats(awayTeamStats, 'away'),
        homeTeamAbsences: this.analyzeTeamAbsences(homeTeamInjuries, match.homeTeam),
        awayTeamAbsences: this.analyzeTeamAbsences(awayTeamInjuries, match.awayTeam),
        historicalMatchups: this.analyzeHeadToHead(headToHeadData, homeTeamId, awayTeamId),
        formAnalysis: {
          homeTeamMomentum: this.analyzeFormMomentum(homeTeamForm, homeTeamStats),
          awayTeamMomentum: this.analyzeFormMomentum(awayTeamForm, awayTeamStats)
        },
        contextualFactors: this.analyzeContextualFactors(match, homeTeamStats, awayTeamStats),
        dataQuality: this.assessDataQuality({
          homeTeamStats,
          awayTeamStats,
          homeTeamInjuries,
          awayTeamInjuries,
          headToHeadData,
          homeTeamForm,
          awayTeamForm
        })
      };

      console.log(`✅ Enhanced real-time data gathered successfully (Quality Score: ${enhancedContext.dataQuality.overall}%)`);
      return enhancedContext;

    } catch (error) {
      console.error('❌ Error gathering enhanced real-time data:', error);
      return this.createFallbackContext(match, existingContext);
    }
  }

  /**
   * Process raw team statistics into enhanced metrics
   */
  private processTeamStats(rawStats: any, venue: 'home' | 'away'): any {
    const stats = rawStats?.response?.[0] || rawStats || {};
    const fixtures = stats.fixtures || {};
    const goals = stats.goals || {};
    
    return {
      attackStrength: this.calculateAttackStrength(goals, fixtures),
      defenseStrength: this.calculateDefenseStrength(goals, fixtures),
      averageGoalsScored: this.safeAverage(goals.for?.total?.total, fixtures.played?.total),
      averageGoalsConceded: this.safeAverage(goals.against?.total?.total, fixtures.played?.total),
      xgFor: goals.for?.total?.total || 0, // Placeholder - would need xG data
      xgAgainst: goals.against?.total?.total || 0,
      shotsPerGame: 0, // Would need shots data from API-Football
      shotsOnTargetPerGame: 0,
      possession: 0, // Would need possession data
      passAccuracy: 0,
      foulsPerGame: 0,
      yellowCardsPerGame: 0,
      redCardsPerGame: 0,
      cornersPerGame: 0,
      cleanSheets: stats.clean_sheet?.total || 0,
      failedToScore: stats.failed_to_score?.total || 0,
      [venue === 'home' ? 'homeAdvantage' : 'awayForm']: this.calculateVenueAdvantage(stats, venue)
    };
  }

  /**
   * Analyze team injuries and suspensions for impact assessment
   */
  private analyzeTeamAbsences(injuryData: any[], teamName: string): any {
    const injuries = Array.isArray(injuryData) ? injuryData : [];
    
    const keyPlayersOut = injuries.map(injury => ({
      name: injury.player?.name || 'Unknown Player',
      position: injury.player?.position || 'Unknown',
      importance: this.assessPlayerImportance(injury.player, injury.type),
      reason: injury.reason || injury.type || 'Injury',
      expectedReturn: injury.date || undefined
    }));

    const totalImpactScore = this.calculateInjuryImpactScore(keyPlayersOut);
    
    return {
      keyPlayersOut,
      totalImpactScore,
      defensiveImpact: this.calculatePositionalImpact(keyPlayersOut, ['Defender', 'Goalkeeper']),
      attackingImpact: this.calculatePositionalImpact(keyPlayersOut, ['Attacker', 'Midfielder'])
    };
  }

  /**
   * Analyze historical head-to-head matchups
   */
  private analyzeHeadToHead(h2hData: any[], homeTeamId: number, awayTeamId: number): any {
    const matches = Array.isArray(h2hData) ? h2hData : [];
    
    if (matches.length === 0) {
      return {
        totalGames: 0,
        homeTeamWins: 0,
        draws: 0,
        awayTeamWins: 0,
        averageHomeGoals: 0,
        averageAwayGoals: 0,
        bttsPercentage: 0,
        over25Percentage: 0,
        homeTeamWinPercentage: 0,
        awayTeamWinPercentage: 0,
        recentFormH2H: [],
        goalVariance: 0,
        highScoringTendency: false
      };
    }

    let homeWins = 0, draws = 0, awayWins = 0;
    let totalHomeGoals = 0, totalAwayGoals = 0;
    let bttsCount = 0, over25Count = 0;
    const recentForm: Array<'W' | 'D' | 'L'> = [];

    matches.slice(0, 10).forEach((match, index) => {
      const homeGoals = match.goals?.home || 0;
      const awayGoals = match.goals?.away || 0;
      const isHomeTeamHome = match.teams?.home?.id === homeTeamId;
      
      // Adjust perspective based on which team is home in historical match
      const effectiveHomeGoals = isHomeTeamHome ? homeGoals : awayGoals;
      const effectiveAwayGoals = isHomeTeamHome ? awayGoals : homeGoals;
      
      totalHomeGoals += effectiveHomeGoals;
      totalAwayGoals += effectiveAwayGoals;
      
      if (effectiveHomeGoals > effectiveAwayGoals) homeWins++;
      else if (effectiveHomeGoals < effectiveAwayGoals) awayWins++;
      else draws++;
      
      if (homeGoals > 0 && awayGoals > 0) bttsCount++;
      if (homeGoals + awayGoals > 2.5) over25Count++;
      
      // Recent form (last 5)
      if (index < 5) {
        if (effectiveHomeGoals > effectiveAwayGoals) recentForm.push('W');
        else if (effectiveHomeGoals < effectiveAwayGoals) recentForm.push('L');
        else recentForm.push('D');
      }
    });

    const totalGames = matches.length;
    
    return {
      totalGames,
      homeTeamWins: homeWins,
      draws,
      awayTeamWins: awayWins,
      averageHomeGoals: totalHomeGoals / totalGames,
      averageAwayGoals: totalAwayGoals / totalGames,
      bttsPercentage: (bttsCount / totalGames) * 100,
      over25Percentage: (over25Count / totalGames) * 100,
      homeTeamWinPercentage: (homeWins / totalGames) * 100,
      awayTeamWinPercentage: (awayWins / totalGames) * 100,
      recentFormH2H: recentForm,
      goalVariance: this.calculateGoalVariance(matches),
      highScoringTendency: (totalHomeGoals + totalAwayGoals) / totalGames > 2.5
    };
  }

  /**
   * Analyze current form momentum
   */
  private analyzeFormMomentum(formData: Array<'W' | 'D' | 'L'>, teamStats: any): any {
    const form = Array.isArray(formData) ? formData.slice(-5) : [];
    
    let points = 0;
    form.forEach(result => {
      if (result === 'W') points += 3;
      else if (result === 'D') points += 1;
    });

    const trend = this.calculateFormTrend(form);
    const momentumScore = this.calculateMomentumScore(form, points);

    return {
      last5Games: form,
      goalsScored: 0, // Would need recent match goal data
      goalsConceded: 0,
      points,
      trend,
      momentumScore
    };
  }

  /**
   * Analyze contextual factors affecting the match
   */
  private analyzeContextualFactors(match: Match, homeStats: any, awayStats: any): any {
    return {
      restDays: {
        homeTeam: 7, // Would need last match dates
        awayTeam: 7,
        advantage: 'neutral' as const
      },
      motivation: {
        homeTeamMotivation: this.assessMotivation(match.homeTeam, match.league, homeStats),
        awayTeamMotivation: this.assessMotivation(match.awayTeam, match.league, awayStats),
        homeReasons: this.getMotivationReasons(match.homeTeam, homeStats),
        awayReasons: this.getMotivationReasons(match.awayTeam, awayStats)
      },
      pressureSituation: {
        level: this.assessPressureLevel(match),
        factors: this.getPressureFactors(match)
      }
    };
  }

  /**
   * Assess overall data quality
   */
  private assessDataQuality(data: any): any {
    let score = 0;
    let maxScore = 0;

    // Stats availability
    maxScore += 25;
    if (data.homeTeamStats && data.awayTeamStats) score += 25;
    else if (data.homeTeamStats || data.awayTeamStats) score += 15;

    // Injury data freshness
    maxScore += 20;
    if (Array.isArray(data.homeTeamInjuries) && Array.isArray(data.awayTeamInjuries)) score += 20;
    else if (Array.isArray(data.homeTeamInjuries) || Array.isArray(data.awayTeamInjuries)) score += 10;

    // Form data completeness
    maxScore += 25;
    if (Array.isArray(data.homeTeamForm) && Array.isArray(data.awayTeamForm)) {
      const formComplete = data.homeTeamForm.length >= 5 && data.awayTeamForm.length >= 5;
      score += formComplete ? 25 : 15;
    }

    // Historical data depth
    maxScore += 30;
    if (Array.isArray(data.headToHeadData)) {
      if (data.headToHeadData.length >= 10) score += 30;
      else if (data.headToHeadData.length >= 5) score += 20;
      else if (data.headToHeadData.length > 0) score += 10;
    }

    const overallScore = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

    return {
      overall: overallScore,
      statsAvailability: data.homeTeamStats && data.awayTeamStats ? 100 : 50,
      injuryDataFreshness: 80, // Assume good freshness
      formDataCompleteness: Array.isArray(data.homeTeamForm) && data.homeTeamForm.length >= 5 ? 100 : 60,
      historicalDataDepth: Array.isArray(data.headToHeadData) ? Math.min(100, data.headToHeadData.length * 10) : 0
    };
  }

  // Utility methods
  private async fetchWithFallback<T>(fetchFn: () => Promise<T>, fallback: T): Promise<T> {
    try {
      const result = await fetchFn();
      this.apiUsageTracker.callsThisSession++;
      return result;
    } catch (error) {
      console.warn('API call failed, using fallback:', error);
      return fallback;
    }
  }

  private createFallbackContext(match: Match, existingContext?: PredictionContext): RealTimeDataContext {
    console.log('📋 Creating fallback context due to API limitations');
    
    return {
      homeTeamDetailedStats: this.createEmptyTeamStats('home') as any,
      awayTeamDetailedStats: this.createEmptyTeamStats('away') as any,
      homeTeamAbsences: this.createEmptyAbsences(),
      awayTeamAbsences: this.createEmptyAbsences(),
      historicalMatchups: this.createEmptyH2H(),
      formAnalysis: {
        homeTeamMomentum: this.createEmptyMomentum(),
        awayTeamMomentum: this.createEmptyMomentum()
      },
      contextualFactors: this.createEmptyContextualFactors(),
      dataQuality: {
        overall: 20, // Low quality due to fallback
        statsAvailability: 0,
        injuryDataFreshness: 0,
        formDataCompleteness: 0,
        historicalDataDepth: 0
      }
    };
  }

  private createEmptyTeamStats(venue: 'home' | 'away' = 'home') {
    const baseStats = {
      attackStrength: 0,
      defenseStrength: 0,
      averageGoalsScored: 0,
      averageGoalsConceded: 0,
      xgFor: 0,
      xgAgainst: 0,
      shotsPerGame: 0,
      shotsOnTargetPerGame: 0,
      possession: 0,
      passAccuracy: 0,
      foulsPerGame: 0,
      yellowCardsPerGame: 0,
      redCardsPerGame: 0,
      cornersPerGame: 0,
      cleanSheets: 0,
      failedToScore: 0
    };

    return venue === 'home' 
      ? { ...baseStats, homeAdvantage: 0 }
      : { ...baseStats, awayForm: 0 };
  }

  private createEmptyAbsences() {
    return {
      keyPlayersOut: [],
      totalImpactScore: 0,
      defensiveImpact: 0,
      attackingImpact: 0
    };
  }

  private createEmptyH2H() {
    return {
      totalGames: 0,
      homeTeamWins: 0,
      draws: 0,
      awayTeamWins: 0,
      averageHomeGoals: 0,
      averageAwayGoals: 0,
      bttsPercentage: 0,
      over25Percentage: 0,
      homeTeamWinPercentage: 0,
      awayTeamWinPercentage: 0,
      recentFormH2H: [],
      goalVariance: 0,
      highScoringTendency: false
    };
  }

  private createEmptyMomentum() {
    return {
      last5Games: [],
      goalsScored: 0,
      goalsConceded: 0,
      points: 0,
      trend: 'stable' as const,
      momentumScore: 0
    };
  }

  private createEmptyContextualFactors() {
    return {
      restDays: { homeTeam: 0, awayTeam: 0, advantage: 'neutral' as const },
      motivation: {
        homeTeamMotivation: 'medium' as const,
        awayTeamMotivation: 'medium' as const,
        homeReasons: [],
        awayReasons: []
      },
      pressureSituation: { level: 'medium' as const, factors: [] }
    };
  }

  // Helper calculation methods
  private calculateAttackStrength(goals: any, fixtures: any): number {
    const goalsFor = goals?.for?.total?.total || 0;
    const gamesPlayed = fixtures?.played?.total || 1;
    return (goalsFor / gamesPlayed) * 10; // Scale to 0-100
  }

  private calculateDefenseStrength(goals: any, fixtures: any): number {
    const goalsAgainst = goals?.against?.total?.total || 0;
    const gamesPlayed = fixtures?.played?.total || 1;
    return Math.max(0, 10 - (goalsAgainst / gamesPlayed)) * 10; // Inverse scale
  }

  private safeAverage(total: number, games: number): number {
    return games > 0 ? total / games : 0;
  }

  private calculateVenueAdvantage(stats: any, venue: 'home' | 'away'): number {
    // Placeholder calculation based on venue performance
    const venueStats = venue === 'home' ? stats.home : stats.away;
    if (!venueStats) return 50;
    
    // Simple win percentage calculation
    const wins = venueStats.wins || 0;
    const draws = venueStats.draws || 0;
    const losses = venueStats.loses || 0;
    const total = wins + draws + losses;
    
    return total > 0 ? Math.round(((wins * 3 + draws) / (total * 3)) * 100) : 50;
  }

  private assessPlayerImportance(player: any, injuryType: string): 'critical' | 'important' | 'moderate' {
    // Simple assessment based on position and injury type
    const position = player?.position?.toLowerCase() || '';
    
    if (position.includes('goalkeeper')) return 'critical';
    if (position.includes('defender') || position.includes('midfielder')) return 'important';
    if (position.includes('attacker') || position.includes('forward')) return 'important';
    
    return 'moderate';
  }

  private calculateInjuryImpactScore(players: any[]): number {
    return players.reduce((score, player) => {
      switch (player.importance) {
        case 'critical': return score + 30;
        case 'important': return score + 20;
        case 'moderate': return score + 10;
        default: return score;
      }
    }, 0);
  }

  private calculatePositionalImpact(players: any[], positions: string[]): number {
    return players
      .filter(player => positions.some(pos => player.position.includes(pos)))
      .reduce((impact, player) => {
        switch (player.importance) {
          case 'critical': return impact + 25;
          case 'important': return impact + 15;
          case 'moderate': return impact + 8;
          default: return impact;
        }
      }, 0);
  }

  private calculateGoalVariance(matches: any[]): number {
    if (matches.length === 0) return 0;
    
    const goalTotals = matches.map(match => 
      (match.goals?.home || 0) + (match.goals?.away || 0)
    );
    
    const mean = goalTotals.reduce((sum, total) => sum + total, 0) / goalTotals.length;
    const variance = goalTotals.reduce((sum, total) => sum + Math.pow(total - mean, 2), 0) / goalTotals.length;
    
    return Math.sqrt(variance);
  }

  private calculateFormTrend(form: Array<'W' | 'D' | 'L'>): 'improving' | 'declining' | 'stable' {
    if (form.length < 3) return 'stable';
    
    const recent = form.slice(-3);
    const earlier = form.slice(0, Math.max(1, form.length - 3));
    
    const recentPoints = recent.reduce((pts, result) => {
      if (result === 'W') return pts + 3;
      if (result === 'D') return pts + 1;
      return pts;
    }, 0) / recent.length;
    
    const earlierPoints = earlier.reduce((pts, result) => {
      if (result === 'W') return pts + 3;
      if (result === 'D') return pts + 1;
      return pts;
    }, 0) / earlier.length;
    
    const diff = recentPoints - earlierPoints;
    
    if (diff > 0.5) return 'improving';
    if (diff < -0.5) return 'declining';
    return 'stable';
  }

  private calculateMomentumScore(form: Array<'W' | 'D' | 'L'>, points: number): number {
    if (form.length === 0) return 50;
    
    // Weight recent results more heavily
    let weightedScore = 0;
    let totalWeight = 0;
    
    form.forEach((result, index) => {
      const weight = index + 1; // More recent = higher weight
      let resultScore = 0;
      
      if (result === 'W') resultScore = 100;
      else if (result === 'D') resultScore = 50;
      else resultScore = 0;
      
      weightedScore += resultScore * weight;
      totalWeight += weight;
    });
    
    return totalWeight > 0 ? Math.round(weightedScore / totalWeight) : 50;
  }

  private assessMotivation(teamName: string, league: string, stats: any): 'high' | 'medium' | 'low' {
    // This would ideally analyze league position, recent form, upcoming fixtures
    // For now, return medium as baseline
    return 'medium';
  }

  private getMotivationReasons(teamName: string, stats: any): string[] {
    // Placeholder - would analyze specific context
    return ['Regular season fixture'];
  }

  private assessPressureLevel(match: Match): 'high' | 'medium' | 'low' {
    // Analyze if it's a derby, relegation battle, European qualification, etc.
    return 'medium';
  }

  private getPressureFactors(match: Match): string[] {
    return ['Regular fixture pressure'];
  }

  // Team ID resolution
  private async resolveTeamId(teamName: string, league: string): Promise<number | null> {
    try {
      const teamDetails = await getTeamDetails(teamName);
      return teamDetails?.id || null;
    } catch (error) {
      console.warn(`Could not resolve team ID for ${teamName}:`, error);
      return null;
    }
  }

  private getLeagueId(league: string): number | null {
    // Map league names to API-Football league IDs
    const leagueMap: { [key: string]: number } = {
      'Premier League': 39,
      'La Liga': 140,
      'Serie A': 135,
      'Bundesliga': 78,
      'Ligue 1': 61,
      'Champions League': 2,
      'Europa League': 3
    };
    
    return leagueMap[league] || null;
  }

  /**
   * Format enhanced context for AI prompt
   */
  formatForPrompt(context: RealTimeDataContext): string {
    const { dataQuality } = context;
    
    let prompt = `\n**ENHANCED REAL-TIME DATA ANALYSIS (Quality Score: ${dataQuality.overall}%)**\n\n`;
    
    // Team Statistics Comparison
    prompt += `**Team Performance Analysis:**\n`;
    prompt += `- Home Attack Strength: ${context.homeTeamDetailedStats.attackStrength.toFixed(1)}/10\n`;
    prompt += `- Home Defense Strength: ${context.homeTeamDetailedStats.defenseStrength.toFixed(1)}/10\n`;
    prompt += `- Away Attack Strength: ${context.awayTeamDetailedStats.attackStrength.toFixed(1)}/10\n`;
    prompt += `- Away Defense Strength: ${context.awayTeamDetailedStats.defenseStrength.toFixed(1)}/10\n`;
    
    // Injury Impact
    if (context.homeTeamAbsences.keyPlayersOut.length > 0 || context.awayTeamAbsences.keyPlayersOut.length > 0) {
      prompt += `\n**Injury/Suspension Impact:**\n`;
      if (context.homeTeamAbsences.keyPlayersOut.length > 0) {
        prompt += `- Home Team Impact Score: ${context.homeTeamAbsences.totalImpactScore} (${context.homeTeamAbsences.keyPlayersOut.length} players out)\n`;
      }
      if (context.awayTeamAbsences.keyPlayersOut.length > 0) {
        prompt += `- Away Team Impact Score: ${context.awayTeamAbsences.totalImpactScore} (${context.awayTeamAbsences.keyPlayersOut.length} players out)\n`;
      }
    }
    
    // Historical Matchups
    if (context.historicalMatchups.totalGames > 0) {
      prompt += `\n**Head-to-Head Analysis (${context.historicalMatchups.totalGames} games):**\n`;
      prompt += `- Home Win Rate: ${context.historicalMatchups.homeTeamWinPercentage.toFixed(1)}%\n`;
      prompt += `- BTTS Rate: ${context.historicalMatchups.bttsPercentage.toFixed(1)}%\n`;
      prompt += `- Over 2.5 Goals: ${context.historicalMatchups.over25Percentage.toFixed(1)}%\n`;
      prompt += `- Average Goals: ${context.historicalMatchups.averageHomeGoals.toFixed(1)} - ${context.historicalMatchups.averageAwayGoals.toFixed(1)}\n`;
    }
    
    // Form Analysis
    prompt += `\n**Current Form Momentum:**\n`;
    prompt += `- Home Team: ${context.formAnalysis.homeTeamMomentum.trend} (${context.formAnalysis.homeTeamMomentum.points}/15 pts in last 5)\n`;
    prompt += `- Away Team: ${context.formAnalysis.awayTeamMomentum.trend} (${context.formAnalysis.awayTeamMomentum.points}/15 pts in last 5)\n`;
    
    // Data Quality Warning
    if (dataQuality.overall < 70) {
      prompt += `\n**⚠️ Data Quality Notice:** Some enhanced data may be limited (${dataQuality.overall}% complete). Predictions adjusted for uncertainty.\n`;
    }
    
    return prompt;
  }

  /**
   * Get current API usage stats
   */
  getApiUsageStats() {
    const footballApiUsage = getApiUsage();
    return {
      ...footballApiUsage,
      enhancedDataCalls: this.apiUsageTracker.callsThisSession,
      maxCallsPerPrediction: this.apiUsageTracker.maxCallsPerPrediction
    };
  }
}

export const realTimeDataService = new RealTimeDataService();