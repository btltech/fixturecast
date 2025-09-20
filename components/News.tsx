
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { NewsArticle, View } from '../types';
import { getFootballNews } from '../services/newsService';
import LoadingSpinner from './LoadingSpinner';
import { NEWS_SOURCES } from '../constants';
import { timeAgo } from '../utils/dateUtils';

const NewsArticleCard: React.FC<{ article: NewsArticle }> = ({ article }) => {
    const sourceInfo = NEWS_SOURCES[article.source];
    
    return (
        <a 
            href={article.link}
            target="_blank"
            rel="noopener noreferrer"
            className="block bg-gray-800 rounded-xl overflow-hidden shadow-lg hover:shadow-blue-500/20 border border-gray-700 hover:border-blue-600 transition-all duration-300 transform hover:-translate-y-1"
        >
            <div className="p-5">
                <div className="flex items-center mb-3">
                    {sourceInfo?.logo && (
                        <img src={sourceInfo.logo} alt={`${article.source} logo`} className="h-5 mr-3 brightness-0 invert" />
                    )}
                    <span className="text-xs font-semibold text-gray-400 uppercase">{article.source}</span>
                </div>
                <h3 className="font-bold text-lg text-white mb-2 leading-tight">{article.title}</h3>
                <p className="text-gray-300 text-sm mb-4">{article.snippet}</p>
                <p className="text-xs text-blue-400 font-medium">{timeAgo(article.publishedDate)}</p>
            </div>
        </a>
    );
};

interface NewsProps {
    onNavigate?: (view: any) => void;
}

const News: React.FC<NewsProps> = ({ onNavigate }) => {
    const navigate = useNavigate();
    const [articles, setArticles] = useState<NewsArticle[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [query, setQuery] = useState<string>('');

    useEffect(() => {
        const fetchNews = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const newsData = await getFootballNews();
                setArticles(newsData);
            } catch (err) {
                setError("Failed to fetch news. Please try again later.");
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchNews();
    }, []);

    const filtered = articles.filter(a =>
        !query.trim() ||
        a.title.toLowerCase().includes(query.toLowerCase()) ||
        a.snippet.toLowerCase().includes(query.toLowerCase())
    );

    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="text-center p-8">
                    <LoadingSpinner />
                    <p className="mt-4 text-gray-300 animate-pulse">Fetching latest headlines...</p>
                </div>
            );
        }

        if (error) {
            return <div className="text-center p-8 text-red-400">{error}</div>;
        }

        if (filtered.length === 0) {
            return <div className="text-center p-8 text-gray-400">No news articles found.</div>;
        }

        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.map(article => (
                    <NewsArticleCard key={article.id} article={article} />
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header with Back Button */}
            {onNavigate && (
                <div className="flex items-center justify-between mb-6">
                    <button
                        onClick={() => navigate('/')}
                        className="flex items-center text-blue-400 hover:text-blue-300 transition-colors bg-gray-800 hover:bg-gray-700 px-3 py-2 rounded-lg font-medium"
                    >
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                        <span className="text-sm sm:text-base">Back to Home</span>
                    </button>
                </div>
            )}

            <section>
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-6">Latest Football News</h2>
                <div className="mb-6 flex items-center">
                    <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Filter by league, team, or keyword..."
                        className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                {renderContent()}
            </section>
        </div>
    );
};

export default News;
