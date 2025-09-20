import React, { useState, useRef, useEffect } from 'react';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  threshold?: number;
  pullDownText?: string;
  releaseText?: string;
  refreshingText?: string;
}

const PullToRefresh: React.FC<PullToRefreshProps> = ({
  onRefresh,
  children,
  threshold = 80,
  pullDownText = "Pull down to refresh",
  releaseText = "Release to refresh",
  refreshingText = "Refreshing..."
}) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [canRefresh, setCanRefresh] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const isDragging = useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY <= 0) {
      startY.current = e.touches[0].clientY;
      isDragging.current = true;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current || isRefreshing) return;

    const currentY = e.touches[0].clientY;
    const distance = Math.max(0, (currentY - startY.current) * 0.5);
    
    if (distance > 0) {
      e.preventDefault();
      setPullDistance(distance);
      setCanRefresh(distance >= threshold);
    }
  };

  const handleTouchEnd = async () => {
    if (!isDragging.current) return;
    
    isDragging.current = false;
    
    if (canRefresh && !isRefreshing) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
        setCanRefresh(false);
      }
    } else {
      setPullDistance(0);
      setCanRefresh(false);
    }
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleTouchMovePassive = (e: TouchEvent) => {
      if (isDragging.current && pullDistance > 0) {
        e.preventDefault();
      }
    };

    container.addEventListener('touchmove', handleTouchMovePassive, { passive: false });
    
    return () => {
      container.removeEventListener('touchmove', handleTouchMovePassive);
    };
  }, [pullDistance]);

  const getRefreshText = () => {
    if (isRefreshing) return refreshingText;
    if (canRefresh) return releaseText;
    return pullDownText;
  };

  return (
    <div
      ref={containerRef}
      className="overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull to refresh indicator */}
      <div
        className={`
          flex items-center justify-center py-4 transition-all duration-200
          ${pullDistance > 0 ? 'visible opacity-100' : 'invisible opacity-0'}
        `}
        style={{
          transform: `translateY(${Math.min(pullDistance - 60, 0)}px)`
        }}
      >
        <div className="flex items-center space-x-3 text-gray-400">
          <div
            className={`
              w-8 h-8 rounded-full border-2 border-gray-600 border-t-blue-500
              ${isRefreshing ? 'animate-spin' : ''}
              ${canRefresh ? 'border-t-green-500' : ''}
            `}
            style={{
              transform: `rotate(${pullDistance * 2}deg)`
            }}
          />
          <span className="text-sm font-medium">
            {getRefreshText()}
          </span>
        </div>
      </div>

      {/* Content */}
      <div
        style={{
          transform: `translateY(${pullDistance}px)`,
          transition: isDragging.current ? 'none' : 'transform 0.3s ease-out'
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default PullToRefresh;
