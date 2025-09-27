import { Prediction, Match, PredictionContext } from '../types';
import { getMatchPrediction as getGeminiPrediction } from './geminiService';
import { getDeepSeekMatchPrediction } from './deepSeekService';

export type PredictionModel = 'gemini' | 'deepseek' | 'both';

export interface ModelPredictionResult {
  model: string;
  prediction?: Prediction;
  error?: string;
  responseTime: number;
}

export interface UnifiedPredictionResult {
  primary?: ModelPredictionResult;
  secondary?: ModelPredictionResult;
  comparison?: {
    similar: boolean;
    differences: string[];
  };
}

/**
 * Unified prediction service that can use Gemini, DeepSeek, or both models
 */
export class UnifiedPredictionService {
  
  /**
   * Get prediction using the specified model(s)
   */
  async getPrediction(
    match: Match, 
    context?: PredictionContext, 
    model: PredictionModel = 'gemini',
    accuracyStats?: any
  ): Promise<UnifiedPredictionResult> {
    
    console.log(`🤖 Generating prediction for ${match.homeTeam} vs ${match.awayTeam} using: ${model}`);
    
    const results: UnifiedPredictionResult = {};
    
    if (model === 'gemini' || model === 'both') {
      results.primary = await this.runGemini(match, context, accuracyStats);
    }
    
    if (model === 'deepseek') {
      results.primary = await this.runDeepSeek(match, context, accuracyStats);
    }
    
    if (model === 'both') {
      results.secondary = await this.runDeepSeek(match, context, accuracyStats);
      
      // Compare results if both succeeded
      if (results.primary?.prediction && results.secondary?.prediction) {
        results.comparison = this.comparePredictions(
          results.primary.prediction,
          results.secondary.prediction
        );
      }
    }
    
    return results;
  }
  
  /**
   * Run Gemini prediction with error handling
   */
  private async runGemini(match: Match, context?: PredictionContext, accuracyStats?: any): Promise<ModelPredictionResult> {
    const startTime = Date.now();
    
    try {
      const prediction = await getGeminiPrediction(match, context, accuracyStats);
      const responseTime = Date.now() - startTime;
      
      console.log(`✅ Gemini completed in ${responseTime}ms`);
      
      return {
        model: 'Gemini 2.5 Flash',
        prediction,
        responseTime
      };
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      console.error(`❌ Gemini failed after ${responseTime}ms:`, error);
      
      // Check if it's a rate limit error and provide better messaging
      const isRateLimitError = 
        error.message?.toLowerCase().includes('rate limit') ||
        error.message?.toLowerCase().includes('quota') ||
        error.message?.toLowerCase().includes('try again later');
      
      const errorMessage = isRateLimitError 
        ? 'Gemini rate limit exceeded. Please try again in a few minutes.'
        : error.message;
      
      return {
        model: 'Gemini 2.5 Flash',
        error: errorMessage,
        responseTime
      };
    }
  }
  
  /**
   * Run DeepSeek prediction with error handling
   */
  private async runDeepSeek(match: Match, context?: PredictionContext, accuracyStats?: any): Promise<ModelPredictionResult> {
    const startTime = Date.now();
    
    try {
      const prediction = await getDeepSeekMatchPrediction(match, context, accuracyStats);
      const responseTime = Date.now() - startTime;
      
      console.log(`✅ DeepSeek completed in ${responseTime}ms`);
      
      return {
        model: 'DeepSeek V3.1 Terminus',
        prediction,
        responseTime
      };
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      console.error(`❌ DeepSeek failed after ${responseTime}ms:`, error);
      
      // Check if it's a rate limit error and provide better messaging
      const isRateLimitError = 
        error.message?.toLowerCase().includes('rate limit') ||
        error.message?.toLowerCase().includes('quota') ||
        error.message?.toLowerCase().includes('try again later');
      
      const errorMessage = isRateLimitError 
        ? 'DeepSeek rate limit exceeded. Please try again in a few minutes.'
        : error.message;
      
      return {
        model: 'DeepSeek V3.1 Terminus',
        error: errorMessage,
        responseTime
      };
    }
  }
  
