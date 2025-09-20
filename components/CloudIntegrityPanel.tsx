import React, { useState, useEffect } from 'react';
import { cloudPredictionService } from '../services/cloudPredictionService';

interface CloudIntegrityPanelProps {
  className?: string;
}

const CloudIntegrityPanel: React.FC<CloudIntegrityPanelProps> = ({ className = '' }) => {
  const [cloudStatus, setCloudStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [localStats, setLocalStats] = useState({ predictions: 0, verified: 0 });
  const [cloudStats, setCloudStats] = useState({ predictions: 0, verified: 0 });
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResults, setSyncResults] = useState<{ synced: number; failed: number } | null>(null);

  useEffect(() => {
    checkCloudStatus();
    loadLocalStats();
  }, []);

  const checkCloudStatus = async () => {
    try {
      // Probe the cloud API; if it responds, mark as connected and load stats
      await cloudPredictionService.getAccuracyStats();
      setCloudStatus('connected');
      await loadCloudStats();
    } catch (error) {
      console.warn('Cloud storage not available:', error);
      setCloudStatus('disconnected');
    }
  };

  const loadLocalStats = () => {
    try {
      const dailyPredictions = JSON.parse(localStorage.getItem('fixturecast_daily_predictions') || '{}');
      let totalPredictions = 0;
      let totalVerified = 0;

      Object.values(dailyPredictions).forEach((predictions: any) => {
        totalPredictions += (predictions as any[]).length;
        totalVerified += (predictions as any[]).filter((p: any) => p.verified).length;
      });

      setLocalStats({ predictions: totalPredictions, verified: totalVerified });
    } catch (error) {
      console.warn('Failed to load local stats:', error);
    }
  };

  const loadCloudStats = async () => {
    try {
      const stats = await cloudPredictionService.getAccuracyStats();
      setCloudStats({
        predictions: stats.totalPredictions || 0,
        verified: stats.verifiedPredictions || 0
      });
    } catch (error) {
      console.warn('Failed to load cloud stats:', error);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncResults(null);

    try {
      const results = await cloudPredictionService.syncLocalToCloud();
      setSyncResults(results);
      
      // Refresh stats after sync
      await loadCloudStats();
      loadLocalStats();
      
    } catch (error) {
      console.error('Sync failed:', error);
      setSyncResults({ synced: 0, failed: -1 });
    } finally {
      setIsSyncing(false);
    }
  };

  const getStatusColor = () => {
    switch (cloudStatus) {
      case 'connected': return 'text-green-400';
      case 'disconnected': return 'text-red-400';
      default: return 'text-yellow-400';
    }
  };

  const getStatusIcon = () => {
    switch (cloudStatus) {
      case 'connected': return '🔒';
      case 'disconnected': return '⚠️';
      default: return '🔄';
    }
  };

  const getStatusText = () => {
    switch (cloudStatus) {
      case 'connected': return 'Cloud Integrity Active';
      case 'disconnected': return 'Local Storage Only';
      default: return 'Checking Connection...';
    }
  };

  return (
    <div className={`bg-gray-800 rounded-xl p-6 border border-gray-700 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-white">🔐 Prediction Integrity System</h3>
        <div className={`flex items-center space-x-2 ${getStatusColor()}`}>
          <span className="text-lg">{getStatusIcon()}</span>
          <span className="font-medium">{getStatusText()}</span>
        </div>
      </div>

      {/* Storage Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Local Storage */}
        <div className="bg-gray-900 rounded-lg p-4 border border-gray-600">
          <h4 className="text-lg font-semibold text-blue-400 mb-3">📱 Local Storage</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-300">Total Predictions:</span>
              <span className="text-white font-medium">{localStats.predictions}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Verified:</span>
              <span className="text-green-400 font-medium">{localStats.verified}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Cloud Backed:</span>
              <span className="text-blue-400 font-medium">
                {(() => {
                  try {
                    const dailyData = JSON.parse(localStorage.getItem('fixturecast_daily_predictions') || '{}');
                    let cloudBacked = 0;
                    Object.values(dailyData).forEach((predictions: any) => {
                      cloudBacked += (predictions as any[]).filter((p: any) => p.cloudStored).length;
                    });
                    return cloudBacked;
                  } catch (error) {
                      console.warn('Failed to load integrity data:', error);
                      return 0;
                  }
                })()}
              </span>
            </div>
          </div>
        </div>

        {/* Cloud Storage */}
        <div className="bg-gray-900 rounded-lg p-4 border border-gray-600">
          <h4 className="text-lg font-semibold text-purple-400 mb-3">☁️ Cloud Storage</h4>
          {cloudStatus === 'connected' ? (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-300">Total Predictions:</span>
                <span className="text-white font-medium">{cloudStats.predictions}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Verified:</span>
                <span className="text-green-400 font-medium">{cloudStats.verified}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Integrity Status:</span>
                <span className="text-green-400 font-medium">✓ Protected</span>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-gray-400 text-sm mb-2">Cloud storage unavailable</p>
              <button 
                onClick={checkCloudStatus}
                className="text-blue-400 hover:text-blue-300 text-sm underline"
              >
                Retry Connection
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Sync Section */}
      {cloudStatus === 'connected' && (
        <div className="bg-gray-900 rounded-lg p-4 border border-gray-600 mb-4">
          <h4 className="text-lg font-semibold text-yellow-400 mb-3">🔄 Data Synchronization</h4>
          
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm text-gray-300">
              Sync local predictions to cloud for enhanced integrity protection
            </div>
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                isSyncing 
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : 'bg-yellow-600 hover:bg-yellow-700 text-white'
              }`}
            >
              {isSyncing ? '🔄 Syncing...' : '📤 Sync to Cloud'}
            </button>
          </div>

          {syncResults && (
            <div className={`text-sm p-3 rounded-lg ${
              syncResults.failed === -1 
                ? 'bg-red-900/50 text-red-300'
                : 'bg-green-900/50 text-green-300'
            }`}>
              {syncResults.failed === -1 
                ? '❌ Sync failed. Check connection and try again.'
                : `✅ Sync complete: ${syncResults.synced} predictions synced, ${syncResults.failed} failed`
              }
            </div>
          )}
        </div>
      )}

      {/* Benefits Section */}
      <div className="bg-gray-900 rounded-lg p-4 border border-gray-600">
        <h4 className="text-lg font-semibold text-green-400 mb-3">🛡️ Integrity Benefits</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div className="flex items-start space-x-2">
            <span className="text-green-400 mt-0.5">✓</span>
            <span className="text-gray-300">Tamper-proof prediction storage</span>
          </div>
          <div className="flex items-start space-x-2">
            <span className="text-green-400 mt-0.5">✓</span>
            <span className="text-gray-300">Cryptographic integrity hashing</span>
          </div>
          <div className="flex items-start space-x-2">
            <span className="text-green-400 mt-0.5">✓</span>
            <span className="text-gray-300">Automatic verification tracking</span>
          </div>
          <div className="flex items-start space-x-2">
            <span className="text-green-400 mt-0.5">✓</span>
            <span className="text-gray-300">Complete audit trail</span>
          </div>
          <div className="flex items-start space-x-2">
            <span className="text-green-400 mt-0.5">✓</span>
            <span className="text-gray-300">Global edge caching</span>
          </div>
          <div className="flex items-start space-x-2">
            <span className="text-green-400 mt-0.5">✓</span>
            <span className="text-gray-300">Backup redundancy</span>
          </div>
        </div>
      </div>

      {/* Setup Hint */}
      {cloudStatus === 'disconnected' && (
        <div className="mt-4 p-3 bg-blue-900/50 rounded-lg border border-blue-700">
          <p className="text-blue-300 text-sm">
            <strong>💡 Setup Cloud Integrity:</strong> Configure Cloudflare KV storage for enhanced prediction security. 
            See <code className="bg-blue-800 px-1 rounded">CLOUDFLARE_PREDICTION_SETUP.md</code> for instructions.
          </p>
        </div>
      )}
    </div>
  );
};

export default CloudIntegrityPanel;
