import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import ts-node and register TypeScript loader
const tsNode = require('ts-node');

// Register TypeScript compiler
tsNode.register({
  esm: true,
  experimentalSpecifierResolution: 'node',
  transpileOnly: true
});

// Now we can import the TypeScript files
const { UnifiedPredictionService } = await import('./services/unifiedPredictionService.ts');

console.log('🔮 Testing Gemini prediction with Key Factors Analysis...\n');

const testMatch = {
  id: 'test-001',
  homeTeam: 'Arsenal',
  awayTeam: 'Chelsea',
  league: 'Premier League',
  date: new Date().toISOString()
};

try {
  const service = new UnifiedPredictionService();
  const result = await service.getPrediction(testMatch);
  
  console.log('✅ Prediction Result:');
  console.log('Model:', result.primary?.model);
  console.log('Response Time:', result.primary?.responseTime + 'ms');
  
  if (result.primary?.error) {
    console.log('❌ Error:', result.primary.error);
  } else if (result.primary?.prediction) {
    const prediction = result.primary.prediction;
    console.log('\n📊 Prediction Data:');
    console.log('- Home Win:', prediction.homeWinProbability + '%');
    console.log('- Draw:', prediction.drawProbability + '%');
    console.log('- Away Win:', prediction.awayWinProbability + '%');
    console.log('- Scoreline:', prediction.predictedScoreline);
    console.log('- Confidence:', prediction.confidence);
    
    // Check for Key Factors Analysis
    if (prediction.keyFactors && Array.isArray(prediction.keyFactors)) {
      console.log('\n🔑 Key Factors Analysis:');
      prediction.keyFactors.forEach((factor, index) => {
        console.log(`  ${index + 1}. ${factor.category}:`);
        factor.points.forEach(point => {
          console.log(`     - ${point}`);
        });
      });
      console.log('\n✅ Key Factors Analysis is present!');
    } else {
      console.log('\n❌ Key Factors Analysis is MISSING!');
    }
  }
} catch (error) {
  console.error('❌ Test failed:', error.message);
  
  // Check if it's a network/API issue
  if (error.message.includes('fetch') || error.message.includes('network')) {
    console.log('\n💡 This might be because the API endpoint is not running.');
    console.log('   Try starting your dev server with: npm run dev');
  }
}