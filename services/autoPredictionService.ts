import { Match, Prediction } from '../types';
import { getMatchPrediction } from './geminiService';
import { 
  getTodaysFixtures, 
  getFinishedFixtures, 
  getHeadToHead, 
  getInjuries, 
  getTeamStats, 
  getRecentTeamForm, 
  getLeagueTable,
  getLeagueId 
} from './footballApiService';
import { storeDailyPrediction, checkAndUpdateMatchResults } from './accuracyService';
import { buildContextForMatch } from '../utils/contextUtils';

export class AutoPredictionService {
  private isGeneratingPredictions = false;
  private lastGenerationTime = 0;
  private readonly GENERATION_COOLDOWN = 30 * 60 * 1000; // 30 minutes

  constructor() {
    // Auto-check for completed matches every hour
    this.startResultsChecker();
  }

  /**
   * Fetch comprehensive data for a match to improve prediction accuracy
   */
  private async fetchMatchData(match: Match) {
    const homeTeamId = match.homeTeamId;
    const awayTeamId = match.awayTeamId;
    
    console.log(`📊 Fetching comprehensive data for ${match.homeTeam} vs ${match.awayTeam}...`);
    
    const dataPromises = [];
    
    // Fetch league table
    dataPromises.push(
      (async () => {
        try {
          const leagueTable = await getLeagueTable(match.league);
          console.log(`✅ Fetched league table for ${match.league} (${leagueTable.length} teams)`);
          return { leagueTables: { [match.league]: leagueTable } };
        } catch (error) {
          console.warn(`❌ Failed to fetch league table for ${match.league}:`, error);
          return { leagueTables: {} };
        }
      })()
    );
    
    // Fetch head-to-head if we have team IDs
    if (homeTeamId && awayTeamId) {
      dataPromises.push(
        (async () => {
          try {
            const h2hData = await getHeadToHead(homeTeamId, awayTeamId);
            console.log(`✅ Fetched H2H data: ${h2hData.length} previous meetings`);
            return { h2hData };
          } catch (error) {
            console.warn(`❌ Failed to fetch H2H data:`, error);
            return { h2hData: [] };
          }
        })()
      );
    } else {
      dataPromises.push(Promise.resolve({ h2hData: [] }));
    }
    
    // Fetch team stats and injuries
    const leagueId = getLeagueId(match.league);
    if (homeTeamId && leagueId) {
      dataPromises.push(
        (async () => {
          try {
            const [homeStats, homeInjuries, homeForm] = await Promise.all([
              getTeamStats(homeTeamId, leagueId),
              getInjuries(homeTeamId, leagueId),
              getRecentTeamForm(homeTeamId)
            ]);
            console.log(`✅ Fetched home team data - Stats: ✓, Injuries: ${homeInjuries.length}, Form: ${homeForm.join('')}`);
            return { homeTeamStats: homeStats, homeTeamInjuries: homeInjuries, homeForm };
          } catch (error) {
            console.warn(`❌ Failed to fetch home team data:`, error);
            return { homeTeamStats: null, homeTeamInjuries: [], homeForm: [] };
          }
        })()
      );
    } else {
      dataPromises.push(Promise.resolve({ homeTeamStats: null, homeTeamInjuries: [], homeForm: [] }));
    }
    
    if (awayTeamId && leagueId) {
      dataPromises.push(
        (async () => {
          try {
            const [awayStats, awayInjuries, awayForm] = await Promise.all([
              getTeamStats(awayTeamId, leagueId),
              getInjuries(awayTeamId, leagueId),
              getRecentTeamForm(awayTeamId)
            ]);
            console.log(`✅ Fetched away team data - Stats: ✓, Injuries: ${awayInjuries.length}, Form: ${awayForm.join('')}`);
            return { awayTeamStats: awayStats, awayTeamInjuries: awayInjuries, awayForm };
          } catch (error) {
            console.warn(`❌ Failed to fetch away team data:`, error);
            return { awayTeamStats: null, awayTeamInjuries: [], awayForm: [] };
          }
        })()
      );
    } else {
      dataPromises.push(Promise.resolve({ awayTeamStats: null, awayTeamInjuries: [], awayForm: [] }));
    }
    
    // Execute all data fetching in parallel
    const results = await Promise.allSettled(dataPromises);
    
    // Combine results
    const combinedData = {
      leagueTables: {},
      h2hData: [],
      homeTeamStats: null,
      awayTeamStats: null,
      homeTeamInjuries: [],
      awayTeamInjuries: [],
      formOverride: undefined as any
    };
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        Object.assign(combinedData, result.value);
        
        // Handle form data specially
        if (result.value.homeForm) {
          combinedData.formOverride = { 
            ...combinedData.formOverride, 
            home: result.value.homeForm.join('') 
          };
        }
        if (result.value.awayForm) {
          combinedData.formOverride = { 
            ...combinedData.formOverride, 
            away: result.value.awayForm.join('') 
          };
        }
      }
    });
    
    console.log(`📊 Data fetching complete for ${match.homeTeam} vs ${match.awayTeam}:`, {
      leagueTable: Object.keys(combinedData.leagueTables).length > 0,
      h2hRecords: combinedData.h2hData.length,
      homeStats: !!combinedData.homeTeamStats,
      awayStats: !!combinedData.awayTeamStats,
      homeInjuries: combinedData.homeTeamInjuries.length,
      awayInjuries: combinedData.awayTeamInjuries.length,
      formData: !!combinedData.formOverride
    });
    
    return combinedData;
  }

  /**
   * Generate predictions for all today's games
   */
  async generateTodaysPredictions(): Promise<{ success: number; failed: number; total: number }> {
    if (this.isGeneratingPredictions) {
      console.log('⏳ Prediction generation already in progress...');
      return { success: 0, failed: 0, total: 0 };
    }

    // Rate limiting
    const now = Date.now();
    if (now - this.lastGenerationTime < this.GENERATION_COOLDOWN) {
      const remainingTime = Math.ceil((this.GENERATION_COOLDOWN - (now - this.lastGenerationTime)) / 60000);
      console.log(`⏳ Prediction generation on cooldown. ${remainingTime} minutes remaining.`);
      return { success: 0, failed: 0, total: 0 };
    }

    this.isGeneratingPredictions = true;
    this.lastGenerationTime = now;

    try {
      console.log('🤖 Starting automatic prediction generation...');
      console.log('📅 Today\'s date:', new Date().toISOString().split('T')[0]);
      
      // Get today's fixtures from major leagues
      const majorLeagues = [
        'Premier League', 'La Liga', 'Serie A', 'Bundesliga', 'Ligue 1',
        'UEFA Champions League', 'UEFA Europa League', 'EFL Championship'
      ];

      let allTodaysMatches: Match[] = [];
      let debugInfo: string[] = [];
      
      // Fetch today's games from each major league
      for (const league of majorLeagues) {
        try {
          const matches = await getTodaysFixtures(league as any);
          allTodaysMatches.push(...matches);
          const info = `📊 ${league}: ${matches.length} matches`;
          console.log(info);
          debugInfo.push(info);
          
          // Small delay between league requests
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          const errorInfo = `❌ ${league}: Failed (${error.message})`;
          console.warn(errorInfo);
          debugInfo.push(errorInfo);
        }
      }

      // Remove duplicates
      const uniqueMatches = allTodaysMatches.filter((match, index, self) => 
        index === self.findIndex(m => m.id === match.id)
      );

      console.log(`🎯 Found ${uniqueMatches.length} unique matches total`);
      console.log('🔍 Debug info:', debugInfo);

      // If no matches today, try upcoming matches (within 24 hours)
      if (uniqueMatches.length === 0) {
        console.log('📅 No matches today, checking for upcoming matches in next 24 hours...');
        
        // Import the general fixture fetching function
        const { getUpcomingFixtures } = await import('./footballApiService');
        
        for (const league of majorLeagues.slice(0, 5)) { // Check top 5 leagues
          try {
            const upcomingMatches = await getUpcomingFixtures(league as any, 1); // Next 1 day
            const todayAndTomorrowMatches = upcomingMatches.filter(match => {
              const matchDate = new Date(match.date);
              const now = new Date();
              const timeDiff = matchDate.getTime() - now.getTime();
              const hoursDiff = timeDiff / (1000 * 60 * 60);
              return hoursDiff >= 0 && hoursDiff <= 24; // Next 24 hours
            });
            
            allTodaysMatches.push(...todayAndTomorrowMatches);
            console.log(`📊 ${league}: ${todayAndTomorrowMatches.length} matches in next 24 hours`);
            
            await new Promise(resolve => setTimeout(resolve, 1000));
          } catch (error) {
            console.warn(`Failed to fetch upcoming fixtures for ${league}:`, error);
          }
        }
        
        // Remove duplicates again
        const uniqueUpcomingMatches = allTodaysMatches.filter((match, index, self) => 
          index === self.findIndex(m => m.id === match.id)
        );
        
        console.log(`🎯 Found ${uniqueUpcomingMatches.length} matches in next 24 hours`);
        uniqueMatches.length = 0;
        uniqueMatches.push(...uniqueUpcomingMatches);
      }

      if (uniqueMatches.length === 0) {
        console.log('❌ No matches found for today or next 24 hours');
        return { success: 0, failed: 0, total: 0 };
      }

      console.log(`🎯 Generating predictions for ${uniqueMatches.length} matches`);

      let successCount = 0;
      let failedCount = 0;

      // Generate predictions in batches to avoid rate limits
      const BATCH_SIZE = 3;
      for (let i = 0; i < uniqueMatches.length; i += BATCH_SIZE) {
        const batch = uniqueMatches.slice(i, i + BATCH_SIZE);
        
        const batchPromises = batch.map(async (match) => {
          try {
            // Fetch comprehensive match data for accurate predictions
            const matchData = await this.fetchMatchData(match);
            
            // Build context with real data for better predictions
            const context = await buildContextForMatch(
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
            
            console.log(`✅ Generated enhanced prediction for ${match.homeTeam} vs ${match.awayTeam}`);
            return { success: true, match };
          } catch (error) {
            console.error(`❌ Failed to generate prediction for ${match.homeTeam} vs ${match.awayTeam}:`, error);
            return { success: false, match, error };
          }
        });

        const results = await Promise.allSettled(batchPromises);
        
        results.forEach(result => {
          if (result.status === 'fulfilled') {
            if (result.value.success) {
              successCount++;
            } else {
              failedCount++;
            }
          } else {
            failedCount++;
          }
        });

        // Delay between batches to respect rate limits
        if (i + BATCH_SIZE < uniqueMatches.length) {
          console.log(`⏳ Batch ${Math.floor(i / BATCH_SIZE) + 1} complete. Waiting before next batch...`);
          await new Promise(resolve => setTimeout(resolve, 5000)); // 5 second delay
        }
      }

      const total = uniqueMatches.length;
      console.log(`🎯 Prediction generation complete: ${successCount}/${total} successful, ${failedCount} failed`);

      return { success: successCount, failed: failedCount, total };

    } catch (error) {
      console.error('🔴 Auto-prediction generation failed:', error);
      return { success: 0, failed: 0, total: 0 };
    } finally {
      this.isGeneratingPredictions = false;
    }
  }

  /**
   * Check for finished matches and update accuracy
   */
  async checkAndUpdateResults(): Promise<void> {
    try {
      console.log('🔍 Checking for completed matches to update accuracy...');
      
      // Get finished fixtures from the last 3 days
      const results = await getFinishedFixtures();
      
      if (results.length > 0) {
        await checkAndUpdateMatchResults(results);
        console.log(`✅ Checked ${results.length} completed matches for accuracy updates`);
      } else {
        console.log('📝 No new completed matches found');
      }
    } catch (error) {
      console.error('🔴 Failed to check match results:', error);
    }
  }

  /**
   * Start automatic results checker (runs every hour)
   */
  private startResultsChecker(): void {
    // Check immediately on start
    setTimeout(() => this.checkAndUpdateResults(), 5000);
    
    // Then check every hour
    setInterval(() => {
      this.checkAndUpdateResults();
    }, 60 * 60 * 1000); // 1 hour
    
    console.log('🤖 Auto-results checker started (checks every hour)');
  }

  /**
   * Debug function to check what matches are available
   */
  async debugMatchAvailability(): Promise<{ league: string; todays: Match[]; upcomingSample: Match[] }[]> {
    console.log('🔍 DEBUG: Checking match availability...');
    console.log('📅 Current date/time:', new Date().toISOString());
    console.log('📅 Today\'s date:', new Date().toISOString().split('T')[0]);

    const leagues = ['Premier League', 'La Liga', 'Serie A', 'Bundesliga', 'Ligue 1'];
    const summary: { league: string; todays: Match[]; upcomingSample: Match[] }[] = [];

    for (const league of leagues) {
      try {
        console.log(`\n🔍 Checking ${league}:`);
        const todaysMatches = await getTodaysFixtures(league as any);
        const { getUpcomingFixtures } = await import('./footballApiService');
        const upcomingMatches = await getUpcomingFixtures(league as any, 2);

        summary.push({
          league,
          todays: todaysMatches,
          upcomingSample: upcomingMatches.slice(0, 5)
        });

        console.log(`  📊 Today's matches: ${todaysMatches.length}`);
        console.log(`  📅 Upcoming (next 2 days): ${upcomingMatches.length}`);
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (error) {
        console.error(`❌ Error checking ${league}:`, error);
        summary.push({ league, todays: [], upcomingSample: [] });
      }
    }

    console.log('🔍 DEBUG: Match availability check complete');
    return summary;
  }

  /**
   * Get the status of auto-prediction service
   */
  getStatus(): { 
    isGenerating: boolean; 
    lastGeneration: number; 
    nextAvailable: number;
    canGenerate: boolean;
  } {
    const now = Date.now();
    const nextAvailable = this.lastGenerationTime + this.GENERATION_COOLDOWN;
    
    return {
      isGenerating: this.isGeneratingPredictions,
      lastGeneration: this.lastGenerationTime,
      nextAvailable,
      canGenerate: !this.isGeneratingPredictions && now >= nextAvailable
    };
  }
}

// Export singleton instance
export const autoPredictionService = new AutoPredictionService();
