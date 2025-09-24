/**
 * Advanced Result Checker Service
 * Automatically fetches match results and validates predictions
 * Updates prediction integrity system with accuracy metrics
 */

import { Match, Prediction, PredictionAccuracy, AccuracyStats } from '../types';
import { footballApiService } from './footballApiService';

export interface MatchResult {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  status: 'FT' | 'AET' | 'PEN';
  date: string;
  league: string;
  events?: MatchEvent[];
  statistics?: MatchStatistics;
}

export interface MatchEvent {
  time: number;
  type: 'Goal' | 'Card' | 'Substitution';
  team: 'home' | 'away';
  player: string;
  description: string;
}

export interface MatchStatistics {
  homeTeam: {
    shots: number;
    shotsOnTarget: number;
    possession: number;
    corners: number;
    fouls: number;
    yellowCards: number;
    redCards: number;
  };
  awayTeam: {
    shots: number;
    shotsOnTarget: number;
    possession: number;
    corners: number;
    fouls: number;
    yellowCards: number;
    redCards: number;
  };
}

export interface PredictionValidation {
  matchId: string;
  prediction: Prediction;
  actualResult: MatchResult;
  accuracy: {
    winner: boolean;
    scoreline: boolean;
    btts: boolean;
    goalLine: boolean;
    htft: boolean;
    cleanSheet: boolean;
    corners: boolean;
    firstGoalscorer: boolean;
  };
  confidence: number;
  timestamp: string;
}

export interface DailyAccuracyReport {
  date: string;
  totalMatches: number;
  validatedMatches: number;
  overallAccuracy: number;
  categoryAccuracy: {
    winner: number;
    scoreline: number;
    btts: number;
    goalLine: number;
    htft: number;
    cleanSheet: number;
    corners: number;
  };
  topPerformers: {
    league: string;
    accuracy: number;
  }[];
  improvementAreas: string[];
}

export class ResultCheckerService {
  private static instance: ResultCheckerService;
  private isRunning: boolean = false;
  private checkInterval: number | null = null;
  private lastCheckTime: number = 0;
  private readonly CHECK_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
  private readonly BATCH_SIZE = 10; // Process matches in batches

  private constructor() {
    this.setupScheduledChecks();
  }

  public static getInstance(): ResultCheckerService {
    if (!ResultCheckerService.instance) {
      ResultCheckerService.instance = new ResultCheckerService();
    }
    return ResultCheckerService.instance;
  }

  /**
   * Setup scheduled result checks
   */
  private setupScheduledChecks(): void {
    // Check every 30 minutes during match days
    this.checkInterval = window.setInterval(() => {
      this.performScheduledCheck();
    }, this.CHECK_INTERVAL_MS);

    // Initial check on startup
    setTimeout(() => this.performScheduledCheck(), 5000);
  }

