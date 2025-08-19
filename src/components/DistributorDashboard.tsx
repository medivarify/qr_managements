import React, { useState, useEffect, useRef } from 'react';
import { 
  MapPin, 
  Scan, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Package, 
  Truck, 
  Shield,
  Navigation,
  Database,
  Eye,
  Filter,
  Download,
  RefreshCw,
  Bell,
  Activity,
  Target,
  Map
} from 'lucide-react';
import { QRScanner } from '../utils/qrScanner';
import { QRCodeParser } from '../utils/qrParser';
import { QRDatabaseService } from '../lib/supabase';

interface GPSCoordinates {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: string;
}

interface DistributionTransaction {
  id: string;
  qr_code_id: string;
  medicine_name: string;
  batch_number: string;
  assigned_district: string;
  scanned_district: string;
  gps_coordinates: GPSCoordinates;
  scan_timestamp: string;
  distributor_id: string;
  status: 'success' | 'diversion' | 'pending';
  diversion_distance?: number;
  alert_triggered: boolean;
}

interface DistrictMapping {
  name: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  radius: number; // km
}

interface DistributorDashboardProps {
  qrData: any[];
}

export const DistributorDashboard: React.FC<DistributorDashboardProps> = ({ qrData }) => {
  const [activeTab, setActiveTab] = useState<'scan' | 'transactions' | 'alerts' | 'analytics'>('scan');
  const [isScanning, setIsScanning] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<GPSCoordinates | null>(null);
  const [locationError, setLocationError] = useState<string>('');
  const [transactions, setTransactions] = useState<DistributionTransaction[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [scanResult, setScanResult] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<QRScanner | null>(null);

  // Bangladesh districts with GPS coordinates
  const bangladeshDistricts: DistrictMapping[] = [
    { name: 'Dhaka', coordinates: { lat: 23.8103, lng: 90.4125 }, radius: 50 },
    { name: 'Chittagong', coordinates: { lat: 22.3569, lng: 91.7832 }, radius: 40 },
    { name: 'Sylhet', coordinates: { lat: 24.8949, lng: 91.8687 }, radius: 35 },
    { name: 'Rajshahi', coordinates: { lat: 24.3745, lng: 88.6042 }, radius: 30 },
    { name: 'Khulna', coordinates: { lat: 22.8456, lng: 89.5403 }, radius: 35 },
    { name: 'Barisal', coordinates: { lat: 22.7010, lng: 90.3535 }, radius: 25 },
    { name: 'Rangpur', coordinates: { lat: 25.7439, lng: 89.2752 }, radius: 30 },
    { name: 'Mymensingh', coordinates: { lat: 24.7471, lng: 90.4203 }, radius: 25 },
    { name: 'Comilla', coordinates: { lat: 23.4607, lng: 91.1809 }, radius: 20 },
    { name: 'Narayanganj', coordinates: { lat: 23.6238, lng: 90.4990 }, radius: 15 },
    { name: 'Gazipur', coordinates: { lat: 23.9999, lng: 90.4203 }, radius: 20 },
    { name: 'Tangail', coordinates: { lat: 24.2513, lng: 89.9167 }, radius: 25 },
    { name: 'Jessore', coordinates: { lat: 23.1697, lng: 89.2072 }, radius: 25 },
    { name: 'Bogra', coordinates: { lat: 24.8465, lng: 89.3776 }, radius: 20 },
    { name: 'Dinajpur', coordinates: { lat: 25.6217, lng: 88.6354 }, radius: 20 },
    { name: 'Pabna', coordinates: { lat: 24.0064, lng: 89.2372 }, radius: 18 },
    { name: 'Kushtia', coordinates: { lat: 23.9013, lng: 89.1206 }, radius: 18 },
    { name: 'Faridpur', coordinates: { lat: 23.6070, lng: 89.8429 }, radius: 20 },
    { name: 'Brahmanbaria', coordinates: { lat: 23.9571, lng: 91.1115 }, radius: 15 },
    { name: 'Noakhali', coordinates: { lat: 22.8696, lng: 91.0995 }, radius: 20 }
  ];

  useEffect(() => {
    getCurrentLocation();
    loadTransactions();
    generateAlerts();
  }, []);

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by this browser');
      return;
    }

    setLocationError('Getting location...');
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location: GPSCoordinates = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date().toISOString()
        };
        setCurrentLocation(location);
        setLocationError('');
      },
      (error) => {
        let errorMessage = 'Location access failed';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied. Please enable location services.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out.';
            break;
        }
        setLocationError(errorMessage);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const detectDistrict = (gps: GPSCoordinates): string => {
    let closestDistrict = 'Unknown';
    let minDistance = Infinity;

    bangladeshDistricts.forEach(district => {
      const distance = calculateDistance(
        gps.latitude, 
        gps.longitude, 
        district.coordinates.lat, 
        district.coordinates.lng
      );
      
      if (distance < minDistance && distance <= district.radius) {
        minDistance = distance;
        closestDistrict = district.name;
      }
    });

    return closestDistrict;
  };

  const startScanning = async () => {
    if (!videoRef.current || !currentLocation) {
      alert('Location access required for scanning');
      return;
    }

    try {
      scannerRef.current = new QRScanner();
      setIsScanning(true);
      setScanResult(null);

      await scannerRef.current.startScanning(
        videoRef.current,
        handleScanSuccess,
        handleScanError
      );
    } catch (error) {
      console.error('Failed to start scanner:', error);
      setIsScanning(false);
    }
  };

  const stopScanning = () => {
    if (scannerRef.current) {
      scannerRef.current.stopScanning();
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  const handleScanSuccess = async (rawData: string) => {
    if (!currentLocation) {
      alert('Location not available');
      return;
    }

    setIsProcessing(true);
    
    try {
      // Parse QR code data
      const parsedQR = QRCodeParser.parseQRCode(rawData);
      
      // Get current location
      getCurrentLocation();
      
      // Detect current district
      const scannedDistrict = detectDistrict(currentLocation);
      
      // Extract assigned district from QR data
      const assignedDistrict = parsedQR.parsed_data?.assigned_district || 
                              parsedQR.parsed_data?.destination_district || 
                              'Unknown';

      // Check for diversion
      const isDiversion = scannedDistrict !== assignedDistrict && 
                         assignedDistrict !== 'Unknown' && 
                         scannedDistrict !== 'Unknown';

      // Calculate diversion distance if applicable
      let diversionDistance = 0;
      if (isDiversion) {
        const assignedDistrictData = bangladeshDistricts.find(d => d.name === assignedDistrict);
        if (assignedDistrictData) {
          diversionDistance = calculateDistance(
            currentLocation.latitude,
            currentLocation.longitude,
            assignedDistrictData.coordinates.lat,
            assignedDistrictData.coordinates.lng
          );
        }
      }

      // Create transaction record
      const transaction: DistributionTransaction = {
        id: crypto.randomUUID(),
        qr_code_id: parsedQR.id || crypto.randomUUID(),
        medicine_name: parsedQR.parsed_data?.medicine_name || 'Unknown Medicine',
        batch_number: parsedQR.parsed_data?.batch_number || 'Unknown Batch',
        assigned_district: assignedDistrict,
        scanned_district: scannedDistrict,
        gps_coordinates: currentLocation,
        scan_timestamp: new Date().toISOString(),
        distributor_id: 'DIST-001', // Would come from auth
        status: isDiversion ? 'diversion' : 'success',
        diversion_distance: diversionDistance,
        alert_triggered: isDiversion
      };

      // Save to database
      await saveTransaction(transaction);
      
      // Add to local state
      setTransactions(prev => [transaction, ...prev]);
      
      // Set scan result
      setScanResult({
        ...parsedQR,
        transaction,
        isDiversion,
        diversionDistance
      });

      // Trigger alert if diversion detected
      if (isDiversion) {
        triggerDiversionAlert(transaction);
      }

      stopScanning();
    } catch (error) {
      console.error('Error processing scan:', error);
      alert('Failed to process QR code');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleScanError = (error: string) => {
    console.error('Scan error:', error);
  };

  const saveTransaction = async (transaction: DistributionTransaction) => {
    try {
      // In a real app, this would save to a distribution_transactions table
      console.log('Saving transaction:', transaction);
      
      // For demo, save to localStorage
      const existingTransactions = JSON.parse(localStorage.getItem('distribution_transactions') || '[]');
      existingTransactions.unshift(transaction);
      localStorage.setItem('distribution_transactions', JSON.stringify(existingTransactions));
    } catch (error) {
      console.error('Failed to save transaction:', error);
    }
  };

  const loadTransactions = () => {
    try {
      const saved = JSON.parse(localStorage.getItem('distribution_transactions') || '[]');
      setTransactions(saved);
    } catch (error) {
      console.error('Failed to load transactions:', error);
    }
  };

  const triggerDiversionAlert = (transaction: DistributionTransaction) => {
    const alert = {
      id: crypto.randomUUID(),
      type: 'diversion',
      severity: 'high',
      title: 'Medicine Diversion Detected',
      message: `${transaction.medicine_name} (Batch: ${transaction.batch_number}) scanned in ${transaction.scanned_district} but assigned to ${transaction.assigned_district}`,
      transaction_id: transaction.id,
      timestamp: new Date().toISOString(),
      distance: transaction.diversion_distance,
      status: 'active'
    };

    setAlerts(prev => [alert, ...prev]);
    
    // In a real app, this would send notifications to authorities
    console.log('DIVERSION ALERT:', alert);
  };

  const generateAlerts = () => {
    // Generate sample alerts for demo
    const sampleAlerts = [
      {
        id: '1',
        type: 'diversion',
        severity: 'high',
        title: 'Suspected Medicine Diversion',
        message: 'Amoxicillin batch BATCH-ABC123 detected 45km from assigned district',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        status: 'active'
      },
      {
        id: '2',
        type: 'location',
        severity: 'medium',
        title: 'GPS Accuracy Warning',
        message: 'Low GPS accuracy detected in recent scans',
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        status: 'resolved'
      }
    ];
    
    setAlerts(sampleAlerts);
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      success: 'bg-green-100 text-green-800',
      diversion: 'bg-red-100 text-red-800',
      pending: 'bg-yellow-100 text-yellow-800'
    };

    const icons = {
      success: <CheckCircle className="w-3 h-3" />,
      diversion: <XCircle className="w-3 h-3" />,
      pending: <Clock className="w-3 h-3" />
    };

    return (
      <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
        {icons[status as keyof typeof icons]}
        <span>{status.toUpperCase()}</span>
      </span>
    );
  };

  const exportTransactions = () => {
    const dataStr = JSON.stringify(transactions, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `distribution_transactions_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const stats = {
    totalScans: transactions.length,
    successfulDeliveries: transactions.filter(t => t.status === 'success').length,
    diversionsDetected: transactions.filter(t => t.status === 'diversion').length,
    activeAlerts: alerts.filter(a => a.status === 'active').length
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Truck className="w-6 h-6 text-blue-600" />
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Distributor Dashboard</h1>
              <p className="text-sm text-gray-600">Medicine distribution tracking & diversion detection</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={getCurrentLocation}
              className="flex items-center space-x-1 px-3 py-2 text-blue-600 hover:text-blue-800 transition-colors"
            >
              <Navigation className="w-4 h-4" />
              <span className="hidden sm:inline">Refresh Location</span>
            </button>
          </div>
        </div>

        {/* Location Status */}
        <div className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
          <MapPin className="w-5 h-5 text-green-600" />
          <div className="flex-1">
            {currentLocation ? (
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Current Location: {detectDistrict(currentLocation)}
                </p>
                <p className="text-xs text-gray-600">
                  GPS: {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)} 
                  (±{currentLocation.accuracy.toFixed(0)}m)
                </p>
              </div>
            ) : (
              <div>
                <p className="text-sm font-medium text-red-600">Location Required</p>
                <p className="text-xs text-gray-600">{locationError || 'Click refresh to get location'}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-md border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Scans</p>
              <p className="text-2xl font-bold text-blue-600">{stats.totalScans}</p>
            </div>
            <Scan className="w-8 h-8 text-blue-500 opacity-80" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-md border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Successful</p>
              <p className="text-2xl font-bold text-green-600">{stats.successfulDeliveries}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500 opacity-80" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-md border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Diversions</p>
              <p className="text-2xl font-bold text-red-600">{stats.diversionsDetected}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-500 opacity-80" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-md border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Alerts</p>
              <p className="text-2xl font-bold text-orange-600">{stats.activeAlerts}</p>
            </div>
            <Bell className="w-8 h-8 text-orange-500 opacity-80" />
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'scan', label: 'QR Scanner', icon: Scan },
              { id: 'transactions', label: 'Transactions', icon: Database },
              { id: 'alerts', label: 'Alerts', icon: Bell },
              { id: 'analytics', label: 'Analytics', icon: Activity }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as any)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* QR Scanner Tab */}
          {activeTab === 'scan' && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Medicine QR Code Scanner</h2>
                <p className="text-sm text-gray-600">Scan medicine QR codes to track distribution and detect diversions</p>
              </div>

              {/* Scanner Interface */}
              <div className="max-w-md mx-auto">
                <div className="relative bg-black rounded-lg overflow-hidden">
                  <video
                    ref={videoRef}
                    className="w-full h-64 object-cover"
                    autoPlay
                    playsInline
                    muted
                  />
                  
                  {/* Scanning overlay */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="relative">
                      <div className="w-48 h-48 border-2 border-white rounded-lg opacity-80"></div>
                      <div className="absolute -top-2 -left-2 w-6 h-6 border-l-4 border-t-4 border-white"></div>
                      <div className="absolute -top-2 -right-2 w-6 h-6 border-r-4 border-t-4 border-white"></div>
                      <div className="absolute -bottom-2 -left-2 w-6 h-6 border-l-4 border-b-4 border-white"></div>
                      <div className="absolute -bottom-2 -right-2 w-6 h-6 border-r-4 border-b-4 border-white"></div>
                      
                      {isProcessing && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-lg">
                          <div className="text-white text-center">
                            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2" />
                            <p className="text-sm">Processing...</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex justify-center">
                  <button
                    onClick={isScanning ? stopScanning : startScanning}
                    disabled={!currentLocation || isProcessing}
                    className={`flex items-center space-x-2 px-6 py-3 rounded-md font-medium transition-colors ${
                      isScanning
                        ? 'bg-red-600 hover:bg-red-700 text-white'
                        : 'bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50'
                    }`}
                  >
                    <Scan className="w-4 h-4" />
                    <span>{isScanning ? 'Stop Scanning' : 'Start Scanning'}</span>
                  </button>
                </div>
              </div>

              {/* Scan Result */}
              {scanResult && (
                <div className="max-w-2xl mx-auto">
                  <div className={`p-4 rounded-lg border-l-4 ${
                    scanResult.isDiversion 
                      ? 'bg-red-50 border-red-500' 
                      : 'bg-green-50 border-green-500'
                  }`}>
                    <div className="flex items-center space-x-3 mb-3">
                      {scanResult.isDiversion ? (
                        <XCircle className="w-6 h-6 text-red-600" />
                      ) : (
                        <CheckCircle className="w-6 h-6 text-green-600" />
                      )}
                      <h3 className={`text-lg font-semibold ${
                        scanResult.isDiversion ? 'text-red-900' : 'text-green-900'
                      }`}>
                        {scanResult.isDiversion ? 'DIVERSION DETECTED' : 'DELIVERY CONFIRMED'}
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="font-medium text-gray-700">Medicine:</p>
                        <p className="text-gray-900">{scanResult.transaction.medicine_name}</p>
                      </div>
                      <div>
                        <p className="font-medium text-gray-700">Batch:</p>
                        <p className="text-gray-900">{scanResult.transaction.batch_number}</p>
                      </div>
                      <div>
                        <p className="font-medium text-gray-700">Assigned District:</p>
                        <p className="text-gray-900">{scanResult.transaction.assigned_district}</p>
                      </div>
                      <div>
                        <p className="font-medium text-gray-700">Scanned District:</p>
                        <p className="text-gray-900">{scanResult.transaction.scanned_district}</p>
                      </div>
                      {scanResult.isDiversion && (
                        <div className="sm:col-span-2">
                          <p className="font-medium text-gray-700">Diversion Distance:</p>
                          <p className="text-red-600 font-semibold">{scanResult.diversionDistance.toFixed(1)} km</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Transactions Tab */}
          {activeTab === 'transactions' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Distribution Transactions</h2>
                <button
                  onClick={exportTransactions}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Export</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px] bg-white border border-gray-200 rounded-lg">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Medicine</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Districts</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Timestamp</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">GPS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {transactions.map((transaction) => (
                      <tr key={transaction.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-gray-900">{transaction.medicine_name}</p>
                            <p className="text-sm text-gray-600">Batch: {transaction.batch_number}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm">
                            <p><span className="font-medium">Assigned:</span> {transaction.assigned_district}</p>
                            <p><span className="font-medium">Scanned:</span> {transaction.scanned_district}</p>
                            {transaction.diversion_distance && (
                              <p className="text-red-600">Distance: {transaction.diversion_distance.toFixed(1)}km</p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {getStatusBadge(transaction.status)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {new Date(transaction.scan_timestamp).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          <div>
                            <p>{transaction.gps_coordinates.latitude.toFixed(4)}</p>
                            <p>{transaction.gps_coordinates.longitude.toFixed(4)}</p>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {transactions.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No transactions recorded yet</p>
                    <p className="text-sm">Start scanning QR codes to track distributions</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Alerts Tab */}
          {activeTab === 'alerts' && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Security Alerts</h2>
              
              <div className="space-y-3">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-4 rounded-lg border-l-4 ${
                      alert.severity === 'high' 
                        ? 'bg-red-50 border-red-500' 
                        : alert.severity === 'medium'
                        ? 'bg-yellow-50 border-yellow-500'
                        : 'bg-blue-50 border-blue-500'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <AlertTriangle className={`w-5 h-5 mt-0.5 ${
                        alert.severity === 'high' ? 'text-red-600' : 
                        alert.severity === 'medium' ? 'text-yellow-600' : 'text-blue-600'
                      }`} />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium text-gray-900">{alert.title}</h3>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            alert.status === 'active' 
                              ? 'bg-red-100 text-red-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {alert.status.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 mt-1">{alert.message}</p>
                        <p className="text-xs text-gray-500 mt-2">
                          {new Date(alert.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}

                {alerts.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No alerts at this time</p>
                    <p className="text-sm">System is monitoring for diversions</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">Distribution Analytics</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium text-gray-900 mb-3">Success Rate</h3>
                  <div className="text-3xl font-bold text-green-600">
                    {stats.totalScans > 0 ? ((stats.successfulDeliveries / stats.totalScans) * 100).toFixed(1) : 0}%
                  </div>
                  <p className="text-sm text-gray-600">
                    {stats.successfulDeliveries} of {stats.totalScans} deliveries successful
                  </p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium text-gray-900 mb-3">Diversion Rate</h3>
                  <div className="text-3xl font-bold text-red-600">
                    {stats.totalScans > 0 ? ((stats.diversionsDetected / stats.totalScans) * 100).toFixed(1) : 0}%
                  </div>
                  <p className="text-sm text-gray-600">
                    {stats.diversionsDetected} diversions detected
                  </p>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-3">Recent Activity</h3>
                <div className="space-y-2">
                  {transactions.slice(0, 5).map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between text-sm">
                      <span>{transaction.medicine_name}</span>
                      <span className="text-gray-500">
                        {new Date(transaction.scan_timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};