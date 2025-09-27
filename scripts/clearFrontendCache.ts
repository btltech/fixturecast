// Script to clear all frontend caching and ensure fresh data flow
// This addresses the issue of frontend showing old cached prediction data

import fetch from 'node-fetch';

const WORKER_ENDPOINT = 'https://fixturecast-cron-worker.btltech.workers.dev';
const PAGES_ENDPOINT = 'https://fixturecast.pages.dev';

interface CacheClearResult {
  success: boolean;
  message: string;
  clearedKeys?: number;
  errors?: string[];
}

async function clearBackendCache(): Promise<CacheClearResult> {
  try {
    console.log('🧹 Clearing backend cache...');
    
    // Clear recent predictions list
    const clearRecentResponse = await fetch(`${WORKER_ENDPOINT}/clear-predictions?date=2025-09-27&confirm=true`);
    const clearResult = await clearRecentResponse.json();
    
    if (clearResult.success) {
      console.log(`✅ Cleared ${clearResult.clearedKeys} backend keys`);
      return {
        success: true,
        message: `Cleared ${clearResult.clearedKeys} backend keys`,
        clearedKeys: clearResult.clearedKeys
      };
    } else {
      throw new Error(clearResult.message || 'Failed to clear backend cache');
    }
  } catch (error) {
    console.error('Error clearing backend cache:', error);
    return {
      success: false,
      message: `Backend cache clear failed: ${error}`,
      errors: [error.toString()]
    };
  }
}

async function clearFrontendCache(): Promise<CacheClearResult> {
  try {
    console.log('🧹 Clearing frontend cache...');
    
    // Clear browser localStorage (this would need to be done in the browser)
    console.log('💡 Frontend cache clearing instructions:');
    console.log('   1. Open browser Developer Tools (F12)');
    console.log('   2. Go to Application/Storage tab');
    console.log('   3. Clear Local Storage for your domain');
    console.log('   4. Clear Session Storage');
    console.log('   5. Hard refresh the page (Ctrl+Shift+R or Cmd+Shift+R)');
    
    return {
      success: true,
      message: 'Frontend cache clearing instructions provided'
    };
  } catch (error) {
    console.error('Error with frontend cache clearing:', error);
    return {
      success: false,
      message: `Frontend cache clear failed: ${error}`,
      errors: [error.toString()]
    };
  }
}

async function testDataFlow(): Promise<boolean> {
  try {
    console.log('🔍 Testing data flow from backend to frontend...');
    
    // Test 1: Check if backend has fresh predictions
    const healthResponse = await fetch(`${WORKER_ENDPOINT}/prediction-health`);
    const health = await healthResponse.json();
    
    if (!health.progress || health.progress.predicted === 0) {
      console.log('❌ Backend has no predictions - need to regenerate');
      return false;
    }
    
    console.log(`✅ Backend has ${health.progress.predicted} predictions`);
    
    // Test 2: Check API endpoints
    const testMatchId = '1379021'; // Chelsea vs Brighton
    const apiResponse = await fetch(`${PAGES_ENDPOINT}/api/predictions/${testMatchId}`);
    
    if (apiResponse.ok) {
      const predictionData = await apiResponse.json();
      if (predictionData.numeric_predictions) {
        console.log('✅ API endpoint returns fresh prediction data');
        return true;
      } else {
        console.log('⚠️ API endpoint returns empty prediction data');
        return false;
      }
    } else {
      console.log(`❌ API endpoint failed: ${apiResponse.status}`);
      return false;
    }
  } catch (error) {
    console.error('Error testing data flow:', error);
    return false;
  }
}

async function regenerateFreshPredictions(): Promise<boolean> {
  try {
    console.log('🔄 Regenerating fresh predictions...');
    
    const response = await fetch(`${WORKER_ENDPOINT}/trigger-predictions?resume=true&wave=20&model=deepseek-chat&force=true`);
    const result = await response.json();
    
    if (result.processedPredictions > 0) {
      console.log(`✅ Generated ${result.processedPredictions} fresh predictions`);
      return true;
    } else {
      console.log('⚠️ No new predictions generated');
      return false;
    }
  } catch (error) {
    console.error('Error regenerating predictions:', error);
    return false;
  }
}

async function main() {
  console.log('🔄 FRONTEND CACHE CLEARING & DATA REFRESH');
  console.log('='.repeat(60));
  
  try {
    // Step 1: Clear backend cache
    console.log('\n📋 Step 1: Clearing backend cache...');
    const backendResult = await clearBackendCache();
    
    if (backendResult.success) {
      console.log(`✅ ${backendResult.message}`);
    } else {
      console.log(`❌ ${backendResult.message}`);
    }
    
    // Step 2: Regenerate fresh predictions
    console.log('\n📋 Step 2: Regenerating fresh predictions...');
    const regenerateSuccess = await regenerateFreshPredictions();
    
    if (regenerateSuccess) {
      console.log('✅ Fresh predictions generated successfully');
    } else {
      console.log('⚠️ Prediction regeneration had issues');
    }
    
    // Step 3: Test data flow
    console.log('\n📋 Step 3: Testing data flow...');
    const dataFlowSuccess = await testDataFlow();
    
    if (dataFlowSuccess) {
      console.log('✅ Data flow is working correctly');
    } else {
      console.log('❌ Data flow has issues');
    }
    
    // Step 4: Frontend cache clearing instructions
    console.log('\n📋 Step 4: Frontend cache clearing...');
    const frontendResult = await clearFrontendCache();
    console.log(`✅ ${frontendResult.message}`);
    
    // Summary
    console.log('\n🎯 SUMMARY:');
    console.log('='.repeat(40));
    
    if (backendResult.success && regenerateSuccess && dataFlowSuccess) {
      console.log('✅ All systems are working correctly');
      console.log('💡 Next steps:');
      console.log('   1. Clear your browser cache (F12 → Application → Storage → Clear)');
      console.log('   2. Hard refresh the page (Ctrl+Shift+R)');
      console.log('   3. Check that matches now show fresh prediction data');
    } else {
      console.log('⚠️ Some issues detected:');
      if (!backendResult.success) console.log('   - Backend cache clearing failed');
      if (!regenerateSuccess) console.log('   - Prediction regeneration had issues');
      if (!dataFlowSuccess) console.log('   - Data flow has problems');
      
      console.log('\n💡 Troubleshooting:');
      console.log('   1. Check your browser console for errors');
      console.log('   2. Verify the API endpoints are accessible');
      console.log('   3. Clear browser cache and try again');
    }
    
  } catch (error) {
    console.error('\n❌ Cache clearing process failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { clearBackendCache, clearFrontendCache, testDataFlow, regenerateFreshPredictions };
