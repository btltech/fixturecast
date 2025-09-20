import React from 'react';
import { Match } from '../types';
import TeamLogo from './TeamLogo';
import ProbabilityBar from './ProbabilityBar';
import ConfidenceIndicator from './ConfidenceIndicator';
import FormTrendIndicator from './FormTrendIndicator';
import { useAppContext } from '../contexts/AppContext';

interface MatchCardProps {
  match: Match;
  onSelectMatch: (match: Match) => void;
  onSelectTeam: (teamName: string) => void;
  compact?: boolean;
}

const MatchCard: React.FC<MatchCardProps> = ({ match, onSelectMatch, onSelectTeam, compact = false }) => {
  const { favoriteTeams, toggleFavoriteTeam, getPrediction, teams, accuracyStats, getTeamForm } = useAppContext();
  const { homeTeam, awayTeam, league, date } = match;
  
  const prediction = getPrediction(match.id);
  
  // Get team form data
  const homeTeamForm = getTeamForm(1, homeTeam); // Using mock team ID
  const awayTeamForm = getTeamForm(2, awayTeam); // Using mock team ID

  const matchDate = new Date(date);
  const dateString = matchDate.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  const timeString = matchDate.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const isFavorite = (teamName: string) => favoriteTeams.includes(teamName);

  const handleFavoriteClick = (e: React.MouseEvent, teamName: string) => {
    e.stopPropagation(); // Prevent card click when favoriting
    toggleFavoriteTeam(teamName);
  };

  const homeTeamColor = teams[homeTeam]?.jerseyColors.primary || 'transparent';
  const awayTeamColor = teams[awayTeam]?.jerseyColors.primary || 'transparent';

  const renderPredictionBar = () => {
    if (prediction) {
      return (
        <ProbabilityBar
            home={prediction.homeWinProbability}
            draw={prediction.drawProbability}
            away={prediction.awayWinProbability}
        />
      );
    }
    // Render an empty div to maintain layout consistency if no prediction
    return <div className="h-4"></div>;
  };

  const renderPredictionSummary = () => {
    if (!prediction) return null;
    
    const predictions = [];
    
    if (prediction.btts) {
      predictions.push(`BTTS: ${prediction.btts.yesProbability}%`);
    }
    
    if (prediction.scoreRange) {
      const topRange = Math.max(prediction.scoreRange.zeroToOne, prediction.scoreRange.twoToThree, prediction.scoreRange.fourPlus);
      let rangeText = '';
      if (topRange === prediction.scoreRange.zeroToOne) rangeText = '0-1';
      else if (topRange === prediction.scoreRange.twoToThree) rangeText = '2-3';
      else rangeText = '4+';
      predictions.push(`Goals: ${rangeText} (${topRange}%)`);
    }
    
    if (prediction.corners) {
      const cornerChoice = prediction.corners.over > prediction.corners.under ? 'Over' : 'Under';
      predictions.push(`Corners: ${cornerChoice} (${Math.max(prediction.corners.over, prediction.corners.under)}%)`);
    }
    
    if (predictions.length === 0) return null;
    
    return (
      <div className="mt-2 text-xs text-gray-300 text-center">
        {predictions.join(' · ')}
      </div>
    );
  };

  return (
    <div
      onClick={() => onSelectMatch(match)}
      className="bg-gray-800 rounded-xl overflow-hidden shadow-lg hover:shadow-blue-500/20 border border-gray-700 hover:border-blue-600 transition-all duration-300 transform hover:-translate-y-1 cursor-pointer flex flex-col"
    >
      <div className="p-3 sm:p-4 bg-gray-900/50">
        <p className="text-xs sm:text-sm font-semibold text-blue-400 text-center">{league}</p>
        <p className="text-xs text-gray-400 text-center">{dateString} - {timeString}</p>
      </div>
      <div className="p-3 sm:p-5 flex items-center justify-around flex-grow">
        <div className="flex flex-col items-center justify-between space-y-2 w-1/3 h-full">
          <TeamLogo teamName={homeTeam} size="medium" showJerseyColors={true} clickable={true} onClick={() => onSelectTeam(homeTeam)} />
          <h3 
            className="text-xs sm:text-sm font-bold text-center text-white pt-2 w-full cursor-pointer hover:text-blue-400 transition-colors duration-200"
            style={{ borderTop: `2px solid ${homeTeamColor}`}} // eslint-disable-line react/forbid-dom-props
            onClick={() => onSelectTeam(homeTeam)}
          >
            {homeTeam}
          </h3>
          <div className="mt-1">
            <FormTrendIndicator 
              form={homeTeamForm.overall} 
              showLast={5} 
              showTrend={true} 
              size="sm" 
            />
          </div>
          <button
            onClick={(e) => handleFavoriteClick(e, homeTeam)}
            className={`text-2xl transition-colors ${isFavorite(homeTeam) ? 'text-yellow-400' : 'text-gray-600 hover:text-yellow-300'}`}
            title={`Favorite ${homeTeam}`}
          >
            ★
          </button>
        </div>
        <div className="text-4xl font-bold text-gray-400">vs</div>
        <div className="flex flex-col items-center justify-between space-y-2 w-1/3 h-full">
          <TeamLogo teamName={awayTeam} size="medium" showJerseyColors={true} clickable={true} onClick={() => onSelectTeam(awayTeam)} />
          <h3 
            className="text-sm font-bold text-center text-white pt-2 w-full cursor-pointer hover:text-blue-400 transition-colors duration-200"
            style={{ borderTop: `2px solid ${awayTeamColor}`}} // eslint-disable-line react/forbid-dom-props
            onClick={() => onSelectTeam(awayTeam)}
          >
            {awayTeam}
          </h3>
          <div className="mt-1">
            <FormTrendIndicator 
              form={awayTeamForm.overall} 
              showLast={5} 
              showTrend={true} 
              size="sm" 
            />
          </div>
          <button
            onClick={(e) => handleFavoriteClick(e, awayTeam)}
            className={`text-2xl transition-colors ${isFavorite(awayTeam) ? 'text-yellow-400' : 'text-gray-600 hover:text-yellow-300'}`}
            title={`Favorite ${awayTeam}`}
          >
            ★
          </button>
        </div>
      </div>
      <div className="px-5 pb-4 mt-auto border-t border-gray-700/50 pt-3">
        {renderPredictionBar()}
        {renderPredictionSummary()}
        {prediction && (
          <div className="mt-3 flex justify-center">
            <ConfidenceIndicator
              prediction={prediction}
              accuracyStats={accuracyStats}
              matchContext={{
                league: league,
                hasRecentForm: true,
                hasHeadToHead: true
              }}
              size="small"
              showPercentage={true}
              showTooltip={true}
            />
          </div>
        )}
      </div>
      
      {/* Navigation handled via onSelectTeam; modal removed */}
    </div>
  );
};

export default MatchCard;
