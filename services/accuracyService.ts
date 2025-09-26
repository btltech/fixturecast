// Frontend Accuracy Service - uses worker endpoints as source of truth
export interface DailyAccuracyStats {
  date: string;
  processed: number;
  outcomeAccuracyPct: number;
  exactScoreAccuracyPct: number;
  bttsAccuracyPct: number;
  overallAccuracyPct: number;
  leagueBreakdown?: any[];
  processedAt?: string;
}

export interface AccuracyTrendPoint {
  date: string;
  overallAccuracyPct: number | null;
  processed: number;
}

const WORKER_BASE = 'https://fixturecast-cron-worker.btltech.workers.dev';

async function safeJson(res: Response) {
  try { return await res.json(); } catch { return null; }
}

export async function fetchDailyAccuracy(date?: string): Promise<DailyAccuracyStats | null> {
  const url = `${WORKER_BASE}/accuracy/today${date ? `?date=${date}` : ''}`;
  try {
    const res = await fetch(url, { headers: { 'Accept':'application/json' }});
    if (!res.ok) return null;
    const data = await safeJson(res);
    if (!data || !data.stats) return null;
    return data.stats as DailyAccuracyStats;
  } catch {
    return null;
  }
}

export async function fetchAccuracyTrend(days: number = 7): Promise<AccuracyTrendPoint[]> {
  try {
    const res = await fetch(`${WORKER_BASE}/accuracy/trend?days=${days}`, { headers: { 'Accept':'application/json' }});
    if (!res.ok) return [];
    const data = await safeJson(res);
    return data?.trend || [];
  } catch { return []; }
}

export const accuracyService = {
  fetchDailyAccuracy,
  fetchAccuracyTrend
};
import { Prediction, PredictionAccuracy, AccuracyStats, Match } from '../types';
import { cloudPredictionService } from './cloudPredictionService';

// Enhanced accuracy tracking with match result fetching
export const ACCURACY_STORAGE_KEY = 'fixturecast_accuracy_data';
export const DAILY_PREDICTIONS_KEY = 'fixturecast_daily_predictions';

