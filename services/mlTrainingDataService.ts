import { Prediction, Match } from '../types';
import { RealTimeDataContext } from './realTimeDataService';

// Cloudflare D1 Database types
declare global {
  const ML_TRAINING_DB: D1Database;
}

interface D1Database {
  prepare(query: string): D1PreparedStatement;
}

interface D1PreparedStatement {
  bind(...values: any[]): D1PreparedStatement;
  first(): Promise<any>;
  run(): Promise<any>;
}

// ML Training Data Collection Service
// Collects prediction data for machine learning model training

export interface TrainingRecord {
  id: string;
  matchId: string;
  predictionDate: string;
  
  // Match details
  homeTeam: string;
  awayTeam: string;
  homeTeamId?: number;
  awayTeamId?: number;
  league: string;
  matchTimestamp: string;
  
  // Real-time data features
  homeAttackStrength: number;
  homeDefenseStrength: number;
  awayAttackStrength: number;
  awayDefenseStrength: number;
  
  // Injury impact features
  homeInjuryImpact: number;
  awayInjuryImpact: number;
  homeKeyPlayersOut: number;
  awayKeyPlayersOut: number;
  
  // Form momentum features
  homeFormMomentum: number;
  awayFormMomentum: number;
  homeRecentPoints: number;
  awayRecentPoints: number;
  homeFormTrend: 'improving' | 'declining' | 'stable';
  awayFormTrend: 'improving' | 'declining' | 'stable';
  
  // Head-to-head features
  h2hTotalGames: number;
  h2hHomeWins: number;
  h2hDraws: number;
  h2hAwayWins: number;
  h2hBttsRate: number;
  h2hOver25Rate: number;
  h2hAvgHomeGoals: number;
  h2hAvgAwayGoals: number;
  
  // Contextual features
  restDaysHome: number;
  restDaysAway: number;
  motivationHome: 'high' | 'medium' | 'low';
  motivationAway: 'high' | 'medium' | 'low';
  pressureLevel: 'high' | 'medium' | 'low';
  
  // Data quality metrics
  dataQualityOverall: number;
  statsAvailability: number;
  injuryDataFreshness: number;
  formDataCompleteness: number;
  h2hDataDepth: number;
  
  // Model predictions
  predictedHomeWin: number;
  predictedDraw: number;
  predictedAwayWin: number;
  predictedBttsYes?: number;
  predictedBttsNo?: number;
  predictedOver25Yes?: number;
  predictedOver25No?: number;
  predictedHomeScore?: number;
  predictedAwayScore?: number;
  predictionConfidence: number;
  
  // AI model context
  modelVersion: string;
  aiProvider: 'gemini' | 'deepseek';
  promptVersion?: string;
  keyFactorsCount: number;
  
  // Actual results (populated later)
  actualHomeScore?: number;
  actualAwayScore?: number;
  actualResult?: 'H' | 'D' | 'A';
  actualBtts?: boolean;
  actualOver25?: boolean;
  actualTotalGoals?: number;
  resultUpdatedAt?: string;
  
  // Learning metrics (calculated after result)
  predictionCorrect?: boolean;
  resultProbability?: number;
  bttsPredictionCorrect?: boolean;
  over25PredictionCorrect?: boolean;
  confidenceCalibrationScore?: number;
  brierScore?: number;
  
  createdAt: string;
  updatedAt?: string;
}

export interface ModelPerformance {
  id: string;
  modelVersion: string;
  testPeriodStart: string;
  testPeriodEnd: string;
  totalPredictions: number;
  correct1x2Predictions: number;
  correctBttsPredictions: number;
  correctOver25Predictions: number;
  accuracy1x2: number;
  accuracyBtts: number;
  accuracyOver25: number;
  overallAccuracy: number;
  avgPredictionConfidence: number;
  confidenceCalibration: number;
  avgBrierScore: number;
  premierLeagueAccuracy: number;
  laLigaAccuracy: number;
  serieAAccuracy: number;
  bundesligaAccuracy: number;
  ligue1Accuracy: number;
  highQualityAccuracy: number;
  lowQualityAccuracy: number;
  createdAt: string;
}

class MLTrainingDataService {
  private currentModelVersion = 'v1.0.0';
  private isD1Available = false;

  /**
   * Initialize ML training data service
   */
  async initialize() {
    // Check if D1 database is available
    try {
      if (typeof globalThis !== 'undefined' && 'ML_TRAINING_DB' in globalThis) {
        this.isD1Available = true;
        console.log('✅ ML Training Database (D1) is available');
      } else {
        console.warn('⚠️ ML Training Database not available - falling back to local storage');
      }
    } catch (error) {
      console.warn('⚠️ ML Training Database initialization failed:', error);
    }
  }

