import React from 'react';
import { TeamForm, FormAnalysis } from '../types';
import { formatFormString, getFormColor, getTrendIcon, getTrendColor } from '../services/formAnalysisService';

interface TeamFormChartProps {
  formAnalysis: FormAnalysis;
  showHomeAway?: boolean;
  compact?: boolean;
  className?: string;
  teamName?: string;
}

const TeamFormChart: React.FC<TeamFormChartProps> = ({
  formAnalysis,
  showHomeAway = true,
  compact = false,
  className = '',
  teamName
}) => {
  const { overall, home, away, trend } = formAnalysis;
  
  const FormResult: React.FC<{ result: 'W' | 'D' | 'L'; size?: 'sm' | 'md' | 'lg' }> = ({ result, size = 'md' }) => {
    const sizeClasses = {
      sm: 'w-6 h-6 text-xs',
      md: 'w-8 h-8 text-sm',
      lg: 'w-10 h-10 text-base'
    };
    
    return (
      <div className={`
        ${sizeClasses[size]} 
        ${getFormColor(result)} 
        rounded-full 
        flex items-center justify-center 
        font-bold 
        border border-current/30
      `}>
        {result}
      </div>
    );
  };
  
  const FormRow: React.FC<{ 
    title: string; 
    results: ('W' | 'D' | 'L')[]; 
    points?: number;
    showPoints?: boolean;
  }> = ({ title, results, points, showPoints = true }) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-300">{title}</h4>
        {showPoints && points !== undefined && (
          <span className="text-xs text-gray-400">{points} pts</span>
        )}
      </div>
      <div className="flex space-x-1">
        {results.map((result, index) => (
          <FormResult key={index} result={result} size={compact ? 'sm' : 'md'} />
        ))}
      </div>
      <div className="text-xs text-gray-500 font-mono">
        {formatFormString(results)}
      </div>
    </div>
  );
  
  if (compact) {
    return (
      <div className={`bg-gray-800 rounded-lg p-3 ${className}`}>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-blue-400">Form</h3>
          <div className="flex items-center space-x-1">
            <span className={getTrendColor(trend.direction)}>
              {getTrendIcon(trend.direction)}
            </span>
            <span className={`text-xs ${getTrendColor(trend.direction)}`}>
              {trend.strength}%
            </span>
          </div>
        </div>
        
        <div className="flex space-x-1 mb-2">
          {overall.last10Results.slice(0, 5).map((result, index) => (
            <FormResult key={index} result={result} size="sm" />
          ))}
        </div>
        
        <div className="text-xs text-gray-500 font-mono">
          {formatFormString(overall.last10Results.slice(0, 5))}
        </div>
      </div>
    );
  }
  
  return (
    <div className={`bg-gray-800 rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-blue-400">Team Form Analysis</h3>
        <div className="flex items-center space-x-2">
          <span className={getTrendColor(trend.direction)}>
            {getTrendIcon(trend.direction)}
          </span>
          <div className="text-right">
            <div className={`text-sm font-semibold ${getTrendColor(trend.direction)}`}>
              {trend.description}
            </div>
            <div className="text-xs text-gray-400">
              {trend.strength}% trend strength
            </div>
          </div>
        </div>
      </div>
      
      <div className="space-y-4">
        {/* Overall Form */}
        <FormRow 
          title="Last 10 Games" 
          results={overall.last10Results} 
          points={overall.pointsLast10}
        />
        
        {showHomeAway && (
          <>
            {/* Home Form */}
            <FormRow 
              title="Home Form" 
              results={home.last10Results} 
              points={home.pointsLast10}
            />
            
            {/* Away Form */}
            <FormRow 
              title="Away Form" 
              results={away.last10Results} 
              points={away.pointsLast10}
            />
          </>
        )}
      </div>
      
      {/* Additional Stats */}
      <div className="mt-4 pt-3 border-t border-gray-700">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-400">Goals:</span>
            <span className="text-white ml-2">{overall.goalsFor}-{overall.goalsAgainst}</span>
          </div>
          <div>
            <span className="text-gray-400">Clean Sheets:</span>
            <span className="text-white ml-2">{overall.cleanSheets}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamFormChart;
