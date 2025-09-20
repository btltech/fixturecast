
import React from 'react';
import { Toast as ToastType } from '../types';

interface ToastProps {
  toast: ToastType;
}

const ICONS: { [key in ToastType['type']]: React.JSX.Element } = {
    success: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    ),
    info: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    ),
    warning: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
    ),
    error: (
         <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    )
};

const COLORS: { [key in ToastType['type']]: { bg: string; text: string; } } = {
    success: { bg: 'bg-green-500', text: 'text-green-100' },
    info: { bg: 'bg-blue-500', text: 'text-blue-100' },
    warning: { bg: 'bg-yellow-500', text: 'text-yellow-100' },
    error: { bg: 'bg-red-500', text: 'text-red-100' },
};

const Toast: React.FC<ToastProps> = ({ toast }) => {
    const { message, type } = toast;
    const color = COLORS[type];
    const icon = ICONS[type];

    return (
        <div className={`${color.bg} shadow-lg mx-auto max-w-sm rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden`}>
            <div className="p-4">
                <div className="flex items-start">
                    <div className="flex-shrink-0 text-white">
                        {icon}
                    </div>
                    <div className="ml-3 w-0 flex-1 pt-0.5">
                        <p className={`text-sm font-semibold text-white`}>{message}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Toast;