  /**
   * Compare two predictions and identify similarities/differences
   */
  private comparePredictions(pred1: Prediction, pred2: Prediction) {
    const differences: string[] = [];
    
    // Compare main outcome probabilities
    const homeWinDiff = Math.abs(pred1.homeWinProbability - pred2.homeWinProbability);
    const drawDiff = Math.abs(pred1.drawProbability - pred2.drawProbability);
    const awayWinDiff = Math.abs(pred1.awayWinProbability - pred2.awayWinProbability);
    
    if (homeWinDiff > 10 || drawDiff > 10 || awayWinDiff > 10) {
      differences.push(`Match outcome probabilities differ significantly`);
    }
    
    // Compare scorelines
    if (pred1.predictedScoreline !== pred2.predictedScoreline) {
      differences.push(`Different predicted scorelines: ${pred1.predictedScoreline} vs ${pred2.predictedScoreline}`);
    }
    
    // Compare confidence
    if (pred1.confidence !== pred2.confidence) {
      differences.push(`Different confidence levels: ${pred1.confidence} vs ${pred2.confidence}`);
    }
    
    // Compare BTTS
    if (pred1.btts && pred2.btts) {
      const bttsDiff = Math.abs(pred1.btts.yesProbability - pred2.btts.yesProbability);
      if (bttsDiff > 15) {
        differences.push(`BTTS predictions differ: ${pred1.btts.yesProbability}% vs ${pred2.btts.yesProbability}%`);
      }
    }
    
    // Compare O/U 2.5
    if (pred1.goalLine && pred2.goalLine) {
      const goalLineDiff = Math.abs(pred1.goalLine.overProbability - pred2.goalLine.overProbability);
      if (goalLineDiff > 15) {
        differences.push(`Over/Under predictions differ: ${pred1.goalLine.overProbability}% vs ${pred2.goalLine.overProbability}%`);
      }
    }
    
    const similar = differences.length <= 2; // Consider similar if 2 or fewer differences
    
    return {
      similar,
      differences
    };
  }
  
  /**
   * Get the best available prediction (primary if successful, otherwise secondary)
   */
  getBestPrediction(result: UnifiedPredictionResult): Prediction | null {
    if (result.primary?.prediction) {
      return result.primary.prediction;
    }
    if (result.secondary?.prediction) {
      return result.secondary.prediction;
    }
    return null;
  }
  
  /**
   * Check which models are available
   */
  getAvailableModels(): { gemini: boolean; deepseek: boolean } {
    // Gemini now always proxied via server; assume available (server will error if misconfigured)
    const geminiAvailable = true;
    const deepseekAvailable = !!(import.meta as any).env?.VITE_DEEPSEEK_API_KEY;
    
    return {
      gemini: geminiAvailable,
      deepseek: deepseekAvailable
    };
  }
}

// Export singleton instance
export const unifiedPredictionService = new UnifiedPredictionService();

// Convenience functions for backward compatibility
export const getMatchPrediction = async (
  match: Match, 
  context?: PredictionContext, 
  accuracyStats?: any,
  model: PredictionModel = 'gemini'
): Promise<Prediction> => {
  const result = await unifiedPredictionService.getPrediction(match, context, model, accuracyStats);
  const prediction = unifiedPredictionService.getBestPrediction(result);
  
  if (!prediction) {
    throw new Error('Failed to generate prediction with any available model');
  }
  
  return prediction;
};

/**
 * Retry incomplete predictions for a list of matches, with delay between each call
 * @param matches Array of Match objects
 * @param isPredictionComplete Function to check if prediction is complete for a match
 * @param context Optional PredictionContext
 * @param model PredictionModel to use
 * @param delayMs Delay in milliseconds between each retry (default: 60000)
 */
export const retryIncompletePredictions = async (
  matches: Match[],
  isPredictionComplete: (match: Match) => boolean,
  context?: PredictionContext,
  model: PredictionModel = 'gemini',
  delayMs: number = 60000
) => {
  for (const match of matches) {
    if (isPredictionComplete(match)) {
      console.log(`✅ Prediction already complete for ${match.homeTeam} vs ${match.awayTeam}`);
      continue;
    }
    console.log(`🔄 Retrying prediction for ${match.homeTeam} vs ${match.awayTeam}...`);
    try {
      await getMatchPrediction(match, context, undefined, model);
      console.log(`🎯 Prediction retried for ${match.homeTeam} vs ${match.awayTeam}`);
    } catch (err) {
      console.error(`❌ Failed to retry prediction for ${match.homeTeam} vs ${match.awayTeam}:`, err);
    }
    // Wait before next call
    if (delayMs > 0) {
      await new Promise(res => setTimeout(res, delayMs));
    }
  }
};