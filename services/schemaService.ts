import { Match, League } from '../types';

export interface SchemaSportsEvent {
  '@context': string;
  '@type': string;
  name: string;
  startDate: string;
  endDate?: string;
  eventStatus: string;
  eventAttendanceMode: string;
  location: {
    '@type': string;
    name: string;
    address?: {
      '@type': string;
      streetAddress?: string;
      addressLocality?: string;
      addressCountry?: string;
    };
  };
  organizer: {
    '@type': string;
    name: string;
    url?: string;
  };
  performer: Array<{
    '@type': string;
    name: string;
    url?: string;
  }>;
  offers?: {
    '@type': string;
    url: string;
    price?: string;
    priceCurrency?: string;
    availability?: string;
    validFrom?: string;
    validThrough?: string;
  };
  sport?: string;
  homeTeam?: {
    '@type': string;
    name: string;
    url?: string;
  };
  awayTeam?: {
    '@type': string;
    name: string;
    url?: string;
  };
  competitor?: Array<{
    '@type': string;
    name: string;
    url?: string;
  }>;
  potentialAction?: {
    '@type': string;
    target: {
      '@type': string;
      urlTemplate: string;
    };
    'query-input': string;
  };
}

export interface SchemaEvent {
  '@context': string;
  '@type': string;
  name: string;
  startDate: string;
  endDate?: string;
  eventStatus: string;
  eventAttendanceMode: string;
  location: {
    '@type': string;
    name: string;
    address?: {
      '@type': string;
      streetAddress?: string;
      addressLocality?: string;
      addressCountry?: string;
    };
  };
  organizer: {
    '@type': string;
    name: string;
    url?: string;
  };
  offers?: {
    '@type': string;
    url: string;
    price?: string;
    priceCurrency?: string;
    availability?: string;
    validFrom?: string;
    validThrough?: string;
  };
}

