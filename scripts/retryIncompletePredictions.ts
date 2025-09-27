// Script to fetch today's predictions and fixtures, identify incomplete predictions, and retry them with delay
// Place in scripts/retryIncompletePredictions.ts

import fetch from 'node-fetch';
import { retryIncompletePredictions } from '../services/unifiedPredictionService';
import { Match, Prediction } from '../types';

const FIXTURES_ENDPOINT = 'https://fixturecast-cron-worker.btltech.workers.dev/fixtures/today';
const PREDICTIONS_ENDPOINT = 'https://fixturecast-cron-worker.btltech.workers.dev/predictions/today';

async function fetchFixtures(): Promise<Match[]> {
  const res = await fetch(FIXTURES_ENDPOINT);
  if (!res.ok) throw new Error('Failed to fetch fixtures');
  const data = await res.json();
  // If the response is not an array, fallback to empty array
  if (!Array.isArray(data)) {
    console.warn('Fixtures response is not an array. Got:', data);
    return [];
  }
  return data as Match[];
}

async function fetchPredictions(): Promise<{ [fixtureId: string]: Prediction }> {
  const res = await fetch(PREDICTIONS_ENDPOINT);
  if (!res.ok) throw new Error('Failed to fetch predictions');
  const data = await res.json();
  // If the response is not an object, fallback to empty object
  if (typeof data !== 'object' || Array.isArray(data) || data === null) {
    console.warn('Predictions response is not an object. Got:', data);
    return {};
  }
  return data as { [fixtureId: string]: Prediction };
}

function isPredictionCompleteFactory(predictions: { [fixtureId: string]: Prediction }) {
  return (match: Match) => {
    const pred = predictions[match.id];
    // Define completeness: must exist and have main outcome probabilities
    return pred && typeof pred.homeWinProbability === 'number' && typeof pred.awayWinProbability === 'number' && typeof pred.drawProbability === 'number';
  };
}

async function main() {
  console.log('Fetching fixtures and predictions...');
  const fixtures = await fetchFixtures();
  const predictions = await fetchPredictions();
  const isPredictionComplete = isPredictionCompleteFactory(predictions);

  const incompleteMatches = fixtures.filter(match => !isPredictionComplete(match));
  console.log(`Found ${incompleteMatches.length} incomplete predictions.`);

  if (incompleteMatches.length === 0) {
    console.log('All predictions are complete!');
    return;
  }

  await retryIncompletePredictions(incompleteMatches, isPredictionComplete);
  console.log('Retry process finished.');
}

main().catch(err => {
  console.error('Error running retry script:', err);
  process.exit(1);
});
