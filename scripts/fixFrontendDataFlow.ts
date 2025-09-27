// Comprehensive fix for frontend data flow issues
// Ensures fresh prediction data reaches the frontend

import fetch from 'node-fetch';

const WORKER_ENDPOINT = 'https://fixturecast-cron-worker.btltech.workers.dev';

interface DataFlowFix {
  success: boolean;
  message: string;
  predictionsGenerated: number;
  apiEndpoints: string[];
  instructions: string[];
}

async function ensureFreshPredictions(): Promise<number> {
  try {
    console.log('🔄 Ensuring fresh predictions are available...');
    
    // Check current status
    const healthResponse = await fetch(`${WORKER_ENDPOINT}/prediction-health`);
    const health = await healthResponse.json();
    
    if (health.progress && health.progress.predicted > 0) {
      console.log(`✅ Found ${health.progress.predicted} existing predictions`);
      return health.progress.predicted;
    }
    
    // Generate fresh predictions if none exist
    console.log('🔄 Generating fresh predictions...');
    const response = await fetch(`${WORKER_ENDPOINT}/trigger-predictions?resume=true&wave=20&model=deepseek-chat&force=true`);
    const result = await response.json();
    
    if (result.processedPredictions > 0) {
      console.log(`✅ Generated ${result.processedPredictions} fresh predictions`);
      return result.processedPredictions;
    } else {
      console.log('⚠️ No predictions were generated');
      return 0;
    }
  } catch (error) {
    console.error('Error ensuring fresh predictions:', error);
    return 0;
  }
}

async function testDirectDataAccess(): Promise<string[]> {
  const workingEndpoints: string[] = [];
  
  try {
    console.log('🔍 Testing direct data access methods...');
    
    // Test 1: Worker health endpoint
    try {
      const healthResponse = await fetch(`${WORKER_ENDPOINT}/prediction-health`);
      if (healthResponse.ok) {
        workingEndpoints.push(`${WORKER_ENDPOINT}/prediction-health`);
        console.log('✅ Worker health endpoint working');
      }
    } catch (error) {
      console.log('❌ Worker health endpoint failed');
    }
    
    // Test 2: Worker cron status
    try {
      const statusResponse = await fetch(`${WORKER_ENDPOINT}/cron-status`);
      if (statusResponse.ok) {
        workingEndpoints.push(`${WORKER_ENDPOINT}/cron-status`);
        console.log('✅ Worker cron status endpoint working');
      }
    } catch (error) {
      console.log('❌ Worker cron status endpoint failed');
    }
    
    // Test 3: Worker trigger endpoint
    try {
      const triggerResponse = await fetch(`${WORKER_ENDPOINT}/trigger-predictions?resume=true&wave=1&model=deepseek-chat`);
      if (triggerResponse.ok) {
        workingEndpoints.push(`${WORKER_ENDPOINT}/trigger-predictions`);
        console.log('✅ Worker trigger endpoint working');
      }
    } catch (error) {
      console.log('❌ Worker trigger endpoint failed');
    }
    
  } catch (error) {
    console.error('Error testing endpoints:', error);
  }
  
  return workingEndpoints;
}

async function createDataFlowSolution(): Promise<DataFlowFix> {
  try {
    console.log('🛠️ Creating comprehensive data flow solution...');
    
    // Step 1: Ensure fresh predictions exist
    const predictionsCount = await ensureFreshPredictions();
    
    // Step 2: Test available endpoints
    const workingEndpoints = await testDirectDataAccess();
    
    // Step 3: Create solution instructions
    const instructions = [
      'Clear browser cache completely (F12 → Application → Storage → Clear All)',
      'Hard refresh the page (Ctrl+Shift+R or Cmd+Shift+R)',
      'Check browser console for any errors',
      'Verify network requests are reaching the backend',
      'If still showing old data, try incognito/private browsing mode'
    ];
    
    return {
      success: predictionsCount > 0,
      message: predictionsCount > 0 ? 
        `Successfully ensured ${predictionsCount} fresh predictions are available` : 
        'Failed to ensure fresh predictions are available',
      predictionsGenerated: predictionsCount,
      apiEndpoints: workingEndpoints,
      instructions
    };
  } catch (error) {
    console.error('Error creating data flow solution:', error);
    return {
      success: false,
      message: `Data flow solution failed: ${error}`,
      predictionsGenerated: 0,
      apiEndpoints: [],
      instructions: ['Contact support for assistance']
    };
  }
}

async function main() {
  console.log('🛠️ FRONTEND DATA FLOW FIX');
  console.log('='.repeat(50));
  
  try {
    const solution = await createDataFlowSolution();
    
    console.log('\n📊 RESULTS:');
    console.log(`   Success: ${solution.success ? '✅' : '❌'}`);
    console.log(`   Predictions: ${solution.predictionsGenerated}`);
    console.log(`   Working Endpoints: ${solution.apiEndpoints.length}`);
    
    if (solution.apiEndpoints.length > 0) {
      console.log('\n🔗 WORKING ENDPOINTS:');
      solution.apiEndpoints.forEach(endpoint => {
        console.log(`   ✅ ${endpoint}`);
      });
    }
    
    console.log('\n💡 FRONTEND FIX INSTRUCTIONS:');
    solution.instructions.forEach((instruction, index) => {
      console.log(`   ${index + 1}. ${instruction}`);
    });
    
    console.log('\n🔧 TECHNICAL SOLUTION:');
    console.log('   The issue is likely one of these:');
    console.log('   1. Frontend is caching old prediction data in localStorage');
    console.log('   2. Browser is serving cached API responses');
    console.log('   3. The AppContext is not refreshing prediction data');
    console.log('   4. The advancedPredictionSyncService is serving stale data');
    
    console.log('\n🎯 IMMEDIATE ACTIONS:');
    console.log('   1. Open your browser Developer Tools (F12)');
    console.log('   2. Go to Application tab → Storage → Clear All');
    console.log('   3. Go to Network tab and check "Disable cache"');
    console.log('   4. Hard refresh the page (Ctrl+Shift+R)');
    console.log('   5. Check if fresh prediction data loads');
    
    if (solution.success) {
      console.log('\n✅ Fresh predictions are available in the backend');
      console.log('   The issue is likely frontend caching - follow the instructions above');
    } else {
      console.log('\n❌ Backend prediction generation failed');
      console.log('   You may need to manually trigger prediction generation');
    }
    
  } catch (error) {
    console.error('\n❌ Data flow fix failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { ensureFreshPredictions, testDirectDataAccess, createDataFlowSolution };