  /**
   * Collect training data from prediction and real-time context
   */
  async collectTrainingData(
    match: Match,
    prediction: Prediction,
    realTimeContext?: RealTimeDataContext,
    aiProvider: 'gemini' | 'deepseek' = 'gemini'
  ): Promise<void> {
    try {
      const trainingRecord = this.createTrainingRecord(
        match,
        prediction,
        realTimeContext,
        aiProvider
      );

      // Store in D1 database if available
      if (this.isD1Available) {
        await this.storeInD1Database(trainingRecord);
      } else {
        // Fallback to local storage for development
        await this.storeInLocalStorage(trainingRecord);
      }

      console.log(`📊 Training data collected for match: ${match.homeTeam} vs ${match.awayTeam}`);
    } catch (error) {
      console.error('❌ Failed to collect training data:', error);
    }
  }

  /**
   * Update training record with actual match result
   */
  async updateWithActualResult(
    matchId: string,
    homeScore: number,
    awayScore: number
  ): Promise<void> {
    try {
      const actualResult = homeScore > awayScore ? 'H' : homeScore < awayScore ? 'A' : 'D';
      const actualBtts = homeScore > 0 && awayScore > 0;
      const actualOver25 = (homeScore + awayScore) > 2.5;
      const actualTotalGoals = homeScore + awayScore;

      if (this.isD1Available) {
        await this.updateD1Record(matchId, {
          actualHomeScore: homeScore,
          actualAwayScore: awayScore,
          actualResult,
          actualBtts,
          actualOver25,
          actualTotalGoals,
          resultUpdatedAt: new Date().toISOString()
        });
      } else {
        await this.updateLocalStorageRecord(matchId, {
          actualHomeScore: homeScore,
          actualAwayScore: awayScore,
          actualResult,
          actualBtts,
          actualOver25,
          actualTotalGoals,
          resultUpdatedAt: new Date().toISOString()
        });
      }

      // Calculate learning metrics
      await this.calculateLearningMetrics(matchId);

      console.log(`✅ Updated training record with actual result: ${homeScore}-${awayScore}`);
    } catch (error) {
      console.error('❌ Failed to update training record with result:', error);
    }
  }

  /**
   * Get recent model performance
   */
  async getModelPerformance(days: number = 30): Promise<ModelPerformance | null> {
    try {
      if (this.isD1Available) {
        return await this.getD1Performance(days);
      } else {
        return await this.getLocalStoragePerformance(days);
      }
    } catch (error) {
      console.error('❌ Failed to get model performance:', error);
      return null;
    }
  }

  /**
   * Get training data summary for ML pipeline
   */
  async getTrainingDataSummary(): Promise<{
    totalRecords: number;
    recordsWithResults: number;
    averageAccuracy: number;
    dataQuality: number;
  }> {
    try {
      if (this.isD1Available) {
        const result = await ML_TRAINING_DB.prepare(`
          SELECT 
            COUNT(*) as total,
            COUNT(CASE WHEN actual_result IS NOT NULL THEN 1 END) as with_results,
            AVG(CASE WHEN prediction_correct = 1 THEN 1.0 ELSE 0.0 END) as accuracy,
            AVG(data_quality_overall) as quality
          FROM training_records
          WHERE prediction_date >= DATE('now', '-30 days')
        `).first();

        return {
          totalRecords: result.total || 0,
          recordsWithResults: result.with_results || 0,
          averageAccuracy: result.accuracy || 0,
          dataQuality: result.quality || 0
        };
      } else {
        // Fallback implementation for local storage
        return {
          totalRecords: 0,
          recordsWithResults: 0,
          averageAccuracy: 0,
          dataQuality: 0
        };
      }
    } catch (error) {
      console.error('❌ Failed to get training data summary:', error);
      return {
        totalRecords: 0,
        recordsWithResults: 0,
        averageAccuracy: 0,
        dataQuality: 0
      };
    }
  }

  // Private helper methods

