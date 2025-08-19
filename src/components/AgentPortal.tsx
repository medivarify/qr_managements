import React, { useState, useEffect, useRef } from 'react';
import { 
  Package, 
  Scan, 
  MapPin, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Truck, 
  Navigation,
  Shield,
  Eye,
  Download,
  RefreshCw,
  Bell,
  Activity,
  User,
  Building,
  Route,
  Camera,
  FileText,
  Zap
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

interface AgentTransaction {
  id: string;
  qr_code_id: string;
  medicine_name: string;
  batch_number: string;
  assigned_district: string;
  current_district: string;
  pickup_location: GPSCoordinates;
  delivery_location?: GPSCoordinates;
  pickup_timestamp: string;
  delivery_timestamp?: string;
  agent_id: string;
  distributor_name: string;
  destination_pharmacy: string;
  status: 'picked_up' | 'in_transit' | 'delivered' | 'diverted' | 'missing';
  custody_chain: CustodyRecord[];
  tamper_proof_log: TamperProofRecord[];
  diversion_distance?: number;
  alert_triggered: boolean;
}

interface CustodyRecord {
  id: string;
  action: 'pickup' | 'delivery' | 'scan_verification';
  location: GPSCoordinates;
  timestamp: string;
  agent_id: string;
  notes?: string;
  photo_evidence?: string;
}

interface TamperProofRecord {
  id: string;
  event_type: 'custody_taken' | 'location_update' | 'delivery_attempt' | 'alert_triggered';
  gps_coordinates: GPSCoordinates;
  timestamp: string;
  hash: string; // Cryptographic hash for tamper-proofing
  previous_hash?: string;
}

interface DistrictMapping {
  name: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  radius: number; // km
}

interface AgentPortalProps {
  qrData: any[];
}

export const AgentPortal: React.FC<AgentPortalProps> = ({ qrData }) => {
  const [activeTab, setActiveTab] = useState<'pickup' | 'delivery' | 'custody' | 'alerts' | 'proof'>('pickup');
  const [isScanning, setIsScanning] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<GPSCoordinates | null>(null);
  const [locationError, setLocationError] = useState<string>('');
  const [transactions, setTransactions] = useState<AgentTransaction[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [scanResult, setScanResult] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [agentInfo, setAgentInfo] = useState({
    id: 'AGENT-001',
    name: 'Mohammad Rahman',
    phone: '+880-1712-345678',
    district: 'Dhaka',
    vehicle: 'Motorcycle - DHK-1234'
  });
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
    startLocationTracking();
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

  const startLocationTracking = () => {
    // Track location every 30 seconds for tamper-proof logging
    const trackingInterval = setInterval(() => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const location: GPSCoordinates = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              timestamp: new Date().toISOString()
            };
            
            // Create tamper-proof log entry
            createTamperProofLog('location_update', location);
          },
          (error) => console.warn('Location tracking error:', error),
          { enableHighAccuracy: true, timeout: 5000, maximumAge: 30000 }
        );
      }
    }, 30000); // Every 30 seconds

    return () => clearInterval(trackingInterval);
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

  const createTamperProofLog = (eventType: TamperProofRecord['event_type'], location: GPSCoordinates, additionalData?: any) => {
    const logEntry: TamperProofRecord = {
      id: crypto.randomUUID(),
      event_type: eventType,
      gps_coordinates: location,
      timestamp: new Date().toISOString(),
      hash: generateHash({
        eventType,
        location,
        timestamp: new Date().toISOString(),
        agentId: agentInfo.id,
        additionalData
      })
    };

    // In a real implementation, this would be stored in a blockchain or secure database
    console.log('Tamper-proof log created:', logEntry);
    return logEntry;
  };

  const generateHash = (data: any): string => {
    // Simple hash generation for demo - in production, use proper cryptographic hashing
    return btoa(JSON.stringify(data) + Date.now()).substring(0, 16);
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
      const currentDistrict = detectDistrict(currentLocation);
      
      // Extract assigned district from QR data
      const assignedDistrict = parsedQR.parsed_data?.assigned_district || 
                              parsedQR.parsed_data?.destination_district || 
                              'Unknown';

      // Check for diversion
      const isDiversion = currentDistrict !== assignedDistrict && 
                         assignedDistrict !== 'Unknown' && 
                         currentDistrict !== 'Unknown';

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

      // Determine action type based on current tab
      const actionType = activeTab === 'pickup' ? 'pickup' : 'delivery';
      
      // Create custody record
      const custodyRecord: CustodyRecord = {
        id: crypto.randomUUID(),
        action: actionType,
        location: currentLocation,
        timestamp: new Date().toISOString(),
        agent_id: agentInfo.id,
        notes: `${actionType === 'pickup' ? 'Picked up from distributor' : 'Delivered to pharmacy'}`
      };

      // Create tamper-proof log
      const tamperProofLog = createTamperProofLog(
        actionType === 'pickup' ? 'custody_taken' : 'delivery_attempt',
        currentLocation,
        { qrCodeId: parsedQR.id, medicineData: parsedQR.parsed_data }
      );

      // Create or update transaction record
      const existingTransaction = transactions.find(t => t.qr_code_id === parsedQR.id);
      
      let transaction: AgentTransaction;
      
      if (existingTransaction && actionType === 'delivery') {
        // Update existing transaction for delivery
        transaction = {
          ...existingTransaction,
          delivery_location: currentLocation,
          delivery_timestamp: new Date().toISOString(),
          current_district: currentDistrict,
          status: isDiversion ? 'diverted' : 'delivered',
          diversion_distance: diversionDistance,
          alert_triggered: isDiversion,
          custody_chain: [...existingTransaction.custody_chain, custodyRecord],
          tamper_proof_log: [...existingTransaction.tamper_proof_log, tamperProofLog]
        };
      } else {
        // Create new transaction for pickup
        transaction = {
          id: crypto.randomUUID(),
          qr_code_id: parsedQR.id || crypto.randomUUID(),
          medicine_name: parsedQR.parsed_data?.medicine_name || 'Unknown Medicine',
          batch_number: parsedQR.parsed_data?.batch_number || 'Unknown Batch',
          assigned_district: assignedDistrict,
          current_district: currentDistrict,
          pickup_location: currentLocation,
          pickup_timestamp: new Date().toISOString(),
          agent_id: agentInfo.id,
          distributor_name: 'Dhaka Medical Distributors',
          destination_pharmacy: parsedQR.parsed_data?.destination_pharmacy || 'Local Pharmacy',
          status: 'picked_up',
          custody_chain: [custodyRecord],
          tamper_proof_log: [tamperProofLog],
          diversion_distance: diversionDistance,
          alert_triggered: isDiversion
        };
      }

      // Save to database
      await saveTransaction(transaction);
      
      // Update local state
      if (existingTransaction) {
        setTransactions(prev => prev.map(t => t.id === transaction.id ? transaction : t));
      } else {
        setTransactions(prev => [transaction, ...prev]);
      }
      
      // Set scan result
      setScanResult({
        ...parsedQR,
        transaction,
        isDiversion,
        diversionDistance,
        actionType
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

  const saveTransaction = async (transaction: AgentTransaction) => {
    try {
      // In a real app, this would save to an agent_transactions table
      console.log('Saving agent transaction:', transaction);
      
      // For demo, save to localStorage
      const existingTransactions = JSON.parse(localStorage.getItem('agent_transactions') || '[]');
      const updatedTransactions = existingTransactions.filter((t: AgentTransaction) => t.id !== transaction.id);
      updatedTransactions.unshift(transaction);
      localStorage.setItem('agent_transactions', JSON.stringify(updatedTransactions));
    } catch (error) {
      console.error('Failed to save transaction:', error);
    }
  };

  const loadTransactions = () => {
    try {
      const saved = JSON.parse(localStorage.getItem('agent_transactions') || '[]');
      setTransactions(saved);
    } catch (error) {
      console.error('Failed to load transactions:', error);
    }
  };

  const triggerDiversionAlert = (transaction: AgentTransaction) => {
    const alert = {
      id: crypto.randomUUID(),
      type: 'diversion',
      severity: 'high',
      title: 'Medicine Diversion Alert - Agent Level',
      message: `Agent ${agentInfo.name} detected ${transaction.medicine_name} in ${transaction.current_district} but assigned to ${transaction.assigned_district}`,
      transaction_id: transaction.id,
      timestamp: new Date().toISOString(),
      distance: transaction.diversion_distance,
      status: 'active',
      agent_id: agentInfo.id
    };

    setAlerts(prev => [alert, ...prev]);
    
    // In a real app, this would immediately notify manufacturer and distributor
    console.log('AGENT DIVERSION ALERT:', alert);
  };

  const generateAlerts = () => {
    // Generate sample alerts for demo
    const sampleAlerts = [
      {
        id: '1',
        type: 'diversion',
        severity: 'high',
        title: 'Potential Route Deviation',
        message: 'Current location differs from expected delivery route',
        timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
        status: 'active'
      },
      {
        id: '2',
        type: 'custody',
        severity: 'medium',
        title: 'Extended Transit Time',
        message: 'Package in custody longer than expected delivery window',
        timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        status: 'resolved'
      }
    ];
    
    setAlerts(sampleAlerts);
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      picked_up: 'bg-blue-100 text-blue-800',
      in_transit: 'bg-yellow-100 text-yellow-800',
      delivered: 'bg-green-100 text-green-800',
      diverted: 'bg-red-100 text-red-800',
      missing: 'bg-gray-100 text-gray-800'
    };

    const icons = {
      picked_up: <Package className="w-3 h-3" />,
      in_transit: <Truck className="w-3 h-3" />,
      delivered: <CheckCircle className="w-3 h-3" />,
      diverted: <XCircle className="w-3 h-3" />,
      missing: <AlertTriangle className="w-3 h-3" />
    };

    return (
      <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
        {icons[status as keyof typeof icons]}
        <span>{status.replace('_', ' ').toUpperCase()}</span>
      </span>
    );
  };

  const exportCustodyChain = (transaction: AgentTransaction) => {
    const custodyData = {
      transaction_id: transaction.id,
      medicine: transaction.medicine_name,
      batch: transaction.batch_number,
      agent: agentInfo,
      custody_chain: transaction.custody_chain,
      tamper_proof_log: transaction.tamper_proof_log,
      export_timestamp: new Date().toISOString(),
      verification_hash: generateHash({
        transactionId: transaction.id,
        custodyChain: transaction.custody_chain,
        tamperProofLog: transaction.tamper_proof_log
      })
    };

    const dataStr = JSON.stringify(custodyData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `custody_chain_${transaction.id}_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const stats = {
    totalPickups: transactions.filter(t => t.status !== 'delivered').length,
    totalDeliveries: transactions.filter(t => t.status === 'delivered').length,
    inTransit: transactions.filter(t => t.status === 'picked_up' || t.status === 'in_transit').length,
    diversionsDetected: transactions.filter(t => t.status === 'diverted').length
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <User className="w-6 h-6 text-blue-600" />
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Agent Portal</h1>
              <p className="text-sm text-gray-600">Field delivery agent - Last mile medicine distribution</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={getCurrentLocation}
              className="flex items-center space-x-1 px-3 py-2 text-blue-600 hover:text-blue-800 transition-colors"
            >
              <Navigation className="w-4 h-4" />
              <span className="hidden sm:inline">Refresh GPS</span>
            </button>
          </div>
        </div>

        {/* Agent Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
          <div>
            <p className="text-xs text-gray-600">Agent ID</p>
            <p className="font-medium text-gray-900">{agentInfo.id}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Name</p>
            <p className="font-medium text-gray-900">{agentInfo.name}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Phone</p>
            <p className="font-medium text-gray-900">{agentInfo.phone}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Vehicle</p>
            <p className="font-medium text-gray-900">{agentInfo.vehicle}</p>
          </div>
        </div>

        {/* Location Status */}
        <div className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg mt-4">
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
                <p className="text-sm font-medium text-red-600">GPS Required</p>
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
              <p className="text-sm font-medium text-gray-600">Pickups</p>
              <p className="text-2xl font-bold text-blue-600">{stats.totalPickups}</p>
            </div>
            <Package className="w-8 h-8 text-blue-500 opacity-80" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-md border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Delivered</p>
              <p className="text-2xl font-bold text-green-600">{stats.totalDeliveries}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500 opacity-80" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-md border-l-4 border-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">In Transit</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.inTransit}</p>
            </div>
            <Truck className="w-8 h-8 text-yellow-500 opacity-80" />
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
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'pickup', label: 'Pickup Scan', icon: Package },
              { id: 'delivery', label: 'Delivery Scan', icon: Building },
              { id: 'custody', label: 'Custody Chain', icon: Shield },
              { id: 'alerts', label: 'Alerts', icon: Bell },
              { id: 'proof', label: 'Tamper Proof', icon: FileText }
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
          {/* Pickup Scan Tab */}
          {activeTab === 'pickup' && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Medicine Pickup Scanner</h2>
                <p className="text-sm text-gray-600">Scan medicine boxes when picking up from distributor warehouse</p>
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
                    <span>{isScanning ? 'Stop Scanning' : 'Start Pickup Scan'}</span>
                  </button>
                </div>
              </div>

              {/* Scan Result */}
              {scanResult && scanResult.actionType === 'pickup' && (
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
                        {scanResult.isDiversion ? 'DIVERSION WARNING' : 'PICKUP CONFIRMED'}
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
                        <p className="font-medium text-gray-700">Current District:</p>
                        <p className="text-gray-900">{scanResult.transaction.current_district}</p>
                      </div>
                      {scanResult.isDiversion && (
                        <div className="sm:col-span-2">
                          <p className="font-medium text-gray-700">Warning:</p>
                          <p className="text-red-600 font-semibold">
                            This medicine is assigned to {scanResult.transaction.assigned_district} but you're in {scanResult.transaction.current_district}. 
                            Distance: {scanResult.diversionDistance.toFixed(1)} km
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Delivery Scan Tab */}
          {activeTab === 'delivery' && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Medicine Delivery Scanner</h2>
                <p className="text-sm text-gray-600">Scan medicine boxes when delivering to pharmacy/clinic</p>
              </div>

              {/* Scanner Interface - Same as pickup but different processing */}
              <div className="max-w-md mx-auto">
                <div className="relative bg-black rounded-lg overflow-hidden">
                  <video
                    ref={videoRef}
                    className="w-full h-64 object-cover"
                    autoPlay
                    playsInline
                    muted
                  />
                  
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
                        : 'bg-green-600 hover:bg-green-700 text-white disabled:opacity-50'
                    }`}
                  >
                    <Building className="w-4 h-4" />
                    <span>{isScanning ? 'Stop Scanning' : 'Start Delivery Scan'}</span>
                  </button>
                </div>
              </div>

              {/* Delivery Result */}
              {scanResult && scanResult.actionType === 'delivery' && (
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
                        {scanResult.isDiversion ? 'DELIVERY BLOCKED - DIVERSION' : 'DELIVERY COMPLETED'}
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="font-medium text-gray-700">Medicine:</p>
                        <p className="text-gray-900">{scanResult.transaction.medicine_name}</p>
                      </div>
                      <div>
                        <p className="font-medium text-gray-700">Destination:</p>
                        <p className="text-gray-900">{scanResult.transaction.destination_pharmacy}</p>
                      </div>
                      <div>
                        <p className="font-medium text-gray-700">Expected District:</p>
                        <p className="text-gray-900">{scanResult.transaction.assigned_district}</p>
                      </div>
                      <div>
                        <p className="font-medium text-gray-700">Delivery District:</p>
                        <p className="text-gray-900">{scanResult.transaction.current_district}</p>
                      </div>
                      {scanResult.isDiversion && (
                        <div className="sm:col-span-2 p-3 bg-red-100 rounded-md">
                          <p className="font-medium text-red-800">⚠️ DELIVERY BLOCKED</p>
                          <p className="text-red-700 text-sm mt-1">
                            This medicine cannot be delivered here. It's assigned to {scanResult.transaction.assigned_district} 
                            but you're attempting delivery in {scanResult.transaction.current_district}. 
                            Authorities have been notified.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Custody Chain Tab */}
          {activeTab === 'custody' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Custody Chain Records</h2>
              </div>

              <div className="space-y-4">
                {transactions.map((transaction) => (
                  <div key={transaction.id} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-medium text-gray-900">{transaction.medicine_name}</h3>
                        <p className="text-sm text-gray-600">Batch: {transaction.batch_number}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getStatusBadge(transaction.status)}
                        <button
                          onClick={() => exportCustodyChain(transaction)}
                          className="flex items-center space-x-1 px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                        >
                          <Download className="w-3 h-3" />
                          <span>Export</span>
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-gray-700">Custody Events:</h4>
                      {transaction.custody_chain.map((record, index) => (
                        <div key={record.id} className="flex items-start space-x-3 text-sm">
                          <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                          <div className="flex-1">
                            <p className="font-medium text-gray-900 capitalize">{record.action.replace('_', ' ')}</p>
                            <p className="text-gray-600">{record.notes}</p>
                            <p className="text-xs text-gray-500">
                              {new Date(record.timestamp).toLocaleString()} - 
                              GPS: {record.location.latitude.toFixed(4)}, {record.location.longitude.toFixed(4)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {transactions.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No custody records yet</p>
                    <p className="text-sm">Start scanning to create custody chain</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Alerts Tab */}
          {activeTab === 'alerts' && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Agent Alerts</h2>
              
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
                    <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No alerts at this time</p>
                    <p className="text-sm">System is monitoring your deliveries</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tamper Proof Tab */}
          {activeTab === 'proof' && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Tamper-Proof Evidence</h2>
              <p className="text-sm text-gray-600">
                Cryptographically secured logs to prove your innocence in case of disputes
              </p>
              
              <div className="space-y-4">
                {transactions.map((transaction) => (
                  <div key={transaction.id} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-medium text-gray-900">{transaction.medicine_name}</h3>
                        <p className="text-sm text-gray-600">Transaction ID: {transaction.id}</p>
                      </div>
                      <div className="text-xs text-gray-500">
                        {transaction.tamper_proof_log.length} log entries
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-gray-700">Tamper-Proof Log:</h4>
                      {transaction.tamper_proof_log.slice(0, 3).map((log, index) => (
                        <div key={log.id} className="bg-white p-3 rounded border text-xs">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-gray-900 capitalize">
                              {log.event_type.replace('_', ' ')}
                            </span>
                            <span className="text-gray-500">{new Date(log.timestamp).toLocaleString()}</span>
                          </div>
                          <div className="text-gray-600">
                            <p>GPS: {log.gps_coordinates.latitude.toFixed(6)}, {log.gps_coordinates.longitude.toFixed(6)}</p>
                            <p>Hash: {log.hash}</p>
                          </div>
                        </div>
                      ))}
                      {transaction.tamper_proof_log.length > 3 && (
                        <p className="text-xs text-gray-500 text-center">
                          +{transaction.tamper_proof_log.length - 3} more entries
                        </p>
                      )}
                    </div>

                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <button
                        onClick={() => exportCustodyChain(transaction)}
                        className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm"
                      >
                        <FileText className="w-4 h-4" />
                        <span>Export Tamper-Proof Evidence</span>
                      </button>
                    </div>
                  </div>
                ))}

                {transactions.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No tamper-proof logs yet</p>
                    <p className="text-sm">Logs will be created automatically during scans</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};