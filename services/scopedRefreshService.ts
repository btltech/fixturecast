import { Match } from '../types';

interface RefreshOptions {
  interval: number;
  preserveScroll: boolean;
  preserveReading: boolean;
  diffOnly: boolean;
  containerSelector: string;
}

interface DiffResult {
  added: Match[];
  removed: Match[];
  updated: Match[];
  unchanged: Match[];
}

interface ScrollState {
  scrollTop: number;
  scrollLeft: number;
  isUserScrolling: boolean;
  lastScrollTime: number;
}

interface ReadingState {
  isUserReading: boolean;
  lastInteractionTime: number;
  readingThreshold: number;
}

class ScopedRefreshService {
  private refreshIntervals: Map<string, NodeJS.Timeout> = new Map();
  private scrollStates: Map<string, ScrollState> = new Map();
  private readingStates: Map<string, ReadingState> = new Map();
  private updateCallbacks: Map<string, (diff: DiffResult) => void> = new Map();
  
  private defaultOptions: RefreshOptions = {
    interval: 30000, // 30 seconds
    preserveScroll: true,
    preserveReading: true,
    diffOnly: true,
    containerSelector: '[data-fixtures-container]'
  };

  constructor() {
    this.initializeScrollTracking();
    this.initializeReadingTracking();
  }

  // Initialize scroll tracking for containers
  private initializeScrollTracking(): void {
    if (typeof window === 'undefined') return;

    const trackScroll = (containerId: string, element: HTMLElement) => {
      let isScrolling = false;
      let scrollTimeout: NodeJS.Timeout;

      const handleScroll = () => {
        isScrolling = true;
        clearTimeout(scrollTimeout);
        
        scrollTimeout = setTimeout(() => {
          isScrolling = false;
        }, 150);

        this.updateScrollState(containerId, {
          scrollTop: element.scrollTop,
          scrollLeft: element.scrollLeft,
          isUserScrolling: isScrolling,
          lastScrollTime: Date.now()
        });
      };

      element.addEventListener('scroll', handleScroll, { passive: true });
      
      return () => {
        element.removeEventListener('scroll', handleScroll);
        clearTimeout(scrollTimeout);
      };
    };

    // Track scroll for existing containers
    this.observeContainers(trackScroll);
  }

  // Initialize reading tracking
  private initializeReadingTracking(): void {
    if (typeof window === 'undefined') return;

    const trackReading = (containerId: string) => {
      let lastInteraction = Date.now();
      let isReading = false;

      const updateReadingState = () => {
        const now = Date.now();
        const timeSinceInteraction = now - lastInteraction;
        
        isReading = timeSinceInteraction < 5000; // 5 seconds threshold
        
        this.updateReadingState(containerId, {
          isUserReading: isReading,
          lastInteractionTime: lastInteraction,
          readingThreshold: 5000
        });
      };

      const handleInteraction = () => {
        lastInteraction = Date.now();
        updateReadingState();
      };

      // Track various user interactions
      const events = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'click'];
      
      events.forEach(event => {
        document.addEventListener(event, handleInteraction, { passive: true });
      });

      // Update reading state periodically
      const readingInterval = setInterval(updateReadingState, 1000);

      return () => {
        events.forEach(event => {
          document.removeEventListener(event, handleInteraction);
        });
        clearInterval(readingInterval);
      };
    };

