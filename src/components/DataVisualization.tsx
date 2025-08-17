import React from 'react';
import { BarChart3, PieChart, TrendingUp, Database } from 'lucide-react';
import { QRCodeData, QRDataType, ValidationStatus } from '../types';

interface DataVisualizationProps {
  data: QRCodeData[];
}

export const DataVisualization: React.FC<DataVisualizationProps> = ({ data }) => {
  // Calculate statistics
  const totalScans = data.length;
  const validScans = data.filter(item => item.validation_status === ValidationStatus.VALID).length;
  const syncedToArduino = data.filter(item => item.arduino_sync_status === 'synced').length;
  
  // Type distribution
  const typeDistribution = data.reduce((acc, item) => {
    acc[item.data_type] = (acc[item.data_type] || 0) + 1;
    return acc;
  }, {} as Record<QRDataType, number>);

  // Recent activity (last 24 hours)
  const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentScans = data.filter(item => new Date(item.scan_timestamp) > last24Hours).length;

  // Multidimensional analysis
  const multidimensionalData = data.filter(item => item.data_type === QRDataType.MULTIDIMENSIONAL);
  const avgDimensions = data.length > 0 
    ? (data.reduce((sum, item) => sum + item.dimensions, 0) / data.length).toFixed(1)
    : 0;

  const StatCard: React.FC<{
    title: string;
    value: string | number;
    subtitle?: string;
    icon: React.ReactNode;
    color: string;
  }> = ({ title, value, subtitle, icon, color }) => (
    <div className="bg-white p-3 sm:p-4 lg:p-6 rounded-lg shadow-md border-l-4" style={{ borderLeftColor: color }}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs sm:text-sm font-medium text-gray-600">{title}</p>
          <p className="text-lg sm:text-2xl lg:text-3xl font-bold" style={{ color }}>{value}</p>
          {subtitle && <p className="text-xs sm:text-sm text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div style={{ color }} className="opacity-80 hidden sm:block">
          {icon}
        </div>
      </div>
    </div>
  );

  const ChartBar: React.FC<{
    label: string;
    value: number;
    maxValue: number;
    color: string;
  }> = ({ label, value, maxValue, color }) => (
    <div className="flex items-center space-x-3 py-2">
      <div className="w-16 sm:w-20 text-xs sm:text-sm text-gray-600 truncate">{label}</div>
      <div className="flex-1 bg-gray-200 rounded-full h-3 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{ 
            backgroundColor: color, 
            width: `${maxValue > 0 ? (value / maxValue) * 100 : 0}%` 
          }}
        ></div>
      </div>
      <div className="w-8 sm:w-12 text-xs sm:text-sm font-medium text-gray-900 text-right">{value}</div>
    </div>
  );

  const colors = {
    [QRDataType.TEXT]: '#6b7280',
    [QRDataType.URL]: '#3b82f6',
    [QRDataType.EMAIL]: '#8b5cf6',
    [QRDataType.PHONE]: '#10b981',
    [QRDataType.WIFI]: '#6366f1',
    [QRDataType.JSON]: '#f59e0b',
    [QRDataType.MULTIDIMENSIONAL]: '#ec4899',
    [QRDataType.CUSTOM]: '#ef4444',
    [QRDataType.MEDICINE_TRACKING]: '#10b981',
  };

  const maxTypeCount = Math.max(...Object.values(typeDistribution), 1);

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        <StatCard
          title="Total Scans"
          value={totalScans}
          subtitle="All time"
          icon={<Database className="w-8 h-8" />}
          color="#2563eb"
        />
        <StatCard
          title="Valid Scans"
          value={`${validScans}/${totalScans}`}
          subtitle={`${totalScans > 0 ? ((validScans / totalScans) * 100).toFixed(1) : 0}% success rate`}
          icon={<TrendingUp className="w-8 h-8" />}
          color="#059669"
        />
        <StatCard
          title="Arduino Synced"
          value={syncedToArduino}
          subtitle={`${totalScans > 0 ? ((syncedToArduino / totalScans) * 100).toFixed(1) : 0}% synced`}
          icon={<BarChart3 className="w-8 h-8" />}
          color="#dc2626"
        />
        <StatCard
          title="Avg Dimensions"
          value={avgDimensions}
          subtitle={`${multidimensionalData.length} multidimensional`}
          icon={<PieChart className="w-8 h-8" />}
          color="#7c3aed"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Data Type Distribution */}
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
          <div className="flex items-center space-x-2 mb-4">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            <h3 className="text-base sm:text-lg font-semibold text-gray-900">Data Type Distribution</h3>
          </div>
          
          <div className="space-y-3">
            {Object.entries(typeDistribution).map(([type, count]) => (
              <ChartBar
                key={type}
                label={type.toUpperCase()}
                value={count}
                maxValue={maxTypeCount}
                color={colors[type as QRDataType] || colors[QRDataType.CUSTOM]}
              />
            ))}
            {Object.keys(typeDistribution).length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4 sm:py-8">No data to display</p>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
          <div className="flex items-center space-x-2 mb-4">
            <TrendingUp className="w-5 h-5 text-green-600" />
            <h3 className="text-base sm:text-lg font-semibold text-gray-900">Recent Activity</h3>
          </div>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
              <span className="text-sm text-green-800">Last 24 Hours</span>
              <span className="text-2xl font-bold text-green-600">{recentScans}</span>
            </div>
            
            <div className="space-y-2">
              <h4 className="text-xs sm:text-sm font-medium text-gray-700">Validation Status Breakdown</h4>
              {Object.values(ValidationStatus).map(status => {
                const count = data.filter(item => item.validation_status === status).length;
                const percentage = totalScans > 0 ? ((count / totalScans) * 100).toFixed(1) : 0;
                
                const statusColors = {
                  [ValidationStatus.VALID]: '#059669',
                  [ValidationStatus.INVALID]: '#dc2626',
                  [ValidationStatus.CORRUPTED]: '#d97706',
                  [ValidationStatus.INCOMPLETE]: '#ca8a04',
                  [ValidationStatus.PENDING]: '#6b7280',
                };

                return count > 0 ? (
                  <div key={status} className="flex justify-between text-xs sm:text-sm">
                    <span className="capitalize text-gray-600">{status}</span>
                    <span style={{ color: statusColors[status] }} className="font-medium">
                      {count} ({percentage}%)
                    </span>
                  </div>
                ) : null;
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Multidimensional Analysis */}
      {multidimensionalData.length > 0 && (
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
          <div className="flex items-center space-x-2 mb-4">
            <PieChart className="w-5 h-5 text-purple-600" />
            <h3 className="text-base sm:text-lg font-semibold text-gray-900">Multidimensional Data Analysis</h3>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <p className="text-xl sm:text-2xl font-bold text-purple-600">{multidimensionalData.length}</p>
              <p className="text-xs sm:text-sm text-purple-800">Multi-layer QR Codes</p>
            </div>
            <div className="text-center p-4 bg-pink-50 rounded-lg">
              <p className="text-xl sm:text-2xl font-bold text-pink-600">
                {multidimensionalData.reduce((max, item) => Math.max(max, item.dimensions), 0)}
              </p>
              <p className="text-xs sm:text-sm text-pink-800">Max Dimensions</p>
            </div>
            <div className="text-center p-4 bg-indigo-50 rounded-lg">
              <p className="text-xl sm:text-2xl font-bold text-indigo-600">
                {multidimensionalData.length > 0 
                  ? (multidimensionalData.reduce((sum, item) => sum + item.dimensions, 0) / multidimensionalData.length).toFixed(1)
                  : 0}
              </p>
              <p className="text-xs sm:text-sm text-indigo-800">Avg Layers</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};