import React, { useEffect } from 'react';
import { Match } from '../types';
import { schemaService } from '../services/schemaService';

interface StructuredMatchPageProps {
  match: Match;
  children: React.ReactNode;
}

const StructuredMatchPage: React.FC<StructuredMatchPageProps> = ({ match, children }) => {
  useEffect(() => {
    // Inject both SportsEvent and Event structured data for Google rich results
    schemaService.injectStructuredData(match, 'match-page-sports');
    schemaService.injectEventStructuredData(match, 'match-page-event');
  }, [match]);

  return (
    <div className="match-page">
      {/* SportsEvent structured data container */}
      <div id="match-page-sports" style={{ display: 'none' }} />
      
      {/* Event structured data container for Google rich results */}
      <div id="match-page-event" style={{ display: 'none' }} />
      
      {/* Enhanced microdata markup */}
      <div
        itemScope
        itemType="https://schema.org/SportsEvent"
        className="match-details"
      >
        {/* Event name */}
        <h1 itemProp="name" className="text-3xl font-bold text-gray-900 mb-4">
          {match.homeTeam} vs {match.awayTeam}
        </h1>
        
        {/* Event date and time */}
        <div className="mb-4">
          <time itemProp="startDate" dateTime={new Date(match.date).toISOString()}>
            {new Date(match.date).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit'
            })}
          </time>
        </div>
        
        {/* Event status */}
        <meta itemProp="eventStatus" content="https://schema.org/EventScheduled" />
        <meta itemProp="eventAttendanceMode" content="https://schema.org/OfflineEventAttendanceMode" />
        
        {/* Location */}
        <div itemScope itemType="https://schema.org/Place" className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Venue</h2>
          <div itemProp="name" className="text-gray-700">
            {match.homeTeam} Stadium
          </div>
          <div itemScope itemType="https://schema.org/PostalAddress">
            <div itemProp="streetAddress" className="text-gray-600">
              123 Stadium Street
            </div>
            <div itemProp="addressLocality" className="text-gray-600">
              City Name
            </div>
            <div itemProp="addressCountry" className="text-gray-600">
              Country Name
            </div>
          </div>
        </div>
        
        {/* Organizer */}
        <div itemScope itemType="https://schema.org/Organization" className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">League</h2>
          <div itemProp="name" className="text-gray-700">
            {match.league.toString()}
          </div>
          <a itemProp="url" href={`/league/${match.league.toLowerCase().replace(/\s+/g, '-')}`} className="text-blue-600 hover:text-blue-800">
            View League
          </a>
        </div>
        
        {/* Teams */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Teams</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Home Team */}
            <div itemScope itemType="https://schema.org/SportsTeam" className="p-4 border border-gray-200 rounded-lg">
              <h3 itemProp="name" className="text-lg font-semibold text-gray-900 mb-2">
                {match.homeTeam}
              </h3>
              <a itemProp="url" href={`/team/${match.homeTeam.toLowerCase().replace(/\s+/g, '-')}`} className="text-blue-600 hover:text-blue-800">
                View Team
              </a>
            </div>
            
            {/* Away Team */}
            <div itemScope itemType="https://schema.org/SportsTeam" className="p-4 border border-gray-200 rounded-lg">
              <h3 itemProp="name" className="text-lg font-semibold text-gray-900 mb-2">
                {match.awayTeam}
              </h3>
              <a itemProp="url" href={`/team/${match.awayTeam.toLowerCase().replace(/\s+/g, '-')}`} className="text-blue-600 hover:text-blue-800">
                View Team
              </a>
            </div>
          </div>
        </div>
        
        {/* Sport */}
        <meta itemProp="sport" content="https://schema.org/Soccer" />
        
        {/* Offers */}
        <div itemScope itemType="https://schema.org/Offer" className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Event Details</h2>
          <div className="bg-blue-50 p-4 rounded-lg">
            <div itemProp="url" className="text-blue-600 hover:text-blue-800">
              <a href={`/match/${match.id}`}>View Match Details</a>
            </div>
            <div itemProp="price" className="text-gray-700">
              Free to watch
            </div>
            <div itemProp="priceCurrency" content="USD" />
            <div itemProp="availability" content="https://schema.org/InStock" />
            <div itemProp="validFrom" content={new Date(match.date).toISOString()} />
            <div itemProp="validThrough" content={new Date(new Date(match.date).getTime() + (2 * 60 * 60 * 1000)).toISOString()} />
          </div>
        </div>
        
        {/* Render the actual match page content */}
        {children}
      </div>
    </div>
  );
};

export default StructuredMatchPage;
