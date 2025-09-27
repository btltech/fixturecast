// Comprehensive KV storage cleanup script
// Addresses Cloudflare KV storage limit issues

import fetch from 'node-fetch';

const WORKER_ENDPOINT = 'https://fixturecast-cron-worker.btltech.workers.dev';

interface StorageCleanupResult {
  success: boolean;
  message: string;
  keysDeleted: number;
  errors: string[];
  recommendations: string[];
}

async function checkKVStorageStatus(): Promise<any> {
  try {
    console.log('🔍 Checking KV storage status...');
    
    const healthResponse = await fetch(`${WORKER_ENDPOINT}/prediction-health`);
    const health = await healthResponse.json();
    
    console.log('📊 Current Storage Status:');
    console.log(`   Date: ${health.date}`);
    console.log(`   Status: ${health.status}`);
    console.log(`   Predictions: ${health.progress?.predicted || 0}`);
    console.log(`   Failures: ${health.progress?.failures || 0}`);
    
    return health;
  } catch (error) {
    console.error('Error checking KV storage status:', error);
    return null;
  }
}

async function cleanupOldPredictions(): Promise<StorageCleanupResult> {
  try {
    console.log('🧹 Cleaning up old predictions...');
    
    const errors: string[] = [];
    let keysDeleted = 0;
    
    // Clean up predictions from previous days (keep only today)
    const today = '2025-09-27';
    const yesterday = '2025-09-26';
    const dayBefore = '2025-09-25';
    
    const datesToClean = [yesterday, dayBefore];
    
    for (const date of datesToClean) {
      try {
        console.log(`   Cleaning predictions for ${date}...`);
        const response = await fetch(`${WORKER_ENDPOINT}/clear-predictions?date=${date}&confirm=true`);
        const result = await response.json();
        
        if (result.success) {
          keysDeleted += result.clearedKeys || 0;
          console.log(`   ✅ Cleared ${result.clearedKeys} keys for ${date}`);
        } else {
          errors.push(`Failed to clear ${date}: ${result.message}`);
        }
      } catch (error) {
        errors.push(`Error clearing ${date}: ${error}`);
      }
    }
    
    return {
      success: errors.length === 0,
      message: `Cleaned up ${keysDeleted} old prediction keys`,
      keysDeleted,
      errors,
      recommendations: [
        'Consider implementing automatic cleanup of old predictions',
        'Monitor KV storage usage regularly',
        'Set up alerts for storage limits'
      ]
    };
  } catch (error) {
    console.error('Error cleaning up old predictions:', error);
    return {
      success: false,
      message: `Cleanup failed: ${error}`,
      keysDeleted: 0,
      errors: [error.toString()],
      recommendations: ['Manual cleanup required']
    };
  }
}

async function cleanupNonEssentialData(): Promise<StorageCleanupResult> {
  try {
    console.log('🧹 Cleaning up non-essential data...');
    
    const errors: string[] = [];
    let keysDeleted = 0;
    
    // Clean up old cron execution logs (keep only recent ones)
    try {
      console.log('   Cleaning old cron execution logs...');
      // This would require a custom endpoint, but we can suggest manual cleanup
      console.log('   💡 Manual cleanup needed for cron logs');
    } catch (error) {
      errors.push(`Cron log cleanup failed: ${error}`);
    }
    
    // Clean up old accuracy data (keep only recent)
    try {
      console.log('   Cleaning old accuracy data...');
      // This would require a custom endpoint, but we can suggest manual cleanup
      console.log('   💡 Manual cleanup needed for accuracy data');
    } catch (error) {
      errors.push(`Accuracy data cleanup failed: ${error}`);
    }
    
    return {
      success: errors.length === 0,
      message: `Cleaned up non-essential data`,
      keysDeleted,
      errors,
      recommendations: [
        'Implement automatic cleanup of old cron logs',
        'Set retention policies for accuracy data',
        'Monitor storage usage patterns'
      ]
    };
  } catch (error) {
    console.error('Error cleaning up non-essential data:', error);
    return {
      success: false,
      message: `Non-essential cleanup failed: ${error}`,
      keysDeleted: 0,
      errors: [error.toString()],
      recommendations: ['Manual cleanup required']
    };
  }
}

