import React, { useState, useEffect } from 'react';
import { Wifi, Settings, CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { ArduinoCloudService } from '../services/arduinoCloud';
import { ArduinoCloudConfig, QRCodeData } from '../types';

interface ArduinoIntegrationProps {
  qrData: QRCodeData[];
  onSyncComplete: (results: Map<string, any>) => void;
}

export const ArduinoIntegration: React.FC<ArduinoIntegrationProps> = ({ 
  qrData, 
  onSyncComplete 
}) => {
  const [config, setConfig] = useState<ArduinoCloudConfig>({
    clientId: '',
    clientSecret: '',
    baseUrl: 'https://api2.arduino.cc', // Not used anymore, kept for compatibility
    thingId: '',
    propertyName: 'qr_data'
  });
  
  const [service, setService] = useState<ArduinoCloudService | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [connectionMessage, setConnectionMessage] = useState('');
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [syncProgress, setSyncProgress] = useState<{ current: number; total: number } | null>(null);
  const [thingStatus, setThingStatus] = useState<any>(null);

  useEffect(() => {
    // Load saved configuration from localStorage
    const savedConfig = localStorage.getItem('arduino_cloud_config');
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        setConfig(prev => ({ ...prev, ...parsed }));
      } catch (error) {
        console.error('Failed to load saved configuration');
      }
    }
  }, []);

  const saveConfiguration = () => {
    try {
      // Save configuration (excluding sensitive data)
      const configToSave = {
        baseUrl: config.baseUrl,
        thingId: config.thingId,
        propertyName: config.propertyName
      };
      localStorage.setItem('arduino_cloud_config', JSON.stringify(configToSave));
      
      // Create service instance
      const newService = new ArduinoCloudService(config);
      setService(newService);
      setIsConfigOpen(false);
      
      // Test connection
      testConnection(newService);
    } catch (error) {
      setConnectionStatus('error');
      setConnectionMessage('Failed to save configuration');
    }
  };

  const testConnection = async (serviceInstance?: ArduinoCloudService) => {
    const currentService = serviceInstance || service;
    if (!currentService) return;

    setConnectionStatus('connecting');
    setConnectionMessage('Testing connection...');

    try {
      const result = await currentService.testConnection();
      if (result.success) {
        setConnectionStatus('connected');
        setConnectionMessage(result.message);
        
        // Get thing status if connected
        if (config.thingId) {
          const status = await currentService.getThingStatus();
          setThingStatus(status);
          
          // Subscribe to updates
          currentService.subscribeToUpdates((data) => {
            setThingStatus(data);
          });
        }
      } else {
        setConnectionStatus('error');
        setConnectionMessage(result.message);
      }
    } catch (error) {
      setConnectionStatus('error');
      setConnectionMessage(error instanceof Error ? error.message : 'Connection failed');
    }
  };

  const syncSingleQRCode = async (qrCode: QRCodeData) => {
    if (!service) return;

    try {
      const result = await service.syncQRCodeData(qrCode);
      return { [qrCode.id]: result };
    } catch (error) {
      return { [qrCode.id]: 'failed' };
    }
  };

  const syncAllQRCodes = async () => {
    if (!service) return;

    const unsyncedData = qrData.filter(item => item.arduino_sync_status !== 'synced');
    if (unsyncedData.length === 0) {
      setConnectionMessage('All QR codes are already synced');
      return;
    }

    setSyncProgress({ current: 0, total: unsyncedData.length });
    
    try {
      const results = await service.batchSync(unsyncedData);
      onSyncComplete(results);
      setSyncProgress(null);
      setConnectionMessage(`Synced ${results.size} QR codes successfully`);
    } catch (error) {
      setSyncProgress(null);
      setConnectionMessage('Batch sync failed');
    }
  };

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'connecting':
        return <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  const unsyncedCount = qrData.filter(item => item.arduino_sync_status !== 'synced').length;

  return (
    <div className="bg-white rounded-lg shadow-md">
      <div className="p-4 sm:p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Wifi className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Arduino Cloud Integration</h2>
              <p className="text-xs sm:text-sm text-gray-600">Sync QR code data with your Arduino devices</p>
            </div>
          </div>
          <button
            onClick={() => setIsConfigOpen(true)}
            className="flex items-center space-x-1 sm:space-x-2 px-3 sm:px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors text-sm sm:text-base"
          >
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Configure</span>
          </button>
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* Connection Status */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-3">
            {getStatusIcon()}
            <div>
              <p className="text-sm sm:text-base font-medium text-gray-900">Connection Status</p>
              <p className="text-xs sm:text-sm text-gray-600">{connectionMessage || 'Not connected'}</p>
            </div>
          </div>
          {service && (
            <button
              onClick={() => testConnection()}
              disabled={connectionStatus === 'connecting'}
              className="px-3 sm:px-4 py-2 text-xs sm:text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <span className="hidden sm:inline">Test Connection</span>
              <span className="sm:hidden">Test</span>
            </button>
          )}
        </div>

        {/* Sync Status */}
        {connectionStatus === 'connected' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-xl sm:text-2xl font-bold text-blue-600">{qrData.length}</p>
              <p className="text-xs sm:text-sm text-blue-800">Total QR Codes</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-xl sm:text-2xl font-bold text-green-600">
                {qrData.filter(item => item.arduino_sync_status === 'synced').length}
              </p>
              <p className="text-xs sm:text-sm text-green-800">Synced</p>
            </div>
            <div className="p-4 bg-orange-50 rounded-lg">
              <p className="text-xl sm:text-2xl font-bold text-orange-600">{unsyncedCount}</p>
              <p className="text-xs sm:text-sm text-orange-800">Pending Sync</p>
            </div>
          </div>
        )}

        {/* Sync Actions */}
        {connectionStatus === 'connected' && unsyncedCount > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-orange-200 bg-orange-50 rounded-lg space-y-3 sm:space-y-0">
            <div>
              <p className="text-sm sm:text-base font-medium text-orange-900">
                {unsyncedCount} QR code{unsyncedCount !== 1 ? 's' : ''} pending sync
              </p>
              <p className="text-xs sm:text-sm text-orange-700">
                Sync your QR codes to make them available on your Arduino devices
              </p>
            </div>
            <button
              onClick={syncAllQRCodes}
              disabled={syncProgress !== null}
              className="px-4 sm:px-6 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50 transition-colors text-sm sm:text-base whitespace-nowrap"
            >
              {syncProgress ? `Syncing... ${syncProgress.current}/${syncProgress.total}` : 'Sync All'}
            </button>
          </div>
        )}

        {/* Thing Status */}
        {thingStatus && (
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="text-sm sm:text-base font-medium text-gray-900 mb-3">Arduino Thing Status</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
              <div>
                <span className="text-gray-600">Name:</span>
                <span className="ml-2 font-medium">{thingStatus.name || 'Unknown'}</span>
              </div>
              <div>
                <span className="text-gray-600">Status:</span>
                <span className={`ml-2 font-medium ${thingStatus.device_status === 'online' ? 'text-green-600' : 'text-red-600'}`}>
                  {thingStatus.device_status || 'Unknown'}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Last Activity:</span>
                <span className="ml-2 font-medium">
                  {thingStatus.last_activity_at 
                    ? new Date(thingStatus.last_activity_at).toLocaleString()
                    : 'Unknown'}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Properties:</span>
                <span className="ml-2 font-medium">
                  {thingStatus.properties?.length || 0}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Configuration Modal */}
      {isConfigOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">
              Arduino Cloud Configuration
            </h3>
            
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-xs sm:text-sm text-blue-800">
                  <strong>Setup Instructions:</strong><br/>
                  1. Go to <a href="https://cloud.arduino.cc/" target="_blank" rel="noopener noreferrer" className="underline">Arduino Cloud</a><br/>
                  2. Navigate to API Keys section<br/>
                  3. Create a new API key with <strong>iot:read</strong> and <strong>iot:write</strong> scopes<br/>
                  4. Copy the Client ID and Client Secret here
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Client ID
                </label>
                <input
                  type="text"
                  value={config.clientId}
                  onChange={(e) => setConfig(prev => ({ ...prev, clientId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  placeholder="e.g., AbCdEfGhIjKlMnOpQrStUvWxYz123456"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Client Secret
                </label>
                <input
                  type="password"
                  value={config.clientSecret}
                  onChange={(e) => setConfig(prev => ({ ...prev, clientSecret: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  placeholder="Your secret key (keep this secure)"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Thing ID (optional)
                </label>
                <input
                  type="text"
                  value={config.thingId}
                  onChange={(e) => setConfig(prev => ({ ...prev, thingId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  placeholder="e.g., 12345678-1234-1234-1234-123456789abc"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Find this in your Arduino Cloud Things section
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Property Name
                </label>
                <input
                  type="text"
                  value={config.propertyName}
                  onChange={(e) => setConfig(prev => ({ ...prev, propertyName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  placeholder="qr_data"
                />
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 mt-6">
              <button
                onClick={saveConfiguration}
                disabled={!config.clientId || !config.clientSecret}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm sm:text-base"
              >
                Save & Connect
              </button>
              <button
                onClick={() => setIsConfigOpen(false)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors text-sm sm:text-base"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};