import type { Prediction as CorePrediction, ConfidenceLevel } from '../../types';

export type Prediction = CorePrediction;

export type PredictionBreakdown = CorePrediction;

export type PredictedOutcome = 'home' | 'draw' | 'away';

export interface StoredPredictionRecord {
  id: string;
  matchId: string;
  league: string;
  kickoffUtc: string;
  homeTeam: string;
  awayTeam: string;
  predictedOutcome: PredictedOutcome;
  confidence: ConfidenceLevel | string;
  probHome: number;
  probDraw: number;
  probAway: number;
  expectedHomeGoals: number | null;
  expectedAwayGoals: number | null;
  breakdown: PredictionBreakdown;
  createdAt: string;
  updatedAt: string;
}

export interface SavePredictionPayload {
  matchId: string;
  league: string;
  kickoffUtc: string;
  homeTeam: string;
  awayTeam: string;
  prediction: PredictionBreakdown;
}

export interface FetchPredictionsQuery {
  league?: string;
  date?: string;
  from?: string;
  to?: string;
  limit?: number;
}

