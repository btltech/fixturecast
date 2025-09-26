import { Prediction, Match, ConfidenceLevel, PredictionContext } from '../types';
import { calculatePredictionConfidence } from './confidenceService';
import { storeDailyPrediction } from './accuracyService';
import { withRateLimit } from './rateLimitService';

// Use environment variable for API key
const apiKey = (import.meta as any).env?.VITE_DEEPSEEK_API_KEY || (import.meta as any).env?.DEEPSEEK_API_KEY;
let deepSeekQueue: Promise<any> = Promise.resolve();
const DEEPSEEK_RETRY = 2;
const DEEPSEEK_BACKOFF_MS = 1500;

// DeepSeek API usage tracking
let deepSeekCallCount = 0;
let deepSeekCallsToday = 0;
let lastResetDate = new Date().toDateString();

// Reset daily counter if it's a new day
const resetDailyCounterIfNeeded = () => {
  const today = new Date().toDateString();
  if (lastResetDate !== today) {
    deepSeekCallsToday = 0;
    lastResetDate = today;
    console.log('📊 DeepSeek API daily counter reset for new day');
  }
};

// Set global flag for status display
if (typeof window !== 'undefined') {
  (window as any).deepSeekConfigured = !!apiKey;
}

if (!apiKey) {
  console.warn('DEEPSEEK_API_KEY not found - DeepSeek predictions will be disabled');
} else {
  console.log('✅ DeepSeek API key detected and configured');
}

