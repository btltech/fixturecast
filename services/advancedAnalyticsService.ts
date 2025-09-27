import { Match, Team } from '../types';

export interface AdvancedMatchAnalytics {
  eloRatings: {
    homeElo: number;
    awayElo: number;
    eloDifference: number;
    winProbabilityFromElo: number;
  };
  formMomentum: {
    homeFormScore: number; // 0-100
    awayFormScore: number; // 0-100
    formTrend: 'improving' | 'declining' | 'stable';
  };
  statisticalEdges: {
    attackVsDefense: number; // Home attack vs Away defense rating
    defenseVsAttack: number; // Home defense vs Away attack rating
    setPlayAdvantage: 'home' | 'away' | 'neutral';
  };
  contextualFactors: {
    venueAdvantage: number; // 0-100
    restDaysAdvantage: 'home' | 'away' | 'neutral';
    pressureIndex: number; // 0-100 (relegation, champions league, etc.)
    rivalryIntensity: number; // 0-100
  };
  uncertaintyFactors: {
    injuryImpact: number; // 0-100
    dataQuality: number; // 0-100
    squadRotationRisk: number; // 0-100
  };
}

export class AdvancedAnalyticsService {
  
  /**
   * Calculate ELO ratings for teams based on recent performance
   */
  private calculateEloRatings(homeTeam: string, awayTeam: string): AdvancedMatchAnalytics['eloRatings'] {
    // Simplified ELO calculation - in reality this would use historical match results
    // Starting rating: 1500 for average team
    const baseRating = 1500;
    
    // Mock ratings based on team "strength" - would be calculated from actual results
    const teamRatings: Record<string, number> = {
      'Arsenal': 1650, 'Chelsea': 1620, 'Manchester City': 1720, 'Liverpool': 1690,
      'Manchester United': 1580, 'Tottenham': 1560, 'Newcastle': 1540,
      'Brighton': 1520, 'Aston Villa': 1530, 'West Ham': 1510
    };
    
    const homeElo = teamRatings[homeTeam] || baseRating;
    const awayElo = teamRatings[awayTeam] || baseRating;
    const eloDifference = homeElo - awayElo;
    
    // Convert ELO difference to win probability using logistic function
    const winProbabilityFromElo = 1 / (1 + Math.pow(10, -eloDifference / 400));
    
    return { homeElo, awayElo, eloDifference, winProbabilityFromElo };
  }
  
  /**
   * Analyze form momentum with exponential decay weighting
   */
  private analyzeFormMomentum(homeTeam: string, awayTeam: string): AdvancedMatchAnalytics['formMomentum'] {
    // Mock form analysis - would use actual recent results
    // Score based on recent 6 matches with exponential decay
    const mockFormScores: Record<string, number> = {
      'Arsenal': 75, 'Chelsea': 65, 'Manchester City': 85, 'Liverpool': 80,
      'Manchester United': 60, 'Tottenham': 55, 'Newcastle': 70
    };
    
    const homeFormScore = mockFormScores[homeTeam] || 50;
    const awayFormScore = mockFormScores[awayTeam] || 50;
    
    let formTrend: 'improving' | 'declining' | 'stable' = 'stable';
    if (Math.abs(homeFormScore - awayFormScore) > 15) {
      formTrend = homeFormScore > awayFormScore ? 'improving' : 'declining';
    }
    
    return { homeFormScore, awayFormScore, formTrend };
  }
  
  /**
   * Calculate statistical edges based on attack/defense matchups
   */
  private calculateStatisticalEdges(homeTeam: string, awayTeam: string): AdvancedMatchAnalytics['statisticalEdges'] {
    // Mock statistical ratings - would use actual xG, shots, etc.
    const attackRatings: Record<string, number> = {
      'Arsenal': 78, 'Chelsea': 72, 'Manchester City': 88, 'Liverpool': 82,
      'Manchester United': 68, 'Tottenham': 75, 'Newcastle': 70
    };
    
    const defenseRatings: Record<string, number> = {
      'Arsenal': 75, 'Chelsea': 70, 'Manchester City': 82, 'Liverpool': 78,
      'Manchester United': 65, 'Tottenham': 62, 'Newcastle': 73
    };
    
    const homeAttack = attackRatings[homeTeam] || 65;
    const awayDefense = defenseRatings[awayTeam] || 65;
    const homeDefense = defenseRatings[homeTeam] || 65;
    const awayAttack = attackRatings[awayTeam] || 65;
    
    const attackVsDefense = (homeAttack - awayDefense + 100) / 2; // Normalize to 0-100
    const defenseVsAttack = (homeDefense - awayAttack + 100) / 2;
    
    // Mock set play advantage
    const setPlayAdvantage: 'home' | 'away' | 'neutral' = 
      attackVsDefense > 60 ? 'home' : attackVsDefense < 40 ? 'away' : 'neutral';
    
    return { attackVsDefense, defenseVsAttack, setPlayAdvantage };
  }
  
