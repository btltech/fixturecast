import React, { useState } from 'react';

const DisclaimerBanner: React.FC = () => {
  const [isVisible, setIsVisible] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  // Don't render if user has dismissed it
  if (!isVisible) return null;

  return (
    <div className="bg-amber-50 border-l-4 border-amber-500 shadow-sm">
      <div className="px-4 py-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1">
            <div className="text-amber-600 mt-0.5 flex-shrink-0 text-lg">⚠️</div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-amber-800 flex items-center">
                  Important Disclaimer
                  <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="ml-2 text-amber-600 hover:text-amber-800 transition-colors"
                    aria-label={isExpanded ? "Collapse disclaimer" : "Expand disclaimer"}
                  >
                    <span className="text-sm">ℹ️</span>
                  </button>
                </h3>
                <button
                  onClick={() => setIsVisible(false)}
                  className="text-amber-600 hover:text-amber-800 transition-colors ml-4"
                  aria-label="Dismiss disclaimer"
                >
                  <span className="text-lg">×</span>
                </button>
              </div>
              
              {/* Collapsed version */}
              {!isExpanded && (
                <p className="text-sm text-amber-700 mt-1">
                  Predictions for entertainment only • Not gambling advice • 18+ only{' '}
                  <button
                    onClick={() => setIsExpanded(true)}
                    className="underline hover:no-underline font-medium"
                  >
                    Read more
                  </button>
                  {' | '}
                  <a 
                    href="/disclaimer" 
                    className="underline hover:no-underline font-medium"
                  >
                    Full disclaimer
                  </a>
                </p>
              )}
              
              {/* Expanded version */}
              {isExpanded && (
                <div className="text-sm text-amber-700 mt-2 space-y-2">
                  <p className="font-medium">
                    FixtureCast provides predictions based on statistical models and historical data. 
                    These predictions are not guarantees.
                  </p>
                  <p>
                    Football is inherently unpredictable. We do not encourage or endorse gambling. 
                    Use this app for entertainment and informational purposes only.
                  </p>
                  <p className="font-medium">
                    You must be 18+ to gamble. Always gamble responsibly if you choose to do so.
                  </p>
                  <p className="text-xs">
                    Need help? Visit <a href="/disclaimer" className="underline">our disclaimer page</a> for support resources
                  </p>
                  <button
                    onClick={() => setIsExpanded(false)}
                    className="underline hover:no-underline font-medium"
                  >
                    Show less
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DisclaimerBanner;