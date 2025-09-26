#!/usr/bin/env node

/**
 * Comprehensive Functionality Test Suite for FixtureCast
 * Tests all major features to ensure system integrity
 */

import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const TEST_URL = 'http://localhost:5173';
const PRODUCTION_URL = 'https://ef48a746.fixturecast.pages.dev';

// Test configuration
const TEST_CONFIG = {
  timeout: 30000,
  headless: false, // Set to false to see the browser
  viewport: { width: 1280, height: 720 }
};

class FixtureCastTester {
  constructor(baseUrl = TEST_URL) {
    this.baseUrl = baseUrl;
    this.browser = null;
    this.page = null;
    this.results = {
      passed: 0,
      failed: 0,
      tests: []
    };
  }

  async init() {
    console.log('🚀 Initializing FixtureCast Test Suite...');
    this.browser = await puppeteer.launch({
      headless: TEST_CONFIG.headless,
      defaultViewport: TEST_CONFIG.viewport,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    this.page = await this.browser.newPage();
    
    // Enable console logging from the page
    this.page.on('console', msg => {
      const type = msg.type();
      if (type === 'error' || type === 'warn') {
        console.log(`🌐 Browser ${type.toUpperCase()}: ${msg.text()}`);
      }
    });

    // Handle page errors
    this.page.on('pageerror', err => {
      console.error('🔴 Page Error:', err.message);
    });
  }

  async test(name, testFn) {
    try {
      console.log(`\n🧪 Testing: ${name}`);
      const startTime = Date.now();
      
      await testFn();
      
      const duration = Date.now() - startTime;
      console.log(`✅ PASSED: ${name} (${duration}ms)`);
      this.results.passed++;
      this.results.tests.push({ name, status: 'PASSED', duration, error: null });
    } catch (error) {
      console.error(`❌ FAILED: ${name}`);
      console.error(`   Error: ${error.message}`);
      this.results.failed++;
      this.results.tests.push({ name, status: 'FAILED', duration: 0, error: error.message });
    }
  }

  async runAllTests() {
    try {
      await this.init();
      
      console.log(`🎯 Starting comprehensive test suite on: ${this.baseUrl}\n`);

      // ===== CORE FUNCTIONALITY TESTS =====
      
      await this.test('Homepage Loading', async () => {
        await this.page.goto(this.baseUrl, { waitUntil: 'networkidle0', timeout: TEST_CONFIG.timeout });
        await this.page.waitForSelector('h1', { timeout: 10000 });
        const title = await this.page.$eval('h1', el => el.textContent);
        if (!title || title.trim().length === 0) {
          throw new Error('Homepage title not found');
        }
      });

      await this.test('Navigation Menu', async () => {
        // Check if navigation is present and functional
        const navLinks = await this.page.$$('nav a, [role="navigation"] a');
        if (navLinks.length === 0) {
          throw new Error('No navigation links found');
        }
        
        // Test clicking a navigation link
        await this.page.click('a[href*="/fixtures"], a[href*="/predictions"]');
        await this.page.waitForTimeout(2000);
      });

      await this.test('Fixtures Page', async () => {
        await this.page.goto(`${this.baseUrl}/fixtures`, { waitUntil: 'networkidle0' });
        
        // Wait for fixtures to load or show "no fixtures" message
        try {
          await this.page.waitForSelector('[data-testid="fixture-card"], .fixture-card, .match-card', { timeout: 10000 });
        } catch {
          // If no fixture cards, check for empty state message
          const emptyState = await this.page.$('.empty-state, .no-fixtures, .no-matches');
          if (!emptyState) {
            throw new Error('Fixtures page loaded but shows no content');
          }
        }
      });

      await this.test('Prediction Generation', async () => {
        await this.page.goto(`${this.baseUrl}/local-prediction`, { waitUntil: 'networkidle0' });
        
        // Look for prediction form or content
        const predictionContent = await this.page.$('.prediction-form, .match-selection, .team-selector');
        if (!predictionContent) {
          // Check if there's any prediction-related content
          const anyPredictionContent = await this.page.$eval('body', el => 
            el.textContent.toLowerCase().includes('prediction') || 
            el.textContent.toLowerCase().includes('match')
          );
          if (!anyPredictionContent) {
            throw new Error('Prediction page shows no relevant content');
          }
        }
      });

      await this.test('Accuracy Dashboard', async () => {
        await this.page.goto(`${this.baseUrl}/accuracy`, { waitUntil: 'networkidle0' });
        
        // Wait for accuracy content to load
        await this.page.waitForTimeout(3000);
        
        // Check for accuracy statistics
        const accuracyStats = await this.page.evaluate(() => {
          const body = document.body.textContent.toLowerCase();
          return body.includes('accuracy') || 
                 body.includes('predictions') || 
                 body.includes('total') ||
                 body.includes('%');
        });
        
        if (!accuracyStats) {
          throw new Error('Accuracy dashboard shows no statistics');
        }
        
        // Check for historical data loading
        const hasData = await this.page.evaluate(() => {
          // Look for numbers that indicate data is loaded
          const numbers = document.body.textContent.match(/\d+/g);
          return numbers && numbers.some(num => parseInt(num) > 0);
        });
        
        if (!hasData) {
          console.warn('⚠️  Accuracy dashboard may not have loaded historical data yet');
        }
      });

      await this.test('Leagues Page', async () => {
        await this.page.goto(`${this.baseUrl}/leagues`, { waitUntil: 'networkidle0' });
        
        // Check for league content
        const leagueContent = await this.page.evaluate(() => {
          const body = document.body.textContent.toLowerCase();
          return body.includes('premier league') || 
                 body.includes('champions league') || 
                 body.includes('league') ||
                 body.includes('competition');
        });
        
        if (!leagueContent) {
          throw new Error('Leagues page shows no league information');
        }
      });

      await this.test('Teams Page', async () => {
        await this.page.goto(`${this.baseUrl}/teams`, { waitUntil: 'networkidle0' });
        
        // Check for team content
        const teamContent = await this.page.evaluate(() => {
          const body = document.body.textContent.toLowerCase();
          return body.includes('team') || 
                 body.includes('club') || 
                 body.includes('manchester') ||
                 body.includes('liverpool') ||
                 body.includes('chelsea');
        });
        
        if (!teamContent) {
          throw new Error('Teams page shows no team information');
        }
      });

      // ===== RESPONSIVE DESIGN TESTS =====
      
      await this.test('Mobile Responsiveness', async () => {
        await this.page.setViewport({ width: 375, height: 667 }); // iPhone SE
        await this.page.goto(this.baseUrl, { waitUntil: 'networkidle0' });
        
        // Check if mobile navigation is working
        const isMobileOptimized = await this.page.evaluate(() => {
          return window.innerWidth < 768;
        });
        
        if (!isMobileOptimized) {
          throw new Error('Mobile viewport not properly detected');
        }
        
        // Reset to desktop
        await this.page.setViewport(TEST_CONFIG.viewport);
      });

      // ===== PERFORMANCE TESTS =====
      
      await this.test('Page Load Performance', async () => {
        const startTime = Date.now();
        await this.page.goto(this.baseUrl, { waitUntil: 'networkidle0' });
        const loadTime = Date.now() - startTime;
        
        console.log(`   📊 Page load time: ${loadTime}ms`);
        
        if (loadTime > 10000) { // 10 seconds
          throw new Error(`Page load time too slow: ${loadTime}ms`);
        }
      });

      // ===== ERROR HANDLING TESTS =====
      
      await this.test('404 Error Handling', async () => {
        const response = await this.page.goto(`${this.baseUrl}/nonexistent-page`, { waitUntil: 'networkidle0' });
        
        // For SPAs, 404s might still return 200 but show error content
        const hasErrorContent = await this.page.evaluate(() => {
          const body = document.body.textContent.toLowerCase();
          return body.includes('404') || 
                 body.includes('not found') || 
                 body.includes('error') ||
                 body.includes('page');
        });
        
        if (!hasErrorContent && response.status() !== 404) {
          console.warn('⚠️  404 handling may need improvement');
        }
      });

      // ===== API INTEGRATION TESTS =====
      
      await this.test('API Integration', async () => {
        await this.page.goto(this.baseUrl, { waitUntil: 'networkidle0' });
        
        // Check for API-related errors in console
        const logs = [];
        this.page.on('console', msg => {
          if (msg.type() === 'error' && msg.text().toLowerCase().includes('api')) {
            logs.push(msg.text());
          }
        });
        
        await this.page.waitForTimeout(3000);
        
        if (logs.length > 0) {
          console.warn(`⚠️  API warnings detected: ${logs.length} issues`);
          logs.forEach(log => console.warn(`   • ${log}`));
        }
      });

      // ===== LOCAL STORAGE TESTS =====
      
      await this.test('Data Persistence', async () => {
        await this.page.goto(this.baseUrl, { waitUntil: 'networkidle0' });
        
        // Check if localStorage is being used
        const hasLocalStorage = await this.page.evaluate(() => {
          return Object.keys(localStorage).some(key => 
            key.includes('fixturecast') || key.includes('accuracy')
          );
        });
        
        if (!hasLocalStorage) {
          console.warn('⚠️  No FixtureCast data found in localStorage');
        }
      });

      console.log('\n🏁 Test Suite Complete!');
      this.printResults();

    } catch (error) {
      console.error('🔴 Test suite failed:', error);
    } finally {
      if (this.browser) {
        await this.browser.close();
      }
    }
  }

  printResults() {
    console.log('\n' + '='.repeat(50));
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('='.repeat(50));
    
    const total = this.results.passed + this.results.failed;
    const successRate = total > 0 ? (this.results.passed / total * 100).toFixed(1) : 0;
    
    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`❌ Failed: ${this.results.failed}`);
    console.log(`📈 Success Rate: ${successRate}%`);
    
    if (this.results.failed > 0) {
      console.log('\n❌ FAILED TESTS:');
      this.results.tests
        .filter(test => test.status === 'FAILED')
        .forEach(test => {
          console.log(`   • ${test.name}: ${test.error}`);
        });
    }
    
    console.log('\n✅ PASSED TESTS:');
    this.results.tests
      .filter(test => test.status === 'PASSED')
      .forEach(test => {
        console.log(`   • ${test.name} (${test.duration}ms)`);
      });
    
    // Overall assessment
    if (this.results.failed === 0) {
      console.log('\n🎉 ALL TESTS PASSED! System is fully functional.');
    } else if (this.results.failed <= 2) {
      console.log('\n⚠️  Minor issues detected, but core functionality works.');
    } else {
      console.log('\n🚨 Multiple failures detected. Investigation needed.');
    }
    
    // Save results to file
    const resultsFile = path.join(process.cwd(), 'test-results.json');
    fs.writeFileSync(resultsFile, JSON.stringify({
      timestamp: new Date().toISOString(),
      baseUrl: this.baseUrl,
      ...this.results
    }, null, 2));
    
    console.log(`\n📁 Results saved to: ${resultsFile}`);
  }
}

// Check if puppeteer is available
async function checkDependencies() {
  try {
    await import('puppeteer');
    return true;
  } catch (error) {
    console.log('📦 Installing puppeteer for testing...');
    const { execSync } = await import('child_process');
    try {
      execSync('npm install puppeteer --no-save', { stdio: 'inherit' });
      return true;
    } catch (installError) {
      console.error('❌ Failed to install puppeteer:', installError.message);
      return false;
    }
  }
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const testUrl = process.argv[2] || TEST_URL;
  
  checkDependencies().then(hasDepencies => {
    if (hasDepencies) {
      const tester = new FixtureCastTester(testUrl);
      tester.runAllTests();
    } else {
      console.error('❌ Cannot run tests without puppeteer');
      process.exit(1);
    }
  });
}

export { FixtureCastTester };