export const calculatePredictionAccuracy = (
  prediction: Prediction,
  actualResult: { homeScore: number; awayScore: number }
): PredictionAccuracy['accuracy'] => {
  const { homeScore, awayScore } = actualResult;
  const totalGoals = homeScore + awayScore;

  // Determine actual outcome
  const actualOutcome = homeScore > awayScore ? 'home' : homeScore < awayScore ? 'away' : 'draw';
  
  // Determine predicted outcome
  const predictedOutcome = 
    prediction.homeWinProbability > prediction.drawProbability && 
    prediction.homeWinProbability > prediction.awayWinProbability ? 'home' :
    prediction.awayWinProbability > prediction.drawProbability ? 'away' : 'draw';

  // Calculate accuracy for each prediction type
  const accuracy = {
    // Outcome accuracy (Win/Draw/Loss)
    outcome: actualOutcome === predictedOutcome,

    // Exact scoreline accuracy
    scoreline: prediction.predictedScoreline === `${homeScore}-${awayScore}`,

    // BTTS accuracy
    btts: prediction.btts ? (
      (homeScore > 0 && awayScore > 0) ? 
        prediction.btts.yesProbability > prediction.btts.noProbability :
        prediction.btts.noProbability > prediction.btts.yesProbability
    ) : false,

    // Goal line accuracy (Over/Under 2.5)
    goalLine: prediction.goalLine ? (
      totalGoals > prediction.goalLine.line ? 
        prediction.goalLine.overProbability > prediction.goalLine.underProbability :
        prediction.goalLine.underProbability > prediction.goalLine.overProbability
    ) : false,

    // HT/FT accuracy (simplified - would need actual HT score for real accuracy)
    htft: false, // Placeholder - requires HT score data

    // Score range accuracy
    scoreRange: prediction.scoreRange ? (
      totalGoals <= 1 ? prediction.scoreRange.zeroToOne > prediction.scoreRange.twoToThree && 
                        prediction.scoreRange.zeroToOne > prediction.scoreRange.fourPlus :
      totalGoals <= 3 ? prediction.scoreRange.twoToThree > prediction.scoreRange.zeroToOne && 
                        prediction.scoreRange.twoToThree > prediction.scoreRange.fourPlus :
                        prediction.scoreRange.fourPlus > prediction.scoreRange.zeroToOne && 
                        prediction.scoreRange.fourPlus > prediction.scoreRange.twoToThree
    ) : false,

    // First goalscorer accuracy (simplified - would need actual first scorer data)
    firstGoalscorer: false, // Placeholder - requires first scorer data

    // Clean sheet accuracy
    cleanSheet: prediction.cleanSheet ? {
      homeTeam: awayScore === 0 ? 
        prediction.cleanSheet.homeTeam > (100 - prediction.cleanSheet.homeTeam) :
        prediction.cleanSheet.homeTeam < (100 - prediction.cleanSheet.homeTeam),
      awayTeam: homeScore === 0 ? 
        prediction.cleanSheet.awayTeam > (100 - prediction.cleanSheet.awayTeam) :
        prediction.cleanSheet.awayTeam < (100 - prediction.cleanSheet.awayTeam)
    } : { homeTeam: false, awayTeam: false },

    // Corner accuracy (simplified - would need actual corner count)
    corners: false // Placeholder - requires corner data
  };

  return {
    outcome: accuracy.outcome,
    scoreline: accuracy.scoreline,
    btts: accuracy.btts,
    goalLine: accuracy.goalLine,
    htft: accuracy.htft,
    scoreRange: accuracy.scoreRange,
    firstGoalscorer: accuracy.firstGoalscorer,
    cleanSheet: accuracy.cleanSheet.homeTeam || accuracy.cleanSheet.awayTeam,
    corners: accuracy.corners
  };
};

export const calculateAccuracyStats = (accuracyRecords: PredictionAccuracy[]): AccuracyStats => {
  if (accuracyRecords.length === 0) {
    return {
      totalPredictions: 0,
      correctOutcomes: 0,
      correctScorelines: 0,
      correctBtts: 0,
      correctGoalLine: 0,
      correctHtft: 0,
      correctScoreRange: 0,
      correctFirstGoalscorer: 0,
      correctCleanSheet: 0,
      correctCorners: 0,
      recentAccuracy: { last10: 0, last20: 0, last50: 0 },
      overallAccuracy: 0
    };
  }

  const total = accuracyRecords.length;
  const correctOutcomes = accuracyRecords.filter(r => r.accuracy.outcome).length;
  const correctScorelines = accuracyRecords.filter(r => r.accuracy.scoreline).length;
  const correctBtts = accuracyRecords.filter(r => r.accuracy.btts).length;
  const correctGoalLine = accuracyRecords.filter(r => r.accuracy.goalLine).length;
  const correctHtft = accuracyRecords.filter(r => r.accuracy.htft).length;
  const correctScoreRange = accuracyRecords.filter(r => r.accuracy.scoreRange).length;
  const correctFirstGoalscorer = accuracyRecords.filter(r => r.accuracy.firstGoalscorer).length;
  const correctCleanSheet = accuracyRecords.filter(r => r.accuracy.cleanSheet).length;
  const correctCorners = accuracyRecords.filter(r => r.accuracy.corners).length;

  // Calculate recent accuracy
  const last10 = accuracyRecords.slice(-10);
  const last20 = accuracyRecords.slice(-20);
  const last50 = accuracyRecords.slice(-50);

  const recentAccuracy = {
    last10: last10.length > 0 ? Math.round((last10.filter(r => r.accuracy.outcome).length / last10.length) * 100) : 0,
    last20: last20.length > 0 ? Math.round((last20.filter(r => r.accuracy.outcome).length / last20.length) * 100) : 0,
    last50: last50.length > 0 ? Math.round((last50.filter(r => r.accuracy.outcome).length / last50.length) * 100) : 0
  };

  return {
    totalPredictions: total,
    correctOutcomes,
    correctScorelines,
    correctBtts,
    correctGoalLine,
    correctHtft,
    correctScoreRange,
    correctFirstGoalscorer,
    correctCleanSheet,
    correctCorners,
    recentAccuracy,
    overallAccuracy: Math.round((correctOutcomes / total) * 100)
  };
};

