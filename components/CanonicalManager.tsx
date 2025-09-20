import React, { useEffect } from 'react';
import { useCanonicalUrl } from '../hooks/useCanonicalUrl';

interface CanonicalManagerProps {
  path?: string;
  children: React.ReactNode;
}

const CanonicalManager: React.FC<CanonicalManagerProps> = ({ 
  path, 
  children 
}) => {
  const { addSEOMetaTags, addCanonicalMetaTag } = useCanonicalUrl({
    path,
    updateOnMount: true,
    updateOnPathChange: true
  });

  useEffect(() => {
    // Add canonical and SEO meta tags
    addSEOMetaTags();
    
    if (path) {
      addCanonicalMetaTag(path);
    }
  }, [path, addSEOMetaTags, addCanonicalMetaTag]);

  return <>{children}</>;
};

export default CanonicalManager;
