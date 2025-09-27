// Simple script to clear today's predictions using existing endpoints
// This approach works with the current deployed worker

import fetch from 'node-fetch';

const WORKER_ENDPOINT = 'https://fixturecast-cron-worker.btltech.workers.dev';

async function checkCurrentPredictions(): Promise<any> {
  try {
    const response = await fetch(`${WORKER_ENDPOINT}/prediction-health`);
    if (!response.ok) {
      throw new Error(`Health check failed: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error checking prediction health:', error);
    return null;
  }
}

async function triggerFreshPredictions(): Promise<any> {
  try {
    console.log('🔄 Triggering fresh prediction generation...');
    const response = await fetch(`${WORKER_ENDPOINT}/trigger-predictions?resume=true&wave=20&model=gemini-1.5-flash&force=true`);
    
    if (!response.ok) {
      throw new Error(`Prediction trigger failed: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error triggering predictions:', error);
    throw error;
  }
}

async function main() {
  console.log('🗑️ PREDICTION CLEARING & REGENERATION');
  console.log('='.repeat(50));
  
  try {
    // Step 1: Check current status
    console.log('\n📊 Step 1: Checking current prediction status...');
    const health = await checkCurrentPredictions();
    
    if (!health) {
      console.error('❌ Cannot check prediction health - aborting');
      return;
    }
    
    console.log(`   Current Status: ${health.status}`);
    console.log(`   Predicted: ${health.progress.predicted}/${health.progress.featuredMatches}`);
    console.log(`   Failures: ${health.progress.failures}`);
    console.log(`   Remaining: ${health.progress.remaining}`);
    
    if (health.progress.predicted === 0 && health.progress.failures === 0) {
      console.log('\n✅ No existing predictions found - system is already clear');
      console.log('\n💡 You can now generate fresh predictions manually');
      return;
    }
    
    // Step 2: Force regeneration (this will overwrite existing predictions)
    console.log('\n🔄 Step 2: Forcing fresh prediction generation...');
    console.log('   This will overwrite any existing incomplete predictions');
    
    const result = await triggerFreshPredictions();
    
    console.log(`   Result: ${result.message || 'Completed'}`);
    console.log(`   Generated: ${result.processedPredictions || 0} predictions`);
    console.log(`   Failures: ${result.failures?.length || 0}`);
    
    // Step 3: Verify final status
    console.log('\n📊 Step 3: Verifying final status...');
    const finalHealth = await checkCurrentPredictions();
    
    if (finalHealth) {
      console.log(`   Final Status: ${finalHealth.status}`);
      console.log(`   Final Predicted: ${finalHealth.progress.predicted}/${finalHealth.progress.featuredMatches}`);
      console.log(`   Final Failures: ${finalHealth.progress.failures}`);
      console.log(`   Final Remaining: ${finalHealth.progress.remaining}`);
      
      const completionRate = (finalHealth.progress.predicted / finalHealth.progress.featuredMatches) * 100;
      console.log(`   Completion Rate: ${completionRate.toFixed(1)}%`);
      
      if (finalHealth.progress.failures === 0 && finalHealth.progress.remaining === 0) {
        console.log('\n🎉 SUCCESS: Fresh predictions generated successfully!');
        console.log('\n💡 Next steps:');
        console.log('   1. Check your frontend to see the new predictions');
        console.log('   2. Verify the predictions are complete and accurate');
        console.log('   3. Monitor the system for any issues');
      } else {
        console.log('\n⚠️ WARNING: Some issues may remain');
        console.log('   Consider running the generation again if needed');
      }
    }
    
  } catch (error) {
    console.error('\n❌ Operation failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { checkCurrentPredictions, triggerFreshPredictions };
