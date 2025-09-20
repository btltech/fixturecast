/**
 * Search Service for Sports Fixture App
 * Handles search functionality across matches, teams, leagues, and players
 */

import { Match, League } from '../types';

interface SearchResult {
  type: 'match' | 'team' | 'league' | 'player';
  id: string;
  title: string;
  description: string;
  url: string;
  relevance: number;
  metadata?: any;
}

interface SearchFilters {
  sport?: string;
  league?: League | 'all';
  team?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  status?: 'upcoming' | 'live' | 'finished';
}

class SearchService {
  private searchIndex: Map<string, SearchResult[]> = new Map();
  private isIndexed = false;

  /**
   * Index searchable content
   */
  public indexContent(fixtures: Match[], teams: { [key: string]: any }): void {
    this.searchIndex.clear();
    this.isIndexed = false;

    try {
      // Index matches
      fixtures.forEach(match => {
        const matchResult: SearchResult = {
          type: 'match',
          id: match.id,
          title: `${match.homeTeam} vs ${match.awayTeam}`,
          description: `${match.league} • ${new Date(match.date).toLocaleDateString()}`,
          url: `#match/${match.id}`,
          relevance: 1.0,
          metadata: {
            homeTeam: match.homeTeam,
            awayTeam: match.awayTeam,
            league: match.league,
            date: match.date,
            status: match.status
          }
        };

        this.addToIndex(matchResult);
      });

      // Index teams
      Object.keys(teams).forEach(teamName => {
        const teamResult: SearchResult = {
          type: 'team',
          id: teamName,
          title: teamName,
          description: 'Team',
          url: `#team/${teamName}`,
          relevance: 0.9,
          metadata: {
            name: teamName,
            type: 'team'
          }
        };

        this.addToIndex(teamResult);
      });

      // Index leagues
      const uniqueLeagues = [...new Set(fixtures.map(f => f.league))];
      uniqueLeagues.forEach(league => {
        const leagueResult: SearchResult = {
          type: 'league',
          id: league,
          title: league,
          description: 'League',
          url: `#league/${league}`,
          relevance: 0.8,
          metadata: {
            name: league,
            type: 'league'
          }
        };

        this.addToIndex(leagueResult);
      });

      this.isIndexed = true;
      console.log('Search index created with', this.searchIndex.size, 'entries');
    } catch (error) {
      console.error('Failed to index content:', error);
    }
  }

  /**
   * Add item to search index
   */
  private addToIndex(result: SearchResult): void {
    const words = this.extractSearchableWords(result.title, result.description);
    
    words.forEach(word => {
      if (!this.searchIndex.has(word)) {
        this.searchIndex.set(word, []);
      }
      this.searchIndex.get(word)!.push(result);
    });
  }

  /**
   * Extract searchable words from text
   */
  private extractSearchableWords(title: string, description: string): string[] {
    const text = `${title} ${description}`.toLowerCase();
    const words = text
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2)
      .map(word => word.trim());

    // Add partial matches for better search
    const partialWords: string[] = [];
    words.forEach(word => {
      for (let i = 3; i <= word.length; i++) {
        partialWords.push(word.substring(0, i));
      }
    });

