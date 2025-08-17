import React, { useState, useEffect } from 'react';
import { QrCode, BarChart3, Settings, LogOut, User, Download } from 'lucide-react';
import { Scanner } from './components/Scanner';
import { DataTable } from './components/DataTable';
import { DataVisualization } from './components/DataVisualization';
import { ArduinoIntegration } from './components/ArduinoIntegration';
import { AuthModal } from './components/AuthModal';
import { ProductQRGenerator } from './components/ProductQRGenerator';
import { QRCodeData } from './types';
import { QRDatabaseService, AuthService } from './lib/supabase';

type TabType = 'scan' | 'generate' | 'data' | 'analytics' | 'arduino';

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('scan');
  const [qrCodes, setQrCodes] = useState<QRCodeData[]>([]);
  const [selectedQR, setSelectedQR] = useState<QRCodeData | null>(null);
  const [user, setUser] = useState<any>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [scanSessionId, setScanSessionId] = useState<string | null>(null);

  useEffect(() => {
    checkUser();
    setupAuthListener();
  }, []);

  useEffect(() => {
    if (user) {
      loadQRCodes();
      startScanSession();
    }
  }, [user]);

  const checkUser = async () => {
    const currentUser = await AuthService.getCurrentUser();
    setUser(currentUser);
    setLoading(false);
  };

  const setupAuthListener = () => {
    AuthService.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
      if (session?.user) {
        loadQRCodes();
      } else {
        setQrCodes([]);
      }
    });
  };

  const loadQRCodes = async () => {
    try {
      const codes = await QRDatabaseService.getUserQRCodes();
      setQrCodes(codes);
      console.log('Loaded QR codes from database:', codes.length);
    } catch (error) {
      console.error('Failed to load QR codes from database:', error);
      // Keep existing local data if database fails
    }
  };

  const startScanSession = async () => {
    const sessionId = await QRDatabaseService.startScanSession();
    setScanSessionId(sessionId);
  };

  const handleScan = async (data: QRCodeData) => {
    if (!user) return;

    console.log('Handling scan data:', data);
    
    // Save to database
    const savedQR = await QRDatabaseService.insertQRCode(data);
    console.log('Saved QR result:', savedQR);
    
    if (savedQR) {
      setQrCodes(prev => [savedQR, ...prev]);
      
      // Update scan session
      if (scanSessionId) {
        await QRDatabaseService.updateScanSession(scanSessionId, {
          total_scans: qrCodes.length + 1,
          successful_scans: qrCodes.filter(qr => qr.validation_status === 'valid').length + (data.validation_status === 'valid' ? 1 : 0)
        });
      }
    } else {
      console.error('Failed to save QR code to database');
      // Still add to local state for demo purposes
      setQrCodes(prev => [{ ...data, id: crypto.randomUUID() }, ...prev]);
    }
  };

  const handleScanError = (error: string) => {
    console.error('Scan error:', error);
    
    // Update scan session with failed scan
    if (scanSessionId) {
      QRDatabaseService.updateScanSession(scanSessionId, {
        failed_scans: 1
      });
    }
  };

  const handleDeleteQR = async (id: string) => {
    if (await QRDatabaseService.deleteQRCode(id)) {
      setQrCodes(prev => prev.filter(qr => qr.id !== id));
    }
  };

  const handleExport = async () => {
    const exportData = await QRDatabaseService.exportQRCodes();
    if (exportData) {
      const blob = new Blob([exportData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `qr_codes_export_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const handleArduinoSync = async (qrData: QRCodeData) => {
    // Update local state optimistically
    setQrCodes(prev => 
      prev.map(qr => 
        qr.id === qrData.id 
          ? { ...qr, arduino_sync_status: 'pending' as const }
          : qr
      )
    );

    // Log the sync attempt
    await QRDatabaseService.logArduinoSync(qrData.id, {
      sync_status: 'pending',
      arduino_thing_id: 'demo_thing'
    });
  };

  const handleSyncComplete = async (results: Map<string, any>) => {
    // Update sync statuses based on results
    const updates = Array.from(results.entries()).map(async ([qrId, status]) => {
      await QRDatabaseService.updateSyncStatus(qrId, status);
      await QRDatabaseService.logArduinoSync(qrId, {
        sync_status: status,
        arduino_thing_id: 'demo_thing'
      });
    });

    await Promise.all(updates);
    await loadQRCodes(); // Refresh data
  };

  const handleSignOut = async () => {
    // End current scan session
    if (scanSessionId) {
      await QRDatabaseService.updateScanSession(scanSessionId, {
        end_time: new Date().toISOString()
      });
    }
    
    await AuthService.signOut();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full mx-4">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <QrCode className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">MediVerify - Medicine Tracking</h1>
            <p className="text-gray-600">
              Secure medicine tracking, verification, and authenticity management system
            </p>
          </div>

          <div className="space-y-4 mb-6">
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <QrCode className="w-5 h-5 text-blue-600" />
              <span className="text-sm text-gray-700">Medicine QR code scanning & verification</span>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <BarChart3 className="w-5 h-5 text-green-600" />
              <span className="text-sm text-gray-700">Medicine tracking analytics</span>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <Settings className="w-5 h-5 text-purple-600" />
              <span className="text-sm text-gray-700">Real-time medicine monitoring</span>
            </div>
          </div>

          <button
            onClick={() => setAuthModalOpen(true)}
            className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <User className="w-4 h-4" />
            <span>Get Started</span>
          </button>
        </div>

        <AuthModal
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
          onAuthSuccess={() => setAuthModalOpen(false)}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <div className="flex items-center space-x-3">
              <QrCode className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
              <h1 className="text-sm sm:text-xl font-semibold text-gray-900">
                <span className="hidden sm:inline">MediVerify - Medicine Tracking</span>
                <span className="sm:hidden">MediVerify</span>
              </h1>
            </div>
            
            <div className="flex items-center space-x-2 sm:space-x-4">
              <span className="hidden sm:inline text-sm text-gray-600">
                Welcome, {user.email}
              </span>
              <button
                onClick={handleExport}
                className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-1.5 text-green-600 hover:text-green-800 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Export</span>
              </button>
              <button
                onClick={handleSignOut}
                className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-1.5 text-red-600 hover:text-red-800 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex space-x-2 sm:space-x-4 lg:space-x-8 overflow-x-auto">
            {[
              { id: 'scan', label: 'Scan Medicine', icon: QrCode },
              { id: 'generate', label: 'Generate Medicine QR', icon: QrCode },
              { id: 'data', label: 'Medicine Database', icon: User },
              { id: 'analytics', label: 'Medicine Analytics', icon: BarChart3 },
              { id: 'arduino', label: 'IoT Monitoring', icon: Settings },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as TabType)}
                className={`flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-3 sm:py-4 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{label}</span>
                <span className="sm:hidden">
                  {label.split(' ')[0]}
                </span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
        {activeTab === 'scan' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">Medicine QR Code Scanner</h2>
              <Scanner onScan={handleScan} onError={handleScanError} />
            </div>
            
            {qrCodes.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recently Scanned Medicines</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {qrCodes.slice(0, 6).map((qr) => (
                    <div key={qr.id} className="p-3 sm:p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                      <p className="text-sm font-medium text-gray-900 mb-2">
                        {qr.parsed_data.medicine_name || qr.data_type.toUpperCase()}
                      </p>
                      <p className="text-sm text-gray-600 truncate">
                        {qr.parsed_data.manufacturer || 'Unknown Manufacturer'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Batch: {qr.parsed_data.batch_number || 'N/A'}
                      </p>
                      <p className="text-xs text-gray-400 mt-2">
                        {new Date(qr.scan_timestamp).toLocaleString()}
                      </p>
                      {qr.parsed_data.is_expired && (
                        <div className="mt-2 px-2 py-1 bg-red-100 text-red-800 text-xs rounded">
                          EXPIRED
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'generate' && (
          <div>
            <ProductQRGenerator />
          </div>
        )}

        {activeTab === 'data' && (
          <DataTable
            data={qrCodes}
            onView={setSelectedQR}
            onDelete={handleDeleteQR}
            onExport={handleExport}
            onSync={handleArduinoSync}
          />
        )}

        {activeTab === 'analytics' && (
          <DataVisualization data={qrCodes} />
        )}

        {activeTab === 'arduino' && (
          <ArduinoIntegration 
            qrData={qrCodes}
            onSyncComplete={handleSyncComplete}
          />
        )}
      </main>

      {/* QR Detail Modal */}
      {selectedQR && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900">Medicine Details</h3>
              <button
                onClick={() => setSelectedQR(null)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <span className="text-2xl">×</span>
              </button>
            </div>
            <div className="space-y-4">
              {selectedQR.parsed_data.medicine_name && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Medicine Name</label>
                  <p className="mt-1 text-sm text-gray-900 font-semibold">{selectedQR.parsed_data.medicine_name}</p>
                </div>
              )}
              {selectedQR.parsed_data.manufacturer && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Manufacturer</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedQR.parsed_data.manufacturer}</p>
                </div>
              )}
              {selectedQR.parsed_data.batch_number && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Batch Number</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedQR.parsed_data.batch_number}</p>
                </div>
              )}
              {selectedQR.parsed_data.expiry_date && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Expiry Date</label>
                  <p className={`mt-1 text-sm ${selectedQR.parsed_data.is_expired ? 'text-red-600 font-semibold' : 'text-gray-900'}`}>
                    {selectedQR.parsed_data.expiry_date}
                    {selectedQR.parsed_data.is_expired && ' (EXPIRED)'}
                  </p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700">Type</label>
                <p className="mt-1 text-sm text-gray-900">{selectedQR.data_type}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Parsed Data</label>
                <pre className="mt-1 text-xs sm:text-sm text-gray-900 bg-gray-50 p-2 rounded overflow-x-auto">
                  {JSON.stringify(selectedQR.parsed_data, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;