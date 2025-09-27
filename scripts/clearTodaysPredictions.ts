// Script to clear today's predictions from KV storage
// This allows for fresh manual generation of predictions

import fetch from 'node-fetch';

const WORKER_ENDPOINT = 'https://fixturecast-cron-worker.btltech.workers.dev';
const CLEAR_ENDPOINT = `${WORKER_ENDPOINT}/clear-predictions`;

interface ClearResult {
  success: boolean;
  message: string;
  clearedKeys: number;
  date: string;
  errors?: string[];
}

async function clearTodaysPredictions(): Promise<ClearResult> {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD format
  
  console.log(`🧹 Clearing predictions for ${today}...`);
  
  try {
    // Call the worker's clear endpoint
    const response = await fetch(`${CLEAR_ENDPOINT}?date=${today}&confirm=true`);
    
    if (!response.ok) {
      throw new Error(`Clear request failed: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json() as ClearResult;
    return result;
  } catch (error) {
    console.error('Error clearing predictions:', error);
    throw error;
  }
}

async function verifyCleared(): Promise<boolean> {
  console.log('🔍 Verifying predictions are cleared...');
  
  try {
    const healthResponse = await fetch(`${WORKER_ENDPOINT}/prediction-health`);
    if (!healthResponse.ok) {
      console.error('Failed to check prediction health');
      return false;
    }
    
    const health = await healthResponse.json();
    
    // Check if predictions are cleared
    const hasPredictions = health.progress?.predicted > 0;
    const hasFailures = health.progress?.failures > 0;
    
    if (!hasPredictions && !hasFailures) {
      console.log('✅ Predictions successfully cleared');
      return true;
    } else {
      console.log(`⚠️ Still showing ${health.progress?.predicted || 0} predictions, ${health.progress?.failures || 0} failures`);
      return false;
    }
  } catch (error) {
    console.error('Error verifying clear operation:', error);
    return false;
  }
}

async function main() {
  console.log('🗑️ PREDICTION CLEARING TOOL');
  console.log('='.repeat(40));
  
  try {
    // Step 1: Clear predictions
    console.log('\n📋 Step 1: Clearing existing predictions...');
    const clearResult = await clearTodaysPredictions();
    
    if (clearResult.success) {
      console.log(`✅ Successfully cleared ${clearResult.clearedKeys} prediction keys`);
      console.log(`📅 Date: ${clearResult.date}`);
      
      if (clearResult.errors && clearResult.errors.length > 0) {
        console.log('⚠️ Some errors occurred during clearing:');
        clearResult.errors.forEach(error => console.log(`   - ${error}`));
      }
    } else {
      console.log(`❌ Clear operation failed: ${clearResult.message}`);
      return;
    }
    
    // Step 2: Verify clearing
    console.log('\n📋 Step 2: Verifying predictions are cleared...');
    const isCleared = await verifyCleared();
    
    if (isCleared) {
      console.log('\n🎉 SUCCESS: All predictions cleared successfully!');
      console.log('\n💡 Next steps:');
      console.log('   1. Run manual prediction generation:');
      console.log(`      curl -s '${WORKER_ENDPOINT}/trigger-predictions?resume=true&wave=20&model=gemini-1.5-flash'`);
      console.log('   2. Monitor the generation process');
      console.log('   3. Verify new predictions are complete and accurate');
    } else {
      console.log('\n⚠️ WARNING: Some predictions may still exist');
      console.log('   Consider running the clear operation again');
    }
    
  } catch (error) {
    console.error('\n❌ Clear operation failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { clearTodaysPredictions, verifyCleared };
