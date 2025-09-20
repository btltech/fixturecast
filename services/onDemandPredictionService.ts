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
    const leagueId = getLeagueId(match.league);
    
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
    ] = await Promise.allSettled([
      getLeagueTable(leagueId, new Date().getFullYear()),
      getHeadToHead(match.homeTeam, match.awayTeam),
      getTeamStats(match.homeTeam, leagueId, new Date().getFullYear()),
      getTeamStats(match.awayTeam, leagueId, new Date().getFullYear()),
      getInjuries(match.homeTeam, leagueId),
      getInjuries(match.awayTeam, leagueId),
      getRecentTeamForm(match.homeTeam, leagueId),
      getRecentTeamForm(match.awayTeam, leagueId)
    ]);

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
}

// Export singleton instance
export const onDemandPredictionService = new OnDemandPredictionService();
