// Diagnose DeepSeek V3.1-Terminus model name and configuration
// Helps identify the correct model name format

import fetch from 'node-fetch';

const WORKER_ENDPOINT = 'https://fixturecast-cron-worker.btltech.workers.dev';

async function testModelNames(): Promise<void> {
  const modelNames = [
    'deepseek-v3.1-terminus',
    'deepseek-v3.1-terminus-chat', 
    'deepseek-v3.1-terminus-32k',
    'deepseek-v3.1-terminus-128k',
    'deepseek-v3.1-terminus-256k',
    'deepseek-v3.1-terminus-1m'
  ];

  console.log('🧪 Testing different DeepSeek V3.1-Terminus model names...');
  
  for (const modelName of modelNames) {
    try {
      console.log(`\n🔍 Testing: ${modelName}`);
      const response = await fetch(`${WORKER_ENDPOINT}/trigger-predictions?resume=true&wave=1&model=${modelName}&force=true`);
      const result = await response.json();
      
      if (result.processedPredictions > 0) {
        console.log(`✅ SUCCESS: ${modelName} worked! Generated ${result.processedPredictions} predictions`);
        return;
      } else if (result.failures && result.failures.length > 0) {
        const error = result.failures[0].error;
        console.log(`❌ FAILED: ${modelName} - ${error}`);
      } else {
        console.log(`⚠️ NO RESULT: ${modelName} - ${result.message}`);
      }
    } catch (error) {
      console.log(`❌ ERROR: ${modelName} - ${error}`);
    }
  }
}

async function main() {
  console.log('🔍 DEEPSEEK V3.1-TERMINUS DIAGNOSTIC');
  console.log('='.repeat(50));
  
  await testModelNames();
  
  console.log('\n💡 RECOMMENDATIONS:');
  console.log('1. Check your DeepSeek dashboard for available models');
  console.log('2. Verify your API key has V3.1-Terminus access');
  console.log('3. Check DeepSeek documentation for exact model names');
  console.log('4. Consider contacting DeepSeek support if none work');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
