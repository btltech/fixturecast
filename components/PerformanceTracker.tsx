import React, { useMemo } from 'react';
import { PastPrediction } from '../types';
import PlaceholderChart from './PlaceholderChart';

const isPredictionCorrect = (p: PastPrediction): boolean => {
    const { prediction, actualResult } = p;
    const { homeScore, awayScore } = actualResult;

    let actualOutcome: 'home' | 'draw' | 'away';
    if (homeScore > awayScore) {
        actualOutcome = 'home';
    } else if (awayScore > homeScore) {
        actualOutcome = 'away';
    } else {
        actualOutcome = 'draw';
    }

    const probs = [
        { outcome: 'home' as const, value: prediction.homeWinProbability },
        { outcome: 'draw' as const, value: prediction.drawProbability },
        { outcome: 'away' as const, value: prediction.awayWinProbability },
    ];
    
    const predictedOutcome = probs.reduce((max, current) => (current.value > max.value ? current : max), probs[0]).outcome;
    
    return actualOutcome === predictedOutcome;
};

interface StatCardProps {
    title: string;
    correct: number;
    total: number;
}

const StatCard: React.FC<StatCardProps> = ({ title, correct, total }) => {
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
    
    return (
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 text-center shadow-lg">
            <h3 className="text-lg font-semibold text-blue-400 mb-2">{title}</h3>
            {total > 0 ? (
                <>
                    <p className="text-5xl font-bold text-white">{accuracy}%</p>
                    <p className="text-sm text-gray-400 mt-1">{correct} / {total} Correct</p>
                </>
            ) : (
                <p className="text-gray-500 py-8">No prediction data available for this period.</p>
            )}
        </div>
    )
}

const PerformanceTracker: React.FC<{ predictions: PastPrediction[] }> = ({ predictions }) => {
    
    // Show placeholder if no predictions available
    if (!predictions || predictions.length === 0) {
        return (
            <PlaceholderChart 
                title="📊 Performance Tracker"
                description="Track prediction accuracy over different time periods. Performance data will appear after your first predictions are verified."
                type="performance"
            />
        );
    }

    const calculateStats = (days: number) => {
        const now = new Date();
        const cutoffDate = new Date();
        cutoffDate.setDate(now.getDate() - days);

        const relevantPredictions = predictions.filter(p => new Date(p.date) >= cutoffDate);
        const correctCount = relevantPredictions.filter(isPredictionCorrect).length;
        
        return {
            correct: correctCount,
            total: relevantPredictions.length
        };
    };

    const lastWeekStats = useMemo(() => calculateStats(7), [predictions]);
    const lastMonthStats = useMemo(() => calculateStats(30), [predictions]);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <StatCard 
                title="Last 7 Days Accuracy" 
                correct={lastWeekStats.correct} 
                total={lastWeekStats.total} 
            />
            <StatCard 
                title="Last 30 Days Accuracy" 
                correct={lastMonthStats.correct} 
                total={lastMonthStats.total} 
            />
        </div>
    );
};

export default PerformanceTracker;