// Utility to add a delay between API calls to respect rate limits
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// DeepSeek API call function
const callDeepSeekAPI = async (prompt: string, retryAttempt = 0): Promise<any> => {
  try {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-reasoner',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 4000,
        temperature: 0.1,
        response_format: { type: 'json_object' }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`DeepSeek API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid response format from DeepSeek API');
    }

    return data.choices[0].message.content;
  } catch (error: any) {
    console.error(`DeepSeek API call failed (attempt ${retryAttempt + 1}):`, error);
    
    if (retryAttempt < DEEPSEEK_RETRY) {
      await delay(DEEPSEEK_BACKOFF_MS * (retryAttempt + 1));
      return callDeepSeekAPI(prompt, retryAttempt + 1);
    }
    
    throw error;
  }
};

export const getDeepSeekMatchPrediction = async (match: Match, context?: PredictionContext, accuracyStats?: any): Promise<Prediction> => {
  try {
    // Check if API key is available
    if (!apiKey) {
      throw new Error('DeepSeek API key not configured. Set VITE_DEEPSEEK_API_KEY in environment.');
    }
    
    // Rate limiting delay
    await delay(1000);

    // Debug logging to see what context is being built
    console.log(`🔍 DeepSeek Context debug for ${match.homeTeam} vs ${match.awayTeam}:`, {
      hasContext: !!context,
      leagueTableSnippet: context?.leagueTableSnippet || 'None',
      homeTeamFormSnippet: context?.homeTeamFormSnippet || 'None',
      awayTeamFormSnippet: context?.awayTeamFormSnippet || 'None',
      headToHeadSnippet: context?.headToHeadSnippet || 'None',
    });

    // Build context prompt
    const contextPrompt = context ? `
MATCH CONTEXT DATA:
${context.leagueTableSnippet ? `- League Table: ${context.leagueTableSnippet}` : ''}
${context.homeTeamFormSnippet ? `- ${match.homeTeam} Recent Form: ${context.homeTeamFormSnippet}` : ''}
${context.awayTeamFormSnippet ? `- ${match.awayTeam} Recent Form: ${context.awayTeamFormSnippet}` : ''}
${context.headToHeadSnippet ? `- Head-to-Head: ${context.headToHeadSnippet}` : ''}
${context.homeTeamStatsSnippet ? `- ${match.homeTeam} Season Stats: ${context.homeTeamStatsSnippet}` : ''}
${context.awayTeamStatsSnippet ? `- ${match.awayTeam} Season Stats: ${context.awayTeamStatsSnippet}` : ''}
${context.bttsHistoricSnippet ? `- BTTS History: ${context.bttsHistoricSnippet}` : ''}
${context.homeTeamInjuriesSnippet ? `- ${match.homeTeam} Injuries: ${context.homeTeamInjuriesSnippet}` : ''}
${context.awayTeamInjuriesSnippet ? `- ${match.awayTeam} Injuries: ${context.awayTeamInjuriesSnippet}` : ''}
    ` : '';
    
    console.log(`📝 Generated DeepSeek context prompt:`, contextPrompt || 'No context data available');
    
    const prompt = `
You are an advanced football prediction AI using the DeepSeek-V3.1-Terminus reasoning model. Generate a detailed, probabilistic prediction for this football match.

**REASONING APPROACH:**
1. Analyze all available data systematically
2. Consider statistical patterns, team form, head-to-head records
3. Apply probabilistic reasoning to all market predictions
4. Ensure all probability sets sum to 100%
5. Provide detailed reasoning for confidence levels

**MATCH DETAILS:**
- League: ${match.league}
- Home Team: ${match.homeTeam}
- Away Team: ${match.awayTeam}
- Date: ${new Date(match.date).toISOString()}

${contextPrompt}

**REQUIRED OUTPUT:**
Return a JSON object with the following structure (ensure all probabilities are integers that sum to 100%):

{
  "homeWinProbability": <0-100>,
  "drawProbability": <0-100>,
  "awayWinProbability": <0-100>,
  "predictedScoreline": "<score like 2-1>",
  "confidence": "<Low|Medium|High>",
  "keyFactors": [
    {
      "category": "Statistical Analysis",
      "points": ["Point 1", "Point 2", "Point 3"]
    },
    {
      "category": "Form Analysis", 
      "points": ["Point 1", "Point 2"]
    },
    {
      "category": "Tactical Insights",
      "points": ["Point 1", "Point 2"]
    },
    {
      "category": "Risk Factors",
      "points": ["Point 1", "Point 2"]
    }
  ],
  "goalLine": {
    "line": 2.5,
    "overProbability": <0-100>,
    "underProbability": <0-100>
  },
  "btts": {
    "yesProbability": <0-100>,
    "noProbability": <0-100>
  },
  "htft": {
    "homeHome": <0-100>,
    "homeDraw": <0-100>,
    "homeAway": <0-100>,
    "drawHome": <0-100>,
    "drawDraw": <0-100>,
    "drawAway": <0-100>,
    "awayHome": <0-100>,
    "awayDraw": <0-100>,
    "awayAway": <0-100>
  },
  "scoreRange": {
    "zeroToOne": <0-100>,
    "twoToThree": <0-100>,
    "fourPlus": <0-100>
  },
  "firstGoalscorer": {
    "homeTeam": <0-100>,
    "awayTeam": <0-100>,
    "noGoalscorer": <0-100>
  },
  "cleanSheet": {
    "homeTeam": <0-100>,
    "awayTeam": <0-100>
  },
  "corners": {
    "over": <0-100>,
    "under": <0-100>
  },
  "expectedGoals": {
    "homeXg": <decimal like 1.8>,
    "awayXg": <decimal like 1.2>
  },
  "modelWeights": {
    "statistical": <0-100>,
    "tactical": <0-100>,
    "form": <0-100>,
    "historical": <0-100>
  },
  "uncertaintyMetrics": {
    "predictionVariance": <0-100>,
    "dataQuality": "<High|Medium|Low>",
    "modelAgreement": <0-100>
  }
}

**CRITICAL REQUIREMENTS:**
- All probability pairs/sets must sum to exactly 100
- Use realistic football scorelines (0-0 to 5-5 range)
- Base confidence on data quality and model agreement
- Provide substantive analysis in keyFactors
- Consider injury impacts, form trends, and tactical matchups
- Return ONLY valid JSON, no additional text
`;

    // Generate AI prediction with rate limiting
    const response = await withRateLimit('deepseek', async () => {
      // Reset daily counter if needed
      resetDailyCounterIfNeeded();
      
      const result = await callDeepSeekAPI(prompt);
      
      // Track successful API call
      deepSeekCallCount++;
      deepSeekCallsToday++;
      console.log(`✅ DeepSeek API call #${deepSeekCallCount} (${deepSeekCallsToday} today) - ${match.homeTeam} vs ${match.awayTeam}`);
      
      return result;
    }, DEEPSEEK_RETRY + 1);
    deepSeekQueue = deepSeekQueue.then(() => delay(1000)).catch(() => {});

    let predictionData: any;
    try {
      predictionData = JSON.parse(response);
      console.log(`✅ DeepSeek prediction parsed successfully for ${match.homeTeam} vs ${match.awayTeam}`);
    } catch (parseError) {
      console.error('Failed to parse DeepSeek response as JSON:', parseError);
      throw new Error('Invalid JSON response from DeepSeek API');
    }

    // Validate probabilities sum to 100
    const outcomeSum = predictionData.homeWinProbability + predictionData.drawProbability + predictionData.awayWinProbability;
    if (Math.abs(outcomeSum - 100) > 1) {
      console.warn(`⚠️ DeepSeek probability sum validation failed: ${outcomeSum}%, normalizing...`);
      const factor = 100 / outcomeSum;
      predictionData.homeWinProbability = Math.round(predictionData.homeWinProbability * factor);
      predictionData.drawProbability = Math.round(predictionData.drawProbability * factor);
      predictionData.awayWinProbability = 100 - predictionData.homeWinProbability - predictionData.drawProbability;
    }

    // Calculate and set confidence based on DeepSeek's internal metrics
    // Use the confidence from DeepSeek's response or calculate a fallback
    let calculatedConfidence: ConfidenceLevel;
    
    if (accuracyStats && typeof accuracyStats === 'object' && 'overallAccuracy' in accuracyStats) {
      const confidenceAnalysis = calculatePredictionConfidence({
        ...predictionData,
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        league: match.league,
        date: match.date
      } as Prediction, accuracyStats);
      calculatedConfidence = confidenceAnalysis.level;
    } else {
      // Fallback confidence calculation based on prediction variance
      const variance = predictionData.uncertaintyMetrics?.predictionVariance || 50;
      const modelAgreement = predictionData.uncertaintyMetrics?.modelAgreement || 75;
      
      if (variance < 20 && modelAgreement > 80) {
        calculatedConfidence = 'High' as ConfidenceLevel;
      } else if (variance < 40 && modelAgreement > 60) {
        calculatedConfidence = 'Medium' as ConfidenceLevel;
      } else {
        calculatedConfidence = 'Low' as ConfidenceLevel;
      }
    }
    
    predictionData.confidence = calculatedConfidence;

    console.log(`📊 DeepSeek prediction complete for ${match.homeTeam} vs ${match.awayTeam}:`, {
      outcome: `${predictionData.homeWinProbability}% / ${predictionData.drawProbability}% / ${predictionData.awayWinProbability}%`,
      scoreline: predictionData.predictedScoreline,
      confidence: predictionData.confidence,
      btts: `${predictionData.btts?.yesProbability}% Yes`,
      goalLine: `O${predictionData.goalLine?.line}: ${predictionData.goalLine?.overProbability}%`
    });

    // Store prediction for accuracy tracking if enabled
    if (accuracyStats !== false) {
      try {
        await storeDailyPrediction(match, predictionData as Prediction);
        console.log(`📊 Stored DeepSeek prediction for accuracy tracking: ${match.homeTeam} vs ${match.awayTeam}`);
      } catch (storageError) {
        console.warn('Failed to store DeepSeek prediction for tracking:', storageError);
      }
    }

    return predictionData as Prediction;
    
  } catch (error: any) {
    console.error("Error fetching prediction from DeepSeek API:", error);
    
    // Re-throw the error instead of using fallback data
    if (error && typeof error.message === 'string' && error.message.includes("rate limit")) {
        throw new Error("API rate limit exceeded. Please try again later.");
    } else if (error instanceof Error) {
        throw error;
    } else {
        throw new Error("Failed to generate DeepSeek prediction. Please try again.");
    }
  }
};

// Get DeepSeek API usage statistics
export const getDeepSeekApiUsage = () => {
  resetDailyCounterIfNeeded();
  return {
    totalCalls: deepSeekCallCount,
    callsToday: deepSeekCallsToday,
    lastResetDate,
    isConfigured: !!apiKey
  };
};

// Export for potential future use
export const resetDeepSeekUsage = () => {
  deepSeekCallCount = 0;
  deepSeekCallsToday = 0;
  console.log('🔄 DeepSeek API usage counters reset');
};