import { Prediction, AccuracyStats, ConfidenceLevel } from '../types';

export interface ConfidenceAnalysis {
  percentage: number;
  level: ConfidenceLevel;
  color: string;
  reason: string;
}

export const calculatePredictionConfidence = (
  prediction: Prediction,
  accuracyStats: AccuracyStats,
  matchContext?: {
    league: string;
    isRivalry?: boolean;
    isPrimeTime?: boolean;
    hasRecentForm?: boolean;
    hasHeadToHead?: boolean;
  }
): ConfidenceAnalysis => {
  // Base confidence from historical accuracy
  let baseConfidence = Number.isFinite(accuracyStats.overallAccuracy) ? accuracyStats.overallAccuracy : 50;
  
  // Adjust based on recent performance (last 10 predictions)
  const recentAccuracy = accuracyStats.recentAccuracy.last10;
  if (Number.isFinite(recentAccuracy) && recentAccuracy > 0) {
    baseConfidence = (baseConfidence + recentAccuracy) / 2;
  }
  
  // Adjust based on prediction type accuracy
  const predictionTypeAccuracy = getPredictionTypeAccuracy(prediction, accuracyStats);
  if (Number.isFinite(predictionTypeAccuracy)) {
    baseConfidence = (baseConfidence + predictionTypeAccuracy) / 2;
  }
  
  // Context adjustments
  let contextMultiplier = 1.0;
  let contextReasons: string[] = [];
  
  if (matchContext) {
    // League quality adjustment
    if (isHighQualityLeague(matchContext.league)) {
      contextMultiplier += 0.1;
      contextReasons.push('high-quality league data');
    }
    
    // Rivalry match adjustment
    if (matchContext.isRivalry) {
      contextMultiplier += 0.05;
      contextReasons.push('rivalry match patterns');
    }
    
    // Prime time adjustment
    if (matchContext.isPrimeTime) {
      contextMultiplier += 0.05;
      contextReasons.push('prime time performance');
    }
    
    // Data availability adjustments
    if (matchContext.hasRecentForm) {
      contextMultiplier += 0.1;
      contextReasons.push('recent form data');
    }
    
    if (matchContext.hasHeadToHead) {
      contextMultiplier += 0.1;
      contextReasons.push('head-to-head history');
    }
  }
  
  // Apply context multiplier
  let finalConfidence = baseConfidence * contextMultiplier;
  if (!Number.isFinite(finalConfidence)) finalConfidence = 50;
  finalConfidence = Math.min(95, Math.max(25, finalConfidence));
  
  // Determine confidence level and color
  const { level, color } = getConfidenceLevelAndColor(finalConfidence);
  
  // Generate reason
  const reason = generateConfidenceReason(finalConfidence, accuracyStats, contextReasons);
  
  return {
    percentage: Math.round(finalConfidence),
    level,
    color,
    reason
  };
};

const getPredictionTypeAccuracy = (prediction: Prediction, accuracyStats: AccuracyStats): number => {
  // Weight different prediction types based on their historical accuracy
  const weights = {
    outcome: 0.4,
    btts: 0.2,
    goalLine: 0.2,
    scoreRange: 0.1,
    cleanSheet: 0.1
  };
  
  const total = accuracyStats.totalPredictions;
  if (!Number.isFinite(total) || total <= 0) {
    return 50;
  }
  let weightedAccuracy = 0;
  
  // Outcome accuracy (most important)
  weightedAccuracy += (accuracyStats.correctOutcomes / total) * 100 * weights.outcome;
  
  // BTTS accuracy
  if (prediction.btts) {
    weightedAccuracy += (accuracyStats.correctBtts / total) * 100 * weights.btts;
  }
  
  // Goal line accuracy
  if (prediction.goalLine) {
    weightedAccuracy += (accuracyStats.correctGoalLine / total) * 100 * weights.goalLine;
  }
  
  // Score range accuracy
  if (prediction.scoreRange) {
    weightedAccuracy += (accuracyStats.correctScoreRange / total) * 100 * weights.scoreRange;
  }
  
  // Clean sheet accuracy
  if (prediction.cleanSheet) {
    weightedAccuracy += (accuracyStats.correctCleanSheet / total) * 100 * weights.cleanSheet;
  }
  
  return weightedAccuracy;
};

const isHighQualityLeague = (league: string): boolean => {
  const highQualityLeagues = [
    'Premier League',
    'La Liga',
    'Serie A',
    'Bundesliga',
    'Ligue 1',
    'UEFA Champions League',
    'UEFA Europa League'
  ];
  return highQualityLeagues.includes(league);
};

const getConfidenceLevelAndColor = (confidence: number): { level: ConfidenceLevel; color: string } => {
  if (confidence >= 75) {
    return { level: ConfidenceLevel.High, color: 'text-green-400' };
  } else if (confidence >= 60) {
    return { level: ConfidenceLevel.Medium, color: 'text-yellow-400' };
  } else {
    return { level: ConfidenceLevel.Low, color: 'text-red-400' };
  }
};

const generateConfidenceReason = (
  confidence: number,
  accuracyStats: AccuracyStats,
  contextReasons: string[]
): string => {
  const baseReason = `Based on ${accuracyStats.totalPredictions} historical predictions with ${accuracyStats.overallAccuracy}% accuracy`;
  
  if (contextReasons.length > 0) {
    return `${baseReason} and enhanced by ${contextReasons.join(', ')}`;
  }
  
  if (accuracyStats.recentAccuracy.last10 > accuracyStats.overallAccuracy) {
    return `${baseReason} with improving recent performance (${accuracyStats.recentAccuracy.last10}% in last 10)`;
  }
  
  return baseReason;
};

export const getConfidenceColor = (confidence: number): string => {
  if (confidence >= 75) return 'text-green-400';
  if (confidence >= 60) return 'text-yellow-400';
  return 'text-red-400';
};

export const getConfidenceBgColor = (confidence: number): string => {
  if (confidence >= 75) return 'bg-green-500';
  if (confidence >= 60) return 'bg-yellow-500';
  return 'bg-red-500';
};

export const getConfidenceBorderColor = (confidence: number): string => {
  if (confidence >= 75) return 'border-green-500';
  if (confidence >= 60) return 'border-yellow-500';
  return 'border-red-500';
};

export const formatConfidenceDisplay = (confidence: number): string => {
  if (confidence >= 75) return `High Confidence (${confidence}%)`;
  if (confidence >= 60) return `Medium Confidence (${confidence}%)`;
  return `Low Confidence (${confidence}%)`;
};
