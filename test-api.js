#!/usr/bin/env node

console.log('🔮 Testing Gemini prediction with Key Factors Analysis...\n');

// Simple test using the API endpoint directly
const testMatch = {
  id: 'test-001',
  homeTeam: 'Arsenal',
  awayTeam: 'Chelsea',
  league: 'Premier League',
  date: new Date().toISOString()
};

async function testPrediction() {
  try {
    // Test the API endpoint directly
    const response = await fetch('http://localhost:5173/api/ai/gemini/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ match: testMatch, context: null, accuracyStats: null })
    });

    if (!response.ok) {
      throw new Error(`API Error (${response.status}): ${await response.text()}`);
    }

    const data = await response.json();
    const prediction = data.prediction || data;

    console.log('✅ Prediction Result:');
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
      console.log('Prediction object keys:', Object.keys(prediction));
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    if (error.message.includes('ECONNREFUSED') || error.message.includes('fetch')) {
      console.log('\n💡 The dev server is not running.');
      console.log('   Start it with: npm run start');
      console.log('   Then run this test again.');
    }
  }
}

testPrediction();