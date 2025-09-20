import React from 'react';
import { KeyFactor } from '../types';

interface KeyFactorsVisualizerProps {
  factors: KeyFactor[];
}

// Icon components defined within the file for simplicity
const IconInjury = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const IconTrendingUp = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
);

const IconTrendingDown = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
    </svg>
);

const IconFatigue = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.071 14.929a1 1 0 01-1.414 0l-2.828-2.828a1 1 0 010-1.414l2.828-2.828a1 1 0 111.414 1.414L17.414 12l1.657 1.657a1 1 0 010 1.414zm-6 0a1 1 0 01-1.414 0l-2.828-2.828a1 1 0 010-1.414l2.828-2.828a1 1 0 111.414 1.414L11.414 12l1.657 1.657a1 1 0 010 1.414zm-6 0a1 1 0 01-1.414 0l-2.828-2.828a1 1 0 010-1.414l2.828-2.828a1 1 0 111.414 1.414L5.414 12l1.657 1.657a1 1 0 010 1.414z" />
  </svg>
);

const IconStats = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const IconDefault = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);


const factorMappings = [
  { keywords: ['injury', 'injured', 'absence', 'unavailable', 'questionable'], icon: <IconInjury />, color: 'text-yellow-400' },
  { keywords: ['good form', 'winning streak', 'unbeaten', 'high xg', 'strong'], icon: <IconTrendingUp />, color: 'text-green-400' },
  { keywords: ['poor form', 'losing streak', 'struggling'], icon: <IconTrendingDown />, color: 'text-red-400' },
  { keywords: ['fatigue', 'tired', 'congestion', 'short rest'], icon: <IconFatigue />, color: 'text-orange-400' },
  { keywords: ['xg', 'expected goals', 'statistical', 'goals scored', 'head-to-head', 'h2h'], icon: <IconStats />, color: 'text-blue-400' },
];

const getVisualForFactor = (text: string) => {
  const lowerText = text.toLowerCase();
  for (const mapping of factorMappings) {
    if (mapping.keywords.some(keyword => lowerText.includes(keyword))) {
      return { icon: mapping.icon, color: mapping.color };
    }
  }
  return { icon: <IconDefault />, color: 'text-gray-400' };
};

const KeyFactorsVisualizer: React.FC<KeyFactorsVisualizerProps> = ({ factors }) => {
  return (
    <div className="space-y-4">
      {factors.map((factorGroup, index) => (
        <div key={index} className="bg-gray-800/60 p-4 rounded-lg">
          <h4 className="font-semibold text-gray-200 mb-3 border-b border-gray-700 pb-2">{factorGroup.category}</h4>
          <div className="space-y-3">
            {factorGroup.points.map((point, pIndex) => {
              const { icon, color } = getVisualForFactor(point);
              return (
                <div key={pIndex} className="flex items-start space-x-3">
                  <div className={`flex-shrink-0 ${color}`}>
                    {icon}
                  </div>
                  <p className="text-gray-300 text-sm">{point}</p>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default KeyFactorsVisualizer;