
import React from 'react';
import { ConfidenceLevel } from '../types';

interface ConfidenceMeterProps {
  level: ConfidenceLevel;
}

const ConfidenceMeter: React.FC<ConfidenceMeterProps> = ({ level }) => {
  const levels = [ConfidenceLevel.Low, ConfidenceLevel.Medium, ConfidenceLevel.High];
  const levelIndex = levels.indexOf(level);
  
  const levelColors: { [key in ConfidenceLevel]: string } = {
    [ConfidenceLevel.Low]: 'bg-red-500',
    [ConfidenceLevel.Medium]: 'bg-yellow-500',
    [ConfidenceLevel.High]: 'bg-green-500',
  };

  return (
    <div>
        <div className="flex justify-between items-center w-full">
            {levels.map((l, index) => (
                <div key={l} className="flex-1 text-center">
                    <div className={`h-2.5 mx-1 rounded-full ${index <= levelIndex ? levelColors[l] : 'bg-gray-600'}`}></div>
                    <span className={`text-xs mt-2 font-medium ${index <= levelIndex ? 'text-white' : 'text-gray-500'}`}>{l}</span>
                </div>
            ))}
        </div>
    </div>
  );
};

export default ConfidenceMeter;
