import { Match } from '../types';

interface LazyLoadOptions {
  threshold: number;
  rootMargin: string;
  delay: number;
  batchSize: number;
  maxConcurrent: number;
}

interface LazyLoadItem {
  id: string;
  element: HTMLElement;
  data: Match;
  loaded: boolean;
  loading: boolean;
  error: boolean;
}

class LazyLoadingService {
  private options: LazyLoadOptions = {
    threshold: 0.1,
    rootMargin: '100px',
    delay: 100,
    batchSize: 10,
    maxConcurrent: 3
  };

  private observer: IntersectionObserver | null = null;
  private items: Map<string, LazyLoadItem> = new Map();
  private loadingQueue: string[] = [];
  private activeLoads: number = 0;
  private isInitialized: boolean = false;

  // Initialize lazy loading
  initialize(options: Partial<LazyLoadOptions> = {}): void {
    if (this.isInitialized) return;

    this.options = { ...this.options, ...options };
    this.setupIntersectionObserver();
    this.isInitialized = true;
    
    console.log('Lazy loading service initialized');
  }

  // Setup intersection observer
  private setupIntersectionObserver(): void {
    if (typeof window === 'undefined') return;

    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const itemId = entry.target.getAttribute('data-lazy-id');
            if (itemId) {
              this.scheduleLoad(itemId);
            }
          }
        });
      },
      {
        threshold: this.options.threshold,
        rootMargin: this.options.rootMargin
      }
    );
  }

  // Register item for lazy loading
  registerItem(id: string, element: HTMLElement, data: Match): void {
    if (!this.observer) return;

    const item: LazyLoadItem = {
      id,
      element,
      data,
      loaded: false,
      loading: false,
      error: false
    };

    this.items.set(id, item);
    this.observer.observe(element);
    
    console.log(`Registered lazy load item: ${id}`);
  }

  // Unregister item
  unregisterItem(id: string): void {
    const item = this.items.get(id);
    if (item && this.observer) {
      this.observer.unobserve(item.element);
    }
    
    this.items.delete(id);
    console.log(`Unregistered lazy load item: ${id}`);
  }

  // Schedule item for loading
  private scheduleLoad(itemId: string): void {
    const item = this.items.get(itemId);
    if (!item || item.loaded || item.loading) return;

    // Add to loading queue
    this.loadingQueue.push(itemId);
    
    // Process queue
    this.processLoadingQueue();
  }

  // Process loading queue
  private processLoadingQueue(): void {
    if (this.activeLoads >= this.options.maxConcurrent) return;
    if (this.loadingQueue.length === 0) return;

    const itemId = this.loadingQueue.shift();
    if (!itemId) return;

    this.loadItem(itemId);
  }

  // Load item
  private async loadItem(itemId: string): Promise<void> {
    const item = this.items.get(itemId);
    if (!item || item.loaded || item.loading) return;

    item.loading = true;
    this.activeLoads++;

    try {
      // Simulate loading delay
      await new Promise(resolve => setTimeout(resolve, this.options.delay));
      
      // Load item content
      await this.loadItemContent(item);
      
      item.loaded = true;
      item.loading = false;
      
      console.log(`Loaded lazy item: ${itemId}`);
    } catch (error) {
      item.error = true;
      item.loading = false;
      console.error(`Failed to load lazy item ${itemId}:`, error);
    } finally {
      this.activeLoads--;
      
      // Process next item in queue
      this.processLoadingQueue();
    }
  }

  // Load item content
  private async loadItemContent(item: LazyLoadItem): Promise<void> {
    const { element, data } = item;
    
    // Create content
    const content = this.createItemContent(data);
    
    // Replace placeholder with content
    const placeholder = element.querySelector('.lazy-placeholder');
    if (placeholder) {
      placeholder.replaceWith(content);
    } else {
      element.appendChild(content);
    }
    
    // Add loaded class
    element.classList.add('lazy-loaded');
  }

  // Create item content
  private createItemContent(match: Match): HTMLElement {
    const content = document.createElement('div');
    content.className = 'lazy-content';
    content.innerHTML = `
      <div class="match-item">
        <div class="match-content">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-2 flex-1 min-w-0">
              <span class="font-medium text-gray-900 truncate">${match.homeTeam}</span>
            </div>
            <div class="flex flex-col items-center space-y-1 mx-2 flex-shrink-0">
              <div class="text-sm text-gray-500 font-medium">VS</div>
            </div>
            <div class="flex items-center space-x-2 flex-1 min-w-0 justify-end">
              <span class="font-medium text-gray-900 truncate text-right">${match.awayTeam}</span>
            </div>
          </div>
          <div class="flex items-center justify-between text-xs text-gray-500 mt-2">
            <span>${match.league}</span>
            <span>${new Date(match.date).toLocaleTimeString()}</span>
          </div>
        </div>
      </div>
    `;
    
    return content;
  }

  // Preload items
  preloadItems(itemIds: string[]): void {
    itemIds.forEach(id => {
      const item = this.items.get(id);
      if (item && !item.loaded && !item.loading) {
        this.scheduleLoad(id);
      }
    });
  }

  // Get loading status
  getLoadingStatus(): {
    total: number;
    loaded: number;
    loading: number;
    queued: number;
    errors: number;
  } {
    const items = Array.from(this.items.values());
    
    return {
      total: items.length,
      loaded: items.filter(item => item.loaded).length,
      loading: items.filter(item => item.loading).length,
      queued: this.loadingQueue.length,
      errors: items.filter(item => item.error).length
    };
  }

  // Get performance metrics
  getPerformanceMetrics(): {
    loadTime: number;
    memoryUsage: number;
    domNodes: number;
    errorRate: number;
  } {
    const items = Array.from(this.items.values());
    const loadedItems = items.filter(item => item.loaded);
    
    return {
      loadTime: this.calculateAverageLoadTime(loadedItems),
      memoryUsage: this.estimateMemoryUsage(items),
      domNodes: this.countDomNodes(),
      errorRate: items.filter(item => item.error).length / items.length
    };
  }

  // Calculate average load time
  private calculateAverageLoadTime(items: LazyLoadItem[]): number {
    // This would be implemented to track actual load times
    return items.length * 50; // Simulated average
  }

  // Estimate memory usage
  private estimateMemoryUsage(items: LazyLoadItem[]): number {
    return items.length * 1024; // Simulated memory usage
  }

  // Count DOM nodes
  private countDomNodes(): number {
    return document.querySelectorAll('.lazy-content').length;
  }

  // Cleanup
  destroy(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    
    this.items.clear();
    this.loadingQueue = [];
    this.activeLoads = 0;
    this.isInitialized = false;
    
    console.log('Lazy loading service destroyed');
  }
}

export const lazyLoadingService = new LazyLoadingService();