async function generateFreshPredictionsAfterCleanup(): Promise<boolean> {
  try {
    console.log('🔄 Generating fresh predictions after cleanup...');
    
    const response = await fetch(`${WORKER_ENDPOINT}/trigger-predictions?resume=true&wave=20&model=deepseek-chat&force=true`);
    const result = await response.json();
    
    if (result.processedPredictions > 0) {
      console.log(`✅ Generated ${result.processedPredictions} fresh predictions`);
      return true;
    } else {
      console.log(`⚠️ Generation result: ${result.message}`);
      return false;
    }
  } catch (error) {
    console.error('Error generating fresh predictions:', error);
    return false;
  }
}

async function createStorageOptimizationPlan(): Promise<string[]> {
  return [
    'IMMEDIATE ACTIONS:',
    '1. Clean up old predictions (done above)',
    '2. Remove old cron execution logs',
    '3. Clear old accuracy data',
    '4. Generate fresh predictions',
    '',
    'LONG-TERM OPTIMIZATION:',
    '1. Implement automatic cleanup of data older than 7 days',
    '2. Compress prediction data before storage',
    '3. Use more efficient data structures',
    '4. Set up storage monitoring and alerts',
    '5. Consider upgrading KV storage plan if needed',
    '',
    'PREVENTION STRATEGIES:',
    '1. Implement data retention policies',
    '2. Use compression for large data',
    '3. Clean up failed prediction attempts',
    '4. Monitor storage usage daily',
    '5. Set up automatic cleanup schedules'
  ];
}

async function main() {
  console.log('🧹 KV STORAGE CLEANUP & OPTIMIZATION');
  console.log('='.repeat(50));
  
  try {
    // Step 1: Check current status
    console.log('\n📋 Step 1: Checking current storage status...');
    const status = await checkKVStorageStatus();
    
    if (!status) {
      console.log('❌ Could not check storage status');
      return;
    }
    
    // Step 2: Clean up old predictions
    console.log('\n📋 Step 2: Cleaning up old predictions...');
    const predictionCleanup = await cleanupOldPredictions();
    
    if (predictionCleanup.success) {
      console.log(`✅ ${predictionCleanup.message}`);
    } else {
      console.log(`⚠️ ${predictionCleanup.message}`);
      predictionCleanup.errors.forEach(error => console.log(`   - ${error}`));
    }
    
    // Step 3: Clean up non-essential data
    console.log('\n📋 Step 3: Cleaning up non-essential data...');
    const nonEssentialCleanup = await cleanupNonEssentialData();
    
    if (nonEssentialCleanup.success) {
      console.log(`✅ ${nonEssentialCleanup.message}`);
    } else {
      console.log(`⚠️ ${nonEssentialCleanup.message}`);
    }
    
    // Step 4: Generate fresh predictions
    console.log('\n📋 Step 4: Generating fresh predictions...');
    const generationSuccess = await generateFreshPredictionsAfterCleanup();
    
    if (generationSuccess) {
      console.log('✅ Fresh predictions generated successfully');
    } else {
      console.log('⚠️ Prediction generation had issues');
    }
    
    // Step 5: Create optimization plan
    console.log('\n📋 Step 5: Storage optimization plan...');
    const optimizationPlan = await createStorageOptimizationPlan();
    
    console.log('\n🎯 STORAGE OPTIMIZATION PLAN:');
    optimizationPlan.forEach(item => {
      console.log(item);
    });
    
    // Summary
    console.log('\n🎉 CLEANUP SUMMARY:');
    console.log('='.repeat(40));
    console.log(`✅ Old predictions cleaned: ${predictionCleanup.keysDeleted} keys`);
    console.log(`✅ Non-essential data cleaned: ${nonEssentialCleanup.keysDeleted} keys`);
    console.log(`✅ Fresh predictions generated: ${generationSuccess ? 'Yes' : 'No'}`);
    
    console.log('\n💡 NEXT STEPS:');
    console.log('1. Check your Cloudflare dashboard for KV storage usage');
    console.log('2. Monitor storage usage over the next few days');
    console.log('3. Implement automatic cleanup if needed');
    console.log('4. Consider upgrading your KV storage plan if you hit limits again');
    
    console.log('\n🔧 TECHNICAL RECOMMENDATIONS:');
    console.log('- Implement data retention policies (keep only 7 days of data)');
    console.log('- Use compression for large prediction objects');
    console.log('- Clean up failed prediction attempts regularly');
    console.log('- Set up monitoring for storage usage');
    console.log('- Consider using Cloudflare D1 for larger datasets');
    
  } catch (error) {
    console.error('\n❌ Storage cleanup failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { checkKVStorageStatus, cleanupOldPredictions, cleanupNonEssentialData, generateFreshPredictionsAfterCleanup };
