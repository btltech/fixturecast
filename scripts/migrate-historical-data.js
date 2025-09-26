#!/usr/bin/env node

/**
 * Migration script to import historical prediction data into enhanced accuracy tracking
 * Converts existing past-predictions.json into the new comprehensive format
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper function to calculate prediction accuracy
function calculatePredictionAccuracy(prediction, actualResult) {
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
    outcome: actualOutcome === predictedOutcome,
    scoreline: prediction.predictedScoreline === `${homeScore}-${awayScore}`,
    
    btts: prediction.btts ? (
      (homeScore > 0 && awayScore > 0) ? 
        prediction.btts.yesProbability > prediction.btts.noProbability :
        prediction.btts.noProbability > prediction.btts.yesProbability
    ) : false,

    goalLine: prediction.goalLine ? (
      totalGoals > prediction.goalLine.line ? 
        prediction.goalLine.overProbability > prediction.goalLine.underProbability :
        prediction.goalLine.underProbability > prediction.goalLine.overProbability
    ) : false,

    htft: false, // Placeholder - requires HT score data
    scoreRange: false, // Not available in historical data
    firstGoalscorer: false, // Placeholder - requires first scorer data
    cleanSheet: false, // Not available in historical data
    corners: false // Placeholder - requires corner data
  };

  return accuracy;
}

// Helper function to compute calibration metrics
function computeCalibrationMetrics(prediction, actual) {
  const outcome = actual.homeScore > actual.awayScore ? 'home' : actual.homeScore < actual.awayScore ? 'away' : 'draw';
  const ph = Math.max(0, Math.min(100, prediction.homeWinProbability)) / 100;
  const pd = Math.max(0, Math.min(100, prediction.drawProbability)) / 100;
  const pa = Math.max(0, Math.min(100, prediction.awayWinProbability)) / 100;
  const [yh, yd, ya] = outcome === 'home' ? [1,0,0] : outcome === 'draw' ? [0,1,0] : [0,0,1];

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
}

async function migrateHistoricalData() {
  try {
    console.log('🔄 Starting migration of historical prediction data...');

    // Read existing historical data
    const historicalPath = path.join(__dirname, '../dist/data/past-predictions.json');
    if (!fs.existsSync(historicalPath)) {
      console.error('❌ Historical data file not found:', historicalPath);
      process.exit(1);
    }

    const historicalData = JSON.parse(fs.readFileSync(historicalPath, 'utf8'));
    console.log(`📊 Found ${historicalData.length} historical predictions to migrate`);

    // Prepare enhanced accuracy records
    const accuracyRecords = [];
    const dailyPredictions = {};

    let successCount = 0;
    let errorCount = 0;

    for (const record of historicalData) {
      try {
        // Calculate accuracy using new comprehensive system
        const accuracy = calculatePredictionAccuracy(record.prediction, record.actualResult);
        const calibration = computeCalibrationMetrics(record.prediction, record.actualResult);

        // Create enhanced accuracy record
        const accuracyRecord = {
          id: `migrated-${record.id}-${Date.now()}`,
          matchId: record.id,
          homeTeam: record.homeTeam,
          awayTeam: record.awayTeam,
          league: record.league,
          predictionDate: record.date,
          matchDate: record.date,
          prediction: record.prediction,
          actualResult: record.actualResult,
          accuracy,
          calibration,
          verifiedAt: new Date().toISOString(),
          cloudVerified: false,
          migrated: true,
          migratedAt: new Date().toISOString()
        };

        accuracyRecords.push(accuracyRecord);

        // Also add to daily predictions format
        const predictionDate = new Date(record.date).toISOString().split('T')[0];
        if (!dailyPredictions[predictionDate]) {
          dailyPredictions[predictionDate] = [];
        }

        dailyPredictions[predictionDate].push({
          matchId: record.id,
          homeTeam: record.homeTeam,
          awayTeam: record.awayTeam,
          league: record.league,
          matchDate: record.date,
          prediction: record.prediction,
          predictionTime: record.date,
          verified: true,
          verifiedAt: new Date().toISOString(),
          actualResult: record.actualResult,
          accuracy,
          cloudStored: false,
          migrated: true
        });

        successCount++;
        console.log(`✅ Migrated: ${record.homeTeam} vs ${record.awayTeam} (${accuracy.outcome ? 'Correct' : 'Incorrect'} outcome)`);

      } catch (error) {
        errorCount++;
        console.error(`❌ Error migrating record ${record.id}:`, error.message);
      }
    }

    // Calculate overall stats
    const totalPredictions = accuracyRecords.length;
    const correctOutcomes = accuracyRecords.filter(r => r.accuracy.outcome).length;
    const correctScorelines = accuracyRecords.filter(r => r.accuracy.scoreline).length;
    const correctGoalLines = accuracyRecords.filter(r => r.accuracy.goalLine).length;

    const migrationSummary = {
      migratedAt: new Date().toISOString(),
      totalRecords: historicalData.length,
      successfulMigrations: successCount,
      errors: errorCount,
      accuracyStats: {
        totalPredictions,
        correctOutcomes,
        correctScorelines,
        correctGoalLines,
        outcomeAccuracy: Math.round((correctOutcomes / totalPredictions) * 100),
        scorelineAccuracy: Math.round((correctScorelines / totalPredictions) * 100),
        goalLineAccuracy: Math.round((correctGoalLines / totalPredictions) * 100)
      }
    };

    // Write migrated data files
    const outputDir = path.join(__dirname, '../data/migrated');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Write accuracy records
    const accuracyPath = path.join(outputDir, 'accuracy-records.json');
    fs.writeFileSync(accuracyPath, JSON.stringify(accuracyRecords, null, 2));

    // Write daily predictions
    const dailyPath = path.join(outputDir, 'daily-predictions.json');
    fs.writeFileSync(dailyPath, JSON.stringify(dailyPredictions, null, 2));

    // Write migration summary
    const summaryPath = path.join(outputDir, 'migration-summary.json');
    fs.writeFileSync(summaryPath, JSON.stringify(migrationSummary, null, 2));

    console.log('\n🎉 Migration completed successfully!');
    console.log('📁 Migrated files saved to:', outputDir);
    console.log('\n📊 Migration Summary:');
    console.log(`   Total Records: ${migrationSummary.totalRecords}`);
    console.log(`   Successfully Migrated: ${migrationSummary.successfulMigrations}`);
    console.log(`   Errors: ${migrationSummary.errors}`);
    console.log('\n🎯 Accuracy Stats from Historical Data:');
    console.log(`   Outcome Accuracy: ${migrationSummary.accuracyStats.outcomeAccuracy}%`);
    console.log(`   Scoreline Accuracy: ${migrationSummary.accuracyStats.scorelineAccuracy}%`);
    console.log(`   Goal Line Accuracy: ${migrationSummary.accuracyStats.goalLineAccuracy}%`);

    console.log('\n✅ Ready to integrate with new accuracy tracking system!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateHistoricalData();
}

export { migrateHistoricalData };