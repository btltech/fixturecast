// Force clear and regenerate predictions
// This script uses multiple approaches to ensure fresh predictions

import fetch from 'node-fetch';

const WORKER_ENDPOINT = 'https://fixturecast-cron-worker.btltech.workers.dev';

async function forceRegeneratePredictions(): Promise<any> {
  try {
    console.log('🔄 Force regenerating predictions with multiple approaches...');
    
    // Approach 1: Force regeneration with different parameters
    console.log('   Approach 1: Force with different model...');
    const response1 = await fetch(`${WORKER_ENDPOINT}/trigger-predictions?resume=true&wave=10&model=deepseek-chat&force=true`);
    const result1 = await response1.json();
    console.log(`   DeepSeek result: ${result1.message || 'Completed'}`);
    
    // Approach 2: Force with Gemini
    console.log('   Approach 2: Force with Gemini...');
    const response2 = await fetch(`${WORKER_ENDPOINT}/trigger-predictions?resume=true&wave=15&model=gemini-1.5-flash&force=true`);
    const result2 = await response2.json();
    console.log(`   Gemini result: ${result2.message || 'Completed'}`);
    
    // Approach 3: Force with mixed models
    console.log('   Approach 3: Force with mixed models...');
    const response3 = await fetch(`${WORKER_ENDPOINT}/trigger-predictions?resume=true&wave=20&force=true`);
    const result3 = await response3.json();
    console.log(`   Mixed result: ${result3.message || 'Completed'}`);
    
    return {
      deepseek: result1,
      gemini: result2,
      mixed: result3
    };
  } catch (error) {
    console.error('Error in force regeneration:', error);
    throw error;
  }
}

async function checkSystemStatus(): Promise<any> {
  try {
    const response = await fetch(`${WORKER_ENDPOINT}/prediction-health`);
    if (!response.ok) {
      throw new Error(`Health check failed: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error checking system status:', error);
    return null;
  }
}

async function main() {
  console.log('🔄 FORCE CLEAR & REGENERATE PREDICTIONS');
  console.log('='.repeat(50));
  
  try {
    // Step 1: Check initial status
    console.log('\n📊 Step 1: Checking initial system status...');
    const initialHealth = await checkSystemStatus();
    
    if (!initialHealth) {
      console.error('❌ Cannot check system status - aborting');
      return;
    }
    
    console.log(`   Initial Status: ${initialHealth.status}`);
    console.log(`   Initial Predicted: ${initialHealth.progress.predicted}/${initialHealth.progress.featuredMatches}`);
    console.log(`   Initial Failures: ${initialHealth.progress.failures}`);
    
    // Step 2: Force regeneration with multiple approaches
    console.log('\n🔄 Step 2: Force regenerating with multiple approaches...');
    const results = await forceRegeneratePredictions();
    
    console.log('\n📊 Step 3: Checking final system status...');
    const finalHealth = await checkSystemStatus();
    
    if (finalHealth) {
      console.log(`   Final Status: ${finalHealth.status}`);
      console.log(`   Final Predicted: ${finalHealth.progress.predicted}/${finalHealth.progress.featuredMatches}`);
      console.log(`   Final Failures: ${finalHealth.progress.failures}`);
      console.log(`   Final Remaining: ${finalHealth.progress.remaining}`);
      
      const completionRate = (finalHealth.progress.predicted / finalHealth.progress.featuredMatches) * 100;
      console.log(`   Completion Rate: ${completionRate.toFixed(1)}%`);
      
      // Analysis
      console.log('\n🔍 ANALYSIS:');
      if (finalHealth.progress.predicted > initialHealth.progress.predicted) {
        console.log(`   ✅ Generated ${finalHealth.progress.predicted - initialHealth.progress.predicted} new predictions`);
      } else if (finalHealth.progress.predicted === initialHealth.progress.predicted) {
        console.log('   ℹ️ No new predictions generated (system may have detected existing ones)');
      }
      
      if (finalHealth.progress.failures > 0) {
        console.log(`   ⚠️ ${finalHealth.progress.failures} failures detected`);
      }
      
      if (finalHealth.progress.remaining > 0) {
        console.log(`   ⚠️ ${finalHealth.progress.remaining} matches still pending`);
      }
      
      // Recommendations
      console.log('\n💡 RECOMMENDATIONS:');
      
      if (finalHealth.progress.failures === 0 && finalHealth.progress.remaining === 0) {
        console.log('   ✅ System is healthy - all predictions are complete');
        console.log('   📱 Check your frontend to verify predictions display correctly');
      } else {
        console.log('   🔄 Consider running this script again to retry failed predictions');
        console.log('   📊 Monitor the system for any ongoing issues');
      }
      
      // Manual trigger suggestion
      console.log('\n🎯 MANUAL TRIGGER COMMANDS:');
      console.log('   If you need to manually trigger predictions:');
      console.log(`   curl -s '${WORKER_ENDPOINT}/trigger-predictions?resume=true&wave=20&model=gemini-1.5-flash'`);
      console.log(`   curl -s '${WORKER_ENDPOINT}/trigger-predictions?resume=true&wave=10&model=deepseek-chat'`);
      
    } else {
      console.log('❌ Could not verify final status');
    }
    
  } catch (error) {
    console.error('\n❌ Force regeneration failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { forceRegeneratePredictions, checkSystemStatus };