export const getAccuracyPercentage = (correct: number, total: number): number => {
  return total > 0 ? Math.round((correct / total) * 100) : 0;
};

export const formatAccuracyDisplay = (stats: AccuracyStats): string => {
  if (stats.totalPredictions === 0) {
    return "Predictions will appear after first matchday";
  }
  
  const recent = stats.recentAccuracy.last10;
  const total = stats.totalPredictions;
  const overall = stats.overallAccuracy;
  
  return `Last 10: ${recent}% | Overall: ${overall}% (${stats.correctOutcomes}/${total})`;
};

// ---- Calibration helpers ----

const safeProb = (p: number): number => {
  const x = Math.max(0, Math.min(100, p));
  return x / 100; // convert 0-100 → 0-1
};

const outcomeOneHot = (outcome: 'home' | 'draw' | 'away'): [number, number, number] => (
  outcome === 'home' ? [1,0,0] : outcome === 'draw' ? [0,1,0] : [0,0,1]
);

export const computeCalibrationMetrics = (
  prediction: Prediction,
  actual: { homeScore: number; awayScore: number }
) => {
  const outcome: 'home' | 'draw' | 'away' = actual.homeScore > actual.awayScore ? 'home' : actual.homeScore < actual.awayScore ? 'away' : 'draw';
  const ph = safeProb(prediction.homeWinProbability);
  const pd = safeProb(prediction.drawProbability);
  const pa = safeProb(prediction.awayWinProbability);
  const [yh, yd, ya] = outcomeOneHot(outcome);

  // Multi-class Brier score
  const brier = ((ph - yh) ** 2 + (pd - yd) ** 2 + (pa - ya) ** 2) / 3;

  // Log loss (clip to avoid -inf)
  const eps = 1e-9;
  const pActual = outcome === 'home' ? ph : outcome === 'draw' ? pd : pa;
  const logLoss = -Math.log(Math.max(eps, pActual));

  // Agreement margin
  const arr = [ph, pd, pa].sort((a, b) => b - a);
  const topProbability = arr[0];
  const topMargin = arr[0] - arr[1];

  return {
    brierScore: brier,
    logLoss,
    predicted: { home: ph, draw: pd, away: pa },
    actualOutcome: outcome,
    topProbability,
    topMargin,
  };
};

// Store prediction accuracy data persistently
export const storeAccuracyData = (accuracyRecord: PredictionAccuracy): void => {
  try {
    const existingData = getStoredAccuracyData();
    const updatedData = [...existingData, accuracyRecord];
    localStorage.setItem(ACCURACY_STORAGE_KEY, JSON.stringify(updatedData));
    console.log('✅ Accuracy data stored:', accuracyRecord);
  } catch (error) {
    console.warn('Failed to store accuracy data:', error);
  }
};