  /**
   * Perform scheduled result check
   */
  private async performScheduledCheck(): Promise<void> {
    if (this.isRunning) return;

    try {
      this.isRunning = true;
      console.log('🔍 Starting scheduled result check...');

      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // Check yesterday's and today's matches
      const results = await this.fetchMatchResults([yesterday, today]);
      
      if (results.length > 0) {
        await this.validatePredictions(results);
        console.log(`✅ Validated ${results.length} match results`);
      } else {
        console.log('ℹ️ No completed matches found for validation');
      }

      this.lastCheckTime = Date.now();
    } catch (error) {
      console.error('❌ Result check failed:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Fetch match results for specific dates
   */
  private async fetchMatchResults(dates: string[]): Promise<MatchResult[]> {
    const allResults: MatchResult[] = [];

    for (const date of dates) {
      try {
        const results = await this.fetchResultsForDate(date);
        allResults.push(...results);
      } catch (error) {
        console.error(`Failed to fetch results for ${date}:`, error);
      }
    }

    return allResults;
  }

  /**
   * Fetch results for a specific date
   */
  private async fetchResultsForDate(date: string): Promise<MatchResult[]> {
    try {
      // Fetch completed matches for the date
      const response = await fetch(`/api/fixtures?date=${date}&status=FT`);
      if (!response.ok) throw new Error(`API request failed: ${response.status}`);

      const data = await response.json();
      const matches = data.response || [];

      return matches.map((match: any) => ({
        matchId: match.fixture.id.toString(),
        homeTeam: match.teams.home.name,
        awayTeam: match.teams.away.name,
        homeScore: match.goals.home,
        awayScore: match.goals.away,
        status: match.fixture.status.short as 'FT' | 'AET' | 'PEN',
        date: match.fixture.date,
        league: match.league.name,
        events: this.parseMatchEvents(match.events),
        statistics: this.parseMatchStatistics(match.statistics)
      }));
    } catch (error) {
      console.error(`Failed to fetch results for ${date}:`, error);
      return [];
    }
  }

  /**
   * Parse match events from API response
   */
  private parseMatchEvents(events: any[]): MatchEvent[] {
    if (!events) return [];

    return events.map(event => ({
      time: event.time.elapsed,
      type: event.type as 'Goal' | 'Card' | 'Substitution',
      team: event.team.id === event.team.home ? 'home' : 'away',
      player: event.player.name,
      description: event.detail
    }));
  }

  /**
   * Parse match statistics from API response
   */
  private parseMatchStatistics(stats: any[]): MatchStatistics | undefined {
    if (!stats || stats.length === 0) return undefined;

    const homeStats = stats.find(s => s.team.id === s.team.home);
    const awayStats = stats.find(s => s.team.id === s.team.away);

    if (!homeStats || !awayStats) return undefined;

    return {
      homeTeam: {
        shots: this.getStatValue(homeStats, 'Shots on Goal'),
        shotsOnTarget: this.getStatValue(homeStats, 'Shots on Target'),
        possession: this.getStatValue(homeStats, 'Ball Possession'),
        corners: this.getStatValue(homeStats, 'Corner Kicks'),
        fouls: this.getStatValue(homeStats, 'Fouls'),
        yellowCards: this.getStatValue(homeStats, 'Yellow Cards'),
        redCards: this.getStatValue(homeStats, 'Red Cards')
      },
      awayTeam: {
        shots: this.getStatValue(awayStats, 'Shots on Goal'),
        shotsOnTarget: this.getStatValue(awayStats, 'Shots on Target'),
        possession: this.getStatValue(awayStats, 'Ball Possession'),
        corners: this.getStatValue(awayStats, 'Corner Kicks'),
        fouls: this.getStatValue(awayStats, 'Fouls'),
        yellowCards: this.getStatValue(awayStats, 'Yellow Cards'),
        redCards: this.getStatValue(awayStats, 'Red Cards')
      }
    };
  }

  /**
   * Get statistic value from API response
   */
  private getStatValue(stats: any, statName: string): number {
    const stat = stats.statistics.find((s: any) => s.type === statName);
    return stat ? parseInt(stat.value) || 0 : 0;
  }

  /**
   * Validate predictions against actual results
   */
  private async validatePredictions(results: MatchResult[]): Promise<void> {
    const validations: PredictionValidation[] = [];

    for (const result of results) {
      try {
        const prediction = await this.getPredictionForMatch(result.matchId);
        if (!prediction) continue;

        const validation = this.validatePrediction(prediction, result);
        validations.push(validation);

        // Store validation result
        await this.storeValidationResult(validation);
      } catch (error) {
        console.error(`Failed to validate prediction for ${result.matchId}:`, error);
      }
    }

    // Generate daily accuracy report
    if (validations.length > 0) {
      await this.generateDailyReport(validations);
    }
  }

  /**
   * Get prediction for a specific match
   */
  private async getPredictionForMatch(matchId: string): Promise<Prediction | null> {
    try {
      // Try to get from local storage first
      const localPrediction = localStorage.getItem(`fixturecast_prediction_${matchId}`);
      if (localPrediction) {
        const record = JSON.parse(localPrediction);
        return record.prediction;
      }

      // Try to get from cloud storage
      const response = await fetch(`/api/predictions/${matchId}`);
      if (response.ok) {
        const data = await response.json();
        return data.numeric_predictions;
      }

      return null;
    } catch (error) {
      console.error(`Failed to get prediction for ${matchId}:`, error);
      return null;
    }
  }

  /**
   * Validate a single prediction against actual result
   */
  private validatePrediction(prediction: Prediction, result: MatchResult): PredictionValidation {
    const accuracy = {
      winner: this.validateWinnerPrediction(prediction, result),
      scoreline: this.validateScorelinePrediction(prediction, result),
      btts: this.validateBTTSPrediction(prediction, result),
      goalLine: this.validateGoalLinePrediction(prediction, result),
      htft: this.validateHTFTPrediction(prediction, result),
      cleanSheet: this.validateCleanSheetPrediction(prediction, result),
      corners: this.validateCornersPrediction(prediction, result),
      firstGoalscorer: this.validateFirstGoalscorerPrediction(prediction, result)
    };

    const confidence = this.calculateOverallConfidence(accuracy);

    return {
      matchId: result.matchId,
      prediction,
      actualResult: result,
      accuracy,
      confidence,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Validate winner prediction
   */
  private validateWinnerPrediction(prediction: Prediction, result: MatchResult): boolean {
    const predictedWinner = this.getPredictedWinner(prediction);
    const actualWinner = this.getActualWinner(result);
    
    return predictedWinner === actualWinner;
  }

  /**
   * Get predicted winner from prediction
   */
  private getPredictedWinner(prediction: Prediction): 'home' | 'draw' | 'away' {
    const { homeWinProbability, drawProbability, awayWinProbability } = prediction;
    
    if (homeWinProbability >= drawProbability && homeWinProbability >= awayWinProbability) {
      return 'home';
    } else if (drawProbability >= awayWinProbability) {
      return 'draw';
    } else {
      return 'away';
    }
  }

  /**
   * Get actual winner from result
   */
  private getActualWinner(result: MatchResult): 'home' | 'draw' | 'away' {
    if (result.homeScore > result.awayScore) return 'home';
    if (result.awayScore > result.homeScore) return 'away';
    return 'draw';
  }

  /**
   * Validate scoreline prediction
   */
  private validateScorelinePrediction(prediction: Prediction, result: MatchResult): boolean {
    if (!prediction.predictedScoreline) return false;
    
    const predictedScore = prediction.predictedScoreline;
    const actualScore = `${result.homeScore}-${result.awayScore}`;
    
    return predictedScore === actualScore;
  }

  /**
   * Validate BTTS prediction
   */
  private validateBTTSPrediction(prediction: Prediction, result: MatchResult): boolean {
    if (!prediction.btts) return false;
    
    const actualBTTs = result.homeScore > 0 && result.awayScore > 0;
    const predictedBTTs = prediction.btts.prediction;
    
    return actualBTTs === predictedBTTs;
  }

  /**
   * Validate goal line prediction
   */
  private validateGoalLinePrediction(prediction: Prediction, result: MatchResult): boolean {
    if (!prediction.goalLine) return false;
    
    const totalGoals = result.homeScore + result.awayScore;
    const predictedLine = prediction.goalLine.line;
    const predictedOver = prediction.goalLine.probability > 50;
    const actualOver = totalGoals > predictedLine;
    
    return predictedOver === actualOver;
  }

  /**
   * Validate HT/FT prediction
   */
  private validateHTFTPrediction(prediction: Prediction, result: MatchResult): boolean {
    if (!prediction.htft) return false;
    
    // This would require half-time score data
    // For now, return false as we don't have HT data
    return false;
  }

  /**
   * Validate clean sheet prediction
   */
  private validateCleanSheetPrediction(prediction: Prediction, result: MatchResult): boolean {
    if (!prediction.cleanSheet) return false;
    
    const homeCleanSheet = result.awayScore === 0;
    const awayCleanSheet = result.homeScore === 0;
    
    if (prediction.cleanSheet.team === 'home') {
      return homeCleanSheet === prediction.cleanSheet.prediction;
    } else {
      return awayCleanSheet === prediction.cleanSheet.prediction;
    }
  }

  /**
   * Validate corners prediction
   */
  private validateCornersPrediction(prediction: Prediction, result: MatchResult): boolean {
    if (!prediction.corners || !result.statistics) return false;
    
    const totalCorners = result.statistics.homeTeam.corners + result.statistics.awayTeam.corners;
    const predictedOver = prediction.corners.probability > 50;
    const actualOver = totalCorners > 10; // Assuming 10 as the line
    
    return predictedOver === actualOver;
  }

  /**
   * Validate first goalscorer prediction
   */
  private validateFirstGoalscorerPrediction(prediction: Prediction, result: MatchResult): boolean {
    if (!prediction.firstGoalscorer || !result.events) return false;
    
    const firstGoal = result.events.find(event => event.type === 'Goal');
    if (!firstGoal) return false;
    
    const predictedPlayer = prediction.firstGoalscorer.player;
    const actualPlayer = firstGoal.player;
    
    return predictedPlayer === actualPlayer;
  }

  /**
   * Calculate overall confidence score
   */
  private calculateOverallConfidence(accuracy: any): number {
    const scores = Object.values(accuracy).filter(Boolean);
    return (scores.length / Object.keys(accuracy).length) * 100;
  }

  /**
   * Store validation result
   */
  private async storeValidationResult(validation: PredictionValidation): Promise<void> {
    try {
      const key = `fixturecast_validation_${validation.matchId}`;
      localStorage.setItem(key, JSON.stringify(validation));
      
      // Also store in cloud for backup
      await this.storeValidationInCloud(validation);
    } catch (error) {
      console.error('Failed to store validation result:', error);
    }
  }

  /**
   * Store validation in cloud
   */
  private async storeValidationInCloud(validation: PredictionValidation): Promise<void> {
    try {
      await fetch('/api/predictions/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validation)
      });
    } catch (error) {
      console.error('Failed to store validation in cloud:', error);
    }
  }

  /**
   * Generate daily accuracy report
   */
  private async generateDailyReport(validations: PredictionValidation[]): Promise<DailyAccuracyReport> {
    const date = new Date().toISOString().split('T')[0];
    const totalMatches = validations.length;
    const validatedMatches = validations.length;

    // Calculate overall accuracy
    const overallAccuracy = validations.reduce((sum, v) => sum + v.confidence, 0) / totalMatches;

    // Calculate category accuracy
    const categoryAccuracy = {
      winner: this.calculateCategoryAccuracy(validations, 'winner'),
      scoreline: this.calculateCategoryAccuracy(validations, 'scoreline'),
      btts: this.calculateCategoryAccuracy(validations, 'btts'),
      goalLine: this.calculateCategoryAccuracy(validations, 'goalLine'),
      htft: this.calculateCategoryAccuracy(validations, 'htft'),
      cleanSheet: this.calculateCategoryAccuracy(validations, 'cleanSheet'),
      corners: this.calculateCategoryAccuracy(validations, 'corners')
    };

    // Find top performing leagues
    const topPerformers = this.findTopPerformers(validations);

    // Identify improvement areas
    const improvementAreas = this.identifyImprovementAreas(categoryAccuracy);

    const report: DailyAccuracyReport = {
      date,
      totalMatches,
      validatedMatches,
      overallAccuracy,
      categoryAccuracy,
      topPerformers,
      improvementAreas
    };

    // Store report
    localStorage.setItem(`fixturecast_daily_report_${date}`, JSON.stringify(report));
    
    // Notify UI of new report
    window.dispatchEvent(new CustomEvent('fixturecast:daily-report', { detail: report }));

    console.log(`📊 Daily accuracy report generated: ${overallAccuracy.toFixed(1)}% overall accuracy`);
    return report;
  }

  /**
   * Calculate category accuracy
   */
  private calculateCategoryAccuracy(validations: PredictionValidation[], category: string): number {
    const categoryValidations = validations.filter(v => v.accuracy[category as keyof typeof v.accuracy] !== undefined);
    if (categoryValidations.length === 0) return 0;
    
    const correct = categoryValidations.filter(v => v.accuracy[category as keyof typeof v.accuracy]).length;
    return (correct / categoryValidations.length) * 100;
  }

  /**
   * Find top performing leagues
   */
  private findTopPerformers(validations: PredictionValidation[]): { league: string; accuracy: number }[] {
    const leagueStats = new Map<string, { total: number; correct: number }>();
    
    validations.forEach(v => {
      const league = v.actualResult.league;
      const stats = leagueStats.get(league) || { total: 0, correct: 0 };
      stats.total++;
      if (v.confidence > 70) stats.correct++;
      leagueStats.set(league, stats);
    });

    return Array.from(leagueStats.entries())
      .map(([league, stats]) => ({
        league,
        accuracy: (stats.correct / stats.total) * 100
      }))
      .sort((a, b) => b.accuracy - a.accuracy)
      .slice(0, 3);
  }

  /**
   * Identify improvement areas
   */
  private identifyImprovementAreas(categoryAccuracy: any): string[] {
    const areas: string[] = [];
    
    Object.entries(categoryAccuracy).forEach(([category, accuracy]) => {
      if (accuracy < 60) {
        areas.push(`${category} predictions (${accuracy.toFixed(1)}%)`);
      }
    });
    
    return areas;
  }

  /**
   * Get daily accuracy report
   */
  public getDailyReport(date: string): DailyAccuracyReport | null {
    const report = localStorage.getItem(`fixturecast_daily_report_${date}`);
    return report ? JSON.parse(report) : null;
  }

  /**
   * Get validation history
   */
  public getValidationHistory(days: number = 7): PredictionValidation[] {
    const validations: PredictionValidation[] = [];
    const now = new Date();
    
    for (let i = 0; i < days; i++) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const keys = Object.keys(localStorage).filter(key => key.startsWith(`fixturecast_validation_`));
      
      keys.forEach(key => {
        try {
          const validation = JSON.parse(localStorage.getItem(key) || '');
          if (validation && validation.timestamp.startsWith(date)) {
            validations.push(validation);
          }
        } catch (error) {
          console.error('Failed to parse validation:', error);
        }
      });
    }
    
    return validations;
  }

  /**
   * Force immediate result check
   */
  public async forceCheck(): Promise<void> {
    await this.performScheduledCheck();
  }

  /**
   * Get service status
   */
  public getStatus(): { isRunning: boolean; lastCheckTime: number; nextCheckTime: number } {
    return {
      isRunning: this.isRunning,
      lastCheckTime: this.lastCheckTime,
      nextCheckTime: this.lastCheckTime + this.CHECK_INTERVAL_MS
    };
  }

  /**
   * Stop the service
   */
  public stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }
}

// Export singleton instance
export const resultCheckerService = ResultCheckerService.getInstance();
