// Canonical URL and redirect management service
class CanonicalService {
  private preferredHost: 'www' | 'apex' = 'www';
  private baseUrl: string = '';

  constructor() {
    this.initializeService();
  }

  private initializeService(): void {
    if (typeof window === 'undefined') return;

    this.baseUrl = window.location.origin;
    this.preferredHost = this.determinePreferredHost();
    this.enforceCanonicalUrl();
  }

  // Determine the preferred host (www or apex)
  private determinePreferredHost(): 'www' | 'apex' {
    if (typeof window === 'undefined') return 'www';

    const hostname = window.location.hostname;
    
    // Check if current hostname has www
    const hasWww = hostname.startsWith('www.');
    
    // For this app, we'll prefer www
    return 'www';
  }

  // Get the canonical URL for the current page
  getCanonicalUrl(path: string = ''): string {
    if (typeof window === 'undefined') return '';

    const currentHost = window.location.hostname;
    const currentProtocol = window.location.protocol;
    const currentPort = window.location.port;
    
    // Determine the canonical host
    const canonicalHost = this.getCanonicalHost();
    
    // Build canonical URL
    let canonicalUrl = `${currentProtocol}//${canonicalHost}`;
    
    // Add port if not standard
    if (currentPort && currentPort !== '80' && currentPort !== '443') {
      canonicalUrl += `:${currentPort}`;
    }
    
    // Add path
    if (path) {
      canonicalUrl += path.startsWith('/') ? path : `/${path}`;
    } else {
      canonicalUrl += window.location.pathname;
    }
    
    // Add query string if present
    if (window.location.search) {
      canonicalUrl += window.location.search;
    }
    
    return canonicalUrl;
  }

  // Get the canonical host (www or apex)
  private getCanonicalHost(): string {
    if (typeof window === 'undefined') return '';

    const currentHost = window.location.hostname;
    
    if (this.preferredHost === 'www') {
      // Ensure www is present
      if (currentHost.startsWith('www.')) {
        return currentHost;
      } else {
        return `www.${currentHost}`;
      }
    } else {
      // Ensure www is not present (apex domain)
      if (currentHost.startsWith('www.')) {
        return currentHost.substring(4); // Remove www.
      } else {
        return currentHost;
      }
    }
  }

  // Check if current URL is canonical
  isCanonicalUrl(): boolean {
    if (typeof window === 'undefined') return true;

    const currentUrl = window.location.href;
    const canonicalUrl = this.getCanonicalUrl();
    
    return currentUrl === canonicalUrl;
  }

  // Enforce canonical URL (redirect if necessary)
  enforceCanonicalUrl(): void {
    if (typeof window === 'undefined') return;

    // Only redirect if not already canonical
    if (!this.isCanonicalUrl()) {
      const canonicalUrl = this.getCanonicalUrl();
      
      // Perform 301 redirect
      console.log(`Redirecting to canonical URL: ${canonicalUrl}`);
      window.location.replace(canonicalUrl);
    }
  }

  // Add canonical meta tag to document head
  addCanonicalMetaTag(path?: string): void {
    if (typeof window === 'undefined') return;

    // Remove existing canonical tag
    const existingCanonical = document.querySelector('link[rel="canonical"]');
    if (existingCanonical) {
      existingCanonical.remove();
    }

    // Add new canonical tag
    const canonicalUrl = this.getCanonicalUrl(path);
    const canonicalLink = document.createElement('link');
    canonicalLink.rel = 'canonical';
    canonicalLink.href = canonicalUrl;
    
    document.head.appendChild(canonicalLink);
    
    console.log(`Added canonical URL: ${canonicalUrl}`);
  }

  // Add additional SEO meta tags
  addSEOMetaTags(): void {
    if (typeof window === 'undefined') return;

    // Add canonical URL
    this.addCanonicalMetaTag();

    // Add robots meta tag
    this.addRobotsMetaTag();

    // Add hreflang tags if needed
    this.addHreflangTags();
  }

  // Add robots meta tag
  private addRobotsMetaTag(): void {
    if (typeof window === 'undefined') return;

    // Remove existing robots tag
    const existingRobots = document.querySelector('meta[name="robots"]');
    if (existingRobots) {
      existingRobots.remove();
    }

    // Add robots meta tag
    const robotsMeta = document.createElement('meta');
    robotsMeta.name = 'robots';
    robotsMeta.content = 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';
    
    document.head.appendChild(robotsMeta);
  }

  // Add hreflang tags for internationalization
  private addHreflangTags(): void {
    if (typeof window === 'undefined') return;

    // Remove existing hreflang tags
    const existingHreflang = document.querySelectorAll('link[rel="alternate"][hreflang]');
    existingHreflang.forEach(tag => tag.remove());

    // Add hreflang for current language (English)
    const hreflangLink = document.createElement('link');
    hreflangLink.rel = 'alternate';
    hreflangLink.hreflang = 'en';
    hreflangLink.href = this.getCanonicalUrl();
    
    document.head.appendChild(hreflangLink);

    // Add x-default hreflang
    const xDefaultLink = document.createElement('link');
    xDefaultLink.rel = 'alternate';
    xDefaultLink.hreflang = 'x-default';
    xDefaultLink.href = this.getCanonicalUrl();
    
    document.head.appendChild(xDefaultLink);
  }

  // Get the base URL for the application
  getBaseUrl(): string {
    if (typeof window === 'undefined') return '';

    return this.getCanonicalUrl();
  }

  // Update canonical URL when navigating
  updateCanonicalUrl(path: string): void {
    if (typeof window === 'undefined') return;

    this.addCanonicalMetaTag(path);
  }

  // Check if we should redirect to canonical
  shouldRedirect(): boolean {
    if (typeof window === 'undefined') return false;

    return !this.isCanonicalUrl();
  }

  // Get redirect URL if needed
  getRedirectUrl(): string | null {
    if (typeof window === 'undefined') return null;

    if (this.shouldRedirect()) {
      return this.getCanonicalUrl();
    }

    return null;
  }

  // Initialize canonical enforcement for the app
  initializeCanonicalEnforcement(): void {
    if (typeof window === 'undefined') return;

    // Add canonical meta tag
    this.addSEOMetaTags();

    // Check for redirect on page load
    if (this.shouldRedirect()) {
      const redirectUrl = this.getRedirectUrl();
      if (redirectUrl) {
        console.log(`Redirecting to canonical URL: ${redirectUrl}`);
        window.location.replace(redirectUrl);
      }
    }
  }

  // Handle hash changes (for SPA routing)
  handleHashChange(): void {
    if (typeof window === 'undefined') return;

    const currentPath = window.location.pathname + window.location.hash;
    this.updateCanonicalUrl(currentPath);
  }

  // Get preferred host setting
  getPreferredHost(): 'www' | 'apex' {
    return this.preferredHost;
  }

  // Set preferred host (for configuration)
  setPreferredHost(host: 'www' | 'apex'): void {
    this.preferredHost = host;
    
    // Re-enforce canonical URL with new preference
    if (typeof window !== 'undefined') {
      this.enforceCanonicalUrl();
    }
  }
}

export const canonicalService = new CanonicalService();
