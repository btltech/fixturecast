import React, { useState, useEffect } from 'react';
import { searchService, SearchResult } from '../services/searchService';
import LeagueLogo from './LeagueLogo';
import TeamLogo from './TeamLogo';

interface SearchResultsProps {
  query: string;
  onResultClick: (result: SearchResult) => void;
  onClose: () => void;
  className?: string;
}

const SearchResults: React.FC<SearchResultsProps> = ({
  query,
  onResultClick,
  onClose,
  className = ''
}) => {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [popularSearches, setPopularSearches] = useState<string[]>([]);

  useEffect(() => {
    if (query.trim()) {
      performSearch(query);
    } else {
      loadSuggestions();
    }
  }, [query]);

  const performSearch = async (searchQuery: string) => {
    setIsLoading(true);
    try {
      const searchResults = searchService.search(searchQuery);
      setResults(searchResults);
      
      // Save to recent searches
      searchService.saveRecentSearch(searchQuery);
    } catch (error) {
      console.error('Search failed:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSuggestions = () => {
    const recent = searchService.getRecentSearches();
    const popular = searchService.getPopularSearches();
    const suggestions = searchService.getSuggestions(query);
    
    setRecentSearches(recent);
    setPopularSearches(popular);
    setSuggestions(suggestions);
  };

  const handleResultClick = (result: SearchResult) => {
    onResultClick(result);
    onClose();
  };

  const handleSuggestionClick = (suggestion: string) => {
    performSearch(suggestion);
  };

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'match': return '⚽';
      case 'team': return '👥';
      case 'league': return '🏆';
      case 'player': return '👤';
      default: return '🔍';
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return dateString;
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-lg border border-gray-200 max-h-96 overflow-y-auto ${className}`}>
      {isLoading ? (
        <div className="p-4 text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-500">Searching...</p>
        </div>
      ) : query.trim() ? (
        // Search Results
        <div>
          {results.length > 0 ? (
            <div className="py-2">
              <div className="px-4 py-2 text-xs font-medium text-gray-500 border-b border-gray-200">
                {results.length} result{results.length !== 1 ? 's' : ''} for "{query}"
              </div>
              {results.map((result, index) => (
                <button
                  key={`${result.type}-${result.id}-${index}`}
                  onClick={() => handleResultClick(result)}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors"
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-1">
                      <span className="text-lg">{getResultIcon(result.type)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <h4 className="text-sm font-medium text-gray-900 truncate">
                          {result.title}
                        </h4>
                        {result.type === 'match' && (
                          <div className="flex items-center space-x-1">
                            <TeamLogo teamName={result.metadata?.homeTeam} size="small" />
                            <span className="text-xs text-gray-500">vs</span>
                            <TeamLogo teamName={result.metadata?.awayTeam} size="small" />
                          </div>
                        )}
                        {result.type === 'league' && (
                          <LeagueLogo leagueName={result.id} size="small" />
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {result.description}
                      </p>
                      {result.type === 'match' && result.metadata?.date && (
                        <p className="text-xs text-gray-400 mt-1">
                          {formatDate(result.metadata.date)}
                        </p>
                      )}
                    </div>
                    <div className="flex-shrink-0">
                      <span className="text-xs text-gray-400">
                        {Math.round(result.relevance * 100)}%
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center">
              <div className="text-gray-400 text-lg mb-2">🔍</div>
              <p className="text-sm text-gray-500">No results found for "{query}"</p>
              <p className="text-xs text-gray-400 mt-1">Try different keywords or check spelling</p>
            </div>
          )}
        </div>
      ) : (
        // Suggestions and Recent Searches
        <div className="py-2">
          {/* Recent Searches */}
          {recentSearches.length > 0 && (
            <div>
              <div className="px-4 py-2 text-xs font-medium text-gray-500 border-b border-gray-200">
                Recent Searches
              </div>
              {recentSearches.map((search, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(search)}
                  className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center space-x-2 text-sm text-gray-700"
                >
                  <span>🕒</span>
                  <span>{search}</span>
                </button>
              ))}
            </div>
          )}

          {/* Suggestions */}
          {suggestions.length > 0 && (
            <div>
              <div className="px-4 py-2 text-xs font-medium text-gray-500 border-b border-gray-200">
                Suggestions
              </div>
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center space-x-2 text-sm text-gray-700"
                >
                  <span>💡</span>
                  <span>{suggestion}</span>
                </button>
              ))}
            </div>
          )}

          {/* Popular Searches */}
          {popularSearches.length > 0 && (
            <div>
              <div className="px-4 py-2 text-xs font-medium text-gray-500 border-b border-gray-200">
                Popular Searches
              </div>
              {popularSearches.map((search, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(search)}
                  className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center space-x-2 text-sm text-gray-700"
                >
                  <span>🔥</span>
                  <span>{search}</span>
                </button>
              ))}
            </div>
          )}

          {/* Search Tips */}
          <div className="px-4 py-3 border-t border-gray-200">
            <div className="text-xs text-gray-500">
              <p className="font-medium mb-1">Search Tips:</p>
              <ul className="space-y-1">
                <li>• Search for team names, leagues, or match dates</li>
                <li>• Use partial matches for better results</li>
                <li>• Try different spellings if no results found</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchResults;