    // Initialize reading tracking for all containers
    this.observeContainers(trackReading);
  }

  // Observe containers for scroll and reading tracking
  private observeContainers(callback: (containerId: string, element: HTMLElement) => () => void): void {
    if (typeof window === 'undefined') return;

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as HTMLElement;
            const container = element.closest('[data-fixtures-container]');
            if (container) {
              const containerId = container.id || `container-${Date.now()}`;
              callback(containerId, container as HTMLElement);
            }
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  // Start scoped auto-refresh for a container
  startScopedRefresh(
    containerId: string, 
    options: Partial<RefreshOptions> = {},
    updateCallback: (diff: DiffResult) => void
  ): void {
    const config = { ...this.defaultOptions, ...options };
    
    // Store update callback
    this.updateCallbacks.set(containerId, updateCallback);
    
    // Clear existing interval
    this.stopScopedRefresh(containerId);
    
    // Start new interval
    const interval = setInterval(() => {
      this.performScopedRefresh(containerId, config);
    }, config.interval);
    
    this.refreshIntervals.set(containerId, interval);
    
    console.log(`Started scoped refresh for container ${containerId} with ${config.interval}ms interval`);
  }

  // Stop scoped auto-refresh for a container
  stopScopedRefresh(containerId: string): void {
    const interval = this.refreshIntervals.get(containerId);
    if (interval) {
      clearInterval(interval);
      this.refreshIntervals.delete(containerId);
      console.log(`Stopped scoped refresh for container ${containerId}`);
    }
  }

  // Perform scoped refresh with diffed updates
  private async performScopedRefresh(containerId: string, options: RefreshOptions): Promise<void> {
    try {
      // Check if user is reading or scrolling
      if (this.shouldSkipRefresh(containerId)) {
        console.log(`Skipping refresh for container ${containerId} - user is reading/scrolling`);
        return;
      }

      // Get current data
      const currentData = this.getCurrentData(containerId);
      if (!currentData) return;

      // Fetch new data
      const newData = await this.fetchNewData(containerId);
      if (!newData) return;

      // Calculate diff
      const diff = this.calculateDiff(currentData, newData);
      
      // Only update if there are changes
      if (this.hasChanges(diff)) {
        // Preserve scroll position if needed
        const scrollState = this.getScrollState(containerId);
        
        // Apply diffed updates
        await this.applyDiffedUpdates(containerId, diff, scrollState);
        
        // Restore scroll position if preserved
        if (options.preserveScroll && scrollState) {
          this.restoreScrollPosition(containerId, scrollState);
        }
        
        // Notify callback
        const callback = this.updateCallbacks.get(containerId);
        if (callback) {
          callback(diff);
        }
        
        console.log(`Applied diffed updates to container ${containerId}:`, {
          added: diff.added.length,
          removed: diff.removed.length,
          updated: diff.updated.length,
          unchanged: diff.unchanged.length
        });
      } else {
        console.log(`No changes detected for container ${containerId}`);
      }
    } catch (error) {
      console.error(`Error performing scoped refresh for container ${containerId}:`, error);
    }
  }

  // Check if refresh should be skipped
  private shouldSkipRefresh(containerId: string): boolean {
    const scrollState = this.getScrollState(containerId);
    const readingState = this.getReadingState(containerId);
    
    // Skip if user is actively scrolling
    if (scrollState?.isUserScrolling) {
      return true;
    }
    
    // Skip if user is reading
    if (readingState?.isUserReading) {
      return true;
    }
    
    // Skip if user interacted recently
    if (scrollState && Date.now() - scrollState.lastScrollTime < 2000) {
      return true;
    }
    
    if (readingState && Date.now() - readingState.lastInteractionTime < 5000) {
      return true;
    }
    
    return false;
  }

  // Get current data from container
  private getCurrentData(containerId: string): Match[] | null {
    // This would be implemented to get current data from the container
    // For now, return null to indicate no current data
    return null;
  }

  // Fetch new data
  private async fetchNewData(containerId: string): Promise<Match[] | null> {
    // This would be implemented to fetch new data
    // For now, return null to indicate no new data
    return null;
  }

  // Calculate diff between old and new data
  private calculateDiff(oldData: Match[], newData: Match[]): DiffResult {
    const oldMap = new Map(oldData.map(item => [item.id, item]));
    const newMap = new Map(newData.map(item => [item.id, item]));
    
    const added: Match[] = [];
    const removed: Match[] = [];
    const updated: Match[] = [];
    const unchanged: Match[] = [];
    
    // Find added and updated items
    for (const [id, newItem] of newMap) {
      const oldItem = oldMap.get(id);
      if (!oldItem) {
        added.push(newItem);
      } else if (this.hasItemChanged(oldItem, newItem)) {
        updated.push(newItem);
      } else {
        unchanged.push(newItem);
      }
    }
    
    // Find removed items
    for (const [id, oldItem] of oldMap) {
      if (!newMap.has(id)) {
        removed.push(oldItem);
      }
    }
    
    return { added, removed, updated, unchanged };
  }

  // Check if an item has changed
  private hasItemChanged(oldItem: Match, newItem: Match): boolean {
    return (
      oldItem.homeTeam !== newItem.homeTeam ||
      oldItem.awayTeam !== newItem.awayTeam ||
      oldItem.date !== newItem.date ||
      oldItem.league !== newItem.league ||
      oldItem.status !== newItem.status
    );
  }

  // Check if there are any changes
  private hasChanges(diff: DiffResult): boolean {
    return diff.added.length > 0 || diff.removed.length > 0 || diff.updated.length > 0;
  }

  // Apply diffed updates to container
  private async applyDiffedUpdates(
    containerId: string, 
    diff: DiffResult, 
    scrollState: ScrollState | null
  ): Promise<void> {
    const container = document.querySelector(`#${containerId}`);
    
    if (!container) return;
    
    // Apply updates in a way that minimizes reflows
    requestAnimationFrame(() => {
      // Remove items that are no longer needed
      diff.removed.forEach(item => {
        const element = container.querySelector(`[data-match-id="${item.id}"]`);
        if (element) {
          element.remove();
        }
      });
      
      // Add new items
      diff.added.forEach(item => {
        const element = this.createMatchElement(item);
        container.appendChild(element);
      });
      
      // Update existing items
      diff.updated.forEach(item => {
        const element = container.querySelector(`[data-match-id="${item.id}"]`);
        if (element) {
          this.updateMatchElement(element, item);
        }
      });
    });
  }

  // Create match element
  private createMatchElement(match: Match): HTMLElement {
    const element = document.createElement('div');
    element.setAttribute('data-match-id', match.id);
    element.className = 'match-item';
    element.innerHTML = `
      <div class="match-content">
        <span class="home-team">${match.homeTeam}</span>
        <span class="vs">vs</span>
        <span class="away-team">${match.awayTeam}</span>
        <span class="date">${new Date(match.date).toLocaleDateString()}</span>
      </div>
    `;
    return element;
  }

  // Update match element
  private updateMatchElement(element: HTMLElement, match: Match): void {
    const homeTeam = element.querySelector('.home-team');
    const awayTeam = element.querySelector('.away-team');
    const date = element.querySelector('.date');
    
    if (homeTeam) homeTeam.textContent = match.homeTeam;
    if (awayTeam) awayTeam.textContent = match.awayTeam;
    if (date) date.textContent = new Date(match.date).toLocaleDateString();
  }

  // Update scroll state
  private updateScrollState(containerId: string, state: ScrollState): void {
    this.scrollStates.set(containerId, state);
  }

  // Get scroll state
  private getScrollState(containerId: string): ScrollState | null {
    return this.scrollStates.get(containerId) || null;
  }

  // Update reading state
  private updateReadingState(containerId: string, state: ReadingState): void {
    this.readingStates.set(containerId, state);
  }

  // Get reading state
  private getReadingState(containerId: string): ReadingState | null {
    return this.readingStates.get(containerId) || null;
  }

  // Restore scroll position
  private restoreScrollPosition(containerId: string, scrollState: ScrollState): void {
    const container = document.querySelector(`#${containerId}`);
    
    if (container && scrollState) {
      container.scrollTop = scrollState.scrollTop;
      container.scrollLeft = scrollState.scrollLeft;
    }
  }

  // Get all active refresh intervals
  getActiveRefreshIntervals(): string[] {
    return Array.from(this.refreshIntervals.keys());
  }

  // Stop all refresh intervals
  stopAllRefreshIntervals(): void {
    this.refreshIntervals.forEach((interval, containerId) => {
      clearInterval(interval);
      console.log(`Stopped refresh for container ${containerId}`);
    });
    this.refreshIntervals.clear();
  }

  // Cleanup
  destroy(): void {
    this.stopAllRefreshIntervals();
    this.scrollStates.clear();
    this.readingStates.clear();
    this.updateCallbacks.clear();
  }
}

export const scopedRefreshService = new ScopedRefreshService();
