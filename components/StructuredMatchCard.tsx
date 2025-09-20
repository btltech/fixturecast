import React, { useEffect, useRef } from 'react';
import { Match } from '../types';
import { schemaService } from '../services/schemaService';

interface StructuredMatchCardProps {
  match: Match;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
}

const StructuredMatchCard: React.FC<StructuredMatchCardProps> = ({
  match,
  children,
  className = '',
  onClick,
  onKeyDown
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      // Inject structured data for this match
      schemaService.injectStructuredData(match, containerRef.current.id);
    }
  }, [match]);

  return (
    <div
      ref={containerRef}
      id={`match-${match.id}`}
      className={className}
      itemScope
      itemType="https://schema.org/SportsEvent"
      onClick={onClick}
      onKeyDown={onKeyDown}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {/* Hidden structured data elements */}
      <meta itemProp="name" content={`${match.homeTeam} vs ${match.awayTeam}`} />
      <meta itemProp="startDate" content={new Date(match.date).toISOString()} />
      <meta itemProp="eventStatus" content="https://schema.org/EventScheduled" />
      <meta itemProp="eventAttendanceMode" content="https://schema.org/OfflineEventAttendanceMode" />
      
      {/* Location */}
      <div itemScope itemType="https://schema.org/Place" style={{ display: 'none' }}>
        <meta itemProp="name" content={`${match.homeTeam} Stadium`} />
        <div itemScope itemType="https://schema.org/PostalAddress">
          <meta itemProp="streetAddress" content="123 Stadium Street" />
          <meta itemProp="addressLocality" content="City Name" />
          <meta itemProp="addressCountry" content="Country Name" />
        </div>
      </div>

      {/* Organizer */}
      <div itemScope itemType="https://schema.org/Organization" style={{ display: 'none' }}>
        <meta itemProp="name" content={match.league.toString()} />
        <meta itemProp="url" content={`/league/${match.league.toLowerCase().replace(/\s+/g, '-')}`} />
      </div>

      {/* Home Team */}
      <div itemScope itemType="https://schema.org/SportsTeam" style={{ display: 'none' }}>
        <meta itemProp="name" content={match.homeTeam} />
        <meta itemProp="url" content={`/team/${match.homeTeam.toLowerCase().replace(/\s+/g, '-')}`} />
      </div>

      {/* Away Team */}
      <div itemScope itemType="https://schema.org/SportsTeam" style={{ display: 'none' }}>
        <meta itemProp="name" content={match.awayTeam} />
        <meta itemProp="url" content={`/team/${match.awayTeam.toLowerCase().replace(/\s+/g, '-')}`} />
      </div>

      {/* Sport */}
      <meta itemProp="sport" content="https://schema.org/Soccer" />

      {/* Offers */}
      <div itemScope itemType="https://schema.org/Offer" style={{ display: 'none' }}>
        <meta itemProp="url" content={`/match/${match.id}`} />
        <meta itemProp="price" content="0" />
        <meta itemProp="priceCurrency" content="USD" />
        <meta itemProp="availability" content="https://schema.org/InStock" />
        <meta itemProp="validFrom" content={new Date(match.date).toISOString()} />
        <meta itemProp="validThrough" content={new Date(new Date(match.date).getTime() + (2 * 60 * 60 * 1000)).toISOString()} />
      </div>

      {/* Render the actual match card */}
      {children}
    </div>
  );
};

export default StructuredMatchCard;