// Load migrated historical data if available
const loadMigratedData = (): PredictionAccuracy[] => {
  try {
    // Try to load migrated data from the migration output
    const migratedDataPath = '/data/migrated/accuracy-records.json';
    
    // For now, we'll load the historical data directly from past-predictions.json
    // and convert it to the new format if no accuracy data exists
    const existingData = localStorage.getItem(ACCURACY_STORAGE_KEY);
    
    if (!existingData || JSON.parse(existingData).length === 0) {
      // Load historical data and convert it
      const historicalData = [
        {
          "id": "p1", "homeTeam": "Liverpool", "awayTeam": "Tottenham Hotspur", "league": "Premier League", "date": "2024-08-14T14:00:00.000Z",
          "prediction": { "homeWinProbability": 60, "drawProbability": 25, "awayWinProbability": 15, "predictedScoreline": "2-1", "confidence": "High", "keyFactors": [], "goalLine": { "line": 2.5, "overProbability": 70, "underProbability": 30 } },
          "actualResult": { "homeScore": 4, "awayScore": 2 }
        },
        {
          "id": "p2", "homeTeam": "Chelsea", "awayTeam": "Manchester United", "league": "Premier League", "date": "2024-08-13T14:00:00.000Z",
          "prediction": { "homeWinProbability": 55, "drawProbability": 25, "awayWinProbability": 20, "predictedScoreline": "2-0", "confidence": "Medium", "keyFactors": [], "goalLine": { "line": 2.5, "overProbability": 60, "underProbability": 40 } },
          "actualResult": { "homeScore": 5, "awayScore": 0 }
        },
        {
          "id": "p10", "homeTeam": "Bolton Wanderers", "awayTeam": "Reading", "league": "EFL League One", "date": "2024-08-13T14:00:00.000Z",
          "prediction": { "homeWinProbability": 50, "drawProbability": 30, "awayWinProbability": 20, "predictedScoreline": "1-0", "confidence": "Medium", "keyFactors": [], "goalLine": { "line": 2.5, "overProbability": 40, "underProbability": 60 } },
          "actualResult": { "homeScore": 1, "awayScore": 0 }
        },
        {
          "id": "p3", "homeTeam": "Real Madrid", "awayTeam": "Sevilla", "league": "La Liga", "date": "2024-08-12T14:00:00.000Z",
          "prediction": { "homeWinProbability": 70, "drawProbability": 20, "awayWinProbability": 10, "predictedScoreline": "3-0", "confidence": "High", "keyFactors": [], "goalLine": { "line": 2.5, "overProbability": 75, "underProbability": 25 } },
          "actualResult": { "homeScore": 2, "awayScore": 2 }
        },
        {
          "id": "p4-fix", "homeTeam": "AS Roma", "awayTeam": "Juventus", "league": "Serie A", "date": "2024-08-11T14:00:00.000Z",
          "prediction": { "homeWinProbability": 30, "drawProbability": 40, "awayWinProbability": 30, "predictedScoreline": "1-1", "confidence": "Medium", "keyFactors": [], "goalLine": { "line": 2.5, "overProbability": 30, "underProbability": 70 } },
          "actualResult": { "homeScore": 1, "awayScore": 1 }
        },
        {
          "id": "p5", "homeTeam": "Bayern Munich", "awayTeam": "RB Leipzig", "league": "Bundesliga", "date": "2024-08-06T14:00:00.000Z",
          "prediction": { "homeWinProbability": 65, "drawProbability": 20, "awayWinProbability": 15, "predictedScoreline": "3-1", "confidence": "High", "keyFactors": [], "goalLine": { "line": 2.5, "overProbability": 80, "underProbability": 20 } },
          "actualResult": { "homeScore": 2, "awayScore": 1 }
        },
        {
          "id": "p6", "homeTeam": "Borussia Dortmund", "awayTeam": "Bayer Leverkusen", "league": "Bundesliga", "date": "2024-08-04T14:00:00.000Z",
          "prediction": { "homeWinProbability": 45, "drawProbability": 25, "awayWinProbability": 30, "predictedScoreline": "2-1", "confidence": "Medium", "keyFactors": [], "goalLine": { "line": 2.5, "overProbability": 65, "underProbability": 35 } },
          "actualResult": { "homeScore": 1, "awayScore": 4 }
        },
        {
          "id": "p7", "homeTeam": "Barcelona", "awayTeam": "Atletico Madrid", "league": "La Liga", "date": "2024-08-01T14:00:00.000Z",
          "prediction": { "homeWinProbability": 25, "drawProbability": 30, "awayWinProbability": 45, "predictedScoreline": "1-2", "confidence": "Medium", "keyFactors": [], "goalLine": { "line": 2.5, "overProbability": 55, "underProbability": 45 } },
          "actualResult": { "homeScore": 4, "awayScore": 2 }
        },
        {
          "id": "p8", "homeTeam": "Paris Saint-Germain", "awayTeam": "AS Monaco", "league": "Ligue 1", "date": "2024-07-27T14:00:00.000Z",
          "prediction": { "homeWinProbability": 80, "drawProbability": 15, "awayWinProbability": 5, "predictedScoreline": "4-0", "confidence": "High", "keyFactors": [], "goalLine": { "line": 2.5, "overProbability": 90, "underProbability": 10 } },
          "actualResult": { "homeScore": 3, "awayScore": 3 }
        },
        {
          "id": "p9", "homeTeam": "Manchester United", "awayTeam": "Aston Villa", "league": "Premier League", "date": "2024-07-22T14:00:00.000Z",
          "prediction": { "homeWinProbability": 60, "drawProbability": 25, "awayWinProbability": 15, "predictedScoreline": "2-0", "confidence": "Medium", "keyFactors": [], "goalLine": { "line": 2.5, "overProbability": 50, "underProbability": 50 } },
          "actualResult": { "homeScore": 1, "awayScore": 1 }
        }
      ];

      console.log('🔄 Converting historical data to accuracy records...');
      const accuracyRecords: PredictionAccuracy[] = [];

      for (const record of historicalData) {
        try {
          // Calculate accuracy using the existing function
          const accuracy = calculatePredictionAccuracy(record.prediction as any, record.actualResult);
          const calibration = computeCalibrationMetrics(record.prediction as any, record.actualResult);

          const accuracyRecord: PredictionAccuracy = {
            id: `historical-${record.id}-${Date.now()}`,
            matchId: record.id,
            homeTeam: record.homeTeam,
            awayTeam: record.awayTeam,
            league: record.league as any,
            matchDate: record.date,
            prediction: record.prediction as any,
            actualResult: record.actualResult,
            accuracy,
            calibration,
            timestamp: new Date().toISOString(),
            verified: true,
            cloudVerified: false
          };

          accuracyRecords.push(accuracyRecord);
        } catch (error) {
          console.warn(`Failed to convert historical record ${record.id}:`, error);
        }
      }

      // Store the converted data
      if (accuracyRecords.length > 0) {
        localStorage.setItem(ACCURACY_STORAGE_KEY, JSON.stringify(accuracyRecords));
        console.log(`✅ Successfully loaded ${accuracyRecords.length} historical accuracy records`);
      }

      return accuracyRecords;
    }

    return [];
  } catch (error) {
    console.warn('Failed to load migrated data:', error);
    return [];
  }
};

