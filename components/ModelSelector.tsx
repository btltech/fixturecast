import React, { useState, useEffect } from 'react';
import { unifiedPredictionService, PredictionModel } from '../services/unifiedPredictionService';
import { getRateLimitStatus } from '../services/rateLimitService';

interface ModelSelectorProps {
  selectedModel: PredictionModel;
  onModelChange: (model: PredictionModel) => void;
  className?: string;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({ 
  selectedModel, 
  onModelChange, 
  className = '' 
}) => {
  const [availableModels, setAvailableModels] = useState({ gemini: false, deepseek: false });
  const [rateLimits, setRateLimits] = useState<Record<string, any>>({});

  useEffect(() => {
    const updateStatus = () => {
      const models = unifiedPredictionService.getAvailableModels();
      setAvailableModels(models);
      
      // Get rate limit status
      const geminiStatus = getRateLimitStatus('gemini');
      const deepseekStatus = getRateLimitStatus('deepseek');
      setRateLimits({ gemini: geminiStatus, deepseek: deepseekStatus });
    };

    updateStatus();
    const interval = setInterval(updateStatus, 10000); // Update every 10s

    return () => clearInterval(interval);
  }, []);

  const modelOptions = [
    { 
      value: 'gemini' as PredictionModel, 
      label: 'Gemini 2.5 Flash', 
      description: 'Fast & reliable',
      icon: '🔮',
      available: availableModels.gemini && rateLimits.gemini?.canMakeRequest !== false,
      speed: 'Fast (15s)',
      quality: 'High',
      rateLimit: rateLimits.gemini
    },
    { 
      value: 'deepseek' as PredictionModel, 
      label: 'DeepSeek V3.1', 
      description: 'Detailed analysis',
      icon: '🤖',
      available: availableModels.deepseek && rateLimits.deepseek?.canMakeRequest !== false,
      speed: 'Slow (3min)',
      quality: 'High',
      rateLimit: rateLimits.deepseek
    },
    { 
      value: 'both' as PredictionModel, 
      label: 'Both Models', 
      description: 'Compare results',
      icon: '⚖️',
      available: availableModels.gemini && availableModels.deepseek && 
                 rateLimits.gemini?.canMakeRequest !== false && 
                 rateLimits.deepseek?.canMakeRequest !== false,
      speed: 'Slow (3min)',
      quality: 'Comparison',
      rateLimit: null
    }
  ];

  return (
    <div className={`bg-gray-800 rounded-lg p-4 ${className}`}>
      <h3 className="text-lg font-bold text-white mb-3">🤖 AI Model Selection</h3>
      
      <div className="space-y-2">
        {modelOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => option.available && onModelChange(option.value)}
            disabled={!option.available}
            className={`w-full text-left p-3 rounded-md border transition-colors ${
              selectedModel === option.value
                ? 'border-blue-500 bg-blue-900/30 text-white'
                : option.available
                ? 'border-gray-600 bg-gray-700 hover:bg-gray-600 text-gray-300'
                : 'border-gray-700 bg-gray-800 text-gray-500 cursor-not-allowed'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="text-xl">{option.icon}</span>
                <div>
                  <div className="font-semibold flex items-center space-x-2">
                    <span>{option.label}</span>
                    {!availableModels[option.value as keyof typeof availableModels] && (
                      <span className="text-xs bg-red-600 px-2 py-1 rounded">Not Configured</span>
                    )}
                    {option.rateLimit && !option.rateLimit.canMakeRequest && (
                      <span className="text-xs bg-orange-600 px-2 py-1 rounded">Rate Limited</span>
                    )}
                  </div>
                  <div className="text-sm text-gray-400">{option.description}</div>
                  {option.rateLimit && option.rateLimit.waitTimeMs > 0 && (
                    <div className="text-xs text-orange-400">
                      Wait: {Math.ceil(option.rateLimit.waitTimeMs / 1000)}s
                    </div>
                  )}
                </div>
              </div>
              
              {option.available && (
                <div className="text-right text-xs text-gray-400">
                  <div>{option.speed}</div>
                  <div>{option.quality}</div>
                </div>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Configuration Status */}
      <div className="mt-4 p-3 bg-gray-700/50 rounded-md">
        <div className="text-sm text-gray-300 space-y-1">
          <div className="flex justify-between">
            <span>Gemini API:</span>
            <span className={availableModels.gemini ? 'text-green-400' : 'text-red-400'}>
              {availableModels.gemini ? '✅ Ready' : '❌ Not configured'}
            </span>
          </div>
          <div className="flex justify-between">
            <span>DeepSeek API:</span>
            <span className={availableModels.deepseek ? 'text-green-400' : 'text-red-400'}>
              {availableModels.deepseek ? '✅ Ready' : '❌ Not configured'}
            </span>
          </div>
        </div>
      </div>

      {/* Usage Recommendations */}
      <div className="mt-3 text-xs text-gray-400">
        <div className="font-medium mb-1">💡 Recommendations:</div>
        <div>• Use <strong>Gemini</strong> for quick predictions</div>
        <div>• Use <strong>DeepSeek</strong> for detailed analysis</div>
        <div>• Use <strong>Both</strong> to compare and validate</div>
      </div>
    </div>
  );
};

export default ModelSelector;