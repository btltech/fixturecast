import React from 'react';

interface DeploymentStatusProps {
  className?: string;
}

const DeploymentStatus: React.FC<DeploymentStatusProps> = ({ className = '' }) => {
  const isProduction = (import.meta as any).env?.PROD || (import.meta as any).env?.MODE === 'production';
  const isCloudflare = typeof window !== 'undefined' && (
    window.location.hostname.includes('.pages.dev') || 
    window.location.hostname.includes('cloudflare')
  );
  const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';

  return (
    <div className={`bg-gray-800 border border-gray-700 rounded-lg p-4 ${className}`}>
      <h3 className="text-lg font-semibold text-white mb-3">🚀 Deployment Status</h3>
      
      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-gray-300">Environment:</span>
          <span className={`px-2 py-1 rounded text-xs font-medium ${
            isProduction 
              ? 'bg-green-600 text-green-100' 
              : 'bg-yellow-600 text-yellow-100'
          }`}>
            {isProduction ? 'Production' : 'Development'}
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-gray-300">Platform:</span>
          <span className={`px-2 py-1 rounded text-xs font-medium ${
            isCloudflare 
              ? 'bg-orange-600 text-orange-100' 
              : 'bg-blue-600 text-blue-100'
          }`}>
            {isCloudflare ? '☁️ Cloudflare Pages' : '💻 Local Development'}
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-gray-300">Host:</span>
          <span className="text-white font-mono text-xs">
            {hostname}
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-gray-300">API Proxy:</span>
          <span className="text-green-400 text-xs">
            {isCloudflare ? '✅ Pages Function' : '✅ Local CORS Proxy'}
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-gray-300">Predictions:</span>
          <span className={`text-xs ${
            typeof window !== 'undefined' && ((window as any).geminiConfigured) 
              ? 'text-green-400' 
              : 'text-yellow-400'
          }`}>
            {typeof window !== 'undefined' && ((window as any).geminiConfigured) 
              ? '✅ AI Enabled' 
              : '⚠️ Basic Mode'}
          </span>
        </div>
        
        {isCloudflare && (
          <div className="mt-3 p-2 bg-green-900/30 border border-green-600/30 rounded">
            <div className="flex items-center text-green-400 text-xs">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Live on Cloudflare Global CDN
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeploymentStatus;
