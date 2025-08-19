import React, { useState, useMemo, useEffect } from 'react';
import { 
  Factory, 
  MapPin, 
  TrendingUp, 
  AlertTriangle, 
  Package, 
  Truck,
  Calendar,
  BarChart3,
  Filter,
  Search,
  Download,
  Clock,
  Shield,
  Users,
  Target,
  Activity,
  Bell,
  CheckCircle,
  XCircle,
  Eye,
  RefreshCw,
  Globe,
  Zap,
  Award,
  TrendingDown,
  QrCode,
  Plus,
  Printer,
  FileText,
  Trash2,
  Check,
  Copy
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { QRCodeData, DistrictData, ManufacturerStats } from '../types';

interface ManufacturerDashboardProps {
  qrData: QRCodeData[];
}

interface EnhancedDistrictData extends DistrictData {
  averageDeliveryTime: number;
  qualityScore: number;
  complianceRate: number;
  riskLevel: 'low' | 'medium' | 'high';
  trend: 'up' | 'down' | 'stable';
  lastActivity: string;
  medicineTypes: Record<string, number>;
}

interface AlertData {
  id: string;
  type: 'expiry' | 'quality' | 'compliance' | 'delivery';
  district: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
}

export const ManufacturerDashboard: React.FC<ManufacturerDashboardProps> = ({ qrData }) => {
  const [selectedDistrict, setSelectedDistrict] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [timeFilter, setTimeFilter] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [viewMode, setViewMode] = useState<'cards' | 'table' | 'map'>('cards');
  const [selectedMetric, setSelectedMetric] = useState<'volume' | 'quality' | 'compliance' | 'delivery'>('volume');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [showQuickGenerate, setShowQuickGenerate] = useState(false);
  const [generatedQRs, setGeneratedQRs] = useState<Array<{
    id: string;
    qrData: string;
    medicineData: any;
    timestamp: string;
  }>>([]);
  const [batchSize, setBatchSize] = useState(10);
  const [selectedDistrictForGeneration, setSelectedDistrictForGeneration] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<AlertData[]>([]);

  // Auto-refresh functionality
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        setLastRefresh(new Date());
        setAlerts(generateSystemAlerts(enhancedDistricts));
      }, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  // Enhanced Indian districts with regional data
  const indianDistricts = [
    { district: 'Mumbai', state: 'Maharashtra', region: 'West', population: 12442373 },
    { district: 'Delhi', state: 'Delhi', region: 'North', population: 11034555 },
    { district: 'Bangalore', state: 'Karnataka', region: 'South', population: 8443675 },
    { district: 'Chennai', state: 'Tamil Nadu', region: 'South', population: 7088000 },
    { district: 'Kolkata', state: 'West Bengal', region: 'East', population: 4496694 },
    { district: 'Hyderabad', state: 'Telangana', region: 'South', population: 6809970 },
    { district: 'Pune', state: 'Maharashtra', region: 'West', population: 3124458 },
    { district: 'Ahmedabad', state: 'Gujarat', region: 'West', population: 5633927 },
    { district: 'Jaipur', state: 'Rajasthan', region: 'North', population: 3046163 },
    { district: 'Lucknow', state: 'Uttar Pradesh', region: 'North', population: 2817105 },
    { district: 'Kanpur', state: 'Uttar Pradesh', region: 'North', population: 2767031 },
    { district: 'Nagpur', state: 'Maharashtra', region: 'West', population: 2405421 },
    { district: 'Indore', state: 'Madhya Pradesh', region: 'Central', population: 1964086 },
    { district: 'Thane', state: 'Maharashtra', region: 'West', population: 1841488 },
    { district: 'Bhopal', state: 'Madhya Pradesh', region: 'Central', population: 1798218 },
    { district: 'Visakhapatnam', state: 'Andhra Pradesh', region: 'South', population: 1730320 },
    { district: 'Pimpri-Chinchwad', state: 'Maharashtra', region: 'West', population: 1729359 },
    { district: 'Patna', state: 'Bihar', region: 'East', population: 1684222 },
    { district: 'Vadodara', state: 'Gujarat', region: 'West', population: 1666703 },
    { district: 'Ghaziabad', state: 'Uttar Pradesh', region: 'North', population: 1636068 }
  ];

  // Generate alerts based on data
  const generateAlerts = (districts: EnhancedDistrictData[]): AlertData[] => {
    const alerts: AlertData[] = [];
    
    districts.forEach(district => {
      // Expiry alerts
      if (district.expiredMedicines > 5) {
        alerts.push({
          id: `exp-${district.district}`,
          type: 'expiry',
          district: district.district,
          message: `${district.expiredMedicines} medicines expired in ${district.district}`,
          severity: district.expiredMedicines > 20 ? 'critical' : district.expiredMedicines > 10 ? 'high' : 'medium',
          timestamp: new Date().toISOString()
        });
      }

      // Quality alerts
      if (district.qualityScore < 70) {
        alerts.push({
          id: `qual-${district.district}`,
          type: 'quality',
          district: district.district,
          message: `Quality score below threshold in ${district.district} (${district.qualityScore}%)`,
          severity: district.qualityScore < 50 ? 'critical' : 'high',
          timestamp: new Date().toISOString()
        });
      }

      // Compliance alerts
      if (district.complianceRate < 80) {
        alerts.push({
          id: `comp-${district.district}`,
          type: 'compliance',
          district: district.district,
          message: `Compliance rate low in ${district.district} (${district.complianceRate}%)`,
          severity: district.complianceRate < 60 ? 'high' : 'medium',
          timestamp: new Date().toISOString()
        });
      }

      // Delivery alerts
      if (district.averageDeliveryTime > 7) {
        alerts.push({
          id: `del-${district.district}`,
          type: 'delivery',
          district: district.district,
          message: `Delivery delays in ${district.district} (${district.averageDeliveryTime} days avg)`,
          severity: district.averageDeliveryTime > 14 ? 'high' : 'medium',
          timestamp: new Date().toISOString()
        });
      }
    });

    return alerts.sort((a, b) => {
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });
  };

  // Generate random medicine data
  const generateRandomMedicine = (destinationDistrict?: string) => {
    const dosageForms = ['Tablet', 'Capsule', 'Syrup', 'Injection', 'Cream', 'Drops'];
    const manufacturers = ['Pfizer Inc', 'Johnson & Johnson', 'Novartis AG', 'Roche Holding', 'Merck & Co'];
    const medicines = ['Amoxicillin', 'Ibuprofen', 'Metformin', 'Lisinopril', 'Atorvastatin', 'Paracetamol', 'Aspirin', 'Omeprazole'];
    const strengths = ['250mg', '500mg', '10mg', '20mg', '100mg', '5mg', '1mg'];
    
    const randomDosageForm = dosageForms[Math.floor(Math.random() * dosageForms.length)];
    const randomManufacturer = manufacturers[Math.floor(Math.random() * manufacturers.length)];
    const randomMedicine = medicines[Math.floor(Math.random() * medicines.length)];
    const randomStrength = strengths[Math.floor(Math.random() * strengths.length)];
    const medicineId = `MED-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;
    const batchNumber = `BATCH-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    const lotNumber = `LOT-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    const ndcNumber = `${Math.floor(Math.random() * 99999).toString().padStart(5, '0')}-${Math.floor(Math.random() * 999).toString().padStart(3, '0')}-${Math.floor(Math.random() * 99).toString().padStart(2, '0')}`;
    
    const today = new Date();
    const manufacturingDate = today.toISOString().split('T')[0];
    const expiryDate = new Date(today.getTime() + (730 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0]; // 2 years

    // Select destination district
    const district = destinationDistrict || indianDistricts[Math.floor(Math.random() * indianDistricts.length)].district;

    return {
      medicine_id: medicineId,
      medicine_name: randomMedicine,
      batch_number: batchNumber,
      manufacturing_date: manufacturingDate,
      expiry_date: expiryDate,
      manufacturer: randomManufacturer,
      dosage_form: randomDosageForm,
      strength: randomStrength,
      active_ingredient: randomMedicine,
      ndc_number: ndcNumber,
      lot_number: lotNumber,
      storage_conditions: 'Store at room temperature (20-25°C)',
      prescription_required: Math.random() > 0.5,
      destination_district: district,
      tracking_id: `${medicineId}-${Date.now()}`,
      verification_code: Math.random().toString(36).substr(2, 8).toUpperCase()
    };
  };

  // Generate single QR code
  const generateSingleQR = () => {
    const medicineData = generateRandomMedicine(selectedDistrictForGeneration || undefined);
    const qrData = {
      type: 'medicine_tracking',
      timestamp: new Date().toISOString(),
      data: medicineData
    };
    
    const newQR = {
      id: crypto.randomUUID(),
      qrData: JSON.stringify(qrData),
      medicineData,
      timestamp: new Date().toISOString()
    };
    
    setGeneratedQRs(prev => [newQR, ...prev]);
  };

  // Generate batch QR codes
  const generateBatchQRs = () => {
    const newQRs = [];
    for (let i = 0; i < batchSize; i++) {
      const medicineData = generateRandomMedicine(selectedDistrictForGeneration || undefined);
      const qrData = {
        type: 'medicine_tracking',
        timestamp: new Date().toISOString(),
        data: medicineData
      };
      
      newQRs.push({
        id: crypto.randomUUID(),
        qrData: JSON.stringify(qrData),
        medicineData,
        timestamp: new Date().toISOString()
      });
    }
    
    setGeneratedQRs(prev => [...newQRs, ...prev]);
  };

  // Print single QR code
  const printSingleQR = (qr: any) => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Medicine QR Code - ${qr.medicineData.medicine_name}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; text-align: center; }
              .qr-container { border: 2px solid #000; padding: 20px; margin: 20px auto; width: 300px; }
              .medicine-info { margin-bottom: 15px; text-align: left; }
              .medicine-info h3 { margin: 0 0 10px 0; text-align: center; }
              .info-row { margin: 5px 0; }
              .qr-code { text-align: center; margin: 15px 0; }
            </style>
          </head>
          <body>
            <div class="qr-container">
              <div class="medicine-info">
                <h3>${qr.medicineData.medicine_name}</h3>
                <div class="info-row"><strong>ID:</strong> ${qr.medicineData.medicine_id}</div>
                <div class="info-row"><strong>Batch:</strong> ${qr.medicineData.batch_number}</div>
                <div class="info-row"><strong>Manufacturer:</strong> ${qr.medicineData.manufacturer}</div>
                <div class="info-row"><strong>Expiry:</strong> ${qr.medicineData.expiry_date}</div>
                <div class="info-row"><strong>Destination:</strong> ${qr.medicineData.destination_district}</div>
              </div>
              <div class="qr-code">
                <div id="qr-${qr.id}"></div>
              </div>
            </div>
            <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"></script>
            <script>
              QRCode.toCanvas(document.getElementById('qr-${qr.id}'), '${qr.qrData}', { width: 200 }, function (error) {
                if (error) console.error(error);
                setTimeout(() => window.print(), 500);
              });
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  // Print all QR codes
  const printAllQRs = () => {
    if (generatedQRs.length === 0) return;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const qrElements = generatedQRs.map(qr => `
        <div class="qr-item">
          <div class="medicine-info">
            <h4>${qr.medicineData.medicine_name}</h4>
            <div><strong>ID:</strong> ${qr.medicineData.medicine_id}</div>
            <div><strong>Batch:</strong> ${qr.medicineData.batch_number}</div>
            <div><strong>Destination:</strong> ${qr.medicineData.destination_district}</div>
          </div>
          <div class="qr-code" id="qr-${qr.id}"></div>
        </div>
      `).join('');
      
      printWindow.document.write(`
        <html>
          <head>
            <title>Medicine QR Codes Batch Print</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 10px; }
              .qr-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
              .qr-item { border: 1px solid #000; padding: 15px; text-align: center; }
              .medicine-info { margin-bottom: 10px; font-size: 12px; }
              .medicine-info h4 { margin: 0 0 5px 0; font-size: 14px; }
              .qr-code { margin: 10px 0; }
              @media print { .qr-grid { grid-template-columns: repeat(2, 1fr); } }
            </style>
          </head>
          <body>
            <h2 style="text-align: center;">Medicine QR Codes - Batch Print</h2>
            <div class="qr-grid">
              ${qrElements}
            </div>
            <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"></script>
            <script>
              const qrs = ${JSON.stringify(generatedQRs)};
              let completed = 0;
              qrs.forEach(qr => {
                QRCode.toCanvas(document.getElementById('qr-' + qr.id), qr.qrData, { width: 120 }, function (error) {
                  if (error) console.error(error);
                  completed++;
                  if (completed === qrs.length) {
                    setTimeout(() => window.print(), 500);
                  }
                });
              });
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  // Copy QR data to clipboard
  const copyQRData = async (qrData: string, id: string) => {
    try {
      await navigator.clipboard.writeText(qrData);
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    } catch (error) {
      console.error('Failed to copy QR data:', error);
    }
  };

  // Export generated QRs
  const exportGeneratedQRs = () => {
    if (generatedQRs.length === 0) return;
    
    const exportData = {
      timestamp: new Date().toISOString(),
      total_qrs: generatedQRs.length,
      qr_codes: generatedQRs.map(qr => ({
        id: qr.id,
        medicine_data: qr.medicineData,
        qr_data: qr.qrData,
        generated_at: qr.timestamp
      }))
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `generated-qr-codes-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Clear all generated QRs
  const clearAllQRs = () => {
    setGeneratedQRs([]);
  };

  const generateSystemAlerts = (districts: DistrictData[]): AlertData[] => {
    return [];
  };

  // Enhanced manufacturer statistics
  const manufacturerStats = useMemo((): ManufacturerStats & {
    enhancedDistricts: EnhancedDistrictData[];
    alerts: AlertData[];
    regionalStats: Record<string, any>;
    performanceMetrics: any;
  } => {
    const now = new Date();
    const timeFilterDays = timeFilter === '7d' ? 7 : timeFilter === '30d' ? 30 : timeFilter === '90d' ? 90 : 0;
    
    const filteredData = timeFilterDays > 0 
      ? qrData.filter(qr => {
          const qrDate = new Date(qr.scan_timestamp);
          const daysDiff = (now.getTime() - qrDate.getTime()) / (1000 * 60 * 60 * 24);
          return daysDiff <= timeFilterDays;
        })
      : qrData;

    // Enhanced district statistics
    const districtStats = new Map<string, EnhancedDistrictData>();
    
    filteredData.forEach(qr => {
      const districtIndex = Math.abs(qr.id.split('').reduce((a, b) => a + b.charCodeAt(0), 0)) % indianDistricts.length;
      const district = indianDistricts[districtIndex];
      
      const key = district.district;
      const existing = districtStats.get(key) || {
        district: district.district,
        state: district.state,
        totalMedicines: 0,
        expiredMedicines: 0,
        recentShipments: 0,
        lastShipmentDate: undefined,
        averageDeliveryTime: Math.floor(Math.random() * 10) + 2, // 2-12 days
        qualityScore: Math.floor(Math.random() * 30) + 70, // 70-100%
        complianceRate: Math.floor(Math.random() * 25) + 75, // 75-100%
        riskLevel: 'low' as const,
        trend: 'stable' as const,
        lastActivity: new Date().toISOString(),
        medicineTypes: {}
      };

      existing.totalMedicines += 1;
      if (qr.parsed_data.is_expired) {
        existing.expiredMedicines += 1;
      }
      
      // Track medicine types
      const medicineType = qr.parsed_data.medicine_name || qr.data_type;
      existing.medicineTypes[medicineType] = (existing.medicineTypes[medicineType] || 0) + 1;
      
      // Recent shipments (last 7 days)
      const qrDate = new Date(qr.scan_timestamp);
      if ((now.getTime() - qrDate.getTime()) / (1000 * 60 * 60 * 24) <= 7) {
        existing.recentShipments += 1;
      }
      
      if (!existing.lastShipmentDate || qr.scan_timestamp > existing.lastShipmentDate) {
        existing.lastShipmentDate = qr.scan_timestamp;
        existing.lastActivity = qr.scan_timestamp;
      }

      // Calculate risk level
      const expiryRate = existing.totalMedicines > 0 ? (existing.expiredMedicines / existing.totalMedicines) * 100 : 0;
      if (expiryRate > 20 || existing.qualityScore < 60 || existing.complianceRate < 70) {
        existing.riskLevel = 'high';
      } else if (expiryRate > 10 || existing.qualityScore < 80 || existing.complianceRate < 85) {
        existing.riskLevel = 'medium';
      } else {
        existing.riskLevel = 'low';
      }

      // Calculate trend (simplified)
      existing.trend = existing.recentShipments > existing.totalMedicines * 0.3 ? 'up' : 
                      existing.recentShipments < existing.totalMedicines * 0.1 ? 'down' : 'stable';

      districtStats.set(key, existing);
    });

    const enhancedDistricts = Array.from(districtStats.values())
      .sort((a, b) => b.totalMedicines - a.totalMedicines);

    // Regional statistics
    const regionalStats = enhancedDistricts.reduce((acc, district) => {
      const region = indianDistricts.find(d => d.district === district.district)?.region || 'Unknown';
      if (!acc[region]) {
        acc[region] = {
          districts: 0,
          totalMedicines: 0,
          expiredMedicines: 0,
          averageQuality: 0,
          averageCompliance: 0
        };
      }
      acc[region].districts += 1;
      acc[region].totalMedicines += district.totalMedicines;
      acc[region].expiredMedicines += district.expiredMedicines;
      acc[region].averageQuality += district.qualityScore;
      acc[region].averageCompliance += district.complianceRate;
      return acc;
    }, {} as Record<string, any>);

    // Calculate averages for regional stats
    Object.keys(regionalStats).forEach(region => {
      const stats = regionalStats[region];
      stats.averageQuality = Math.round(stats.averageQuality / stats.districts);
      stats.averageCompliance = Math.round(stats.averageCompliance / stats.districts);
    });

    // Performance metrics
    const performanceMetrics = {
      overallQuality: enhancedDistricts.length > 0 
        ? Math.round(enhancedDistricts.reduce((sum, d) => sum + d.qualityScore, 0) / enhancedDistricts.length)
        : 0,
      overallCompliance: enhancedDistricts.length > 0
        ? Math.round(enhancedDistricts.reduce((sum, d) => sum + d.complianceRate, 0) / enhancedDistricts.length)
        : 0,
      averageDeliveryTime: enhancedDistricts.length > 0
        ? Math.round(enhancedDistricts.reduce((sum, d) => sum + d.averageDeliveryTime, 0) / enhancedDistricts.length)
        : 0,
      highRiskDistricts: enhancedDistricts.filter(d => d.riskLevel === 'high').length,
      growingDistricts: enhancedDistricts.filter(d => d.trend === 'up').length
    };

    const alerts = generateAlerts(enhancedDistricts);

    return {
      totalProduced: filteredData.length,
      totalDistributed: filteredData.filter(qr => qr.arduino_sync_status === 'synced').length,
      activeDistricts: districtStats.size,
      expiryAlerts: filteredData.filter(qr => qr.parsed_data.is_expired).length,
      topDistricts: enhancedDistricts.slice(0, 10),
      enhancedDistricts,
      alerts,
      regionalStats,
      performanceMetrics
    };
  }, [qrData, timeFilter, lastRefresh]);

  const filteredDistricts = manufacturerStats.enhancedDistricts.filter(district => {
    const matchesSearch = district.district.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         district.state.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = selectedDistrict === 'all' || district.district === selectedDistrict;
    return matchesSearch && matchesFilter;
  });

  const StatCard: React.FC<{
    title: string;
    value: string | number;
    subtitle?: string;
    icon: React.ReactNode;
    color: string;
    trend?: string;
    onClick?: () => void;
  }> = ({ title, value, subtitle, icon, color, trend, onClick }) => (
    <div 
      className={`bg-white p-4 sm:p-6 rounded-lg shadow-md border-l-4 transition-all duration-200 ${
        onClick ? 'cursor-pointer hover:shadow-lg hover:scale-105' : ''
      }`}
      style={{ borderLeftColor: color }}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-xs sm:text-sm font-medium text-gray-600">{title}</p>
          <p className="text-xl sm:text-2xl lg:text-3xl font-bold" style={{ color }}>{value}</p>
          {subtitle && <p className="text-xs sm:text-sm text-gray-500 mt-1">{subtitle}</p>}
          {trend && (
            <p className="text-xs text-green-600 mt-1 flex items-center">
              <TrendingUp className="w-3 h-3 mr-1" />
              {trend}
            </p>
          )}
        </div>
        <div style={{ color }} className="opacity-80 hidden sm:block">
          {icon}
        </div>
      </div>
    </div>
  );

  const AlertCard: React.FC<{ alert: AlertData }> = ({ alert }) => {
    const severityColors = {
      critical: 'bg-red-100 border-red-500 text-red-800',
      high: 'bg-orange-100 border-orange-500 text-orange-800',
      medium: 'bg-yellow-100 border-yellow-500 text-yellow-800',
      low: 'bg-blue-100 border-blue-500 text-blue-800'
    };

    const severityIcons = {
      critical: <XCircle className="w-4 h-4" />,
      high: <AlertTriangle className="w-4 h-4" />,
      medium: <Clock className="w-4 h-4" />,
      low: <Bell className="w-4 h-4" />
    };

    return (
      <div className={`p-3 rounded-lg border-l-4 ${severityColors[alert.severity]}`}>
        <div className="flex items-start space-x-2">
          {severityIcons[alert.severity]}
          <div className="flex-1">
            <p className="text-sm font-medium">{alert.message}</p>
            <p className="text-xs opacity-75 mt-1">
              {new Date(alert.timestamp).toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    );
  };

  const exportAdvancedReport = () => {
    const exportData = {
      timestamp: new Date().toISOString(),
      timeFilter,
      summary: manufacturerStats,
      districts: filteredDistricts,
      alerts: manufacturerStats.alerts,
      regionalAnalysis: manufacturerStats.regionalStats,
      performanceMetrics: manufacturerStats.performanceMetrics
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `advanced-manufacturer-report-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Enhanced Header */}
      <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
        <div className="flex flex-col space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0">
            <div className="flex items-center space-x-3">
              <Factory className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Advanced Manufacturer Dashboard</h1>
                <p className="text-sm sm:text-base text-gray-600">Real-time medicine distribution analytics & monitoring</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowQuickGenerate(!showQuickGenerate)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Quick Generate</span>
              </button>
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm transition-colors ${
                  autoRefresh 
                    ? 'bg-green-100 text-green-800 border border-green-300' 
                    : 'bg-gray-100 text-gray-600 border border-gray-300'
                }`}
              >
                <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Auto Refresh</span>
              </button>
              <span className="text-xs text-gray-500">
                Last: {lastRefresh.toLocaleTimeString()}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="all">All time</option>
            </select>
            
            <select
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="cards">Card View</option>
              <option value="table">Table View</option>
              <option value="map">Map View</option>
            </select>

            <select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="volume">Volume</option>
              <option value="quality">Quality</option>
              <option value="compliance">Compliance</option>
              <option value="delivery">Delivery Time</option>
            </select>
            
            <button
              onClick={exportAdvancedReport}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm"
            >
              <Download className="w-4 h-4" />
              <span>Export Report</span>
            </button>
          </div>
        </div>
      </div>

      {/* Quick QR Generation Panel */}
      {showQuickGenerate && (
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
          <div className="flex items-center space-x-3 mb-4">
            <QrCode className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">Quick QR Code Generation</h3>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Generation Controls */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Destination District
                </label>
                <select
                  value={selectedDistrictForGeneration}
                  onChange={(e) => setSelectedDistrictForGeneration(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="">Random District</option>
                  {indianDistricts.map(district => (
                    <option key={district.district} value={district.district}>
                      {district.district}, {district.state}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Batch Size
                </label>
                <select
                  value={batchSize}
                  onChange={(e) => setBatchSize(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value={1}>1 QR Code</option>
                  <option value={5}>5 QR Codes</option>
                  <option value={10}>10 QR Codes</option>
                  <option value={25}>25 QR Codes</option>
                  <option value={50}>50 QR Codes</option>
                  <option value={100}>100 QR Codes</option>
                </select>
              </div>
              
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                <button
                  onClick={generateSingleQR}
                  className="flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm"
                >
                  <QrCode className="w-4 h-4" />
                  <span>Generate Single</span>
                </button>
                
                <button
                  onClick={generateBatchQRs}
                  className="flex items-center justify-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors text-sm"
                >
                  <Package className="w-4 h-4" />
                  <span>Generate Batch ({batchSize})</span>
                </button>
              </div>
              
              {generatedQRs.length > 0 && (
                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 pt-4 border-t">
                  <button
                    onClick={printAllQRs}
                    className="flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print All ({generatedQRs.length})</span>
                  </button>
                  
                  <button
                    onClick={exportGeneratedQRs}
                    className="flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm"
                  >
                    <FileText className="w-4 h-4" />
                    <span>Export Data</span>
                  </button>
                  
                  <button
                    onClick={clearAllQRs}
                    className="flex items-center justify-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Clear All</span>
                  </button>
                </div>
              )}
            </div>
            
            {/* Generated QRs Display */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">
                Generated QR Codes ({generatedQRs.length})
              </h4>
              
              {generatedQRs.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <QrCode className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No QR codes generated yet</p>
                </div>
              ) : (
                <div className="max-h-96 overflow-y-auto space-y-3">
                  {generatedQRs.slice(0, 10).map((qr) => (
                    <div key={qr.id} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg">
                      <div className="flex-shrink-0">
                        <QRCodeSVG
                          value={qr.qrData}
                          size={60}
                          level="M"
                          includeMargin={true}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {qr.medicineData.medicine_name}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          ID: {qr.medicineData.medicine_id}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          Destination: {qr.medicineData.destination_district}
                        </p>
                      </div>
                      <div className="flex flex-col space-y-1">
                        <button
                          onClick={() => printSingleQR(qr)}
                          className="p-1 text-blue-600 hover:text-blue-800 transition-colors"
                          title="Print QR Code"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => copyQRData(qr.qrData, qr.id)}
                          className="p-1 text-gray-600 hover:text-gray-800 transition-colors"
                          title="Copy QR Data"
                        >
                          {copied === qr.id ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  ))}
                  {generatedQRs.length > 10 && (
                    <div className="text-center py-2 text-sm text-gray-500">
                      ... and {generatedQRs.length - 10} more QR codes
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4">
        <StatCard
          title="Total Produced"
          value={manufacturerStats.totalProduced}
          subtitle="Medicine units"
          icon={<Package className="w-6 h-6 sm:w-8 sm:h-8" />}
          color="#2563eb"
          trend="+12% this month"
        />
        <StatCard
          title="Distributed"
          value={manufacturerStats.totalDistributed}
          subtitle={`${manufacturerStats.totalProduced > 0 ? ((manufacturerStats.totalDistributed / manufacturerStats.totalProduced) * 100).toFixed(1) : 0}% of total`}
          icon={<Truck className="w-6 h-6 sm:w-8 sm:h-8" />}
          color="#059669"
          trend="+8% this week"
        />
        <StatCard
          title="Active Districts"
          value={manufacturerStats.activeDistricts}
          subtitle="Receiving medicines"
          icon={<MapPin className="w-6 h-6 sm:w-8 sm:h-8" />}
          color="#7c3aed"
          trend="+3 new districts"
        />
        <StatCard
          title="Quality Score"
          value={`${manufacturerStats.performanceMetrics.overallQuality}%`}
          subtitle="Average quality"
          icon={<Award className="w-6 h-6 sm:w-8 sm:h-8" />}
          color="#0891b2"
        />
        <StatCard
          title="Compliance Rate"
          value={`${manufacturerStats.performanceMetrics.overallCompliance}%`}
          subtitle="Regulatory compliance"
          icon={<Shield className="w-6 h-6 sm:w-8 sm:h-8" />}
          color="#7c2d12"
        />
        <StatCard
          title="Avg Delivery"
          value={`${manufacturerStats.performanceMetrics.averageDeliveryTime}d`}
          subtitle="Days to deliver"
          icon={<Clock className="w-6 h-6 sm:w-8 sm:h-8" />}
          color="#dc2626"
        />
      </div>

      {/* Alerts Section */}
      {manufacturerStats.alerts.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
          <div className="flex items-center space-x-3 mb-4">
            <Bell className="w-5 h-5 text-red-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              Active Alerts ({manufacturerStats.alerts.length})
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {manufacturerStats.alerts.slice(0, 6).map(alert => (
              <AlertCard key={alert.id} alert={alert} />
            ))}
          </div>
          {manufacturerStats.alerts.length > 6 && (
            <div className="mt-4 text-center">
              <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                View All {manufacturerStats.alerts.length} Alerts
              </button>
            </div>
          )}
        </div>
      )}

      {/* Regional Overview */}
      <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Globe className="w-5 h-5 text-purple-600" />
          <h3 className="text-lg font-semibold text-gray-900">Regional Overview</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {Object.entries(manufacturerStats.regionalStats).map(([region, stats]) => (
            <div key={region} className="p-4 border border-gray-200 rounded-lg">
              <h4 className="font-semibold text-gray-900 mb-2">{region} India</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Districts:</span>
                  <span className="font-medium">{stats.districts}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Medicines:</span>
                  <span className="font-medium">{stats.totalMedicines}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Quality:</span>
                  <span className={`font-medium ${stats.averageQuality >= 80 ? 'text-green-600' : 'text-orange-600'}`}>
                    {stats.averageQuality}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Compliance:</span>
                  <span className={`font-medium ${stats.averageCompliance >= 85 ? 'text-green-600' : 'text-orange-600'}`}>
                    {stats.averageCompliance}%
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Enhanced District Distribution */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="p-4 sm:p-6 border-b border-gray-200">
          <div className="flex flex-col space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <MapPin className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
                  District-wise Distribution & Analytics
                </h2>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">View:</span>
                <div className="flex border border-gray-300 rounded-md">
                  {['cards', 'table', 'map'].map(mode => (
                    <button
                      key={mode}
                      onClick={() => setViewMode(mode as any)}
                      className={`px-3 py-1 text-sm capitalize ${
                        viewMode === mode 
                          ? 'bg-blue-600 text-white' 
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search districts or states..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>

              <select
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="">Random Bangladesh District</option>
                {manufacturerStats.enhancedDistricts.map(district => (
                  <option key={district.district} value={district.district}>
                    {district.district} - {district.state}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Enhanced District Cards */}
        <div className="p-4 sm:p-6">
          {filteredDistricts.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <MapPin className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 text-gray-400" />
              <p className="text-base sm:text-lg font-medium text-gray-500">No districts found</p>
              <p className="text-sm text-gray-400">Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {filteredDistricts.map((district) => (
                <div key={district.district} className="border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-all duration-200">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="text-base sm:text-lg font-semibold text-gray-900">{district.district}</h3>
                        {district.trend === 'up' && <TrendingUp className="w-4 h-4 text-green-500" />}
                        {district.trend === 'down' && <TrendingDown className="w-4 h-4 text-red-500" />}
                      </div>
                      <p className="text-sm text-gray-600">{district.state}</p>
                      <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mt-1 ${
                        district.riskLevel === 'high' ? 'bg-red-100 text-red-800' :
                        district.riskLevel === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {district.riskLevel.toUpperCase()} RISK
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl sm:text-2xl font-bold text-blue-600">{district.totalMedicines}</p>
                      <p className="text-xs text-gray-500">Total Medicines</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="text-center p-2 bg-green-50 rounded">
                      <p className="text-sm font-semibold text-green-600">{district.recentShipments}</p>
                      <p className="text-xs text-green-800">Recent</p>
                    </div>
                    <div className="text-center p-2 bg-red-50 rounded">
                      <p className="text-sm font-semibold text-red-600">{district.expiredMedicines}</p>
                      <p className="text-xs text-red-800">Expired</p>
                    </div>
                    <div className="text-center p-2 bg-blue-50 rounded">
                      <p className="text-sm font-semibold text-blue-600">{district.qualityScore}%</p>
                      <p className="text-xs text-blue-800">Quality</p>
                    </div>
                    <div className="text-center p-2 bg-purple-50 rounded">
                      <p className="text-sm font-semibold text-purple-600">{district.complianceRate}%</p>
                      <p className="text-xs text-purple-800">Compliance</p>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs text-gray-500">
                    <div className="flex items-center justify-between">
                      <span>Avg Delivery:</span>
                      <span className={`font-medium ${district.averageDeliveryTime <= 5 ? 'text-green-600' : 'text-orange-600'}`}>
                        {district.averageDeliveryTime} days
                      </span>
                    </div>
                    {district.lastShipmentDate && (
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-3 h-3" />
                        <span>Last: {new Date(district.lastShipmentDate).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                  
                  {district.expiredMedicines > 5 && (
                    <div className="mt-2 px-2 py-1 bg-red-100 text-red-800 text-xs rounded flex items-center space-x-1">
                      <AlertTriangle className="w-3 h-3" />
                      <span>High Expiry Alert</span>
                    </div>
                  )}

                  <div className="mt-3 pt-2 border-t border-gray-100">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Medicine Types:</span>
                      <span className="text-xs font-medium">{Object.keys(district.medicineTypes).length}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Enhanced Distribution Chart */}
      <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <BarChart3 className="w-5 h-5 text-purple-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              Top Districts by {selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)}
            </h3>
          </div>
          <div className="flex items-center space-x-2">
            <Activity className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-500">Live Data</span>
          </div>
        </div>
        
        <div className="space-y-3">
          {manufacturerStats.enhancedDistricts.slice(0, 10).map((district, index) => {
            let value, maxValue, color;
            
            switch (selectedMetric) {
              case 'quality':
                value = district.qualityScore;
                maxValue = 100;
                color = value >= 80 ? '#10b981' : value >= 60 ? '#f59e0b' : '#ef4444';
                break;
              case 'compliance':
                value = district.complianceRate;
                maxValue = 100;
                color = value >= 85 ? '#10b981' : value >= 70 ? '#f59e0b' : '#ef4444';
                break;
              case 'delivery':
                value = 15 - district.averageDeliveryTime; // Invert for better visualization
                maxValue = 15;
                color = district.averageDeliveryTime <= 5 ? '#10b981' : district.averageDeliveryTime <= 10 ? '#f59e0b' : '#ef4444';
                break;
              default:
                value = district.totalMedicines;
                maxValue = Math.max(...manufacturerStats.enhancedDistricts.map(d => d.totalMedicines));
                color = '#3b82f6';
            }
            
            const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
            
            return (
              <div key={district.district} className="flex items-center space-x-3">
                <div className="w-4 text-xs text-gray-500 text-right">#{index + 1}</div>
                <div className="w-24 sm:w-32 text-sm text-gray-700 truncate">
                  {district.district}
                </div>
                <div className="flex-1 bg-gray-200 rounded-full h-4 overflow-hidden">
                  <div
                    className="h-full transition-all duration-500"
                    style={{ 
                      backgroundColor: color, 
                      width: `${percentage}%` 
                    }}
                  ></div>
                </div>
                <div className="w-16 text-sm font-medium text-gray-900 text-right">
                  {selectedMetric === 'delivery' ? `${district.averageDeliveryTime}d` : 
                   selectedMetric === 'volume' ? value :
                   `${value}%`}
                </div>
                <div className={`w-2 h-2 rounded-full ${
                  district.riskLevel === 'high' ? 'bg-red-500' :
                  district.riskLevel === 'medium' ? 'bg-yellow-500' :
                  'bg-green-500'
                }`}></div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};