import React from 'react';
import { TeamForm } from '../types';
import { formatFormString, getFormColor, getTrendIcon, getTrendColor } from '../services/formAnalysisService';

interface FormTrendIndicatorProps {
  form: TeamForm;
  showLast?: number;
  showTrend?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const FormTrendIndicator: React.FC<FormTrendIndicatorProps> = ({
  form,
  showLast = 5,
  showTrend = true,
  size = 'md',
  className = ''
}) => {
  const recentResults = form.last10Results.slice(0, showLast);
  
  const sizeClasses = {
    sm: 'w-5 h-5 text-xs',
    md: 'w-6 h-6 text-sm',
    lg: 'w-8 h-8 text-base'
  };
  
  const FormResult: React.FC<{ result: 'W' | 'D' | 'L' }> = ({ result }) => (
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
  
  return (
    <div className={`flex items-center space-x-1 ${className}`}>
      {/* Form Results */}
      <div className="flex space-x-0.5">
        {recentResults.map((result, index) => (
          <FormResult key={index} result={result} />
        ))}
      </div>
      
      {/* Trend Indicator */}
      {showTrend && (
        <div className="flex items-center space-x-1 ml-2">
          <span className={getTrendColor(form.formTrend === 'improving' ? 'up' : form.formTrend === 'declining' ? 'down' : 'stable')}>
            {getTrendIcon(form.formTrend === 'improving' ? 'up' : form.formTrend === 'declining' ? 'down' : 'stable')}
          </span>
        </div>
      )}
    </div>
  );
};

export default FormTrendIndicator;
