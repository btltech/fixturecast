
// Gemini service now proxies through Cloudflare Pages Function (/api/ai/gemini/predict)
// to avoid exposing the API key in client code. This file keeps the same external
// interface but no longer imports the Gemini SDK directly.
import { Prediction, Match, PredictionContext } from '../types';
import { calculatePredictionConfidence } from './confidenceService';
import { storeDailyPrediction } from './accuracyService';
import { withRateLimit } from './rateLimitService';

const GEMINI_RETRY = 2; // kept for potential retry logic of proxy failures
const PROXY_ENDPOINT = '/api/ai/gemini/predict';

// Gemini API usage tracking
let geminiCallCount = 0;
let geminiCallsToday = 0;
let lastResetDate = new Date().toDateString();

// Reset daily counter if it's a new day
const resetDailyCounterIfNeeded = () => {
  const today = new Date().toDateString();
  if (lastResetDate !== today) {
    geminiCallsToday = 0;
    lastResetDate = today;
    console.log('📊 Gemini API daily counter reset for new day');
  }
};

// Set global flag (true assumes server has key; we cannot detect from client)
if (typeof window !== 'undefined') {
  (window as any).geminiConfigured = true; // optimistic; server enforces real availability
}

// Utility to add a delay between API calls to respect rate limits
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// No fallback: predictions require Gemini API key

// We no longer define a schema client-side; server handles prompt & parsing.

