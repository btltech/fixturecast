import { Match, Prediction } from '../types';
import { getMatchPrediction } from './geminiService';
import { 
  getHeadToHead, 
  getInjuries, 
  getTeamStats, 
  getRecentTeamForm, 
  getLeagueTable,
  getLeagueId 
} from './footballApiService';
import { storeDailyPrediction } from './accuracyService';
import { buildContextForMatch } from '../utils/contextUtils';
import { ConfidenceLevel } from '../types';

/**
 * Service for generating predictions on-demand for individual matches
 */
export class OnDemandPredictionService {
  private generatingPredictions = new Set<string>(); // Track matches being generated
  private readonly GENERATION_TIMEOUT = 60000; // 60 seconds timeout

  /**
   * Generate a prediction for a specific match on-demand
   */
  async generateMatchPrediction(match: Match): Promise<Prediction> {
    const matchId = match.id;
    
    // Check if already generating for this match
    if (this.generatingPredictions.has(matchId)) {
      throw new Error('Prediction already being generated for this match');
    }

    try {
      this.generatingPredictions.add(matchId);
      console.log(`🎯 Generating on-demand prediction for ${match.homeTeam} vs ${match.awayTeam}`);

      // Set timeout to prevent hanging
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Prediction generation timeout')), this.GENERATION_TIMEOUT);
      });

      // Fetch comprehensive match data for accurate predictions
      const matchDataPromise = this.fetchMatchData(match);
      
      // Race between data fetching and timeout
      const matchData = await Promise.race([matchDataPromise, timeoutPromise]);
      
      // Build context with real data for better predictions
      const context = buildContextForMatch(
        match, 
        [], // allPastPredictions - could be enhanced later
        matchData.leagueTables, // Current league standings
        matchData.h2hData, // Head-to-head history
        matchData.homeTeamStats, // Home team current season stats
        matchData.awayTeamStats, // Away team current season stats
        matchData.homeTeamInjuries, // Home team injury list
        matchData.awayTeamInjuries, // Away team injury list
        matchData.formOverride // Current form data (WWLDL etc.)
      );
      
      // Generate prediction with enriched context
      const prediction = await getMatchPrediction(match, context);

      // Confidence calibration overlay based on data richness
      try {
        const richness = this.computeDataRichness(matchData);
        // Set or refine confidence fields
        const level = richness.level;
        const reason = richness.reason;
        (prediction as any).confidence = prediction.confidence || level;
        (prediction as any).confidenceReason = prediction.confidenceReason || reason;
        (prediction as any).confidencePercentage = prediction.confidencePercentage ?? Math.min(100, Math.max(0, Math.round(richness.score)));
      } catch {}
      
      // Store the prediction
      await storeDailyPrediction(match, prediction);
      
