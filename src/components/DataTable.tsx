import React, { useState } from 'react';
import { Search, Filter, Download, Trash2, Eye, Wifi, FolderSync as ArduinoSyncStatus } from 'lucide-react';
import { QRCodeData, QRDataType, ValidationStatus } from '../types';

interface DataTableProps {
  data: QRCodeData[];
  onView: (data: QRCodeData) => void;
  onDelete: (id: string) => void;
  onExport: () => void;
  onSync: (data: QRCodeData) => void;
}

export const DataTable: React.FC<DataTableProps> = ({ 
  data, 
  onView, 
  onDelete, 
  onExport, 
  onSync 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<QRDataType | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<ValidationStatus | 'all'>('all');

  const filteredData = data.filter(item => {
    const matchesSearch = item.raw_data.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         JSON.stringify(item.parsed_data).toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || item.data_type === filterType;
    const matchesStatus = filterStatus === 'all' || item.validation_status === filterStatus;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const getStatusBadge = (status: ValidationStatus) => {
    const styles = {
      valid: 'bg-green-100 text-green-800',
      invalid: 'bg-red-100 text-red-800',
      corrupted: 'bg-orange-100 text-orange-800',
      incomplete: 'bg-yellow-100 text-yellow-800',
      pending: 'bg-gray-100 text-gray-800',
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>
        {status.toUpperCase()}
      </span>
    );
  };

  const getSyncStatusBadge = (status: ArduinoSyncStatus) => {
    const styles = {
      not_synced: 'bg-gray-100 text-gray-800',
      pending: 'bg-blue-100 text-blue-800',
      synced: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      partial: 'bg-yellow-100 text-yellow-800',
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>
        <Wifi className="w-3 h-3 mr-1" />
        {status.replace('_', ' ').toUpperCase()}
      </span>
    );
  };

  const getTypeBadge = (type: QRDataType) => {
    const colors = {
      text: 'bg-gray-100 text-gray-800',
      url: 'bg-blue-100 text-blue-800',
      email: 'bg-purple-100 text-purple-800',
      phone: 'bg-green-100 text-green-800',
      wifi: 'bg-indigo-100 text-indigo-800',
      json: 'bg-yellow-100 text-yellow-800',
      multidimensional: 'bg-pink-100 text-pink-800',
      custom: 'bg-orange-100 text-orange-800',
      medicine_tracking: 'bg-emerald-100 text-emerald-800',
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[type] || colors.custom}`}>
        {type.toUpperCase()}
      </span>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-md">
      {/* Header with search and filters */}
      <div className="p-4 sm:p-6 border-b border-gray-200">
        <div className="flex flex-col space-y-4">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Scanned QR Codes</h2>
          
          <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search QR codes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
              />
            </div>

            {/* Type filter */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as QRDataType | 'all')}
              className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
            >
              <option value="all">All Types</option>
              {Object.values(QRDataType).map(type => (
                <option key={type} value={type}>{type.toUpperCase()}</option>
              ))}
            </select>

            {/* Status filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as ValidationStatus | 'all')}
              className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
            >
              <option value="all">All Statuses</option>
              {Object.values(ValidationStatus).map(status => (
                <option key={status} value={status}>{status.toUpperCase()}</option>
              ))}
            </select>

            {/* Export button */}
            <button
              onClick={onExport}
              className="flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm sm:text-base"
            >
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type & Status
              </th>
              <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Data Preview
              </th>
              <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                Dimensions
              </th>
              <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Scan Time
              </th>
              <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                Arduino Status
              </th>
              <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 sm:px-6 py-8 sm:py-12 text-center">
                  <div className="text-gray-500">
                    <Filter className="w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-4 opacity-50" />
                    <p className="text-base sm:text-lg font-medium">No QR codes found</p>
                    <p className="text-xs sm:text-sm">Try adjusting your search or filters</p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredData.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-3 sm:px-6 py-3 sm:py-4">
                    <div className="space-y-2">
                      {getTypeBadge(item.data_type)}
                      {getStatusBadge(item.validation_status)}
                    </div>
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4">
                    <div className="max-w-[150px] sm:max-w-xs">
                      <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">
                        {typeof item.parsed_data === 'object' 
                          ? JSON.stringify(item.parsed_data).substring(0, 30) + '...'
                          : item.raw_data.substring(0, 30) + '...'}
                      </p>
                    </div>
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-500 hidden sm:table-cell">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {item.dimensions}D
                    </span>
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-500">
                    <div className="sm:hidden">
                      {new Date(item.scan_timestamp).toLocaleDateString()}
                    </div>
                    <div className="hidden sm:block">
                      {new Date(item.scan_timestamp).toLocaleString()}
                    </div>
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 hidden md:table-cell">
                    <div className="flex items-center space-x-2">
                      {getSyncStatusBadge(item.arduino_sync_status)}
                      {item.arduino_sync_status !== 'synced' && (
                        <button
                          onClick={() => onSync(item)}
                          className="text-blue-600 hover:text-blue-800 text-xs sm:text-sm underline"
                        >
                          Sync
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4">
                    <div className="flex items-center space-x-1 sm:space-x-2">
                      <button
                        onClick={() => onView(item)}
                        className="p-1 sm:p-2 text-blue-600 hover:text-blue-800 transition-colors"
                        title="View details"
                      >
                        <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
                      </button>
                      <button
                        onClick={() => onDelete(item.id)}
                        className="p-1 sm:p-2 text-red-600 hover:text-red-800 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination info */}
      {filteredData.length > 0 && (
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-200 bg-gray-50">
          <p className="text-xs sm:text-sm text-gray-700">
            Showing {filteredData.length} of {data.length} QR codes
          </p>
        </div>
      )}
    </div>
  );
};