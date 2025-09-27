// Simple diagnostic tool for prediction completeness
// Uses available endpoints to check prediction status

import fetch from 'node-fetch';

const PREDICTION_HEALTH_ENDPOINT = 'https://fixturecast-cron-worker.btltech.workers.dev/prediction-health';
const TRIGGER_ENDPOINT = 'https://fixturecast-cron-worker.btltech.workers.dev/trigger-predictions';

interface PredictionHealth {
  date: string;
  status: string;
  model: string;
  keys: {
    football: boolean;
    gemini: boolean;
    deepseek: boolean;
  };
  progress: {
    date: string;
    totalMatches: number;
    featuredMatches: number;
    predicted: number;
    remaining: number;
    failures: number;
    waveSizeApplied: number;
    resume: boolean;
    fetchMode: string;
    adaptiveDelayMs: number;
    dynamicConcurrency: number;
    consecutiveRateLimit: number;
    lastBatchAt: string;
    done: boolean;
  };
  aggregateSummary: {
    processed: number;
    failures: number;
    waveSizeApplied: number;
    remainingAfterWave: number;
    fetchMode: string;
    resume: boolean;
    generatedAt: string;
  };
  ratePressure: number;
  suggestions: string[];
}

async function checkPredictionHealth(): Promise<PredictionHealth | null> {
  try {
    const response = await fetch(PREDICTION_HEALTH_ENDPOINT);
    if (!response.ok) {
      throw new Error(`Health check failed: ${response.status}`);
    }
    return await response.json() as PredictionHealth;
  } catch (error) {
    console.error('Error fetching prediction health:', error);
    return null;
  }
}

function analyzeHealthData(health: PredictionHealth): void {
  console.log('\n🔍 PREDICTION SYSTEM DIAGNOSTIC');
  console.log('='.repeat(50));
  
  console.log(`\n📅 Date: ${health.date}`);
  console.log(`📊 Status: ${health.status}`);
  console.log(`🤖 Model: ${health.model}`);
  
  console.log(`\n🔑 API Keys Status:`);
  console.log(`   Football API: ${health.keys.football ? '✅' : '❌'}`);
  console.log(`   Gemini API: ${health.keys.gemini ? '✅' : '❌'}`);
  console.log(`   DeepSeek API: ${health.keys.deepseek ? '✅' : '❌'}`);
  
  console.log(`\n📈 Progress Summary:`);
  console.log(`   Total Matches: ${health.progress.totalMatches}`);
  console.log(`   Featured Matches: ${health.progress.featuredMatches}`);
  console.log(`   Predicted: ${health.progress.predicted}`);
  console.log(`   Remaining: ${health.progress.remaining}`);
  console.log(`   Failures: ${health.progress.failures}`);
  console.log(`   Completion: ${health.progress.done ? '✅ Complete' : '⏳ In Progress'}`);
  
  console.log(`\n⚙️ System Configuration:`);
  console.log(`   Wave Size: ${health.progress.waveSizeApplied}`);
  console.log(`   Concurrency: ${health.progress.dynamicConcurrency}`);
  console.log(`   Rate Limit Pressure: ${health.ratePressure}`);
  console.log(`   Adaptive Delay: ${health.progress.adaptiveDelayMs}ms`);
  
  console.log(`\n📊 Aggregate Summary:`);
  console.log(`   Processed: ${health.aggregateSummary.processed}`);
  console.log(`   Failures: ${health.aggregateSummary.failures}`);
  console.log(`   Remaining After Wave: ${health.aggregateSummary.remainingAfterWave}`);
  
  // Analysis and recommendations
  console.log(`\n🔍 ANALYSIS:`);
  
  const completionRate = (health.progress.predicted / health.progress.featuredMatches) * 100;
  console.log(`   Completion Rate: ${completionRate.toFixed(1)}%`);
  
  if (health.progress.failures > 0) {
    console.log(`   ⚠️ ${health.progress.failures} failures detected`);
  }
  
  if (health.progress.remaining > 0) {
    console.log(`   ⚠️ ${health.progress.remaining} matches still pending`);
  }
  
  if (health.ratePressure > 0) {
    console.log(`   ⚠️ Rate limit pressure: ${health.ratePressure}`);
  }
  
  if (!health.keys.football) {
    console.log(`   ❌ Football API key missing - fixtures cannot be fetched`);
  }
  
  if (!health.keys.gemini && !health.keys.deepseek) {
    console.log(`   ❌ No AI model keys available - predictions cannot be generated`);
  }
  
  console.log(`\n💡 RECOMMENDATIONS:`);
  
  if (health.progress.remaining > 0) {
    console.log(`   🔄 Run: curl -s '${TRIGGER_ENDPOINT}?resume=true&wave=20' to complete remaining predictions`);
  }
  
  if (health.progress.failures > 0) {
    console.log(`   🔄 Run: curl -s '${TRIGGER_ENDPOINT}?resume=true&wave=10&model=deepseek-chat' to retry failed predictions`);
  }
  
  if (health.ratePressure > 2) {
    console.log(`   ⏳ Consider reducing wave size or increasing delays due to rate limiting`);
  }
  
  if (completionRate === 100 && health.progress.failures === 0) {
    console.log(`   ✅ All predictions are complete and successful!`);
  }
  
  if (health.suggestions && health.suggestions.length > 0) {
    console.log(`\n💭 System Suggestions:`);
    health.suggestions.forEach(suggestion => console.log(`   ${suggestion}`));
  }
  
  console.log('\n' + '='.repeat(50));
}

async function main() {
  console.log('🔍 Starting prediction system diagnostic...');
  
  const health = await checkPredictionHealth();
  
  if (!health) {
    console.error('❌ Failed to fetch prediction health data');
    process.exit(1);
  }
  
  analyzeHealthData(health);
  
  // Determine if action is needed
  if (health.progress.remaining > 0 || health.progress.failures > 0) {
    console.log('\n⚠️ Action may be required to complete predictions');
    process.exit(1);
  } else {
    console.log('\n✅ Prediction system is healthy and complete');
    process.exit(0);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { checkPredictionHealth, analyzeHealthData };
