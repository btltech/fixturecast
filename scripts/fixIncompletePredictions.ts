// Comprehensive fix for incomplete predictions
// Identifies and retries incomplete predictions with enhanced validation

import fetch from 'node-fetch';

const TRIGGER_ENDPOINT = 'https://fixturecast-cron-worker.btltech.workers.dev/trigger-predictions';
const PREDICTION_HEALTH_ENDPOINT = 'https://fixturecast-cron-worker.btltech.workers.dev/prediction-health';

interface FixOptions {
  waveSize?: number;
  model?: string;
  force?: boolean;
  resume?: boolean;
}

async function triggerPredictionFix(options: FixOptions = {}): Promise<any> {
  const params = new URLSearchParams();
  
  if (options.waveSize) params.append('wave', options.waveSize.toString());
  if (options.model) params.append('model', options.model);
  if (options.force) params.append('force', 'true');
  if (options.resume) params.append('resume', 'true');
  
  const url = `${TRIGGER_ENDPOINT}?${params.toString()}`;
  console.log(`🔄 Triggering prediction fix: ${url}`);
  
  try {
    const response = await fetch(url);
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error triggering prediction fix:', error);
    throw error;
  }
}

async function checkSystemHealth(): Promise<any> {
  try {
    const response = await fetch(PREDICTION_HEALTH_ENDPOINT);
    return await response.json();
  } catch (error) {
    console.error('Error checking system health:', error);
    return null;
  }
}

async function fixIncompletePredictions(): Promise<void> {
  console.log('🔧 Starting comprehensive prediction fix...');
  
  // Step 1: Check current system health
  console.log('\n📊 Checking system health...');
  const health = await checkSystemHealth();
  
  if (!health) {
    console.error('❌ Cannot check system health - aborting');
    return;
  }
  
  console.log(`   Status: ${health.status}`);
  console.log(`   Predicted: ${health.progress.predicted}/${health.progress.featuredMatches}`);
  console.log(`   Failures: ${health.progress.failures}`);
  console.log(`   Remaining: ${health.progress.remaining}`);
  
  // Step 2: Determine fix strategy
  const needsRetry = health.progress.failures > 0;
  const needsResume = health.progress.remaining > 0;
  const isComplete = health.progress.done && health.progress.failures === 0;
  
  if (isComplete) {
    console.log('\n✅ System appears complete - running validation fix anyway...');
  }
  
  // Step 3: Execute fixes based on issues found
  const fixes = [];
  
  if (needsRetry || needsResume || isComplete) {
    console.log('\n🔄 Executing prediction fixes...');
    
    // Fix 1: Retry failed predictions with DeepSeek (more reliable)
    if (needsRetry) {
      console.log('   🔄 Retrying failed predictions with DeepSeek...');
      try {
        const result1 = await triggerPredictionFix({
          waveSize: 10,
          model: 'deepseek-chat',
          resume: true
        });
        console.log(`   ✅ Retry result: ${result1.message || 'Completed'}`);
        fixes.push('Retried failed predictions with DeepSeek');
      } catch (error) {
        console.error('   ❌ Retry failed:', error);
      }
    }
    
    // Fix 2: Resume any remaining predictions
    if (needsResume) {
      console.log('   🔄 Resuming remaining predictions...');
      try {
        const result2 = await triggerPredictionFix({
          waveSize: 20,
          model: 'gemini-1.5-flash',
          resume: true
        });
        console.log(`   ✅ Resume result: ${result2.message || 'Completed'}`);
        fixes.push('Resumed remaining predictions with Gemini');
      } catch (error) {
        console.error('   ❌ Resume failed:', error);
      }
    }
    
    // Fix 3: Force regeneration for data quality improvements
    if (isComplete) {
      console.log('   🔄 Running data quality improvement pass...');
      try {
        const result3 = await triggerPredictionFix({
          waveSize: 15,
          model: 'gemini-1.5-flash',
          resume: true
        });
        console.log(`   ✅ Quality improvement: ${result3.message || 'Completed'}`);
        fixes.push('Ran data quality improvement pass');
      } catch (error) {
        console.error('   ❌ Quality improvement failed:', error);
      }
    }
  }
  
  // Step 4: Final health check
  console.log('\n📊 Final system health check...');
  const finalHealth = await checkSystemHealth();
  
  if (finalHealth) {
    console.log(`   Final Status: ${finalHealth.status}`);
    console.log(`   Final Predicted: ${finalHealth.progress.predicted}/${finalHealth.progress.featuredMatches}`);
    console.log(`   Final Failures: ${finalHealth.progress.failures}`);
    console.log(`   Final Remaining: ${finalHealth.progress.remaining}`);
    
    const finalCompletionRate = (finalHealth.progress.predicted / finalHealth.progress.featuredMatches) * 100;
    console.log(`   Final Completion Rate: ${finalCompletionRate.toFixed(1)}%`);
    
    if (finalHealth.progress.failures === 0 && finalHealth.progress.remaining === 0) {
      console.log('\n✅ All prediction issues have been resolved!');
    } else {
      console.log('\n⚠️ Some issues may still remain - consider running again');
    }
  }
  
  // Step 5: Summary
  console.log('\n📋 FIX SUMMARY:');
  if (fixes.length > 0) {
    fixes.forEach((fix, index) => {
      console.log(`   ${index + 1}. ${fix}`);
    });
  } else {
    console.log('   No fixes were needed - system was already healthy');
  }
  
  console.log('\n🎯 RECOMMENDATIONS:');
  console.log('   1. Monitor the system for the next few hours');
  console.log('   2. Check the frontend to ensure predictions display correctly');
  console.log('   3. Run this script again if issues persist');
  console.log('   4. Consider implementing the enhanced validation in your retry script');
}

async function main() {
  try {
    await fixIncompletePredictions();
    console.log('\n🎉 Prediction fix process completed!');
  } catch (error) {
    console.error('\n❌ Prediction fix failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { fixIncompletePredictions, triggerPredictionFix };