class SchemaService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  }

  // Generate Schema.org SportsEvent markup for a match
  generateSportsEventSchema(match: Match): SchemaSportsEvent {
    const matchDate = new Date(match.date);
    const endDate = new Date(matchDate.getTime() + (2 * 60 * 60 * 1000)); // 2 hours later

    return {
      '@context': 'https://schema.org',
      '@type': 'SportsEvent',
      name: `${match.homeTeam} vs ${match.awayTeam}`,
      startDate: matchDate.toISOString(),
      endDate: endDate.toISOString(),
      eventStatus: this.getEventStatus(match),
      eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
      location: {
        '@type': 'Place',
        name: this.getVenueName(match),
        address: {
          '@type': 'PostalAddress',
          streetAddress: this.getVenueAddress(match),
          addressLocality: this.getVenueCity(match),
          addressCountry: this.getVenueCountry(match)
        }
      },
      organizer: {
        '@type': 'Organization',
        name: this.getLeagueName(match.league),
        url: this.getLeagueUrl(match.league)
      },
      performer: [
        {
          '@type': 'SportsTeam',
          name: match.homeTeam,
          url: this.getTeamUrl(match.homeTeam)
        },
        {
          '@type': 'SportsTeam',
          name: match.awayTeam,
          url: this.getTeamUrl(match.awayTeam)
        }
      ],
      offers: {
        '@type': 'Offer',
        url: `${this.baseUrl}/match/${match.id}`,
        price: '0',
        priceCurrency: 'USD',
        availability: 'https://schema.org/InStock',
        validFrom: matchDate.toISOString(),
        validThrough: endDate.toISOString()
      },
      sport: this.getSportType(match.league),
      homeTeam: {
        '@type': 'SportsTeam',
        name: match.homeTeam,
        url: this.getTeamUrl(match.homeTeam)
      },
      awayTeam: {
        '@type': 'SportsTeam',
        name: match.awayTeam,
        url: this.getTeamUrl(match.awayTeam)
      },
      competitor: [
        {
          '@type': 'SportsTeam',
          name: match.homeTeam,
          url: this.getTeamUrl(match.homeTeam)
        },
        {
          '@type': 'SportsTeam',
          name: match.awayTeam,
          url: this.getTeamUrl(match.awayTeam)
        }
      ],
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: `${this.baseUrl}/search?q={search_term_string}`
        },
        'query-input': 'required name=search_term_string'
      }
    };
  }

  // Generate Schema.org Event markup for a match (Google Event structured data)
  generateEventSchema(match: Match): SchemaEvent {
    const matchDate = new Date(match.date);
    const endDate = new Date(matchDate.getTime() + (2 * 60 * 60 * 1000)); // 2 hours later

    return {
      '@context': 'https://schema.org',
      '@type': 'Event',
      name: `${match.homeTeam} vs ${match.awayTeam}`,
      startDate: matchDate.toISOString(),
      endDate: endDate.toISOString(),
      eventStatus: this.getEventStatus(match),
      eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
      location: {
        '@type': 'Place',
        name: this.getVenueName(match),
        address: {
          '@type': 'PostalAddress',
          streetAddress: this.getVenueAddress(match),
          addressLocality: this.getVenueCity(match),
          addressCountry: this.getVenueCountry(match)
        }
      },
      organizer: {
        '@type': 'Organization',
        name: this.getLeagueName(match.league),
        url: this.getLeagueUrl(match.league)
      },
      offers: {
        '@type': 'Offer',
        url: `${this.baseUrl}/match/${match.id}`,
        price: '0',
        priceCurrency: 'USD',
        availability: 'https://schema.org/InStock',
        validFrom: matchDate.toISOString(),
        validThrough: endDate.toISOString()
      }
    };
  }

  // Generate JSON-LD script tag for a match
  generateJsonLdScript(match: Match): string {
    const schema = this.generateSportsEventSchema(match);
    return `<script type="application/ld+json">${JSON.stringify(schema, null, 2)}</script>`;
  }

  // Generate JSON-LD script tag for Google Event structured data
  generateEventJsonLdScript(match: Match): string {
    const schema = this.generateEventSchema(match);
    return `<script type="application/ld+json">${JSON.stringify(schema, null, 2)}</script>`;
  }

  // Get event status based on match timing
  private getEventStatus(match: Match): string {
    const now = new Date();
    const matchDate = new Date(match.date);
    const timeDiff = now.getTime() - matchDate.getTime();
    const minutesDiff = Math.floor(timeDiff / (1000 * 60));

    if (minutesDiff < 0) {
      return 'https://schema.org/EventScheduled';
    } else if (minutesDiff >= 0 && minutesDiff < 120) {
      return 'https://schema.org/EventScheduled';
    } else {
      return 'https://schema.org/EventPostponed';
    }
  }

  // Get venue name (mock data - in real app would come from match data)
  private getVenueName(match: Match): string {
    // In a real app, this would come from match.venue or similar
    return `${match.homeTeam} Stadium`;
  }

  // Get venue address (mock data)
  private getVenueAddress(match: Match): string {
    return '123 Stadium Street';
  }

  // Get venue city (mock data)
  private getVenueCity(match: Match): string {
    return 'City Name';
  }

  // Get venue country (mock data)
  private getVenueCountry(match: Match): string {
    return 'Country Name';
  }

  // Get league name
  private getLeagueName(league: League): string {
    return league.toString();
  }

  // Get league URL
  private getLeagueUrl(league: League): string {
    return `${this.baseUrl}/league/${league.toLowerCase().replace(/\s+/g, '-')}`;
  }

  // Get team URL
  private getTeamUrl(teamName: string): string {
    return `${this.baseUrl}/team/${teamName.toLowerCase().replace(/\s+/g, '-')}`;
  }

  // Get sport type based on league
  private getSportType(league: League): string {
    // All our leagues are football/soccer
    return 'https://schema.org/Soccer';
  }

  // Generate structured data for a list of matches
  generateMatchListSchema(matches: Match[]): string {
    const schemas = matches.map(match => this.generateSportsEventSchema(match));
    return `<script type="application/ld+json">${JSON.stringify(schemas, null, 2)}</script>`;
  }

  // Generate structured data for a league
  generateLeagueSchema(league: League, matches: Match[]): string {
    const leagueSchema = {
      '@context': 'https://schema.org',
      '@type': 'SportsOrganization',
      name: league.toString(),
      url: this.getLeagueUrl(league),
      sport: 'https://schema.org/Soccer',
      member: matches.flatMap(match => [
        {
          '@type': 'SportsTeam',
          name: match.homeTeam,
          url: this.getTeamUrl(match.homeTeam)
        },
        {
          '@type': 'SportsTeam',
          name: match.awayTeam,
          url: this.getTeamUrl(match.awayTeam)
        }
      ])
    };

    return `<script type="application/ld+json">${JSON.stringify(leagueSchema, null, 2)}</script>`;
  }

  // Generate structured data for a team
  generateTeamSchema(teamName: string, matches: Match[]): string {
    const teamMatches = matches.filter(match => 
      match.homeTeam === teamName || match.awayTeam === teamName
    );

    const teamSchema = {
      '@context': 'https://schema.org',
      '@type': 'SportsTeam',
      name: teamName,
      url: this.getTeamUrl(teamName),
      sport: 'https://schema.org/Soccer',
      memberOf: {
        '@type': 'SportsOrganization',
        name: 'Football League'
      },
      event: teamMatches.map(match => this.generateSportsEventSchema(match))
    };

    return `<script type="application/ld+json">${JSON.stringify(teamSchema, null, 2)}</script>`;
  }

  // Inject structured data into DOM
  injectStructuredData(match: Match, containerId: string): void {
    if (typeof window === 'undefined') return;

    const container = document.getElementById(containerId);
    if (!container) return;

    // Remove existing structured data
    const existingScript = container.querySelector('script[type="application/ld+json"]');
    if (existingScript) {
      existingScript.remove();
    }

    // Add new structured data
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(this.generateSportsEventSchema(match), null, 2);
    container.appendChild(script);
  }

  // Inject Google Event structured data
  injectEventStructuredData(match: Match, containerId: string): void {
    if (typeof window === 'undefined') return;

    const container = document.getElementById(containerId);
    if (!container) return;

    // Remove existing structured data
    const existingScript = container.querySelector('script[type="application/ld+json"]');
    if (existingScript) {
      existingScript.remove();
    }

    // Add new structured data
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(this.generateEventSchema(match), null, 2);
    container.appendChild(script);
  }
}

export const schemaService = new SchemaService();
