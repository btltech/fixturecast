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

// Retrieve stored accuracy data
export const getStoredAccuracyData = (): PredictionAccuracy[] => {
  try {
    const stored = localStorage.getItem(ACCURACY_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
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
      } catch (cloudError) {
        console.warn('Failed to store prediction in cloud (local copy preserved):', cloudError);
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
      
      // Store accuracy record
      const accuracyRecord: PredictionAccuracy = {
        id: `${result.id}-${Date.now()}`,
        matchId: result.id,
        homeTeam: matchPrediction.homeTeam,
        awayTeam: matchPrediction.awayTeam,
        league: matchPrediction.league,
        predictionDate: matchPrediction.predictionTime,
        matchDate: matchPrediction.matchDate,
        prediction: matchPrediction.prediction,
        actualResult: { homeScore: result.homeScore, awayScore: result.awayScore },
        accuracy,
        verifiedAt: new Date().toISOString(),
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
