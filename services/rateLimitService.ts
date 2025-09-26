/**
 * Rate Limit Management Service
 * Handles API rate limits for Gemini and DeepSeek with smart retry logic
 */

interface RateLimitState {
  requestCount: number;
  lastResetTime: number;
  isBlocked: boolean;
  blockUntil: number;
  dailyCount: number;
  lastDayReset: string;
}

interface RateLimitConfig {
  maxRequestsPerMinute: number;
  maxRequestsPerDay: number;
  baseBackoffMs: number;
  maxBackoffMs: number;
}

const DEFAULT_CONFIGS = {
  gemini: {
    maxRequestsPerMinute: 15,    // Gemini typically allows 15/min
    maxRequestsPerDay: 1500,     // Conservative daily limit
    baseBackoffMs: 1000,
    maxBackoffMs: 60000
  },
  deepseek: {
    maxRequestsPerMinute: 10,    // DeepSeek is more restrictive
    maxRequestsPerDay: 1000,     // Conservative daily limit
    baseBackoffMs: 2000,
    maxBackoffMs: 120000
  }
};

class RateLimitManager {
  private states: Map<string, RateLimitState> = new Map();
  private configs: Map<string, RateLimitConfig> = new Map();

  constructor() {
    // Initialize default configurations
    Object.entries(DEFAULT_CONFIGS).forEach(([service, config]) => {
      this.configs.set(service, config);
      this.resetState(service);
    });
  }

  /**
   * Reset rate limit state for a service
   */
  private resetState(service: string): void {
    const now = Date.now();
    const today = new Date().toDateString();
    
    this.states.set(service, {
      requestCount: 0,
      lastResetTime: now,
      isBlocked: false,
      blockUntil: 0,
      dailyCount: 0,
      lastDayReset: today
    });
  }

  /**
   * Check if we can make a request to the service
   */
  canMakeRequest(service: string): boolean {
    const state = this.states.get(service);
    const config = this.configs.get(service);
    
    if (!state || !config) {
      console.warn(`⚠️ No rate limit config for service: ${service}`);
      return true; // Allow if no config (fail open)
    }

    const now = Date.now();
    const today = new Date().toDateString();

    // Reset daily counter if new day
    if (state.lastDayReset !== today) {
      state.dailyCount = 0;
      state.lastDayReset = today;
      console.log(`📅 ${service} daily counter reset`);
    }

    // Check if currently blocked
    if (state.isBlocked && now < state.blockUntil) {
      const waitTime = Math.ceil((state.blockUntil - now) / 1000);
      console.log(`🚫 ${service} rate limited. Wait ${waitTime}s`);
      return false;
    }

    // Reset minute counter if needed
    const minutesPassed = (now - state.lastResetTime) / (60 * 1000);
    if (minutesPassed >= 1) {
      state.requestCount = 0;
      state.lastResetTime = now;
      state.isBlocked = false;
    }

    // Check daily limit
    if (state.dailyCount >= config.maxRequestsPerDay) {
      console.log(`📊 ${service} daily limit reached (${config.maxRequestsPerDay})`);
      this.blockService(service, 24 * 60 * 60 * 1000); // Block for 24 hours
      return false;
    }

    // Check per-minute limit
    if (state.requestCount >= config.maxRequestsPerMinute) {
      console.log(`⏰ ${service} per-minute limit reached (${config.maxRequestsPerMinute})`);
      this.blockService(service, 60 * 1000); // Block for 1 minute
      return false;
    }

    return true;
  }

  /**
   * Record a successful request
   */
  recordRequest(service: string): void {
    const state = this.states.get(service);
    if (state) {
      state.requestCount++;
      state.dailyCount++;
      console.log(`📈 ${service} requests: ${state.requestCount}/min, ${state.dailyCount}/day`);
    }
  }

  /**
   * Handle rate limit error from API
   */
  handleRateLimitError(service: string, error: any): number {
    console.error(`🚨 ${service} rate limit error:`, error);
    
    const config = this.configs.get(service);
    if (!config) return config?.baseBackoffMs || 5000;

    // Parse retry-after header if available
    let retryAfter = 0;
    if (error.headers && error.headers['retry-after']) {
      retryAfter = parseInt(error.headers['retry-after']) * 1000;
    } else if (error.message?.includes('quota')) {
      retryAfter = 24 * 60 * 60 * 1000; // 24 hours for quota errors
    } else {
      // Exponential backoff
      const state = this.states.get(service);
      const attempts = state?.requestCount || 1;
      retryAfter = Math.min(
        config.baseBackoffMs * Math.pow(2, attempts - 1),
        config.maxBackoffMs
      );
    }

    this.blockService(service, retryAfter);
    return retryAfter;
  }

