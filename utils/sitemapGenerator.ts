import { Match } from '../types';

interface SitemapUrl {
  loc: string;
  lastmod: string;
  changefreq: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority: number;
}

class SitemapGenerator {
  private baseUrl: string;

  constructor() {
    this.baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://www.yourdomain.com';
  }

  // Generate sitemap XML
  generateSitemap(matches: Match[]): string {
    const urls: SitemapUrl[] = [
      // Main pages
      {
        loc: `${this.baseUrl}/`,
        lastmod: new Date().toISOString(),
        changefreq: 'daily',
        priority: 1.0
      },
      {
        loc: `${this.baseUrl}/#dashboard`,
        lastmod: new Date().toISOString(),
        changefreq: 'daily',
        priority: 0.9
      },
      {
        loc: `${this.baseUrl}/#fixtures`,
        lastmod: new Date().toISOString(),
        changefreq: 'hourly',
        priority: 0.9
      },
      {
        loc: `${this.baseUrl}/#news`,
        lastmod: new Date().toISOString(),
        changefreq: 'daily',
        priority: 0.8
      },
      {
        loc: `${this.baseUrl}/#my-teams`,
        lastmod: new Date().toISOString(),
        changefreq: 'weekly',
        priority: 0.7
      }
    ];

    // Add match pages
    matches.forEach(match => {
      urls.push({
        loc: `${this.baseUrl}/#match/${match.id}`,
        lastmod: new Date(match.date).toISOString(),
        changefreq: 'daily',
        priority: 0.8
      });
    });

    // Add team pages (unique teams from matches)
    const uniqueTeams = new Set<string>();
    matches.forEach(match => {
      uniqueTeams.add(match.homeTeam);
      uniqueTeams.add(match.awayTeam);
    });

    uniqueTeams.forEach(team => {
      urls.push({
        loc: `${this.baseUrl}/#team/${team.toLowerCase().replace(/\s+/g, '-')}`,
        lastmod: new Date().toISOString(),
        changefreq: 'weekly',
        priority: 0.7
      });
    });

    return this.generateXML(urls);
  }

  // Generate XML sitemap
  private generateXML(urls: SitemapUrl[]): string {
    const xmlHeader = '<?xml version="1.0" encoding="UTF-8"?>';
    const urlsetOpen = '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';
    const urlsetClose = '</urlset>';

    const urlEntries = urls.map(url => `
  <url>
    <loc>${url.loc}</loc>
    <lastmod>${url.lastmod}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`).join('');

    return `${xmlHeader}
${urlsetOpen}${urlEntries}
${urlsetClose}`;
  }

  // Generate robots.txt content
  generateRobotsTxt(): string {
    return `User-agent: *
Allow: /

# Sitemap location
Sitemap: ${this.baseUrl}/sitemap.xml

# Crawl delay
Crawl-delay: 1

# Disallow certain paths
Disallow: /api/
Disallow: /admin/
Disallow: /private/
Disallow: /*.json$
Disallow: /*.xml$

# Allow important pages
Allow: /
Allow: /fixtures
Allow: /teams
Allow: /news
Allow: /matches`;
  }

  // Update sitemap in the DOM
  updateSitemapInDOM(matches: Match[]): void {
    if (typeof window === 'undefined') return;

    // Remove existing sitemap link
    const existingSitemap = document.querySelector('link[rel="sitemap"]');
    if (existingSitemap) {
      existingSitemap.remove();
    }

    // Add sitemap link
    const sitemapLink = document.createElement('link');
    sitemapLink.rel = 'sitemap';
    sitemapLink.type = 'application/xml';
    sitemapLink.href = `${this.baseUrl}/sitemap.xml`;
    
    document.head.appendChild(sitemapLink);
  }

  // Generate and serve sitemap
  async serveSitemap(matches: Match[]): Promise<Response> {
    const sitemap = this.generateSitemap(matches);
    
    return new Response(sitemap, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600'
      }
    });
  }
}

export const sitemapGenerator = new SitemapGenerator();
