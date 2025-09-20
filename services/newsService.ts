import { NewsArticle } from '../types';

// RSS Feed URLs for major sports outlets
const RSS_FEEDS = [
  {
    url: 'http://feeds.bbci.co.uk/sport/football/rss.xml',
    source: 'BBC Sport' as const,
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/42/BBC_Sport_2019.svg/1200px-BBC_Sport_2019.svg.png'
  },
  {
    url: 'https://www.espn.com/espn/rss/soccer/news',
    source: 'ESPN' as const,
    logo: 'https://a.espncdn.com/i/espn/espn_logos/espn_red.png'
  },
  {
    url: 'https://www.skysports.com/rss/12040',
    source: 'Sky Sports' as const,
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/Sky_Sports_logo.svg/1200px-Sky_Sports_logo.svg.png'
  },
  {
    url: 'https://www.nbcsports.com/soccer/rss',
    source: 'NBC Sports' as const,
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/NBC_Sports_logo.svg/1200px-NBC_Sports_logo.svg.png'
  },
  {
    url: 'https://sports.beinsports.com/en/rss',
    source: 'BeIN Sports' as const,
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/92/BeIN_Sports_logo.svg/1200px-BeIN_Sports_logo.svg.png'
  },
  {
    url: 'https://www.goal.com/feeds/en/news',
    source: 'Goal.com' as const,
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/50/Goal.com_logo.svg/1200px-Goal.com_logo.svg.png'
  },
  {
    url: 'https://feeds.feedburner.com/thefalse9',
    source: 'The False 9' as const,
    logo: 'https://thefalse9.com/wp-content/uploads/2019/01/cropped-false9_logo_light-300x300.png'
  },
  {
    url: 'https://www.football365.com/feed',
    source: 'Football365' as const,
    logo: 'https://www.football365.com/wp-content/uploads/2020/01/f365-logo-new.png'
  },
  {
    url: 'https://feeds.feedburner.com/talkSPORTFootball',
    source: 'talkSPORT' as const,
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/61/TalkSport_logo.svg/1200px-TalkSport_logo.svg.png'
  },
  {
    url: 'https://www.givemesport.com/rss',
    source: 'GiveMeSport' as const,
    logo: 'https://www.givemesport.com/static/uploads/2020/06/gms-logo.png'
  },
  {
    url: 'https://www.fourfourtwo.com/news/rss',
    source: 'FourFourTwo' as const,
    logo: 'https://cdn.mos.cms.futurecdn.net/6bKwKpnEjGjfDGKHFk7nJV-300-80.png'
  },
  {
    url: 'https://talksport.com/football/rss/',
    source: 'TalkSport Football' as const,
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/61/TalkSport_logo.svg/1200px-TalkSport_logo.svg.png'
  },
  {
    url: 'https://theathletic.com/rss/',
    source: 'The Athletic' as const,
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/The_Athletic_logo.svg/1200px-The_Athletic_logo.svg.png'
  },
  {
    url: 'https://www.transfermarkt.com/rss/news',
    source: 'Transfermarkt' as const,
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7f/Transfermarkt_logo.svg/1200px-Transfermarkt_logo.svg.png'
  },
  {
    url: 'https://www.football-italia.net/rss.xml',
    source: 'Football Italia' as const,
    logo: 'https://www.football-italia.net/sites/all/themes/football_italia/logo.png'
  },
  {
    url: 'https://www.marca.com/futbol.rss',
    source: 'Marca' as const,
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ee/Marca.svg/1200px-Marca.svg.png'
  },
  {
    url: 'https://www.sport.es/es/rss/futbol/',
    source: 'Sport.es' as const,
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Sport_logo.svg/1200px-Sport_logo.svg.png'
  },
  {
    url: 'https://feeds.feedburner.com/mundodeportivo/futbol',
    source: 'Mundo Deportivo' as const,
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8d/Mundo_Deportivo_logo.svg/1200px-Mundo_Deportivo_logo.svg.png'
  },
  {
    url: 'https://www.football.london/rss.xml',
    source: 'Football London' as const,
    logo: 'https://i2-prod.football.london/incoming/article18965937.ece/ALTERNATES/s1200/0_FL-LOGO.png'
  },
  {
    url: 'https://www.90min.com/rss',
    source: '90min' as const,
    logo: 'https://images.90min.com/production/90min-logo-white.png'
  },
  {
    url: 'https://rss.cnn.com/rss/edition_football.rss',
    source: 'CNN Sports' as const,
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/66/CNN_International_logo.svg/1200px-CNN_International_logo.svg.png'
  }
];