// Retrieve stored accuracy data
export const getStoredAccuracyData = (): PredictionAccuracy[] => {
  try {
    const stored = localStorage.getItem(ACCURACY_STORAGE_KEY);
    const existingData = stored ? JSON.parse(stored) : [];
    
    // If no existing data, try to load migrated historical data
    if (existingData.length === 0) {
      const migratedData = loadMigratedData();
      return migratedData;
    }
    
    return existingData;
  } catch (error) {
    console.warn('Failed to retrieve accuracy data:', error);
    return [];
  }
};

// Store daily predictions for tracking (with cloud backup)
export const storeDailyPrediction = async (match: Match, prediction: Prediction): Promise<void> => {
  try {
    // Store locally first (immediate)
    const today = new Date().toISOString().split('T')[0];
    const existingData = getDailyPredictions();
    
    if (!existingData[today]) {
      existingData[today] = [];
    }
    
    // Check if prediction already exists for this match
    const existingIndex = existingData[today].findIndex(p => p.matchId === match.id);

    // Build new prediction payload
    const newPredictionData = {
      matchId: match.id,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      league: match.league,
      matchDate: match.date,
      prediction,
      predictionTime: new Date().toISOString(),
      verified: false,
      cloudStored: false
    } as any;
    
    let shouldCloudSync = true;

    if (existingIndex >= 0) {
      // Preserve existing cloud fields and only update the prediction content/time
      const existing = existingData[today][existingIndex];
      newPredictionData.cloudStored = !!existing.cloudStored;
      newPredictionData.cloudPredictionId = existing.cloudPredictionId;
      newPredictionData.integrityHash = existing.integrityHash;
      
      // Update local record
      existingData[today][existingIndex] = {
        ...existing,
        ...newPredictionData
      };

      // One-per-game cloud sync: only sync on first creation
      shouldCloudSync = !existing.cloudStored;
    } else {
      // First record for this match today
      existingData[today].push(newPredictionData);
      shouldCloudSync = true; // First prediction should sync to cloud
    }
    
    localStorage.setItem(DAILY_PREDICTIONS_KEY, JSON.stringify(existingData));
    console.log('✅ Daily prediction stored locally:', newPredictionData);

    // Notify UI listeners that a prediction was stored
    try {
      if (typeof window !== 'undefined' && (window as any).dispatchEvent) {
        (window as any).dispatchEvent(new CustomEvent('fixturecast:prediction-stored', {
          detail: {
            matchId: match.id,
            homeTeam: match.homeTeam,
            awayTeam: match.awayTeam,
            league: match.league,
            source: 'local'
          }
        }));
      }
    } catch {}
    
    // Store in cloud only if first time (or if not yet stored)
    if (shouldCloudSync) {
      try {
        const cloudResult = await cloudPredictionService.storePrediction(match, prediction);
        
        // Update local record with cloud confirmation
        const updatedData = getDailyPredictions();
        const idx = updatedData[today].findIndex((p: any) => p.matchId === match.id);
        if (idx >= 0) {
          updatedData[today][idx].cloudStored = true;
          updatedData[today][idx].cloudPredictionId = cloudResult.predictionId;
          updatedData[today][idx].integrityHash = cloudResult.integrityHash;
          localStorage.setItem(DAILY_PREDICTIONS_KEY, JSON.stringify(updatedData));
        }
        console.log('🔒 Prediction backed up to cloud with integrity hash:', cloudResult.integrityHash);

        // Notify UI listeners that cloud sync completed
        try {
          if (typeof window !== 'undefined' && (window as any).dispatchEvent) {
            (window as any).dispatchEvent(new CustomEvent('fixturecast:prediction-stored', {
              detail: {
                matchId: match.id,
                homeTeam: match.homeTeam,
                awayTeam: match.awayTeam,
                league: match.league,
                source: 'cloud'
              }
            }));
          }
        } catch {}
      } catch (cloudError: any) {
        // Suppress noisy cloud errors in local dev; show concise warning
        const msg = String(cloudError?.message || cloudError);
        if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname.startsWith('127.'))) {
          console.warn('Cloud sync skipped in local dev');
        } else {
          console.warn('Failed to store prediction in cloud (local copy preserved):', msg);
        }
      }
    }
    
  } catch (error) {
    console.error('Failed to store daily prediction:', error);
    throw error;
  }
};

