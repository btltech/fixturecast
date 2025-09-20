import { Match } from '../types';
import { schemaService } from '../services/schemaService';

// Add structured data to HTML head
export const addStructuredDataToHead = (match: Match): void => {
  if (typeof window === 'undefined') return;

  // Remove existing structured data
  const existingScripts = document.querySelectorAll('script[type="application/ld+json"]');
  existingScripts.forEach(script => script.remove());

  // Add SportsEvent structured data
  const sportsEventScript = document.createElement('script');
  sportsEventScript.type = 'application/ld+json';
  sportsEventScript.textContent = JSON.stringify(schemaService.generateSportsEventSchema(match), null, 2);
  document.head.appendChild(sportsEventScript);

  // Add Event structured data for Google rich results
  const eventScript = document.createElement('script');
  eventScript.type = 'application/ld+json';
  eventScript.textContent = JSON.stringify(schemaService.generateEventSchema(match), null, 2);
  document.head.appendChild(eventScript);
};

// Add structured data for a list of matches
export const addMatchListStructuredDataToHead = (matches: Match[]): void => {
  if (typeof window === 'undefined') return;

  // Remove existing structured data
  const existingScripts = document.querySelectorAll('script[type="application/ld+json"]');
  existingScripts.forEach(script => script.remove());

  // Add structured data for each match
  matches.forEach((match, index) => {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(schemaService.generateSportsEventSchema(match), null, 2);
    document.head.appendChild(script);
  });
};

// Add breadcrumb structured data
export const addBreadcrumbStructuredData = (items: Array<{ name: string; url: string }>): void => {
  if (typeof window === 'undefined') return;

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url
    }))
  };

  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify(breadcrumbSchema, null, 2);
  document.head.appendChild(script);
};

// Add organization structured data
export const addOrganizationStructuredData = (): void => {
  if (typeof window === 'undefined') return;

  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'FixtureCast',
    url: window.location.origin,
    logo: `${window.location.origin}/logo.png`,
    description: 'AI-powered football predictions and match analysis',
    sameAs: [
      'https://twitter.com/fixturecast',
      'https://facebook.com/fixturecast'
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      email: 'support@fixturecast.com'
    }
  };

  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify(organizationSchema, null, 2);
  document.head.appendChild(script);
};

// Add website structured data
export const addWebsiteStructuredData = (): void => {
  if (typeof window === 'undefined') return;

  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'FixtureCast',
    url: window.location.origin,
    description: 'AI-powered football predictions and match analysis',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${window.location.origin}/search?q={search_term_string}`
      },
      'query-input': 'required name=search_term_string'
    }
  };

  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify(websiteSchema, null, 2);
  document.head.appendChild(script);
};

// Add FAQ structured data
export const addFAQStructuredData = (faqs: Array<{ question: string; answer: string }>): void => {
  if (typeof window === 'undefined') return;

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer
      }
    }))
  };

  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify(faqSchema, null, 2);
  document.head.appendChild(script);
};

// Add local business structured data
export const addLocalBusinessStructuredData = (): void => {
  if (typeof window === 'undefined') return;

  const localBusinessSchema = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: 'FixtureCast',
    description: 'AI-powered football predictions and match analysis',
    url: window.location.origin,
    telephone: '+1-555-FOOTBALL',
    address: {
      '@type': 'PostalAddress',
      streetAddress: '123 Sports Street',
      addressLocality: 'Sports City',
      addressRegion: 'SC',
      postalCode: '12345',
      addressCountry: 'US'
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: '40.7128',
      longitude: '-74.0060'
    },
    openingHours: 'Mo-Su 00:00-23:59',
    priceRange: '$$'
  };

  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify(localBusinessSchema, null, 2);
  document.head.appendChild(script);
};

// Clean up all structured data
export const cleanupStructuredData = (): void => {
  if (typeof window === 'undefined') return;

  const existingScripts = document.querySelectorAll('script[type="application/ld+json"]');
  existingScripts.forEach(script => script.remove());
};