    return [...new Set([...words, ...partialWords])];
  }

  /**
   * Search for content
   */
  public search(query: string, filters?: SearchFilters): SearchResult[] {
    if (!this.isIndexed) {
      console.warn('Search index not ready');
      return [];
    }

    if (!query.trim()) {
      return [];
    }

    try {
      const searchTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 0);
      const results = new Map<string, SearchResult>();

      // Search for each term
      searchTerms.forEach(term => {
        this.searchIndex.forEach((items, word) => {
          if (word.includes(term)) {
            items.forEach(item => {
              const key = `${item.type}-${item.id}`;
              if (!results.has(key)) {
                results.set(key, { ...item });
              }
              
              // Boost relevance for exact matches
              const currentResult = results.get(key)!;
              if (word === term) {
                currentResult.relevance += 0.5;
              } else if (word.startsWith(term)) {
                currentResult.relevance += 0.3;
              } else {
                currentResult.relevance += 0.1;
              }
            });
          }
        });
      });

      // Apply filters
      let filteredResults = Array.from(results.values());

      if (filters) {
        filteredResults = this.applyFilters(filteredResults, filters);
      }

      // Sort by relevance
      filteredResults.sort((a, b) => b.relevance - a.relevance);

      return filteredResults.slice(0, 20); // Limit to top 20 results
    } catch (error) {
      console.error('Search failed:', error);
      return [];
    }
  }

  /**
   * Apply search filters
   */
  private applyFilters(results: SearchResult[], filters: SearchFilters): SearchResult[] {
    return results.filter(result => {
      // Sport filter
      if (filters.sport && result.metadata?.sport !== filters.sport) {
        return false;
      }

      // League filter
      if (filters.league && filters.league !== 'all') {
        if (result.type === 'match' && result.metadata?.league !== filters.league) {
          return false;
        }
        if (result.type === 'league' && result.id !== filters.league) {
          return false;
        }
      }

      // Team filter
      if (filters.team) {
        if (result.type === 'match') {
          const match = result.metadata;
          if (match?.homeTeam !== filters.team && match?.awayTeam !== filters.team) {
            return false;
          }
        }
        if (result.type === 'team' && result.id !== filters.team) {
          return false;
        }
      }

      // Date range filter
      if (filters.dateRange && result.type === 'match') {
        const matchDate = new Date(result.metadata?.date);
        if (matchDate < filters.dateRange.start || matchDate > filters.dateRange.end) {
          return false;
        }
      }

      // Status filter
      if (filters.status && result.type === 'match') {
        if (result.metadata?.status !== filters.status) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Get search suggestions
   */
  public getSuggestions(query: string, limit: number = 5): string[] {
    if (!query.trim() || !this.isIndexed) {
      return [];
    }

    const suggestions = new Set<string>();
    const queryLower = query.toLowerCase();

    this.searchIndex.forEach((items, word) => {
      if (word.startsWith(queryLower) && suggestions.size < limit) {
        suggestions.add(word);
      }
    });

    return Array.from(suggestions).slice(0, limit);
  }

  /**
   * Get popular searches
   */
  public getPopularSearches(): string[] {
    return [
      'Premier League',
      'Champions League',
      'Manchester United',
      'Barcelona',
      'Real Madrid',
      'Liverpool',
      'Arsenal',
      'Chelsea',
      'Manchester City',
      'Tottenham'
    ];
  }

  /**
   * Get recent searches from localStorage
   */
  public getRecentSearches(): string[] {
    try {
      const recent = localStorage.getItem('fixturecast_recent_searches');
      return recent ? JSON.parse(recent) : [];
    } catch (error) {
      console.error('Failed to get recent searches:', error);
      return [];
    }
  }

  /**
   * Save search to recent searches
   */
  public saveRecentSearch(query: string): void {
    try {
      const recent = this.getRecentSearches();
      const updated = [query, ...recent.filter(q => q !== query)].slice(0, 10);
      localStorage.setItem('fixturecast_recent_searches', JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to save recent search:', error);
    }
  }

  /**
   * Clear recent searches
   */
  public clearRecentSearches(): void {
    try {
      localStorage.removeItem('fixturecast_recent_searches');
    } catch (error) {
      console.error('Failed to clear recent searches:', error);
    }
  }

  /**
   * Get search statistics
   */
  public getSearchStats(): { indexed: boolean; totalItems: number; totalWords: number } {
    return {
      indexed: this.isIndexed,
      totalItems: Array.from(this.searchIndex.values()).flat().length,
      totalWords: this.searchIndex.size
    };
  }

  /**
   * Check if search is ready
   */
  public isReady(): boolean {
    return this.isIndexed;
  }
}

// Create singleton instance
export const searchService = new SearchService();
