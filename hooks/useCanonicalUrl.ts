import { useEffect } from 'react';
import { canonicalService } from '../services/canonicalService';

interface UseCanonicalUrlOptions {
  path?: string;
  updateOnMount?: boolean;
  updateOnPathChange?: boolean;
}

export const useCanonicalUrl = (options: UseCanonicalUrlOptions = {}) => {
  const {
    path,
    updateOnMount = true,
    updateOnPathChange = true
  } = options;

  useEffect(() => {
    if (updateOnMount) {
      // Initialize canonical enforcement
      canonicalService.initializeCanonicalEnforcement();
    }
  }, [updateOnMount]);

  useEffect(() => {
    if (updateOnPathChange && path) {
      // Update canonical URL when path changes
      canonicalService.updateCanonicalUrl(path);
    }
  }, [path, updateOnPathChange]);

  // Handle hash changes for SPA routing
  useEffect(() => {
    const handleHashChange = () => {
      canonicalService.handleHashChange();
    };

    window.addEventListener('hashchange', handleHashChange);
    
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  return {
    getCanonicalUrl: (customPath?: string) => canonicalService.getCanonicalUrl(customPath),
    isCanonicalUrl: () => canonicalService.isCanonicalUrl(),
    shouldRedirect: () => canonicalService.shouldRedirect(),
    getRedirectUrl: () => canonicalService.getRedirectUrl(),
    addCanonicalMetaTag: (customPath?: string) => canonicalService.addCanonicalMetaTag(customPath),
    addSEOMetaTags: () => canonicalService.addSEOMetaTags()
  };
};