  /**
   * Assess contextual factors affecting the match
   */
  private assessContextualFactors(homeTeam: string, awayTeam: string, league: string): AdvancedMatchAnalytics['contextualFactors'] {
    // Venue advantage varies by league and specific teams
    const leagueVenueAdvantage: Record<string, number> = {
      'Premier League': 58, // Home win rate ~45%, so moderate advantage
      'La Liga': 62,
      'Serie A': 60,
      'Bundesliga': 55,
      'Ligue 1': 59
    };
    
    const venueAdvantage = leagueVenueAdvantage[league] || 55;
    
    // Mock rest days advantage
    const restDaysAdvantage: 'home' | 'away' | 'neutral' = 'neutral';
    
    // Pressure index based on league position implications
    const pressureTeams = ['Manchester United', 'Tottenham', 'Chelsea']; // Teams with high expectations
    const pressureIndex = pressureTeams.includes(homeTeam) || pressureTeams.includes(awayTeam) ? 70 : 40;
    
    // Rivalry intensity
    const rivalries: Record<string, string[]> = {
      'Arsenal': ['Tottenham', 'Chelsea', 'Manchester United'],
      'Chelsea': ['Arsenal', 'Tottenham', 'Liverpool'],
      'Tottenham': ['Arsenal', 'Chelsea'],
      'Liverpool': ['Manchester United', 'Manchester City', 'Chelsea'],
      'Manchester United': ['Liverpool', 'Manchester City', 'Arsenal'],
      'Manchester City': ['Manchester United', 'Liverpool']
    };
    
    const rivalryIntensity = rivalries[homeTeam]?.includes(awayTeam) ? 85 : 25;
    
    return { venueAdvantage, restDaysAdvantage, pressureIndex, rivalryIntensity };
  }
  
  /**
   * Quantify uncertainty factors that affect prediction confidence
   */
  private quantifyUncertaintyFactors(homeTeam: string, awayTeam: string): AdvancedMatchAnalytics['uncertaintyFactors'] {
    // Mock injury impact - would use actual injury reports
    const injuryImpact = Math.random() * 30 + 10; // 10-40% impact
    
    // Data quality based on available context
    const dataQuality = 75; // Would be based on actual data availability
    
    // Squad rotation risk - higher for teams in European competitions
    const europeanTeams = ['Arsenal', 'Chelsea', 'Manchester City', 'Liverpool', 'Manchester United', 'Newcastle'];
    const squadRotationRisk = europeanTeams.includes(homeTeam) || europeanTeams.includes(awayTeam) ? 40 : 20;
    
    return { injuryImpact, dataQuality, squadRotationRisk };
  }
  
  /**
   * Generate comprehensive advanced analytics for a match
   */
  async generateAdvancedAnalytics(match: Match): Promise<AdvancedMatchAnalytics> {
    const eloRatings = this.calculateEloRatings(match.homeTeam, match.awayTeam);
    const formMomentum = this.analyzeFormMomentum(match.homeTeam, match.awayTeam);
    const statisticalEdges = this.calculateStatisticalEdges(match.homeTeam, match.awayTeam);
    const contextualFactors = this.assessContextualFactors(match.homeTeam, match.awayTeam, match.league);
    const uncertaintyFactors = this.quantifyUncertaintyFactors(match.homeTeam, match.awayTeam);
    
    return {
      eloRatings,
      formMomentum,
      statisticalEdges,
      contextualFactors,
      uncertaintyFactors
    };
  }
  
  /**
   * Convert analytics to context prompt for AI model
   */
  formatAnalyticsForPrompt(analytics: AdvancedMatchAnalytics): string {
    return `
**ADVANCED ANALYTICS CONTEXT:**

ELO RATINGS & PROBABILITIES:
- Home Team ELO: ${analytics.eloRatings.homeElo}
- Away Team ELO: ${analytics.eloRatings.awayElo}  
- ELO Difference: ${analytics.eloRatings.eloDifference > 0 ? '+' : ''}${analytics.eloRatings.eloDifference}
- ELO Win Probability: ${(analytics.eloRatings.winProbabilityFromElo * 100).toFixed(1)}%

FORM MOMENTUM ANALYSIS:
- Home Form Score: ${analytics.formMomentum.homeFormScore}/100
- Away Form Score: ${analytics.formMomentum.awayFormScore}/100
- Momentum Trend: ${analytics.formMomentum.formTrend}

STATISTICAL MATCHUP EDGES:
- Home Attack vs Away Defense: ${analytics.statisticalEdges.attackVsDefense.toFixed(1)}/100
- Home Defense vs Away Attack: ${analytics.statisticalEdges.defenseVsAttack.toFixed(1)}/100
- Set Play Advantage: ${analytics.statisticalEdges.setPlayAdvantage}

CONTEXTUAL FACTORS:
- Venue Advantage: ${analytics.contextualFactors.venueAdvantage}%
- Rest Days Advantage: ${analytics.contextualFactors.restDaysAdvantage}
- Pressure Index: ${analytics.contextualFactors.pressureIndex}/100
- Rivalry Intensity: ${analytics.contextualFactors.rivalryIntensity}/100

UNCERTAINTY ASSESSMENT:
- Injury Impact: ${analytics.uncertaintyFactors.injuryImpact.toFixed(1)}%
- Data Quality: ${analytics.uncertaintyFactors.dataQuality}%
- Squad Rotation Risk: ${analytics.uncertaintyFactors.squadRotationRisk}%

Use this quantitative analysis to inform your modeling approach and adjust probabilities accordingly.
`;
  }
}

export const advancedAnalyticsService = new AdvancedAnalyticsService();