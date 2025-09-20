import React from 'react';
import { Alert, AlertType } from '../types';
import { timeAgo } from '../utils/dateUtils';

const AlertIcons: React.FC<{type: AlertType}> = ({ type }) => {
    switch (type) {
        case AlertType.PredictionReady:
            return (
                <div className="bg-blue-500/20 text-blue-400 rounded-full h-10 w-10 flex items-center justify-center flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
            );
        case AlertType.InjuryNews:
             return (
                <div className="bg-yellow-500/20 text-yellow-400 rounded-full h-10 w-10 flex items-center justify-center flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>
            );
        default:
            return null;
    }
}

const AlertCard: React.FC<{ alert: Alert }> = ({ alert }) => {
    return (
        <div className={`flex items-start space-x-4 p-4 rounded-lg bg-gray-700/50 border-l-4 ${alert.type === AlertType.InjuryNews ? 'border-yellow-500' : 'border-blue-500'}`}>
            <AlertIcons type={alert.type} />
            <div className="flex-grow">
                <p className="font-semibold text-gray-200">{alert.message}</p>
                <p className="text-xs text-gray-400 mt-1">{timeAgo(alert.timestamp)}</p>
            </div>
        </div>
    );
};

export default AlertCard;