  private createTrainingRecord(
    match: Match,
    prediction: Prediction,
    realTimeContext?: RealTimeDataContext,
    aiProvider: 'gemini' | 'deepseek' = 'gemini'
  ): TrainingRecord {
    const now = new Date().toISOString();
    const id = `${match.id}_${Date.now()}`;

    return {
      id,
      matchId: match.id,
      predictionDate: now.split('T')[0],
      
      // Match details
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      homeTeamId: match.homeTeamId,
      awayTeamId: match.awayTeamId,
      league: match.league,
      matchTimestamp: match.date,
      
      // Real-time features
      homeAttackStrength: realTimeContext?.homeTeamDetailedStats?.attackStrength || 0,
      homeDefenseStrength: realTimeContext?.homeTeamDetailedStats?.defenseStrength || 0,
      awayAttackStrength: realTimeContext?.awayTeamDetailedStats?.attackStrength || 0,
      awayDefenseStrength: realTimeContext?.awayTeamDetailedStats?.defenseStrength || 0,
      
      // Injury impact
      homeInjuryImpact: realTimeContext?.homeTeamAbsences?.totalImpactScore || 0,
      awayInjuryImpact: realTimeContext?.awayTeamAbsences?.totalImpactScore || 0,
      homeKeyPlayersOut: realTimeContext?.homeTeamAbsences?.keyPlayersOut?.length || 0,
      awayKeyPlayersOut: realTimeContext?.awayTeamAbsences?.keyPlayersOut?.length || 0,
      
      // Form momentum
      homeFormMomentum: realTimeContext?.formAnalysis?.homeTeamMomentum?.momentumScore || 0,
      awayFormMomentum: realTimeContext?.formAnalysis?.awayTeamMomentum?.momentumScore || 0,
      homeRecentPoints: realTimeContext?.formAnalysis?.homeTeamMomentum?.points || 0,
      awayRecentPoints: realTimeContext?.formAnalysis?.awayTeamMomentum?.points || 0,
      homeFormTrend: realTimeContext?.formAnalysis?.homeTeamMomentum?.trend || 'stable',
      awayFormTrend: realTimeContext?.formAnalysis?.awayTeamMomentum?.trend || 'stable',
      
      // Head-to-head
      h2hTotalGames: realTimeContext?.historicalMatchups?.totalGames || 0,
      h2hHomeWins: realTimeContext?.historicalMatchups?.homeTeamWins || 0,
      h2hDraws: realTimeContext?.historicalMatchups?.draws || 0,
      h2hAwayWins: realTimeContext?.historicalMatchups?.awayTeamWins || 0,
      h2hBttsRate: realTimeContext?.historicalMatchups?.bttsPercentage || 0,
      h2hOver25Rate: realTimeContext?.historicalMatchups?.over25Percentage || 0,
      h2hAvgHomeGoals: realTimeContext?.historicalMatchups?.averageHomeGoals || 0,
      h2hAvgAwayGoals: realTimeContext?.historicalMatchups?.averageAwayGoals || 0,
      
      // Contextual factors
      restDaysHome: realTimeContext?.contextualFactors?.restDays?.homeTeam || 0,
      restDaysAway: realTimeContext?.contextualFactors?.restDays?.awayTeam || 0,
      motivationHome: realTimeContext?.contextualFactors?.motivation?.homeTeamMotivation || 'medium',
      motivationAway: realTimeContext?.contextualFactors?.motivation?.awayTeamMotivation || 'medium',
      pressureLevel: realTimeContext?.contextualFactors?.pressureSituation?.level || 'medium',
      
      // Data quality
      dataQualityOverall: realTimeContext?.dataQuality?.overall || 0,
      statsAvailability: realTimeContext?.dataQuality?.statsAvailability || 0,
      injuryDataFreshness: realTimeContext?.dataQuality?.injuryDataFreshness || 0,
      formDataCompleteness: realTimeContext?.dataQuality?.formDataCompleteness || 0,
      h2hDataDepth: realTimeContext?.dataQuality?.historicalDataDepth || 0,
      
      // Predictions
      predictedHomeWin: prediction.homeWinProbability,
      predictedDraw: prediction.drawProbability,
      predictedAwayWin: prediction.awayWinProbability,
      predictedBttsYes: prediction.btts?.yesProbability,
      predictedBttsNo: prediction.btts?.noProbability,
      predictedOver25Yes: prediction.scoreRange?.twoToThree, // Using available scoreRange data
      predictedOver25No: prediction.scoreRange?.zeroToOne,
      predictedHomeScore: prediction.expectedGoals?.homeXg,
      predictedAwayScore: prediction.expectedGoals?.awayXg,
      predictionConfidence: prediction.confidencePercentage || 0,
      
      // Model context
      modelVersion: this.currentModelVersion,
      aiProvider,
      keyFactorsCount: prediction.keyFactors?.length || 0,
      
      createdAt: now
    };
  }

