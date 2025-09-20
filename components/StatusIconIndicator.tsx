import React from 'react';
import { Match } from '../types';

interface StatusIconIndicatorProps {
  match: Match;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

const StatusIconIndicator: React.FC<StatusIconIndicatorProps> = ({
  match,
  size = 'medium',
  className = ''
}) => {
  // Get match status and determine icon
  const getStatusInfo = () => {
    const now = new Date();
    const matchDate = new Date(match.date);
    const diffInHours = (matchDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    // Check for special statuses
    if (match.status === 'postponed') {
      return {
        icon: '⏰',
        color: '#F59E0B',
        bgColor: '#FEF3C7',
        textColor: '#92400E',
        description: 'Postponed'
      };
    }

    if (match.status === 'cancelled') {
      return {
        icon: '❌',
        color: '#EF4444',
        bgColor: '#FEE2E2',
        textColor: '#991B1B',
        description: 'Cancelled'
      };
    }

    if (match.status === 'suspended') {
      return {
        icon: '⏸️',
        color: '#F59E0B',
        bgColor: '#FEF3C7',
        textColor: '#92400E',
        description: 'Suspended'
      };
    }

    if (match.status === 'abandoned') {
      return {
        icon: '🚫',
        color: '#6B7280',
        bgColor: '#F3F4F6',
        textColor: '#374151',
        description: 'Abandoned'
      };
    }

    // Check if match is completed
    if (match.status === 'finished' || match.status === 'completed' || diffInHours < -2) {
      return {
        icon: '✅',
        color: '#6B7280',
        bgColor: '#F3F4F6',
        textColor: '#374151',
        description: 'Completed'
      };
    }

    // Check if match is live
    if (diffInHours >= -2 && diffInHours <= 0) {
      return {
        icon: '🔴',
        color: '#10B981',
        bgColor: '#D1FAE5',
        textColor: '#065F46',
        description: 'Live'
      };
    }

    // Check if match is starting soon
    if (diffInHours > 0 && diffInHours <= 2) {
      return {
        icon: '⏰',
        color: '#3B82F6',
        bgColor: '#DBEAFE',
        textColor: '#1E40AF',
        description: 'Starting Soon'
      };
    }

    // Default to upcoming
    return {
      icon: '📅',
      color: '#6B7280',
      bgColor: '#F3F4F6',
      textColor: '#374151',
      description: 'Upcoming'
    };
  };

  const statusInfo = getStatusInfo();

  // Size variants
  const sizeClasses = {
    small: {
      container: 'w-6 h-6',
      icon: 'text-xs'
    },
    medium: {
      container: 'w-8 h-8',
      icon: 'text-sm'
    },
    large: {
      container: 'w-10 h-10',
      icon: 'text-base'
    }
  };

  const currentSize = sizeClasses[size];

  return (
    <div
      className={`${currentSize.container} rounded-full flex items-center justify-center ${className}`}
      style={{
        backgroundColor: statusInfo.bgColor,
        border: `2px solid ${statusInfo.color}`
      }}
      title={statusInfo.description}
    >
      <span className={`${currentSize.icon}`}>
        {statusInfo.icon}
      </span>
    </div>
  );
};

export default StatusIconIndicator;
