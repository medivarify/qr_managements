// Core type definitions for the QR code management system
export interface QRCodeData {
  id: string;
  raw_data: string;
  parsed_data: Record<string, any>;
  data_type: QRDataType;
  dimensions: number;
  scan_timestamp: string;
  scan_location?: {
    latitude: number;
    longitude: number;
  };
  device_info?: {
    user_agent: string;
    platform: string;
  };
  validation_status: ValidationStatus;
  arduino_sync_status: ArduinoSyncStatus;
  metadata?: Record<string, any>;
}

export enum QRDataType {
  TEXT = 'text',
  URL = 'url',
  EMAIL = 'email',
  PHONE = 'phone',
  SMS = 'sms',
  WIFI = 'wifi',
  VCARD = 'vcard',
  EVENT = 'event',
  GEO = 'geo',
  JSON = 'json',
  XML = 'xml',
  MULTIDIMENSIONAL = 'multidimensional',
  CUSTOM = 'custom',
  MEDICINE_TRACKING = 'medicine_tracking'
}

export enum ValidationStatus {
  VALID = 'valid',
  INVALID = 'invalid',
  CORRUPTED = 'corrupted',
  INCOMPLETE = 'incomplete',
  PENDING = 'pending'
}

export enum ArduinoSyncStatus {
  NOT_SYNCED = 'not_synced',
  PENDING = 'pending',
  SYNCED = 'synced',
  FAILED = 'failed',
  PARTIAL = 'partial'
}

export interface MultidimensionalData {
  layer: number;
  data: Record<string, any>;
  checksum?: string;
  dependencies?: string[];
}

export interface ArduinoCloudConfig {
  clientId: string;
  clientSecret: string;
  baseUrl: string;
  thingId?: string;
  propertyName?: string;
}

export interface ScanSession {
  id: string;
  start_time: string;
  end_time?: string;
  total_scans: number;
  successful_scans: number;
  failed_scans: number;
  session_metadata?: Record<string, any>;
}

export interface APIResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  error?: string;
  timestamp: string;
}