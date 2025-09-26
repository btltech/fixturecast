
import { GoogleGenAI, Type } from "@google/genai";
import { Prediction, Match, ConfidenceLevel, PredictionContext } from '../types';
import { calculatePredictionConfidence } from './confidenceService';
import { storeDailyPrediction } from './accuracyService';
import { withRateLimit } from './rateLimitService';

// Use environment variable for API key
const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || (import.meta as any).env?.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;
let geminiQueue: Promise<any> = Promise.resolve();
const GEMINI_RETRY = 2;
const GEMINI_BACKOFF_MS = 1500;

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

if (apiKey) {
  ai = new GoogleGenAI({ apiKey });
  // Set global flag for status display
  if (typeof window !== 'undefined') {
    (window as any).geminiConfigured = true;
  }
} else {
  console.warn('GEMINI_API_KEY not found - predictions will be disabled');
  // Set global flag for status display
  if (typeof window !== 'undefined') {
    (window as any).geminiConfigured = false;
  }
}

// Utility to add a delay between API calls to respect rate limits
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// No fallback: predictions require Gemini API key

const predictionSchema = {
  type: Type.OBJECT,
  properties: {
    homeWinProbability: {
      type: Type.NUMBER,
      description: "Probability of the home team winning (0-100).",
    },
    drawProbability: {
      type: Type.NUMBER,
      description: "Probability of a draw (0-100).",
    },
    awayWinProbability: {
      type: Type.NUMBER,
      description: "Probability of the away team winning (0-100).",
    },
    predictedScoreline: {
      type: Type.STRING,
      description: "The most statistically probable final score (e.g., '2-1').",
    },
    confidence: {
      type: Type.STRING,
      enum: ["Low", "Medium", "High"],
      description: "The model's confidence in its prediction.",
    },
    keyFactors: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          category: {
            type: Type.STRING,
            description: "The category of the key factors (e.g., 'ML Model Consensus', 'Statistical Patterns', 'Tactical Analysis', 'Uncertainty Factors')."
          },
          points: {
            type: Type.ARRAY,
            items: {
              type: Type.STRING,
            },
            description: "A list of specific points within this category."
          }
        },
        required: ["category", "points"]
      },
      description: "A categorized list of key factors from ensemble ML analysis, including model consensus, statistical patterns, tactical insights, and uncertainty quantification.",
    },
    goalLine: {
      type: Type.OBJECT,
      description: "Prediction for the Over/Under goal line, typically 2.5 goals.",
      properties: {
        line: { type: Type.NUMBER, description: "The goal line (e.g., 2.5)." },
        overProbability: { type: Type.NUMBER, description: "Probability of total goals being OVER the line (0-100)." },
        underProbability: { type: Type.NUMBER, description: "Probability of total goals being UNDER the line (0-100)." }
      },
      required: ["line", "overProbability", "underProbability"]
    },
    btts: {
      type: Type.OBJECT,
      description: "Both Teams To Score market prediction.",
      properties: {
        yesProbability: { type: Type.NUMBER, description: "Probability that both teams score (0-100)." },
        noProbability: { type: Type.NUMBER, description: "Probability that at least one team fails to score (0-100)." }
      },
      required: ["yesProbability", "noProbability"]
    },
    htft: {
      type: Type.OBJECT,
      description: "Half-Time/Full-Time prediction with all 9 possible combinations.",
      properties: {
        homeHome: { type: Type.NUMBER, description: "Home team leads at HT, wins at FT (0-100)." },
        homeDraw: { type: Type.NUMBER, description: "Home team leads at HT, draws at FT (0-100)." },
        homeAway: { type: Type.NUMBER, description: "Home team leads at HT, loses at FT (0-100)." },
        drawHome: { type: Type.NUMBER, description: "Draw at HT, home team wins at FT (0-100)." },
        drawDraw: { type: Type.NUMBER, description: "Draw at HT, draw at FT (0-100)." },
        drawAway: { type: Type.NUMBER, description: "Draw at HT, away team wins at FT (0-100)." },
        awayHome: { type: Type.NUMBER, description: "Away team leads at HT, home team wins at FT (0-100)." },
        awayDraw: { type: Type.NUMBER, description: "Away team leads at HT, draws at FT (0-100)." },
        awayAway: { type: Type.NUMBER, description: "Away team leads at HT, wins at FT (0-100)." }
      },
      required: ["homeHome", "homeDraw", "homeAway", "drawHome", "drawDraw", "drawAway", "awayHome", "awayDraw", "awayAway"]
    },
    scoreRange: {
      type: Type.OBJECT,
      description: "Total goals range prediction.",
      properties: {
        zeroToOne: { type: Type.NUMBER, description: "Probability of 0-1 total goals (0-100)." },
        twoToThree: { type: Type.NUMBER, description: "Probability of 2-3 total goals (0-100)." },
        fourPlus: { type: Type.NUMBER, description: "Probability of 4+ total goals (0-100)." }
      },
      required: ["zeroToOne", "twoToThree", "fourPlus"]
    },
    firstGoalscorer: {
      type: Type.OBJECT,
      description: "First goalscorer type prediction.",
      properties: {
        homeTeam: { type: Type.NUMBER, description: "Probability home team scores first (0-100)." },
        awayTeam: { type: Type.NUMBER, description: "Probability away team scores first (0-100)." },
        noGoalscorer: { type: Type.NUMBER, description: "Probability of no goals scored (0-100)." }
      },
      required: ["homeTeam", "awayTeam", "noGoalscorer"]
    },
    cleanSheet: {
      type: Type.OBJECT,
      description: "Clean sheet prediction for both teams.",
      properties: {
        homeTeam: { type: Type.NUMBER, description: "Probability home team keeps clean sheet (0-100)." },
        awayTeam: { type: Type.NUMBER, description: "Probability away team keeps clean sheet (0-100)." }
      },
      required: ["homeTeam", "awayTeam"]
    },
    corners: {
      type: Type.OBJECT,
      description: "Corner prediction (Over/Under 9.5 corners).",
      properties: {
        over: { type: Type.NUMBER, description: "Probability of over 9.5 corners (0-100)." },
        under: { type: Type.NUMBER, description: "Probability of under 9.5 corners (0-100)." }
      },
      required: ["over", "under"]
    },
    expectedGoals: {
      type: Type.OBJECT,
      description: "Expected goals (xG) predictions from Poisson modeling.",
      properties: {
        homeXg: { type: Type.NUMBER, description: "Expected goals for home team (e.g., 1.8)." },
        awayXg: { type: Type.NUMBER, description: "Expected goals for away team (e.g., 1.2)." }
      },
      required: ["homeXg", "awayXg"]
    },
    modelWeights: {
      type: Type.OBJECT,
      description: "Ensemble model contribution weights for transparency.",
      properties: {
        xgboost: { type: Type.NUMBER, description: "XGBoost model weight in ensemble (0-100)." },
        poisson: { type: Type.NUMBER, description: "Poisson regression weight in ensemble (0-100)." },
        neuralNet: { type: Type.NUMBER, description: "Neural network weight in ensemble (0-100)." },
        bayesian: { type: Type.NUMBER, description: "Bayesian model weight in ensemble (0-100)." }
      },
      required: ["xgboost", "poisson", "neuralNet", "bayesian"]
    },
    uncertaintyMetrics: {
      type: Type.OBJECT,
      description: "Prediction uncertainty and confidence intervals.",
      properties: {
        predictionVariance: { type: Type.NUMBER, description: "Statistical variance in ensemble predictions (0-100)." },
        dataQuality: { type: Type.STRING, enum: ["High", "Medium", "Low"], description: "Quality of available data for analysis." },
        modelAgreement: { type: Type.NUMBER, description: "Percentage agreement between ensemble models (0-100)." }
      },
      required: ["predictionVariance", "dataQuality", "modelAgreement"]
    }
  },
  required: [
    "homeWinProbability",
    "drawProbability",
    "awayWinProbability",
    "predictedScoreline",
    "confidence",
    "keyFactors",
    "goalLine",
    "btts",
    "htft",
    "scoreRange",
    "firstGoalscorer",
    "cleanSheet",
    "corners",
    "expectedGoals",
    "modelWeights",
    "uncertaintyMetrics"
  ],
};

export const getMatchPrediction = async (match: Match, context?: PredictionContext, accuracyStats?: any): Promise<Prediction> => {
  try {
    // Check if AI is available
    if (!ai) {
      throw new Error('Gemini API key not configured. Set VITE_GEMINI_API_KEY in environment.');
    }
    
    // With higher quota, reduce delay for faster UX
    await delay(2000);

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
      // Reset daily counter if needed
      resetDailyCounterIfNeeded();
      
      const result = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: predictionSchema,
        },
      });
      
      // Track successful API call
      geminiCallCount++;
      geminiCallsToday++;
      console.log(`✅ Gemini API call #${geminiCallCount} (${geminiCallsToday} today) - ${match.homeTeam} vs ${match.awayTeam}`);
      
      return result;
    }, GEMINI_RETRY + 1);
    
    const jsonText = response.text.trim();
    const predictionData = JSON.parse(jsonText);

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
    isConfigured: !!apiKey
  };
};

