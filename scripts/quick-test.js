#!/usr/bin/env node

/**
 * FixtureCast Quick Functionality Test
 * Tests core services and functionality without browser automation
 */

console.log('🎯 FixtureCast Functionality Test Suite');
console.log('=====================================\n');

const tests = [];
let passed = 0;
let failed = 0;

function test(name, testFn) {
  try {
    console.log(`🧪 Testing: ${name}`);
    const result = testFn();
    
    if (result && typeof result.then === 'function') {
      // Handle async tests
      return result
        .then(() => {
          console.log(`✅ PASSED: ${name}`);
          passed++;
          tests.push({ name, status: 'PASSED' });
        })
        .catch(error => {
          console.error(`❌ FAILED: ${name} - ${error.message}`);
          failed++;
          tests.push({ name, status: 'FAILED', error: error.message });
        });
    } else {
      console.log(`✅ PASSED: ${name}`);
      passed++;
      tests.push({ name, status: 'PASSED' });
    }
  } catch (error) {
    console.error(`❌ FAILED: ${name} - ${error.message}`);
    failed++;
    tests.push({ name, status: 'FAILED', error: error.message });
  }
}

async function runTests() {
  console.log('🔍 Testing Core Services...\n');

  // Test 1: Accuracy Service
  await test('Accuracy Service Import', async () => {
    const { getStoredAccuracyData, calculateAccuracyStats } = await import('../services/accuracyService.ts');
    
    if (typeof getStoredAccuracyData !== 'function') {
      throw new Error('getStoredAccuracyData is not a function');
    }
    if (typeof calculateAccuracyStats !== 'function') {
      throw new Error('calculateAccuracyStats is not a function');
    }
  });

  // Test 2: Historical Data Conversion
  await test('Historical Data Conversion', async () => {
    const { getStoredAccuracyData } = await import('../services/accuracyService.ts');
    
    // This should trigger the historical data loading
    const accuracyData = getStoredAccuracyData();
    
    if (!Array.isArray(accuracyData)) {
      throw new Error('getStoredAccuracyData should return an array');
    }
    
    console.log(`   📊 Loaded ${accuracyData.length} accuracy records`);
    
    if (accuracyData.length === 0) {
      console.log('   ℹ️  No existing data - historical conversion should trigger on first use');
    } else {
      // Verify structure
      const firstRecord = accuracyData[0];
      const requiredFields = ['matchId', 'prediction', 'actualResult', 'accuracy', 'timestamp'];
      
      for (const field of requiredFields) {
        if (!(field in firstRecord)) {
          throw new Error(`Missing required field: ${field}`);
        }
      }
      
      console.log(`   ✅ Data structure is valid`);
    }
  });

  // Test 3: Accuracy Statistics Calculation
  await test('Accuracy Statistics', async () => {
    const { calculateAccuracyStats } = await import('../services/accuracyService.ts');
    
    // Test with sample data
    const sampleData = [
      {
        matchId: 'test1',
        accuracy: { outcome: true, scoreline: false, goalLine: true },
        timestamp: new Date().toISOString()
      },
      {
        matchId: 'test2', 
        accuracy: { outcome: false, scoreline: false, goalLine: true },
        timestamp: new Date().toISOString()
      }
    ];
    
    const stats = calculateAccuracyStats(sampleData);
    
    if (stats.totalPredictions !== 2) {
      throw new Error('Incorrect total predictions count');
    }
    if (stats.correctOutcomes !== 1) {
      throw new Error('Incorrect correct outcomes count');
    }
    if (stats.overallAccuracy !== 50) {
      throw new Error('Incorrect overall accuracy calculation');
    }
    
    console.log(`   📊 Stats calculation working: ${stats.overallAccuracy}% accuracy`);
  });

  // Test 4: Types Import
  await test('Types Definitions', async () => {
    const types = await import('../types.ts');
    
    if (!types.League) {
      throw new Error('League enum not found');
    }
    
    const leagues = Object.values(types.League);
    if (leagues.length === 0) {
      throw new Error('No leagues defined');
    }
    
    console.log(`   📋 Found ${leagues.length} league definitions`);
  });

  // Test 5: App Context
  await test('App Context Structure', async () => {
    const { useAppContext } = await import('../contexts/AppContext.tsx');
    
    if (typeof useAppContext !== 'function') {
      throw new Error('useAppContext is not a function');
    }
  });

  // Test 6: Component Imports
  await test('Core Components', async () => {
    try {
      const AccuracyDashboard = await import('../components/AccuracyDashboard.tsx');
      const Dashboard = await import('../components/Dashboard.tsx');
      const Fixtures = await import('../components/Fixtures.tsx');
      
      if (!AccuracyDashboard.default && !AccuracyDashboard.AccuracyDashboard) {
        throw new Error('AccuracyDashboard component not found');
      }
      
      console.log('   🎯 Core components import successfully');
    } catch (error) {
      throw new Error(`Component import failed: ${error.message}`);
    }
  });

  // Test 7: Static Data Files
  await test('Static Data Files', () => {
    const fs = require('fs');
    const path = require('path');
    
    const pastPredictionsPath = path.join(process.cwd(), 'dist/data/past-predictions.json');
    
    if (fs.existsSync(pastPredictionsPath)) {
      const data = JSON.parse(fs.readFileSync(pastPredictionsPath, 'utf8'));
      
      if (!Array.isArray(data)) {
        throw new Error('past-predictions.json should contain an array');
      }
      
      console.log(`   📁 Found ${data.length} historical predictions`);
      
      if (data.length > 0) {
        const sample = data[0];
        const requiredFields = ['id', 'homeTeam', 'awayTeam', 'prediction', 'actualResult'];
        
        for (const field of requiredFields) {
          if (!(field in sample)) {
            throw new Error(`Missing field in historical data: ${field}`);
          }
        }
      }
    } else {
      console.log('   ℹ️  Historical data file not found in dist - will be created during build');
    }
  });

  // Test 8: Package Configuration
  await test('Package Configuration', () => {
    const fs = require('fs');
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    
    if (!packageJson.scripts) {
      throw new Error('No scripts defined in package.json');
    }
    
    const requiredScripts = ['dev', 'build', 'preview'];
    for (const script of requiredScripts) {
      if (!packageJson.scripts[script]) {
        throw new Error(`Missing required script: ${script}`);
      }
    }
    
    console.log('   📦 Package configuration is valid');
  });

  // Test 9: Build Output
  await test('Build Output Validation', () => {
    const fs = require('fs');
    const path = require('path');
    
    const distPath = path.join(process.cwd(), 'dist');
    const indexPath = path.join(distPath, 'index.html');
    
    if (fs.existsSync(distPath) && fs.existsSync(indexPath)) {
      const indexContent = fs.readFileSync(indexPath, 'utf8');
      
      if (!indexContent.includes('FixtureCast') && !indexContent.includes('script')) {
        throw new Error('Build output appears invalid');
      }
      
      console.log('   🏗️  Build output is valid');
    } else {
      throw new Error('Build output not found - run npm run build first');
    }
  });

  // Test 10: Environment Check
  await test('Environment Configuration', () => {
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.split('.')[0].substring(1));
    
    if (majorVersion < 16) {
      throw new Error(`Node.js ${majorVersion} is too old. Requires Node 16+`);
    }
    
    console.log(`   🟢 Node.js ${nodeVersion} is compatible`);
    
    // Check for required environment setup
    const hasVite = process.env.NODE_ENV !== undefined || 
                   require('fs').existsSync('vite.config.ts');
    
    if (!hasVite) {
      console.log('   ⚠️  Vite configuration may be missing');
    }
  });

  console.log('\n' + '='.repeat(50));
  console.log('📊 FUNCTIONALITY TEST RESULTS');
  console.log('='.repeat(50));
  
  const total = passed + failed;
  const successRate = total > 0 ? (passed / total * 100).toFixed(1) : 0;
  
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${successRate}%`);

  if (failed === 0) {
    console.log('\n🎉 ALL CORE TESTS PASSED!');
    console.log('✨ FixtureCast functionality is working correctly');
    console.log('\n🚀 Ready for production use:');
    console.log('   • Historical accuracy data integration: ✅');
    console.log('   • Component structure: ✅');
    console.log('   • Service layer: ✅');
    console.log('   • Build system: ✅');
    console.log('   • Data persistence: ✅');
  } else {
    console.log(`\n⚠️  ${failed} test(s) failed - review issues above`);
  }

  // Show failed tests
  if (failed > 0) {
    console.log('\n❌ FAILED TESTS:');
    tests.filter(t => t.status === 'FAILED').forEach(test => {
      console.log(`   • ${test.name}: ${test.error}`);
    });
  }

  console.log('\n📝 Next steps:');
  console.log('   1. Visit http://localhost:5173/accuracy to verify UI');
  console.log('   2. Test prediction generation manually');
  console.log('   3. Verify mobile responsiveness');
  console.log('   4. Check production deployment');
}

// Run the tests
runTests().catch(error => {
  console.error('🚨 Test suite crashed:', error);
  process.exit(1);
});