      console.log(`✅ Generated on-demand prediction for ${match.homeTeam} vs ${match.awayTeam}`);
      return prediction;
      
    } catch (error) {
      console.error(`❌ Failed to generate prediction for ${match.homeTeam} vs ${match.awayTeam}:`, error);
      throw error;
    } finally {
      this.generatingPredictions.delete(matchId);
    }
  }

  /**
   * Check if a prediction is currently being generated for a match
   */
  isGenerating(matchId: string): boolean {
    return this.generatingPredictions.has(matchId);
  }

  /**
   * Fetch comprehensive data for a match to improve prediction accuracy
   */
  private async fetchMatchData(match: Match) {
    // Allow custom leagueId/season passed from UI for global coverage (clubs and national teams)
    const customLeagueId = (match as any)?.leagueId as number | undefined;
    const customSeason = (match as any)?.season as number | undefined;

    const derivedLeagueId = getLeagueId(match.league);
    const leagueId = customLeagueId ?? derivedLeagueId ?? undefined;
    const seasonYear = customSeason ?? new Date().getFullYear();

    const homeId = match.homeTeamId;
    const awayId = match.awayTeamId;

    // Prepare calls with correct parameter types
    const calls: Array<Promise<any>> = [
      // League table (best-effort). If we only have a dynamic league, skip table.
      derivedLeagueId ? getLeagueTable(match.league) : Promise.resolve(null),
      // H2H expects numeric team IDs
      getHeadToHead(homeId, awayId),
      // Team stats require teamId and leagueId
      leagueId ? getTeamStats(homeId, leagueId) : Promise.resolve(null),
      leagueId ? getTeamStats(awayId, leagueId) : Promise.resolve(null),
      // Injuries require teamId and leagueId
      leagueId ? getInjuries(homeId, leagueId) : Promise.resolve(null),
      leagueId ? getInjuries(awayId, leagueId) : Promise.resolve(null),
      // Recent form requires teamId only
      getRecentTeamForm(homeId),
      getRecentTeamForm(awayId)
    ];

    // Fetch all data in parallel for faster response
    const [
      leagueTables,
      h2hData,
      homeTeamStats,
      awayTeamStats,
      homeTeamInjuries,
      awayTeamInjuries,
      homeTeamForm,
      awayTeamForm
    ] = await Promise.allSettled(calls);

    // Extract successful results
    const leagueTable = leagueTables.status === 'fulfilled' ? leagueTables.value : null;
    const h2h = h2hData.status === 'fulfilled' ? h2hData.value : null;
    const homeStats = homeTeamStats.status === 'fulfilled' ? homeTeamStats.value : null;
    const awayStats = awayTeamStats.status === 'fulfilled' ? awayTeamStats.value : null;
    const homeInjuries = homeTeamInjuries.status === 'fulfilled' ? homeTeamInjuries.value : null;
    const awayInjuries = awayTeamInjuries.status === 'fulfilled' ? awayTeamInjuries.value : null;
    const homeForm = homeTeamForm.status === 'fulfilled' ? homeTeamForm.value : null;
    const awayForm = awayTeamForm.status === 'fulfilled' ? awayTeamForm.value : null;

    // Create form override if we have recent form data
    const formOverride = homeForm && awayForm ? {
      homeTeam: {
        recentForm: homeForm,
        last5Results: homeForm.slice(-5)
      },
      awayTeam: {
        recentForm: awayForm,
        last5Results: awayForm.slice(-5)
      }
    } : null;

    return {
      leagueTables: leagueTable,
      h2hData: h2h,
      homeTeamStats: homeStats,
      awayTeamStats: awayStats,
      homeTeamInjuries: homeInjuries,
      awayTeamInjuries: awayInjuries,
      formOverride
    };
  }

  private computeDataRichness(matchData: any): { score: number; reason: string; level: ConfidenceLevel } {
    let score = 0;
    const reasons: string[] = [];

    const hasHomeStats = !!matchData?.homeTeamStats;
    const hasAwayStats = !!matchData?.awayTeamStats;
    const hasStats = hasHomeStats && hasAwayStats;
    score += hasStats ? 35 : (hasHomeStats || hasAwayStats ? 20 : 5);
    if (!hasStats) reasons.push('Limited team stats');

    const homeFormLen = (matchData?.formOverride?.homeTeam?.recentForm || []).length;
    const awayFormLen = (matchData?.formOverride?.awayTeam?.recentForm || []).length;
    const minForm = Math.min(homeFormLen, awayFormLen);
    if (minForm >= 5) score += 25; else if (minForm >= 3) score += 15; else score += 5;
    if (minForm < 5) reasons.push('Sparse recent form');

    const h2hCount = Array.isArray(matchData?.h2hData) ? matchData.h2hData.length : 0;
    if (h2hCount >= 3) score += 10; else if (h2hCount > 0) score += 6; else score += 2;
    if (h2hCount === 0) reasons.push('No recent H2H');

    const homeInjuries = Array.isArray(matchData?.homeTeamInjuries) ? matchData.homeTeamInjuries.length : 0;
    const awayInjuries = Array.isArray(matchData?.awayTeamInjuries) ? matchData.awayTeamInjuries.length : 0;
    // Presence of injury data (not number) improves context
    const hasInjuryFeeds = (homeInjuries + awayInjuries) >= 0; // if arrays exist
    score += hasInjuryFeeds ? 10 : 2;
    if (!hasInjuryFeeds) reasons.push('Injuries unavailable');

    const hasTable = !!matchData?.leagueTables && Array.isArray(matchData.leagueTables) ? matchData.leagueTables.length > 0 : !!matchData?.leagueTables;
    score += hasTable ? 10 : 2;
    if (!hasTable) reasons.push('Standings unavailable');

    // Cap and map to level
    score = Math.min(100, Math.max(0, score));
    const level = score >= 70 ? ConfidenceLevel.High : score >= 45 ? ConfidenceLevel.Medium : ConfidenceLevel.Low;
    const reason = reasons.length ? reasons.join('; ') : 'Rich data coverage';
    return { score, reason, level };
  }
}

// Export singleton instance
export const onDemandPredictionService = new OnDemandPredictionService();
