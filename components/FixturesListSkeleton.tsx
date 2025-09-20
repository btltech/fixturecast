import React from 'react';
import FixtureCardSkeleton from './FixtureCardSkeleton';

interface FixturesListSkeletonProps {
  count?: number;
  variant?: 'accessible' | 'compact' | 'time-focused' | 'single-line' | 'calendar' | 'original' | 'enhanced';
  showHeader?: boolean;
  showViewToggle?: boolean;
  className?: string;
}

const FixturesListSkeleton: React.FC<FixturesListSkeletonProps> = ({
  count = 8,
  variant = 'accessible',
  showHeader = true,
  showViewToggle = true,
  className = ''
}) => {
  const SkeletonBox: React.FC<{ 
    width: string; 
    height: string; 
    className?: string;
    rounded?: string;
  }> = ({ width, height, className: boxClassName = '', rounded = 'rounded' }) => (
    <div 
      className={`bg-gray-200 dark:bg-gray-700 animate-pulse ${rounded} ${boxClassName}`}
      data-width={width}
      data-height={height}
    />
  );

  const renderSkeletonContent = () => {
    switch (variant) {
      case 'compact':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: count }, (_, index) => (
              <FixtureCardSkeleton
                key={index}
                variant="compact"
                showPrediction={Math.random() > 0.3}
                showCalendarActions={true}
              />
            ))}
          </div>
        );

      case 'time-focused':
        return (
          <div className="space-y-6">
            {Array.from({ length: Math.ceil(count / 3) }, (_, dayIndex) => (
              <div key={dayIndex} className="space-y-4">
                {/* Date Header */}
                <div className="sticky top-0 z-10 theme-bg py-2">
                  <SkeletonBox width="120px" height="18px" />
                </div>
                
                {/* Fixtures for this day */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array.from({ length: 3 }, (_, index) => (
                    <FixtureCardSkeleton
                      key={`${dayIndex}-${index}`}
                      variant="detailed"
                      showPrediction={Math.random() > 0.3}
                      showCalendarActions={true}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        );

      case 'single-line':
        return (
          <div className="space-y-2">
            {Array.from({ length: count }, (_, index) => (
              <div key={index} className="flex items-center justify-between p-3 theme-surface rounded-lg border theme-border">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <SkeletonBox width="40px" height="12px" />
                  <div className="flex items-center space-x-2 flex-1 min-w-0">
                    <SkeletonBox width="60px" height="14px" />
                    <SkeletonBox width="20px" height="12px" />
                    <SkeletonBox width="60px" height="14px" />
                  </div>
                </div>
                <SkeletonBox width="32px" height="32px" rounded="rounded-lg" />
              </div>
            ))}
          </div>
        );

      case 'calendar':
        return (
          <div className="space-y-6">
            {/* Calendar Header Skeleton */}
            <div className="flex flex-col sm:flex-row items-center justify-between mb-6 space-y-4 sm:space-y-0">
              <div className="flex bg-gray-200 dark:bg-gray-700 rounded-lg p-1">
                {[1, 2].map((i) => (
                  <SkeletonBox key={i} width="80px" height="32px" rounded="rounded-md" />
                ))}
              </div>
              <div className="flex bg-gray-200 dark:bg-gray-700 rounded-lg p-1">
                {[1, 2].map((i) => (
                  <SkeletonBox key={i} width="60px" height="32px" rounded="rounded-md" />
                ))}
              </div>
              <div className="flex items-center space-x-2">
                <SkeletonBox width="32px" height="32px" rounded="rounded-lg" />
                <SkeletonBox width="60px" height="32px" rounded="rounded-lg" />
                <SkeletonBox width="32px" height="32px" rounded="rounded-lg" />
              </div>
            </div>

            {/* Calendar Grid Skeleton */}
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: 35 }, (_, index) => (
                <div key={index} className="aspect-square theme-surface rounded-lg border theme-border p-2">
                  <SkeletonBox width="100%" height="16px" className="mb-2" />
                  <div className="space-y-1">
                    {Math.random() > 0.7 && <SkeletonBox width="100%" height="12px" />}
                    {Math.random() > 0.8 && <SkeletonBox width="100%" height="12px" />}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'original':
        return (
          <div className="space-y-6">
            {/* Original Layout Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {Array.from({ length: count }, (_, index) => (
                <FixtureCardSkeleton
                  key={index}
                  variant="default"
                  showPrediction={Math.random() > 0.3}
                  showCalendarActions={true}
                />
              ))}
            </div>
          </div>
        );

      default: // accessible
        return (
          <div className="space-y-4">
            {Array.from({ length: count }, (_, index) => (
              <FixtureCardSkeleton
                key={index}
                variant="default"
                showPrediction={Math.random() > 0.3}
                showCalendarActions={true}
              />
            ))}
          </div>
        );
    }
  };

  return (
    <div className={`fixtures-list-skeleton ${className}`}>
      {/* Header Skeleton */}
      {showHeader && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 px-4 sm:px-0 gap-4 sm:gap-0">
          <SkeletonBox width="120px" height="32px" rounded="rounded-lg" />
          
          {/* View Mode Toggle Skeleton */}
          {showViewToggle && (
            <div className="flex items-center space-x-2">
              <SkeletonBox width="40px" height="14px" />
              <div className="flex bg-gray-200 dark:bg-gray-700 rounded-lg p-1">
                {Array.from({ length: 6 }, (_, i) => (
                  <SkeletonBox key={i} width="60px" height="28px" rounded="rounded-md" />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Content Skeleton */}
      {renderSkeletonContent()}
    </div>
  );
};

export default FixturesListSkeleton;