// Cache for RSS data to avoid frequent requests
const CACHE_KEY = 'fixturecast_news_cache';
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

// Simple RSS parser
const parseRSS = async (feedUrl: string, sourceName: NewsArticle['source']): Promise<NewsArticle[]> => {
  try {
    // Try multiple CORS proxies for better reliability
    const proxies = [
      `https://api.allorigins.win/raw?url=${encodeURIComponent(feedUrl)}`,
      `https://cors-anywhere.herokuapp.com/${feedUrl}`,
      `https://corsproxy.io/?${encodeURIComponent(feedUrl)}`
    ];
    
    let response: Response | null = null;
    let lastError: Error | null = null;
    
    for (const proxyUrl of proxies) {
      try {
        response = await fetch(proxyUrl);
        if (response.ok) {
          break;
        }
      } catch (error) {
        lastError = error as Error;
        continue;
      }
    }
    
    if (!response || !response.ok) {
        throw new Error(`Failed to fetch RSS feed from any proxy: ${lastError?.message || 'All proxies failed'}`);
    }
    
    const text = await response.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(text, 'text/xml');
    const items = xmlDoc.querySelectorAll('item');
    
    const articles: NewsArticle[] = [];
    
    items.forEach((item, index) => {
      const title = item.querySelector('title')?.textContent || 'No title';
      const link = item.querySelector('link')?.textContent || '#';
      const description = item.querySelector('description')?.textContent || '';
      const pubDate = item.querySelector('pubDate')?.textContent || new Date().toISOString();
      
      // Clean up description (remove HTML tags and limit length)
      const cleanDescription = description.replace(/<[^>]*>/g, '').substring(0, 150) + '...';
      
      articles.push({
        id: `${sourceName.toLowerCase().replace(/\s+/g, '-')}-${index}`,
        title: title.trim(),
        link: link.trim(),
        snippet: cleanDescription.trim(),
        source: sourceName,
        publishedDate: new Date(pubDate).toISOString()
      });
    });
    
    return articles;
  } catch (error) {
    console.error(`Error parsing RSS feed ${feedUrl}:`, error);
    return []; // Return empty array on failure
  }
};

export const getFootballNews = async (): Promise<NewsArticle[]> => {
  const hasLocalStorage = typeof window !== 'undefined' && window.localStorage;
  
  // Check persistent cache first
  if (hasLocalStorage) {
    try {
      const cachedRaw = localStorage.getItem(CACHE_KEY);
      if (cachedRaw) {
        const cached = JSON.parse(cachedRaw);
        if ((Date.now() - cached.timestamp) < CACHE_DURATION) {
          console.log("Returning persistently cached news data");
          return cached.data;
        }
      }
    } catch (e) {
        console.warn("Failed to read news cache", e);
        localStorage.removeItem(CACHE_KEY); // Clear corrupt cache
    }
  }
  
  try {
    console.log("Fetching fresh football news from RSS feeds...");
    // Fetch from all RSS feeds in parallel
    const feedPromises = RSS_FEEDS.map(feed => parseRSS(feed.url, feed.source));
    const feedResults = await Promise.allSettled(feedPromises);
    
    // Combine all articles
    const allArticles: NewsArticle[] = [];
    feedResults.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        allArticles.push(...result.value);
      } else {
        console.error(`Failed to fetch from ${RSS_FEEDS[index].source}:`, result.status === 'rejected' ? result.reason : 'No value returned');
      }
    });
    
    // If no articles were fetched, return cached data or empty array
    if (allArticles.length === 0) {
      console.warn("No articles fetched from any RSS feed, returning cached data if available");
      if (hasLocalStorage) {
        try {
          const cachedRaw = localStorage.getItem(CACHE_KEY);
          if (cachedRaw) {
            const cached = JSON.parse(cachedRaw);
            return cached.data || [];
          }
        } catch (e) {
          console.warn("Failed to read fallback cache", e);
        }
      }
      return [];
    }
    
    // Sort by publication date (newest first)
    allArticles.sort((a, b) => new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime());
    
    // Take the most recent 50 articles (increased for more sources)
    const recentArticles = allArticles.slice(0, 50);
    
    // Update persistent cache
    if (hasLocalStorage) {
        try {
            const cacheData = {
                data: recentArticles,
                timestamp: Date.now()
            };
            localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
        } catch (e) {
            console.warn("Failed to write to news cache", e);
        }
    }
    
    console.log(`News fetched successfully: ${recentArticles.length} articles`);
    return recentArticles;
    
  } catch (error) {
    console.error("Error fetching news:", error);
    return []; // Return empty on a major failure
  }
};