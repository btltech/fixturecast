import React from 'react';

const MatchCardSkeleton: React.FC = () => {
  return (
    <div className="bg-gray-800 rounded-xl overflow-hidden shadow-lg border border-gray-700 flex flex-col animate-pulse">
      <div className="p-4 bg-gray-900/50">
        <div className="h-4 bg-gray-700 rounded w-1/2 mx-auto"></div>
        <div className="h-3 bg-gray-700 rounded w-1/3 mx-auto mt-2"></div>
      </div>
      <div className="p-5 flex items-center justify-around flex-grow">
        <div className="flex flex-col items-center justify-between space-y-2 w-1/3 h-full">
          <div className="w-16 h-16 bg-gray-700 rounded-full"></div>
          <div className="h-4 bg-gray-700 rounded w-full mt-2"></div>
          <div className="h-8 w-8 text-gray-600 mt-2"></div>
        </div>
        <div className="text-4xl font-bold text-gray-700">vs</div>
        <div className="flex flex-col items-center justify-between space-y-2 w-1/3 h-full">
          <div className="w-16 h-16 bg-gray-700 rounded-full"></div>
          <div className="h-4 bg-gray-700 rounded w-full mt-2"></div>
          <div className="h-8 w-8 text-gray-600 mt-2"></div>
        </div>
      </div>
      <div className="px-5 pb-4 mt-auto border-t border-gray-700/50 pt-3">
        <div className="h-4 bg-gray-700 rounded-full"></div>
      </div>
    </div>
  );
};

export default MatchCardSkeleton;