  /**
   * Block service for specified duration
   */
  private blockService(service: string, durationMs: number): void {
    const state = this.states.get(service);
    if (state) {
      state.isBlocked = true;
      state.blockUntil = Date.now() + durationMs;
      
      const waitMinutes = Math.ceil(durationMs / (60 * 1000));
      console.log(`🔒 ${service} blocked for ${waitMinutes} minutes`);
    }
  }

  /**
   * Get current status for a service
   */
  getStatus(service: string): {
    canMakeRequest: boolean;
    requestsThisMinute: number;
    requestsToday: number;
    blockedUntil?: Date;
    waitTimeMs?: number;
  } {
    const state = this.states.get(service);
    const config = this.configs.get(service);
    
    if (!state || !config) {
      return {
        canMakeRequest: true,
        requestsThisMinute: 0,
        requestsToday: 0
      };
    }

    const now = Date.now();
    const waitTimeMs = state.isBlocked && now < state.blockUntil 
      ? state.blockUntil - now 
      : 0;

    return {
      canMakeRequest: this.canMakeRequest(service),
      requestsThisMinute: state.requestCount,
      requestsToday: state.dailyCount,
      blockedUntil: state.isBlocked ? new Date(state.blockUntil) : undefined,
      waitTimeMs
    };
  }

  /**
   * Wait for service to become available
   */
  async waitForAvailability(service: string): Promise<void> {
    const status = this.getStatus(service);
    if (status.waitTimeMs && status.waitTimeMs > 0) {
      console.log(`⏳ Waiting ${Math.ceil(status.waitTimeMs / 1000)}s for ${service} availability...`);
      await new Promise(resolve => setTimeout(resolve, status.waitTimeMs));
    }
  }

  /**
   * Execute a function with rate limiting
   */
  async executeWithRateLimit<T>(
    service: string, 
    fn: () => Promise<T>,
    maxRetries: number = 3
  ): Promise<T> {
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      // Wait if blocked
      await this.waitForAvailability(service);
      
      // Check if we can make request
      if (!this.canMakeRequest(service)) {
        if (attempt === maxRetries) {
          throw new Error(`${service} rate limit exceeded. Please try again later.`);
        }
        console.log(`🔄 ${service} attempt ${attempt}/${maxRetries} blocked, retrying...`);
        continue;
      }

      try {
        // Record the request
        this.recordRequest(service);
        
        // Execute the function
        const result = await fn();
        
        console.log(`✅ ${service} request successful (attempt ${attempt})`);
        return result;
        
      } catch (error: any) {
        const isRateLimitError = 
          error.message?.toLowerCase().includes('rate limit') ||
          error.message?.toLowerCase().includes('quota') ||
          error.status === 429 ||
          error.code === 'RATE_LIMIT_EXCEEDED';

        if (isRateLimitError) {
          console.log(`🚨 ${service} rate limit hit on attempt ${attempt}/${maxRetries}`);
          
          const waitTime = this.handleRateLimitError(service, error);
          
          if (attempt === maxRetries) {
            throw new Error(`${service} rate limit exceeded after ${maxRetries} attempts. Please try again in ${Math.ceil(waitTime / 60000)} minutes.`);
          }
          
          console.log(`⏳ Waiting ${Math.ceil(waitTime / 1000)}s before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          
        } else {
          // Non-rate-limit error, don't retry
          throw error;
        }
      }
    }

    throw new Error(`${service} failed after ${maxRetries} attempts`);
  }

  /**
   * Get overall status for all services
   */
  getAllStatuses(): Record<string, any> {
    const statuses: Record<string, any> = {};
    
    for (const service of this.configs.keys()) {
      statuses[service] = this.getStatus(service);
    }
    
    return statuses;
  }
}

// Export singleton instance
export const rateLimitManager = new RateLimitManager();

// Export utility functions
export const withRateLimit = rateLimitManager.executeWithRateLimit.bind(rateLimitManager);
export const getRateLimitStatus = rateLimitManager.getStatus.bind(rateLimitManager);
export const getAllRateLimitStatuses = rateLimitManager.getAllStatuses.bind(rateLimitManager);