
import React from 'react';

interface ProbabilityBarProps {
  home?: number;
  draw?: number;
  away?: number;
  homeWin?: number;
  awayWin?: number;
  homeTeam?: string;
  awayTeam?: string;
  prediction?: any;
}

const ProbabilityBar: React.FC<ProbabilityBarProps> = ({ 
  home, 
  draw, 
  away, 
  homeWin, 
  awayWin, 
  homeTeam, 
  awayTeam, 
  prediction 
}) => {
  // Use provided values or extract from prediction
  const homePercent = home ?? homeWin ?? prediction?.homeWinProbability ?? 0;
  const drawPercent = draw ?? prediction?.drawProbability ?? 0;
  const awayPercent = away ?? awayWin ?? prediction?.awayWinProbability ?? 0;
  return (
    <div className="flex w-full h-4 bg-gray-700 rounded-full overflow-hidden">
      <div
        className="bg-green-500 transition-all duration-500"
        style={{ width: `${homePercent}%` }}
        title={`Home Win: ${homePercent}%`}
      ></div>
      <div
        className="bg-yellow-500 transition-all duration-500"
        style={{ width: `${drawPercent}%` }}
        title={`Draw: ${drawPercent}%`}
      ></div>
      <div
        className="bg-red-500 transition-all duration-500"
        style={{ width: `${awayPercent}%` }}
        title={`Away Win: ${awayPercent}%`}
      ></div>
    </div>
  );
};

export default ProbabilityBar;
