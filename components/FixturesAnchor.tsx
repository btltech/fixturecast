import React, { useEffect, useRef, useState } from 'react';

interface FixturesAnchorProps {
  children: React.ReactNode;
  anchorId?: string;
  priority?: boolean;
  className?: string;
}

const FixturesAnchor: React.FC<FixturesAnchorProps> = ({
  children,
  anchorId = 'fixtures',
  priority = true,
  className = ''
}) => {
  const anchorRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isInViewport, setIsInViewport] = useState(false);

  // Set up intersection observer for visibility tracking
  useEffect(() => {
    if (!anchorRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setIsVisible(entry.isIntersecting);
          setIsInViewport(entry.isIntersecting);
        });
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -100px 0px'
      }
    );

    observer.observe(anchorRef.current);

    return () => {
      observer.disconnect();
    };
  }, []);

  // Handle fragment navigation
  useEffect(() => {
    const handleFragmentNavigation = () => {
      const hash = window.location.hash;
      if (hash === `#${anchorId}` || hash === `#fixtures`) {
        // Scroll to fixtures anchor
        if (anchorRef.current) {
          anchorRef.current.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
          });
        }
      }
    };

    // Handle initial load
    handleFragmentNavigation();

    // Handle hash changes
    window.addEventListener('hashchange', handleFragmentNavigation);
    
    return () => {
      window.removeEventListener('hashchange', handleFragmentNavigation);
    };
  }, [anchorId]);

  // Handle priority navigation
  useEffect(() => {
    if (priority && isVisible) {
      // Update URL hash to reflect current position
      const currentHash = window.location.hash;
      if (currentHash !== `#${anchorId}`) {
        // Update hash without triggering navigation
        window.history.replaceState(null, '', `#${anchorId}`);
      }
    }
  }, [priority, isVisible, anchorId]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Handle Tab navigation to fixtures
      if (event.key === 'Tab' && event.shiftKey === false) {
        const activeElement = document.activeElement;
        if (activeElement && anchorRef.current?.contains(activeElement)) {
          // User is navigating within fixtures, ensure it's visible
          if (!isInViewport) {
            anchorRef.current?.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'start' 
            });
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isInViewport]);

  return (
    <div
      ref={anchorRef}
      id={anchorId}
      className={`fixtures-anchor ${className}`}
      data-priority={priority}
      data-visible={isVisible}
      data-in-viewport={isInViewport}
      tabIndex={-1} // Make it focusable for keyboard navigation
      role="region"
      aria-label="Fixtures section"
    >
      {/* Anchor indicator for development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="anchor-indicator">
          <div className="text-xs text-gray-500 mb-2">
            Fixtures Anchor: {anchorId} {isVisible ? '(visible)' : '(hidden)'}
          </div>
        </div>
      )}
      
      {/* Content */}
      {children}
    </div>
  );
};

export default FixturesAnchor;