// Get daily predictions
export const getDailyPredictions = (): { [date: string]: any[] } => {
  try {
    const stored = localStorage.getItem(DAILY_PREDICTIONS_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.warn('Failed to retrieve daily predictions:', error);
    return {};
  }
};

// Get today's predictions specifically
export const getTodaysPredictions = (): any[] => {
  const today = new Date().toISOString().split('T')[0];
  const dailyData = getDailyPredictions();
  return dailyData[today] || [];
};

// Get accuracy stats from stored data
export const getLiveAccuracyStats = (): AccuracyStats => {
  const storedData = getStoredAccuracyData();
  return calculateAccuracyStats(storedData);
};

// Auto-check results for completed matches (with cloud verification)
export const checkAndUpdateMatchResults = async (matchResults: { id: string; homeScore: number; awayScore: number; status: string }[]): Promise<void> => {
  const storedData = getStoredAccuracyData();
  const dailyPredictions = getDailyPredictions();
  let hasUpdates = false;
  
  // Also verify in cloud for enhanced integrity
  try {
    const cloudResults = await cloudPredictionService.bulkVerifyPredictions(matchResults);
    console.log(`🔒 Cloud verification: ${cloudResults.verified} verified, ${cloudResults.failed} failed`);
  } catch (cloudError) {
    console.warn('Cloud verification failed, continuing with local verification:', cloudError);
  }
  
  for (const result of matchResults) {
    if (result.status !== 'FT') continue; // Only process finished matches
    
    // Check if we already have accuracy data for this match
    const existingAccuracy = storedData.find(acc => acc.matchId === result.id);
    if (existingAccuracy) continue; // Skip if already processed
    
    // Find the prediction for this match
    let matchPrediction = null;
    for (const [date, predictions] of Object.entries(dailyPredictions)) {
      const prediction = (predictions as any[]).find((p: any) => p.matchId === result.id);
      if (prediction) {
        matchPrediction = prediction;
        break;
      }
    }
    
    if (matchPrediction) {
      // Calculate accuracy
      const accuracy = calculatePredictionAccuracy(
        matchPrediction.prediction,
        { homeScore: result.homeScore, awayScore: result.awayScore }
      );
      
      // Store accuracy record with calibration
      const calibration = computeCalibrationMetrics(
        matchPrediction.prediction,
        { homeScore: result.homeScore, awayScore: result.awayScore }
      );
      const accuracyRecord: PredictionAccuracy = {
        id: `${result.id}-${Date.now()}`,
        matchId: result.id,
        homeTeam: matchPrediction.homeTeam,
        awayTeam: matchPrediction.awayTeam,
        league: matchPrediction.league,
        predictionTime: matchPrediction.predictionTime,
        matchDate: matchPrediction.matchDate,
        prediction: matchPrediction.prediction,
        actualResult: { homeScore: result.homeScore, awayScore: result.awayScore },
        accuracy,
        calibration,
        timestamp: new Date().toISOString(),
        verified: true,
        cloudVerified: false
      };
      
      storeAccuracyData(accuracyRecord);
      
      // Update verification status in daily predictions
      const dailyData = getDailyPredictions();
      for (const [date, predictions] of Object.entries(dailyData)) {
        const predictionIndex = (predictions as any[]).findIndex((p: any) => p.matchId === result.id);
        if (predictionIndex >= 0) {
          (predictions as any[])[predictionIndex].verified = true;
          (predictions as any[])[predictionIndex].verifiedAt = new Date().toISOString();
          (predictions as any[])[predictionIndex].actualResult = { homeScore: result.homeScore, awayScore: result.awayScore };
          (predictions as any[])[predictionIndex].accuracy = accuracy;
          
          // Try to verify in cloud if it was stored there
          if ((predictions as any[])[predictionIndex].cloudStored) {
            try {
              await cloudPredictionService.verifyPrediction(result.id, {
                homeScore: result.homeScore,
                awayScore: result.awayScore
              });
              (predictions as any[])[predictionIndex].cloudVerified = true;
              accuracyRecord.cloudVerified = true;
              console.log('🔒 Prediction verified in cloud for enhanced integrity');
            } catch (cloudError) {
              console.warn('Failed to verify in cloud:', cloudError);
            }
          }
          
          localStorage.setItem(DAILY_PREDICTIONS_KEY, JSON.stringify(dailyData));
          break;
        }
      }
      
      hasUpdates = true;
      
      console.log('✅ Match result verified and accuracy updated:', {
        match: `${matchPrediction.homeTeam} vs ${matchPrediction.awayTeam}`,
        result: `${result.homeScore}-${result.awayScore}`,
        accuracy: accuracy.outcome,
        cloudVerified: accuracyRecord.cloudVerified
      });
    }
  }
  
  if (hasUpdates) {
    console.log('🎯 Accuracy tracking updated with new match results');
  }
};
