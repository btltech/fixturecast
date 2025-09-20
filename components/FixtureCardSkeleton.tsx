import React from 'react';

interface FixtureCardSkeletonProps {
  variant?: 'default' | 'compact' | 'detailed' | 'mobile';
  className?: string;
  showPrediction?: boolean;
  showCalendarActions?: boolean;
}

const FixtureCardSkeleton: React.FC<FixtureCardSkeletonProps> = ({
  variant = 'default',
  className = '',
  showPrediction = true,
  showCalendarActions = true
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

  if (variant === 'compact') {
    return (
      <div className={`p-3 rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <SkeletonBox width="40px" height="12px" />
            <div className="flex items-center space-x-2 flex-1 min-w-0">
              <SkeletonBox width="60px" height="14px" />
              <SkeletonBox width="20px" height="12px" />
              <SkeletonBox width="60px" height="14px" />
            </div>
          </div>
          {showCalendarActions && (
            <SkeletonBox width="32px" height="32px" rounded="rounded-lg" />
          )}
        </div>
      </div>
    );
  }

  if (variant === 'detailed') {
    return (
      <div className={`theme-surface rounded-lg border theme-border ${className}`}>
        <div className="p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <SkeletonBox width="120px" height="14px" />
            <SkeletonBox width="80px" height="20px" rounded="rounded-full" />
          </div>
          
          {/* Teams */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              <SkeletonBox width="32px" height="32px" rounded="rounded-full" />
              <SkeletonBox width="80px" height="14px" />
            </div>
            
            <SkeletonBox width="20px" height="12px" />
            
            <div className="flex items-center space-x-3 flex-1 min-w-0 justify-end">
              <SkeletonBox width="80px" height="14px" />
              <SkeletonBox width="32px" height="32px" rounded="rounded-full" />
            </div>
          </div>

          {/* Prediction */}
          {showPrediction && (
            <div className="mb-4 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <SkeletonBox width="80px" height="12px" />
                <SkeletonBox width="60px" height="12px" />
              </div>
              <SkeletonBox width="100px" height="14px" />
            </div>
          )}

          {/* Calendar Actions */}
          {showCalendarActions && (
            <div className="flex items-center space-x-2">
              <SkeletonBox width="120px" height="36px" rounded="rounded-lg" />
              <SkeletonBox width="36px" height="36px" rounded="rounded-lg" />
            </div>
          )}
        </div>
      </div>
    );
  }

  if (variant === 'mobile') {
    return (
      <div className={`theme-surface rounded-lg border theme-border ${className}`}>
        <div className="p-4">
          {/* Mobile Header */}
          <div className="flex items-center justify-between mb-3">
            <SkeletonBox width="60px" height="14px" />
            <SkeletonBox width="60px" height="20px" rounded="rounded-full" />
          </div>
          
          {/* Teams Row */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2 flex-1 min-w-0">
              <SkeletonBox width="24px" height="24px" rounded="rounded-full" />
              <SkeletonBox width="70px" height="14px" />
            </div>
            
            <SkeletonBox width="16px" height="12px" />
            
            <div className="flex items-center space-x-2 flex-1 min-w-0 justify-end">
              <SkeletonBox width="70px" height="14px" />
              <SkeletonBox width="24px" height="24px" rounded="rounded-full" />
            </div>
          </div>

          {/* Prediction */}
          {showPrediction && (
            <div className="mb-3 p-2 bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-1">
                <SkeletonBox width="60px" height="12px" />
                <SkeletonBox width="40px" height="12px" />
              </div>
              <SkeletonBox width="80px" height="14px" />
            </div>
          )}

          {/* Mobile Actions */}
          {showCalendarActions && (
            <div className="flex items-center space-x-2">
              <SkeletonBox width="100px" height="32px" rounded="rounded-lg" />
              <SkeletonBox width="32px" height="32px" rounded="rounded-lg" />
            </div>
          )}
        </div>
      </div>
    );
  }

  // Default variant
  return (
    <div className={`theme-surface rounded-lg border theme-border ${className}`}>
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <SkeletonBox width="80px" height="14px" />
          <SkeletonBox width="60px" height="20px" rounded="rounded-full" />
        </div>
        
        {/* Teams */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <SkeletonBox width="28px" height="28px" rounded="rounded-full" />
            <SkeletonBox width="70px" height="14px" />
          </div>
          
          <SkeletonBox width="16px" height="12px" />
          
          <div className="flex items-center space-x-3 flex-1 min-w-0 justify-end">
            <SkeletonBox width="70px" height="14px" />
            <SkeletonBox width="28px" height="28px" rounded="rounded-full" />
          </div>
        </div>

        {/* Prediction */}
        {showPrediction && (
          <div className="mb-3 p-2 bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-1">
              <SkeletonBox width="60px" height="12px" />
              <SkeletonBox width="40px" height="12px" />
            </div>
            <SkeletonBox width="80px" height="14px" />
          </div>
        )}

        {/* Actions */}
        {showCalendarActions && (
          <div className="flex items-center space-x-2">
            <SkeletonBox width="110px" height="32px" rounded="rounded-lg" />
            <SkeletonBox width="32px" height="32px" rounded="rounded-lg" />
          </div>
        )}
      </div>
    </div>
  );
};

export default FixtureCardSkeleton;
