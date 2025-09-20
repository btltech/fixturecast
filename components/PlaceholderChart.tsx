import React from 'react';

interface PlaceholderChartProps {
  title: string;
  description?: string;
  type?: 'accuracy' | 'confidence' | 'performance';
  className?: string;
}

const PlaceholderChart: React.FC<PlaceholderChartProps> = ({
  title,
  description,
  type = 'accuracy',
  className = ''
}) => {
  const getChartData = () => {
    switch (type) {
      case 'accuracy':
        return {
          icon: '🎯',
          sampleData: [
            { label: 'Match Outcome', value: 75, color: 'bg-blue-500' },
            { label: 'Exact Score', value: 45, color: 'bg-green-500' },
            { label: 'BTTS', value: 68, color: 'bg-yellow-500' },
            { label: 'Over/Under', value: 72, color: 'bg-purple-500' },
          ]
        };
      case 'confidence':
        return {
          icon: '🔮',
          sampleData: [
            { label: 'High Confidence', value: 85, color: 'bg-green-500' },
            { label: 'Medium Confidence', value: 70, color: 'bg-yellow-500' },
            { label: 'Low Confidence', value: 55, color: 'bg-red-500' },
          ]
        };
      case 'performance':
        return {
          icon: '📊',
          sampleData: [
            { label: 'Last 7 Days', value: 78, color: 'bg-blue-500' },
            { label: 'Last 30 Days', value: 73, color: 'bg-green-500' },
            { label: 'All Time', value: 70, color: 'bg-purple-500' },
          ]
        };
      default:
        return { icon: '📈', sampleData: [] };
    }
  };

  const { icon, sampleData } = getChartData();

  return (
    <div className={`bg-gray-800 rounded-lg p-6 border border-gray-700 ${className}`}>
      <div className="text-center mb-6">
        <div className="text-4xl mb-3">{icon}</div>
        <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
        {description && (
          <p className="text-gray-400 text-sm">{description}</p>
        )}
      </div>

      {/* Sample Chart */}
      <div className="space-y-4">
        {sampleData.map((item, index) => (
          <div key={index} className="flex items-center justify-between">
            <span className="text-sm text-gray-300 flex-1">{item.label}</span>
            <div className="flex items-center space-x-3 flex-1">
              <div className="w-full bg-gray-700 rounded-full h-2 relative overflow-hidden">
                <div 
                  className={`h-full ${item.color} rounded-full transition-all duration-1000 ease-out opacity-60`}
                  style={{width: item.value + '%'}}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse" />
              </div>
              <span className="text-sm font-semibold text-gray-300 w-12 text-right">
                {item.value}%
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-6 pt-4 border-t border-gray-700">
        <div className="flex items-center justify-center space-x-2 text-sm text-gray-400">
          <span>✨</span>
          <span>Live data will appear after first predictions</span>
          <span>✨</span>
        </div>
      </div>
    </div>
  );
};

export default PlaceholderChart;
