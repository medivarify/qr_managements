import React, { useState, useMemo } from 'react';
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
  Download
} from 'lucide-react';
import { QRCodeData, DistrictData, ManufacturerStats } from '../types';

interface ManufacturerDashboardProps {
  qrData: QRCodeData[];
}

export const ManufacturerDashboard: React.FC<ManufacturerDashboardProps> = ({ qrData }) => {
  const [selectedDistrict, setSelectedDistrict] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [timeFilter, setTimeFilter] = useState<'7d' | '30d' | '90d' | 'all'>('30d');

  // Sample Indian districts data - in real app, this would come from your database
  const indianDistricts = [
    { district: 'Mumbai', state: 'Maharashtra' },
    { district: 'Delhi', state: 'Delhi' },
    { district: 'Bangalore', state: 'Karnataka' },
    { district: 'Chennai', state: 'Tamil Nadu' },
    { district: 'Kolkata', state: 'West Bengal' },
    { district: 'Hyderabad', state: 'Telangana' },
    { district: 'Pune', state: 'Maharashtra' },
    { district: 'Ahmedabad', state: 'Gujarat' },
    { district: 'Jaipur', state: 'Rajasthan' },
    { district: 'Lucknow', state: 'Uttar Pradesh' },
    { district: 'Kanpur', state: 'Uttar Pradesh' },
    { district: 'Nagpur', state: 'Maharashtra' },
    { district: 'Indore', state: 'Madhya Pradesh' },
    { district: 'Thane', state: 'Maharashtra' },
    { district: 'Bhopal', state: 'Madhya Pradesh' },
    { district: 'Visakhapatnam', state: 'Andhra Pradesh' },
    { district: 'Pimpri-Chinchwad', state: 'Maharashtra' },
    { district: 'Patna', state: 'Bihar' },
    { district: 'Vadodara', state: 'Gujarat' },
    { district: 'Ghaziabad', state: 'Uttar Pradesh' }
  ];

  // Calculate manufacturer statistics
  const manufacturerStats = useMemo((): ManufacturerStats => {
    const now = new Date();
    const timeFilterDays = timeFilter === '7d' ? 7 : timeFilter === '30d' ? 30 : timeFilter === '90d' ? 90 : 0;
    
    const filteredData = timeFilterDays > 0 
      ? qrData.filter(qr => {
          const qrDate = new Date(qr.scan_timestamp);
          const daysDiff = (now.getTime() - qrDate.getTime()) / (1000 * 60 * 60 * 24);
          return daysDiff <= timeFilterDays;
        })
      : qrData;

    // Group by destination district (simulated from medicine data)
    const districtStats = new Map<string, DistrictData>();
    
    filteredData.forEach(qr => {
      // Simulate destination district assignment based on medicine ID or batch
      const districtIndex = Math.abs(qr.id.split('').reduce((a, b) => a + b.charCodeAt(0), 0)) % indianDistricts.length;
      const district = indianDistricts[districtIndex];
      
      const key = district.district;
      const existing = districtStats.get(key) || {
        district: district.district,
        state: district.state,
        totalMedicines: 0,
        expiredMedicines: 0,
        recentShipments: 0,
        lastShipmentDate: undefined
      };

      existing.totalMedicines += 1;
      if (qr.parsed_data.is_expired) {
        existing.expiredMedicines += 1;
      }
      
      // Consider recent scans as shipments
      const qrDate = new Date(qr.scan_timestamp);
      if ((now.getTime() - qrDate.getTime()) / (1000 * 60 * 60 * 24) <= 7) {
        existing.recentShipments += 1;
      }
      
      if (!existing.lastShipmentDate || qr.scan_timestamp > existing.lastShipmentDate) {
        existing.lastShipmentDate = qr.scan_timestamp;
      }

      districtStats.set(key, existing);
    });

    const topDistricts = Array.from(districtStats.values())
      .sort((a, b) => b.totalMedicines - a.totalMedicines)
      .slice(0, 10);

    return {
      totalProduced: filteredData.length,
      totalDistributed: filteredData.filter(qr => qr.arduino_sync_status === 'synced').length,
      activeDistricts: districtStats.size,
      expiryAlerts: filteredData.filter(qr => qr.parsed_data.is_expired).length,
      topDistricts
    };
  }, [qrData, timeFilter]);

  const filteredDistricts = manufacturerStats.topDistricts.filter(district => {
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
  }> = ({ title, value, subtitle, icon, color, trend }) => (
    <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md border-l-4" style={{ borderLeftColor: color }}>
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

  const exportDistrictData = () => {
    const exportData = {
      timestamp: new Date().toISOString(),
      timeFilter,
      stats: manufacturerStats,
      districts: filteredDistricts
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `manufacturer-district-report-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0">
          <div className="flex items-center space-x-3">
            <Factory className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Manufacturer Dashboard</h1>
              <p className="text-sm sm:text-base text-gray-600">Medicine distribution across districts</p>
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
            
            <button
              onClick={exportDistrictData}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm"
            >
              <Download className="w-4 h-4" />
              <span>Export Report</span>
            </button>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
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
          title="Expiry Alerts"
          value={manufacturerStats.expiryAlerts}
          subtitle="Medicines expired"
          icon={<AlertTriangle className="w-6 h-6 sm:w-8 sm:h-8" />}
          color="#dc2626"
        />
      </div>

      {/* District Distribution */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="p-4 sm:p-6 border-b border-gray-200">
          <div className="flex flex-col space-y-4">
            <div className="flex items-center space-x-3">
              <MapPin className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">District-wise Distribution</h2>
            </div>
            
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
              {/* Search */}
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

              {/* District filter */}
              <select
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="all">All Districts</option>
                {manufacturerStats.topDistricts.map(district => (
                  <option key={district.district} value={district.district}>
                    {district.district}, {district.state}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* District Cards */}
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
                <div key={district.district} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900">{district.district}</h3>
                      <p className="text-sm text-gray-600">{district.state}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl sm:text-2xl font-bold text-blue-600">{district.totalMedicines}</p>
                      <p className="text-xs text-gray-500">Total Medicines</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="text-center p-2 bg-green-50 rounded">
                      <p className="text-lg font-semibold text-green-600">{district.recentShipments}</p>
                      <p className="text-xs text-green-800">Recent Shipments</p>
                    </div>
                    <div className="text-center p-2 bg-red-50 rounded">
                      <p className="text-lg font-semibold text-red-600">{district.expiredMedicines}</p>
                      <p className="text-xs text-red-800">Expired</p>
                    </div>
                  </div>
                  
                  {district.lastShipmentDate && (
                    <div className="flex items-center space-x-2 text-xs text-gray-500">
                      <Calendar className="w-3 h-3" />
                      <span>Last shipment: {new Date(district.lastShipmentDate).toLocaleDateString()}</span>
                    </div>
                  )}
                  
                  {district.expiredMedicines > 0 && (
                    <div className="mt-2 px-2 py-1 bg-red-100 text-red-800 text-xs rounded flex items-center space-x-1">
                      <AlertTriangle className="w-3 h-3" />
                      <span>Expiry Alert</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Distribution Chart */}
      <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
        <div className="flex items-center space-x-3 mb-4">
          <BarChart3 className="w-5 h-5 text-purple-600" />
          <h3 className="text-lg font-semibold text-gray-900">Top Districts by Volume</h3>
        </div>
        
        <div className="space-y-3">
          {manufacturerStats.topDistricts.slice(0, 8).map((district, index) => {
            const maxValue = Math.max(...manufacturerStats.topDistricts.map(d => d.totalMedicines));
            const percentage = maxValue > 0 ? (district.totalMedicines / maxValue) * 100 : 0;
            
            return (
              <div key={district.district} className="flex items-center space-x-3">
                <div className="w-4 text-xs text-gray-500 text-right">#{index + 1}</div>
                <div className="w-24 sm:w-32 text-sm text-gray-700 truncate">
                  {district.district}
                </div>
                <div className="flex-1 bg-gray-200 rounded-full h-4 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
                <div className="w-12 text-sm font-medium text-gray-900 text-right">
                  {district.totalMedicines}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};