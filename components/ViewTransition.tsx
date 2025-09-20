import React, { useState, useEffect, ReactNode } from 'react';

interface ViewTransitionProps {
  children: ReactNode;
  isVisible: boolean;
  transitionType?: 'fade' | 'slide' | 'scale' | 'flip';
  duration?: number;
  className?: string;
}

const ViewTransition: React.FC<ViewTransitionProps> = ({
  children,
  isVisible,
  transitionType = 'fade',
  duration = 300,
  className = ''
}) => {
  const [shouldRender, setShouldRender] = useState(isVisible);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setShouldRender(true);
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), duration);
      return () => clearTimeout(timer);
    } else {
      setIsAnimating(true);
      const timer = setTimeout(() => {
        setShouldRender(false);
        setIsAnimating(false);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isVisible, duration]);

  if (!shouldRender) return null;

  const getTransitionClasses = () => {
    const baseClasses = 'transition-all duration-300 ease-in-out';
    
    switch (transitionType) {
      case 'fade':
        return `${baseClasses} ${
          isVisible && !isAnimating 
            ? 'opacity-100' 
            : 'opacity-0'
        }`;
      
      case 'slide':
        return `${baseClasses} ${
          isVisible && !isAnimating 
            ? 'transform translate-x-0' 
            : 'transform translate-x-full'
        }`;
      
      case 'scale':
        return `${baseClasses} ${
          isVisible && !isAnimating 
            ? 'transform scale-100' 
            : 'transform scale-95'
        }`;
      
      case 'flip':
        return `${baseClasses} ${
          isVisible && !isAnimating 
            ? 'transform rotate-y-0' 
            : 'transform rotate-y-90'
        }`;
      
      default:
        return baseClasses;
    }
  };

  return (
    <div 
      className={`${getTransitionClasses()} ${className}`}
      data-transition-duration={duration}
    >
      {children}
    </div>
  );
};

export default ViewTransition;