  private async storeInD1Database(record: TrainingRecord): Promise<void> {
    const stmt = ML_TRAINING_DB.prepare(`
      INSERT INTO training_records (
        id, match_id, prediction_date, home_team, away_team, home_team_id, away_team_id,
        league, match_timestamp, home_attack_strength, home_defense_strength,
        away_attack_strength, away_defense_strength, home_injury_impact, away_injury_impact,
        home_key_players_out, away_key_players_out, home_form_momentum, away_form_momentum,
        home_recent_points, away_recent_points, home_form_trend, away_form_trend,
        h2h_total_games, h2h_home_wins, h2h_draws, h2h_away_wins, h2h_btts_rate,
        h2h_over25_rate, h2h_avg_home_goals, h2h_avg_away_goals, rest_days_home,
        rest_days_away, motivation_home, motivation_away, pressure_level,
        data_quality_overall, stats_availability, injury_data_freshness,
        form_data_completeness, h2h_data_depth, predicted_home_win, predicted_draw,
        predicted_away_win, predicted_btts_yes, predicted_btts_no, predicted_over25_yes,
        predicted_over25_no, predicted_home_score, predicted_away_score,
        prediction_confidence, model_version, ai_provider, key_factors_count, created_at
      ) VALUES (
        ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19,
        ?20, ?21, ?22, ?23, ?24, ?25, ?26, ?27, ?28, ?29, ?30, ?31, ?32, ?33, ?34, ?35, ?36,
        ?37, ?38, ?39, ?40, ?41, ?42, ?43, ?44, ?45, ?46, ?47, ?48, ?49, ?50, ?51, ?52, ?53, ?54
      )
    `);

    await stmt.bind(
      record.id, record.matchId, record.predictionDate, record.homeTeam, record.awayTeam,
      record.homeTeamId, record.awayTeamId, record.league, record.matchTimestamp,
      record.homeAttackStrength, record.homeDefenseStrength, record.awayAttackStrength,
      record.awayDefenseStrength, record.homeInjuryImpact, record.awayInjuryImpact,
      record.homeKeyPlayersOut, record.awayKeyPlayersOut, record.homeFormMomentum,
      record.awayFormMomentum, record.homeRecentPoints, record.awayRecentPoints,
      record.homeFormTrend, record.awayFormTrend, record.h2hTotalGames, record.h2hHomeWins,
      record.h2hDraws, record.h2hAwayWins, record.h2hBttsRate, record.h2hOver25Rate,
      record.h2hAvgHomeGoals, record.h2hAvgAwayGoals, record.restDaysHome, record.restDaysAway,
      record.motivationHome, record.motivationAway, record.pressureLevel,
      record.dataQualityOverall, record.statsAvailability, record.injuryDataFreshness,
      record.formDataCompleteness, record.h2hDataDepth, record.predictedHomeWin,
      record.predictedDraw, record.predictedAwayWin, record.predictedBttsYes,
      record.predictedBttsNo, record.predictedOver25Yes, record.predictedOver25No,
      record.predictedHomeScore, record.predictedAwayScore, record.predictionConfidence,
      record.modelVersion, record.aiProvider, record.keyFactorsCount, record.createdAt
    ).run();
  }

  private async storeInLocalStorage(record: TrainingRecord): Promise<void> {
    // Fallback for development - store in localStorage
    const key = `ml_training_${record.id}`;
    localStorage.setItem(key, JSON.stringify(record));
  }

  private async updateD1Record(matchId: string, updates: Partial<TrainingRecord>): Promise<void> {
    const stmt = ML_TRAINING_DB.prepare(`
      UPDATE training_records 
      SET actual_home_score = ?1, actual_away_score = ?2, actual_result = ?3,
          actual_btts = ?4, actual_over25 = ?5, actual_total_goals = ?6,
          result_updated_at = ?7, updated_at = ?8
      WHERE match_id = ?9
    `);

    await stmt.bind(
      updates.actualHomeScore, updates.actualAwayScore, updates.actualResult,
      updates.actualBtts, updates.actualOver25, updates.actualTotalGoals,
      updates.resultUpdatedAt, new Date().toISOString(), matchId
    ).run();
  }

  private async updateLocalStorageRecord(matchId: string, updates: Partial<TrainingRecord>): Promise<void> {
    // Find and update local storage record
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('ml_training_')) {
        const record = JSON.parse(localStorage.getItem(key)!);
        if (record.matchId === matchId) {
          Object.assign(record, updates);
          localStorage.setItem(key, JSON.stringify(record));
          break;
        }
      }
    }
  }

  private async calculateLearningMetrics(matchId: string): Promise<void> {
    // Implementation for calculating accuracy metrics after results are known
    // This will be used by the ML training pipeline
    console.log('📈 Learning metrics calculated for match:', matchId);
  }

  private async getD1Performance(days: number): Promise<ModelPerformance | null> {
    // Implementation for querying D1 performance data
    return null;
  }

  private async getLocalStoragePerformance(days: number): Promise<ModelPerformance | null> {
    // Implementation for local storage performance analysis
    return null;
  }
}

export const mlTrainingDataService = new MLTrainingDataService();