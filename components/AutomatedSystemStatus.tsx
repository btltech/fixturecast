import React from 'react';

interface AutomatedSystemStatusProps {
  className?: string;
}

export const AutomatedSystemStatus: React.FC<AutomatedSystemStatusProps> = ({ 
  className = "" 
}) => {
  return (
    <div className={`bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-500/20 rounded-lg p-4 ${className}`}>
      <div className="flex items-center space-x-3">
        <div className="flex-shrink-0">
          <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-medium text-green-400">Automated System Active</h3>
          <p className="text-xs text-gray-300 mt-1">
            Predictions and match data are automatically updated every 6 hours by our backend systems.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AutomatedSystemStatus;