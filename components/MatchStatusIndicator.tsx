import React from 'react';
import { Match } from '../types';

// Additional status indicator component for more comprehensive status display
export const StatusIndicator: React.FC<{
  status: MatchStatus;
  size?: 'small' | 'medium' | 'large';
  variant?: 'badge' | 'dot' | 'card';
  showLabel?: boolean;
  className?: string;
}> = ({ status, size = 'medium', variant = 'badge', showLabel = true, className = '' }) => {
  const getStatusConfig = () => {
    const configs = {
      upcoming: {
        color: '#6B7280',
        bgColor: '#F3F4F6',
        borderColor: '#9CA3AF',
        textColor: '#374151',
        label: 'Upcoming',
        shortLabel: 'UPC',
        icon: '📅'
      },
      live: {
        color: '#10B981',
        bgColor: '#D1FAE5',
        borderColor: '#34D399',
        textColor: '#065F46',
        label: 'Live',
        shortLabel: 'LIVE',
        icon: '🔴',
        pulse: true
      },
      postponed: {
        color: '#F59E0B',
        bgColor: '#FEF3C7',
        borderColor: '#FCD34D',
        textColor: '#92400E',
        label: 'Postponed',
        shortLabel: 'PPD',
        icon: '⏰'
      },
      completed: {
        color: '#6B7280',
        bgColor: '#F3F4F6',
        borderColor: '#9CA3AF',
        textColor: '#374151',
        label: 'Completed',
        shortLabel: 'FT',
        icon: '✅'
      },
      cancelled: {
        color: '#EF4444',
        bgColor: '#FEE2E2',
        borderColor: '#F87171',
        textColor: '#991B1B',
        label: 'Cancelled',
        shortLabel: 'CXL',
        icon: '❌'
      },
      suspended: {
        color: '#F59E0B',
        bgColor: '#FEF3C7',
        borderColor: '#FCD34D',
        textColor: '#92400E',
        label: 'Suspended',
        shortLabel: 'SPD',
        icon: '⏸️'
      },
      abandoned: {
        color: '#6B7280',
        bgColor: '#F3F4F6',
        borderColor: '#9CA3AF',
        textColor: '#374151',
        label: 'Abandoned',
        shortLabel: 'ABD',
        icon: '🚫'
      }
    };
    return configs[status];
  };

  const config = getStatusConfig();
  const sizeClasses = {
    small: { container: 'w-2 h-2', text: 'text-xs' },
    medium: { container: 'w-3 h-3', text: 'text-sm' },
    large: { container: 'w-4 h-4', text: 'text-base' }
  };

  if (variant === 'dot') {
    return (
      <div
        className={`inline-block rounded-full ${sizeClasses[size].container} ${(config as any).pulse ? 'animate-pulse' : ''} ${className}`}
        style={{ backgroundColor: config.color }}
        title={config.label}
        aria-label={config.label}
      />
    );
  }

  if (variant === 'card') {
    return (
      <div
        className={`inline-flex items-center space-x-2 px-3 py-2 rounded-lg border ${(config as any).pulse ? 'animate-pulse' : ''} transition-all duration-200 hover:shadow-md ${className}`}
        style={{
          backgroundColor: config.bgColor,
          borderColor: config.borderColor,
          color: config.textColor
        }}
      >
        <span style={{ color: config.color }}>{config.icon}</span>
        {showLabel && (
          <span className={`font-semibold uppercase tracking-wide ${sizeClasses[size].text}`}>
            {config.label}
          </span>
        )}
      </div>
    );
  }

  // Default badge variant
  return (
    <div
      className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full border text-xs font-semibold uppercase tracking-wide ${(config as any).pulse ? 'animate-pulse' : ''} transition-all duration-200 hover:shadow-sm ${className}`}
      style={{
        backgroundColor: config.bgColor,
        borderColor: config.borderColor,
        color: config.textColor
      }}
      title={config.label}
      aria-label={config.label}
    >
      <span style={{ color: config.color }}>{config.icon}</span>
      {showLabel && <span>{config.shortLabel}</span>}
    </div>
  );
};

export type MatchStatus = 'upcoming' | 'live' | 'postponed' | 'completed' | 'cancelled' | 'suspended' | 'abandoned';

interface MatchStatusIndicatorProps {
  match: Match;
  size?: 'small' | 'medium' | 'large';
  showIcon?: boolean;
  showText?: boolean;
  className?: string;
  variant?: 'default' | 'minimal' | 'detailed';
}

const MatchStatusIndicator: React.FC<MatchStatusIndicatorProps> = ({
  match,
  size = 'medium',
  showIcon = true,
  showText = true,
  variant = 'default',
  className = ''
}) => {
  // Enhanced status definitions with better colors and SVG icons
  const getMatchStatus = (): {
    status: MatchStatus;
    color: string;
    bgColor: string;
    textColor: string;
    borderColor: string;
    icon: React.ReactElement;
    description: string;
    shortDescription: string;
    pulse?: boolean;
  } => {
    const now = new Date();
    const matchDate = new Date(match.date);
    const diffInHours = (matchDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    const diffInMinutes = (matchDate.getTime() - now.getTime()) / (1000 * 60);

    // Helper function to create SVG icons
    const createIcon = (path: string, className: string = "w-3 h-3") => (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={path} />
      </svg>
    );

    // Check for special statuses first
    if (match.status === 'postponed' || match.status === 'cancelled' || match.status === 'suspended' || match.status === 'abandoned') {
      const statusMap = {
        postponed: {
          status: 'postponed' as MatchStatus,
          color: '#F59E0B',
          bgColor: '#FEF3C7',
          textColor: '#92400E',
          borderColor: '#FCD34D',
          icon: createIcon("M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"),
          description: 'Match Postponed',
          shortDescription: 'Postponed'
        },
        cancelled: {
          status: 'cancelled' as MatchStatus,
          color: '#EF4444',
          bgColor: '#FEE2E2',
          textColor: '#991B1B',
          borderColor: '#F87171',
          icon: createIcon("M6 18L18 6M6 6l12 12"),
          description: 'Match Cancelled',
          shortDescription: 'Cancelled'
        },
        suspended: {
          status: 'suspended' as MatchStatus,
          color: '#F59E0B',
          bgColor: '#FEF3C7',
          textColor: '#92400E',
          borderColor: '#FCD34D',
          icon: createIcon("M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"),
          description: 'Match Suspended',
          shortDescription: 'Suspended'
        },
        abandoned: {
          status: 'abandoned' as MatchStatus,
          color: '#6B7280',
          bgColor: '#F3F4F6',
          textColor: '#374151',
          borderColor: '#9CA3AF',
          icon: createIcon("M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"),
          description: 'Match Abandoned',
          shortDescription: 'Abandoned'
        }
      };
      return statusMap[match.status as keyof typeof statusMap] || statusMap.postponed;
    }

    // Check if match is completed
    if (match.status === 'finished' || match.status === 'completed' || diffInHours < -2) {
      return {
        status: 'completed',
        color: '#6B7280',
        bgColor: '#F3F4F6',
        textColor: '#374151',
        borderColor: '#9CA3AF',
        icon: createIcon("M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"),
        description: 'Match Completed',
        shortDescription: 'FT'
      };
    }

    // Check if match is live (within 2 hours of start time and not finished)
    if (diffInHours >= -2 && diffInHours <= 0) {
      return {
        status: 'live',
        color: '#10B981',
        bgColor: '#D1FAE5',
        textColor: '#065F46',
        borderColor: '#34D399',
        icon: createIcon("M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"),
        description: 'Live Match',
        shortDescription: 'LIVE',
        pulse: true
      };
    }

    // Check if match is starting soon (within 2 hours)
    if (diffInHours > 0 && diffInHours <= 2) {
      return {
        status: 'upcoming',
        color: '#3B82F6',
        bgColor: '#DBEAFE',
        textColor: '#1E40AF',
        borderColor: '#60A5FA',
        icon: createIcon("M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"),
        description: 'Starting Soon',
        shortDescription: 'Soon'
      };
    }

    // Default to upcoming
    return {
      status: 'upcoming',
      color: '#6B7280',
      bgColor: '#F3F4F6',
      textColor: '#374151',
      borderColor: '#9CA3AF',
      icon: createIcon("M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"),
      description: 'Upcoming Match',
      shortDescription: 'Upcoming'
    };
  };

  const statusInfo = getMatchStatus();

  // Enhanced size variants with better spacing
  const sizeClasses = {
    small: {
      container: 'px-2 py-0.5 text-xs',
      icon: 'w-3 h-3',
      text: 'text-xs font-semibold',
      gap: 'space-x-1'
    },
    medium: {
      container: 'px-3 py-1 text-sm',
      icon: 'w-4 h-4',
      text: 'text-sm font-semibold',
      gap: 'space-x-1.5'
    },
    large: {
      container: 'px-4 py-1.5 text-base',
      icon: 'w-5 h-5',
      text: 'text-base font-bold',
      gap: 'space-x-2'
    }
  };

  const currentSize = sizeClasses[size];

  // Variant-specific styling
  const getVariantClasses = () => {
    switch (variant) {
      case 'minimal':
        return 'shadow-sm';
      case 'detailed':
        return 'shadow-md border-2';
      default:
        return 'shadow-sm border';
    }
  };

  // Get display text based on variant
  const getDisplayText = () => {
    if (!showText) return null;
    return variant === 'minimal' ? statusInfo.shortDescription : statusInfo.description;
  };

  // Pulse animation for live matches
  const pulseClasses = (statusInfo as any).pulse ? 'animate-pulse' : '';

  return (
    <div
      className={`inline-flex items-center ${currentSize.gap} rounded-full ${currentSize.container} ${getVariantClasses()} ${pulseClasses} transition-all duration-200 hover:shadow-md ${className}`}
      style={{
        backgroundColor: statusInfo.bgColor,
        color: statusInfo.textColor,
        borderColor: statusInfo.borderColor
      }}
      title={`${statusInfo.description} - ${variant === 'detailed' ? 'Click for more details' : 'Match status indicator'}`}
      role="status"
      aria-label={statusInfo.description}
    >
      {showIcon && (
        <span
          className={`flex-shrink-0 ${statusInfo.pulse ? 'animate-pulse' : ''}`}
          style={{ color: statusInfo.color }}
        >
          {React.cloneElement(statusInfo.icon, { className: currentSize.icon })}
        </span>
      )}
      {getDisplayText() && (
        <span className={`${currentSize.text} flex-shrink-0 uppercase tracking-wide`}>
          {getDisplayText()}
        </span>
      )}
    </div>
  );
};

// Showcase component to demonstrate all status indicator variants
export const StatusIndicatorShowcase: React.FC = () => {
  const statuses: MatchStatus[] = ['upcoming', 'live', 'postponed', 'completed', 'cancelled', 'suspended', 'abandoned'];
  const variants: Array<'badge' | 'dot' | 'card'> = ['badge', 'dot', 'card'];

  return (
    <div className="p-6 space-y-6 bg-gray-50 dark:bg-gray-900 rounded-lg">
      <div className="text-center">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Match Status Indicators</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">Visual status indicators for quick scanning</p>
      </div>

      <div className="space-y-4">
        {variants.map(variant => (
          <div key={variant} className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 capitalize">
              {variant} Variant
            </h4>
            <div className="flex flex-wrap gap-3">
              {statuses.map(status => (
                <StatusIndicator
                  key={`${variant}-${status}`}
                  status={status}
                  variant={variant}
                  size="medium"
                  showLabel={true}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Usage Examples</h4>
        <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
          <p>• <strong>Badge:</strong> Compact status display with icon and text</p>
          <p>• <strong>Dot:</strong> Minimal indicator for space-constrained areas</p>
          <p>• <strong>Card:</strong> Prominent status display with full styling</p>
        </div>
      </div>
    </div>
  );
};

export default MatchStatusIndicator;