export const getMatchPrediction = async (match: Match, context?: PredictionContext, accuracyStats?: any): Promise<Prediction> => {
  // Detect environment: use DeepSeek for local dev, Gemini for Worker/production
  const isWorkerEnvironment = typeof window === 'undefined' || (globalThis as any).WorkerGlobalScope;
  // Detect Vitest/Jest style test environment to force Gemini path (avoid DeepSeek branch & network)
  const isTestEnv = !!((typeof process !== 'undefined' && (process.env?.VITEST || process.env?.NODE_ENV === 'test')) || (import.meta as any)?.vitest);
  const isLocalDevelopment = !isWorkerEnvironment && !isTestEnv && typeof window !== 'undefined' && window.location.hostname === 'localhost';
  
  // Use DeepSeek for local development, Gemini for Worker/production
  if (isLocalDevelopment) {
    console.log('🤖 Using DeepSeek API for local prediction generation');
    const { getDeepSeekMatchPrediction } = await import('./deepSeekService');
    return getDeepSeekMatchPrediction(match, context, accuracyStats);
  }

  console.log('🔮 Using Gemini proxy endpoint for Worker/production prediction generation');
  
  try {
    // (Proxy will enforce key presence server-side)

  // Apply artificial delay in real usage; skip or reduce in tests to avoid timeouts
  const delayMs = isTestEnv ? 10 : 2000;
  await delay(delayMs);

    // Debug logging to see what context is being built
    console.log(`🔍 Context debug for ${match.homeTeam} vs ${match.awayTeam}:`, {
      hasContext: !!context,
      leagueTableSnippet: context?.leagueTableSnippet || 'None',
      homeTeamFormSnippet: context?.homeTeamFormSnippet || 'None',
      awayTeamFormSnippet: context?.awayTeamFormSnippet || 'None',
      headToHeadSnippet: context?.headToHeadSnippet || 'None',
      homeTeamStatsSnippet: context?.homeTeamStatsSnippet || 'None',
      awayTeamStatsSnippet: context?.awayTeamStatsSnippet || 'None',
      homeTeamInjuriesSnippet: context?.homeTeamInjuriesSnippet || 'None',
      awayTeamInjuriesSnippet: context?.awayTeamInjuriesSnippet || 'None'
    });

    const contextPrompt = (context && (context.leagueTableSnippet || context.homeTeamFormSnippet || context.awayTeamFormSnippet || context.headToHeadSnippet)) ? `
      **Current Context (for enhanced analysis):**
      ${context.leagueTableSnippet ? `\n- Current League Standings: ${context.leagueTableSnippet}` : ''}
      ${context.homeTeamFormSnippet ? `\n- ${match.homeTeam} Recent Form (Last 5): ${context.homeTeamFormSnippet}` : ''}
      ${context.awayTeamFormSnippet ? `\n- ${match.awayTeam} Recent Form (Last 5): ${context.awayTeamFormSnippet}` : ''}
      ${context.headToHeadSnippet ? `\n- Head-to-Head: ${context.headToHeadSnippet}` : ''}
      ${context.homeTeamStatsSnippet ? `\n- ${match.homeTeam} Season Stats: ${context.homeTeamStatsSnippet}` : ''}
      ${context.awayTeamStatsSnippet ? `\n- ${match.awayTeam} Season Stats: ${context.awayTeamStatsSnippet}` : ''}
      ${context.bttsHistoricSnippet ? `\n- BTTS History: ${context.bttsHistoricSnippet}` : ''}
      ${context.homeTeamInjuriesSnippet ? `\n- ${match.homeTeam} Injuries: ${context.homeTeamInjuriesSnippet}` : ''}
      ${context.awayTeamInjuriesSnippet ? `\n- ${match.awayTeam} Injuries: ${context.awayTeamInjuriesSnippet}` : ''}
    ` : '';
    
    console.log(`📝 Generated context prompt:`, contextPrompt || 'No context data available');
    
    const prompt = `
You are a football prediction engine that generates detailed, on-demand predictions for a single, user-selected fixture inside the "My Teams" tab. This must never run automatically.

DATA SOURCE POLICY
- Use API-Football ONLY for all real-time and historical data (fixtures, teams, standings, stats, H2H, injuries/suspensions, lineups, venues, schedules). Do not use any other data source. Do not infer unavailable data.
- All timestamps in outputs must map to the API-Football fixture timestamp and season identifiers when available in context. If missing, mark as Not available and degrade confidence.

INPUTS (from API-Football)
- Competition/season identifiers, fixture (home/away, venue), recent form (last 5–10 matches with recency weighting), head-to-head (wins/draws, BTTS), team stats (goals, xG/xGA, shots, possession, discipline, corners), squad status (injuries/suspensions), context (rest days, congestion, travel/time zone, venue/weather if present).

MODELING (Ensemble)
- GBDT baseline over tabular features; Poisson regression to convert adjusted xG/xGA to expected goals and discrete scoreline probabilities; LSTM for recent form momentum; GNN (or team-level fallback) for lineup/tactical interactions; Bayesian layer to widen uncertainty for injuries/fatigue/travel and sparse national-team history.

FEATURE ENGINEERING
- Rolling form windows (5–10) with time-decay, opponent-adjusted ratings, venue-adjusted performance, attack/defense indices, set-piece threat, pressing/crossing profiles, discipline risk, home advantage, league/tournament style, and congestion/rest.
- For national teams with sparse data, reduce reliance on stale history and down-weight H2H.

PIPELINE
1) Prepare features normalized to league context, with time weighting.
2) Multi-model generation (GBDT, Poisson-xG, LSTM, GNN, Bayesian overlay).
3) Ensemble combination → calibrated 1X2 probabilities aligned with the aggregated scoreline distribution.
4) Confidence calibration → High/Medium/Low using data richness, model agreement, and national-team sparsity flags.
5) Structured reasoning sections: ML consensus, statistical patterns, tactical notes, uncertainty factors.
6) Markets: BTTS, O/U 2.5 (and 1.5/3.5 if data allows), HT/FT, score ranges, corners.

POST-PROCESSING RULES
- Normalize every probability set to 100% (1X2, BTTS, O/U, HT/FT). Ensure Poisson scoreline probabilities integrate to 1 and are consistent with expected goals and outcome probabilities. Round sensibly while maintaining normalization.
- Degrade gracefully with sparse or missing inputs: widen distributions and lower confidence; explicitly state uncertainty drivers in reasoning.

MATCH
- League: ${match.league}
- Home Team: ${match.homeTeam}
- Away Team: ${match.awayTeam}
- Date: ${new Date(match.date).toISOString()}

CONTEXT (provided)
${contextPrompt}

OUTPUT FORMAT
- Return ONLY JSON per the provided response schema (no extra keys, no Markdown, no prose outside JSON). Then, after the JSON, provide concise reasoning notes sections (plain text), as described.
- However, you MUST serialize the JSON to match the response schema supplied by the system (do not invent fields). If some inputs are not available, still produce calibrated outputs and reflect uncertainty.
`;

    // Generate AI prediction with rate limiting and retry
    const response = await withRateLimit('gemini', async () => {
      resetDailyCounterIfNeeded();
      const r = await fetch(PROXY_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ match, context, accuracyStats })
      });
      if (!r.ok) {
        let bodyText = await r.text();
        let parsedErr: any = null;
        try { parsedErr = JSON.parse(bodyText); } catch {}
        const coreMsg = parsedErr?.error || bodyText;

        // Special handling: Gemini not configured (missing secret on Pages env)
        if (coreMsg && /gemini not configured/i.test(coreMsg)) {
          if (typeof window !== 'undefined') {
            (window as any).geminiConfigured = false;
          }
          throw new Error('Gemini unavailable: server secret missing. Admin must set GEMINI_API_KEY in Cloudflare Pages project.');
        }

        throw new Error(`Gemini proxy error (${r.status}): ${coreMsg}`);
      }
      return r.json();
    }, GEMINI_RETRY + 1);

    const predictionData = response.prediction || response;

    // Normalize probabilities to ensure they sum to 100
    const totalProb = predictionData.homeWinProbability + predictionData.drawProbability + predictionData.awayWinProbability;
    if (totalProb > 0) {
      predictionData.homeWinProbability = Math.round((predictionData.homeWinProbability / totalProb) * 100);
      predictionData.awayWinProbability = Math.round((predictionData.awayWinProbability / totalProb) * 100);
      predictionData.drawProbability = 100 - predictionData.homeWinProbability - predictionData.awayWinProbability;
    }
    
    // Normalize BTTS if present
    if (predictionData.btts) {
      const bttsTotal = (predictionData.btts.yesProbability || 0) + (predictionData.btts.noProbability || 0);
      if (bttsTotal > 0) {
        predictionData.btts.yesProbability = Math.round((predictionData.btts.yesProbability / bttsTotal) * 100);
        predictionData.btts.noProbability = 100 - predictionData.btts.yesProbability;
      }
    }

    // Normalize HT/FT if present
    if (predictionData.htft) {
      const htftObj = predictionData.htft as any;
      let htftTotal = 0;
      
      // Calculate total safely
      Object.keys(htftObj).forEach(key => {
        const val = htftObj[key];
        const numVal = typeof val === 'number' ? val : (Number(val) || 0);
        htftTotal += numVal;
      });
      
      // Normalize if total > 0
      if (htftTotal > 0) {
        Object.keys(htftObj).forEach(key => {
          const val = htftObj[key];
          const numVal = typeof val === 'number' ? val : (Number(val) || 0);
          htftObj[key] = Math.round((numVal / htftTotal) * 100);
        });
      }
    }

    // Normalize Score Range if present
    if (predictionData.scoreRange) {
      const scoreTotal = (predictionData.scoreRange.zeroToOne || 0) + (predictionData.scoreRange.twoToThree || 0) + (predictionData.scoreRange.fourPlus || 0);
      if (scoreTotal > 0) {
        predictionData.scoreRange.zeroToOne = Math.round((predictionData.scoreRange.zeroToOne / scoreTotal) * 100);
        predictionData.scoreRange.twoToThree = Math.round((predictionData.scoreRange.twoToThree / scoreTotal) * 100);
        predictionData.scoreRange.fourPlus = 100 - predictionData.scoreRange.zeroToOne - predictionData.scoreRange.twoToThree;
      }
    }

    // Normalize First Goalscorer if present
    if (predictionData.firstGoalscorer) {
      const fgTotal = (predictionData.firstGoalscorer.homeTeam || 0) + (predictionData.firstGoalscorer.awayTeam || 0) + (predictionData.firstGoalscorer.noGoalscorer || 0);
      if (fgTotal > 0) {
        predictionData.firstGoalscorer.homeTeam = Math.round((predictionData.firstGoalscorer.homeTeam / fgTotal) * 100);
        predictionData.firstGoalscorer.awayTeam = Math.round((predictionData.firstGoalscorer.awayTeam / fgTotal) * 100);
        predictionData.firstGoalscorer.noGoalscorer = 100 - predictionData.firstGoalscorer.homeTeam - predictionData.firstGoalscorer.awayTeam;
      }
    }

    // Normalize Corners if present
    if (predictionData.corners) {
      const cornersTotal = (predictionData.corners.over || 0) + (predictionData.corners.under || 0);
      if (cornersTotal > 0) {
        predictionData.corners.over = Math.round((predictionData.corners.over / cornersTotal) * 100);
        predictionData.corners.under = 100 - predictionData.corners.over;
      }
    }

    // Normalize Model Weights if present
    if (predictionData.modelWeights) {
      const weightsTotal = (predictionData.modelWeights.xgboost || 0) + (predictionData.modelWeights.poisson || 0) + (predictionData.modelWeights.neuralNet || 0) + (predictionData.modelWeights.bayesian || 0);
      if (weightsTotal > 0) {
        predictionData.modelWeights.xgboost = Math.round((predictionData.modelWeights.xgboost / weightsTotal) * 100);
        predictionData.modelWeights.poisson = Math.round((predictionData.modelWeights.poisson / weightsTotal) * 100);
        predictionData.modelWeights.neuralNet = Math.round((predictionData.modelWeights.neuralNet / weightsTotal) * 100);
        predictionData.modelWeights.bayesian = 100 - predictionData.modelWeights.xgboost - predictionData.modelWeights.poisson - predictionData.modelWeights.neuralNet;
      }
    }

    // Validate Expected Goals are reasonable (0-5 range typically)
    if (predictionData.expectedGoals) {
      predictionData.expectedGoals.homeXg = Math.max(0, Math.min(5, predictionData.expectedGoals.homeXg || 0));
      predictionData.expectedGoals.awayXg = Math.max(0, Math.min(5, predictionData.expectedGoals.awayXg || 0));
    }

    // Validate Uncertainty Metrics
    if (predictionData.uncertaintyMetrics) {
      predictionData.uncertaintyMetrics.predictionVariance = Math.max(0, Math.min(100, predictionData.uncertaintyMetrics.predictionVariance || 50));
      predictionData.uncertaintyMetrics.modelAgreement = Math.max(0, Math.min(100, predictionData.uncertaintyMetrics.modelAgreement || 75));
    }

    // Add confidence percentage if accuracy stats are available
    if (accuracyStats) {
      const confidenceAnalysis = calculatePredictionConfidence(predictionData, accuracyStats, {
        league: match.league,
        hasRecentForm: !!context?.homeTeamFormSnippet,
        hasHeadToHead: !!context?.headToHeadSnippet
      });
      
      predictionData.confidencePercentage = confidenceAnalysis.percentage;
      predictionData.confidenceReason = confidenceAnalysis.reason;
    }

    // Auto-store prediction for accuracy tracking (only if it's for today's match)
    const matchDate = new Date(match.date);
    const today = new Date();
    const isToday = matchDate.toDateString() === today.toDateString();
    
    if (isToday) {
      try {
        await storeDailyPrediction(match, predictionData as Prediction);
        console.log(`📊 Stored prediction for accuracy tracking: ${match.homeTeam} vs ${match.awayTeam}`);
      } catch (storageError) {
        console.warn('Failed to store prediction for tracking:', storageError);
      }
    }

  return predictionData as Prediction;
    
  } catch (error: any) {
    console.error("Error fetching prediction from Gemini API:", error);
    if (error?.message?.toLowerCase()?.includes('rate limit')) {
      console.warn('🔁 Gemini rate limit surfaced to caller. Consider raising min interval or lowering RPM env overrides.');
    }
    
    // Re-throw the error instead of using fallback data
    if (error && typeof error.message === 'string' && error.message.includes("RESOURCE_EXHAUSTED")) {
        throw new Error("API rate limit exceeded. Please try again later.");
    } else if (error instanceof Error) {
        throw error;
    } else {
        throw new Error("Failed to generate prediction. Please try again.");
    }
  }
};

// Get Gemini API usage statistics
export const getGeminiApiUsage = () => {
  resetDailyCounterIfNeeded();
  return {
    totalCalls: geminiCallCount,
    callsToday: geminiCallsToday,
    lastResetDate,
    isConfigured: true // assume proxy available
  };
};

