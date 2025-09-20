import React, { useState } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { getHomeTeamName, getAwayTeamName, getMatchLeagueName } from '../utils/matchUtils';

const AccuracyTestPanel: React.FC = () => {
  const { fixtures, recordPredictionAccuracy, getAccuracyDisplay } = useAppContext();
  const [selectedMatchId, setSelectedMatchId] = useState<string>('');
  const [homeScore, setHomeScore] = useState<number>(0);
  const [awayScore, setAwayScore] = useState<number>(0);

  const handleRecordResult = () => {
    if (!selectedMatchId) return;
    
    recordPredictionAccuracy(selectedMatchId, { homeScore, awayScore });
    
    // Reset form
    setHomeScore(0);
    setAwayScore(0);
    setSelectedMatchId('');
  };

  const upcomingMatches = fixtures.filter(match => new Date(match.date) > new Date());

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h3 className="text-lg font-semibold text-blue-400 mb-4">Test Accuracy Tracking</h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm text-gray-300 mb-2">Select Match:</label>
          <select 
            value={selectedMatchId} 
            onChange={(e) => setSelectedMatchId(e.target.value)}
            className="w-full p-2 bg-gray-700 text-white rounded border border-gray-600"
            title="Select a match to record results for"
          >
            <option value="">Choose a match...</option>
            {upcomingMatches.slice(0, 5).map(match => (
              <option key={match.id} value={match.id}>
                {getHomeTeamName(match)} vs {getAwayTeamName(match)} ({getMatchLeagueName(match)})
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-300 mb-2">Home Score:</label>
            <input 
              type="number" 
              min="0" 
              max="10"
              value={homeScore} 
              onChange={(e) => setHomeScore(parseInt(e.target.value) || 0)}
              className="w-full p-2 bg-gray-700 text-white rounded border border-gray-600"
              placeholder="0"
              title="Enter home team score"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-2">Away Score:</label>
            <input 
              type="number" 
              min="0" 
              max="10"
              value={awayScore} 
              onChange={(e) => setAwayScore(parseInt(e.target.value) || 0)}
              className="w-full p-2 bg-gray-700 text-white rounded border border-gray-600"
              placeholder="0"
              title="Enter away team score"
            />
          </div>
        </div>

        <button 
          onClick={handleRecordResult}
          disabled={!selectedMatchId}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-semibold py-2 px-4 rounded transition-colors"
        >
          Record Result
        </button>

        <div className="text-center text-sm text-gray-400">
          Current Accuracy: {getAccuracyDisplay()}
        </div>
      </div>
    </div>
  );
};

export default AccuracyTestPanel;
