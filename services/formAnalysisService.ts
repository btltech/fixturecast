import { TeamForm, FormAnalysis } from '../types';

export const generateMockTeamForm = (teamId: number, teamName: string): TeamForm => {
  // Generate realistic form patterns
  const formPatterns = [
    ['W', 'W', 'D', 'L', 'W', 'W', 'D', 'W', 'L', 'W'], // Good form
    ['L', 'D', 'W', 'W', 'L', 'D', 'W', 'L', 'W', 'D'], // Inconsistent
    ['W', 'W', 'W', 'D', 'W', 'W', 'D', 'W', 'W', 'L'], // Excellent
    ['L', 'L', 'D', 'L', 'W', 'L', 'D', 'L', 'L', 'D'], // Poor
    ['D', 'W', 'L', 'W', 'D', 'W', 'L', 'W', 'D', 'W'], // Mixed
  ];
  
  const pattern = formPatterns[teamId % formPatterns.length];
  const last10Results = pattern as ('W' | 'D' | 'L')[];
  
  // Split into home/away (roughly 50/50 split)
  const homeForm = last10Results.filter((_, index) => index % 2 === 0).slice(0, 5);
  const awayForm = last10Results.filter((_, index) => index % 2 === 1).slice(0, 5);
  
  // Calculate stats
  const pointsLast10 = last10Results.reduce((points, result) => {
    return points + (result === 'W' ? 3 : result === 'D' ? 1 : 0);
  }, 0);
  
  // Generate realistic goal stats
  const goalsFor = Math.floor(Math.random() * 15) + 8; // 8-22 goals
  const goalsAgainst = Math.floor(Math.random() * 12) + 6; // 6-17 goals
  const cleanSheets = Math.floor(Math.random() * 4) + 1; // 1-4 clean sheets
  
  // Determine form trend
  const recent5 = last10Results.slice(0, 5);
  const older5 = last10Results.slice(5, 10);
  const recentPoints = recent5.reduce((p, r) => p + (r === 'W' ? 3 : r === 'D' ? 1 : 0), 0);
  const olderPoints = older5.reduce((p, r) => p + (r === 'W' ? 3 : r === 'D' ? 1 : 0), 0);
  
  let formTrend: 'improving' | 'declining' | 'stable' = 'stable';
  if (recentPoints > olderPoints + 2) formTrend = 'improving';
  else if (recentPoints < olderPoints - 2) formTrend = 'declining';
  
  return {
    teamId,
    teamName,
    last10Results,
    homeForm,
    awayForm,
    formTrend,
    pointsLast10,
    goalsFor,
    goalsAgainst,
    cleanSheets,
    lastUpdated: new Date().toISOString()
  };
};

export const analyzeFormTrend = (form: TeamForm): FormAnalysis['trend'] => {
  const results = form.last10Results;
  
  // Calculate trend strength
  let trendStrength = 0;
  let direction: 'up' | 'down' | 'stable' = 'stable';
  
  // Analyze last 5 vs previous 5
  const recent5 = results.slice(0, 5);
  const older5 = results.slice(5, 10);
  
  const recentPoints = recent5.reduce((p, r) => p + (r === 'W' ? 3 : r === 'D' ? 1 : 0), 0);
  const olderPoints = older5.reduce((p, r) => p + (r === 'W' ? 3 : r === 'D' ? 1 : 0), 0);
  
  const pointDiff = recentPoints - olderPoints;
  
  if (pointDiff > 3) {
    direction = 'up';
    trendStrength = Math.min(100, 50 + (pointDiff * 10));
  } else if (pointDiff < -3) {
    direction = 'down';
    trendStrength = Math.min(100, 50 + (Math.abs(pointDiff) * 10));
  } else {
    direction = 'stable';
    trendStrength = 30 + Math.abs(pointDiff) * 5;
  }
  
  // Generate description
  let description = '';
  if (direction === 'up') {
    if (trendStrength > 80) description = 'Excellent recent form';
    else if (trendStrength > 60) description = 'Strong upward trend';
    else description = 'Improving form';
  } else if (direction === 'down') {
    if (trendStrength > 80) description = 'Concerning decline';
    else if (trendStrength > 60) description = 'Poor recent form';
    else description = 'Slight decline';
  } else {
    description = 'Consistent form';
  }
  
  return {
    direction,
    strength: Math.round(trendStrength),
    description
  };
};

export const getFormAnalysis = (teamId: number, teamName: string): FormAnalysis => {
  const overall = generateMockTeamForm(teamId, teamName);
  const home = { ...overall, last10Results: overall.homeForm };
  const away = { ...overall, last10Results: overall.awayForm };
  const trend = analyzeFormTrend(overall);
  
  return {
    overall,
    home,
    away,
    trend
  };
};

export const formatFormString = (results: ('W' | 'D' | 'L')[]): string => {
  return results.join('-');
};

export const getFormColor = (result: 'W' | 'D' | 'L'): string => {
  switch (result) {
    case 'W': return 'text-green-400 bg-green-500/20';
    case 'D': return 'text-yellow-400 bg-yellow-500/20';
    case 'L': return 'text-red-400 bg-red-500/20';
  }
};

export const getTrendIcon = (direction: 'up' | 'down' | 'stable'): string => {
  switch (direction) {
    case 'up': return '📈';
    case 'down': return '📉';
    case 'stable': return '➡️';
  }
};

export const getTrendColor = (direction: 'up' | 'down' | 'stable'): string => {
  switch (direction) {
    case 'up': return 'text-green-400';
    case 'down': return 'text-red-400';
    case 'stable': return 'text-gray-400';
  }
};
