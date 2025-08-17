import { ArduinoCloudConfig, QRCodeData, ArduinoSyncStatus } from '../types';

/**
 * Arduino Cloud Integration Service
 * Handles authentication, data synchronization, and device communication
 */
export class ArduinoCloudService {
  private config: ArduinoCloudConfig;
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;

  constructor(config: ArduinoCloudConfig) {
    this.config = config;
  }

  /**
   * Authenticate with Arduino Cloud API
   */
  async authenticate(): Promise<boolean> {
    try {
      // Use Supabase edge function to avoid CORS issues
      const authUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/arduino-proxy/auth`;
      console.log('Attempting authentication via proxy:', authUrl);

      const response = await fetch(authUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
        }),
      });

      console.log('Authentication response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Authentication error response:', errorText);
        
        // Handle specific error cases
        if (response.status === 401) {
          throw new Error('Invalid client credentials. Please check your Client ID and Client Secret.');
        } else if (response.status === 403) {
          throw new Error('Access forbidden. Please verify your Arduino Cloud account has the required permissions.');
        } else if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please wait before trying again.');
        } else {
          throw new Error(`Authentication failed: ${response.status} ${response.statusText} - ${errorText}`);
        }
      }

      const data = await response.json();
      console.log('Authentication successful, token received');
      this.accessToken = data.access_token;
      this.tokenExpiry = new Date(Date.now() + data.expires_in * 1000);

      return true;
    } catch (error) {
      console.error('Arduino Cloud authentication failed:', error);
      throw error;
    }
  }

  /**
   * Check if token is valid and refresh if needed
   */
  private async ensureValidToken(): Promise<boolean> {
    if (!this.accessToken || !this.tokenExpiry || this.tokenExpiry <= new Date()) {
      return await this.authenticate();
    }
    return true;
  }

  /**
   * Sync QR code data to Arduino Cloud
   */
  async syncQRCodeData(qrData: QRCodeData): Promise<ArduinoSyncStatus> {
    try {
      if (!(await this.ensureValidToken())) {
        return ArduinoSyncStatus.FAILED;
      }

      // Prepare data for Arduino Cloud format
      const cloudData = this.formatForArduino(qrData);

      // Use Supabase edge function to sync data
      const syncUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/arduino-proxy/sync`;
      const response = await fetch(syncUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          access_token: this.accessToken,
          thing_id: this.config.thingId,
          property_name: this.config.propertyName,
          data: cloudData,
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        return ArduinoSyncStatus.SYNCED;
      } else if (result.status >= 500) {
        return ArduinoSyncStatus.FAILED;
      } else {
        return ArduinoSyncStatus.PARTIAL;
      }

    } catch (error) {
      console.error('Arduino Cloud sync failed:', error);
      return ArduinoSyncStatus.FAILED;
    }
  }

  /**
   * Batch sync multiple QR codes
   */
  async batchSync(qrCodes: QRCodeData[]): Promise<Map<string, ArduinoSyncStatus>> {
    const results = new Map<string, ArduinoSyncStatus>();

    // Process in batches of 10
    const batchSize = 10;
    for (let i = 0; i < qrCodes.length; i += batchSize) {
      const batch = qrCodes.slice(i, i + batchSize);
      const promises = batch.map(async (qr) => {
        const status = await this.syncQRCodeData(qr);
        results.set(qr.id, status);
      });

      await Promise.allSettled(promises);
      
      // Add delay between batches to respect rate limits
      if (i + batchSize < qrCodes.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return results;
  }

  /**
   * Get device/thing status from Arduino Cloud
   */
  async getThingStatus(): Promise<any> {
    try {
      if (!(await this.ensureValidToken())) {
        throw new Error('Authentication failed');
      }

      // Use Supabase edge function to get thing status
      const statusUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/arduino-proxy/thing-status`;
      const response = await fetch(statusUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          access_token: this.accessToken,
          thing_id: this.config.thingId,
        }),
      });

      return await response.json();
    } catch (error) {
      console.error('Failed to get thing status:', error);
      throw error;
    }
  }

  /**
   * Subscribe to real-time property updates
   */
  async subscribeToUpdates(callback: (data: any) => void): Promise<void> {
    // In a real implementation, this would use WebSocket connection
    // For demo purposes, we'll poll for updates
    const pollInterval = 5000; // 5 seconds

    const poll = async () => {
      try {
        const status = await this.getThingStatus();
        callback(status);
      } catch (error) {
        console.error('Polling error:', error);
      }
      setTimeout(poll, pollInterval);
    };

    poll();
  }

  /**
   * Format QR code data for Arduino Cloud compatibility
   */
  private formatForArduino(qrData: QRCodeData): any {
    return {
      id: qrData.id,
      type: qrData.data_type,
      data: JSON.stringify(qrData.parsed_data),
      timestamp: qrData.scan_timestamp,
      validation: qrData.validation_status,
      dimensions: qrData.dimensions,
    };
  }

  /**
   * Test connection to Arduino Cloud
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const authResult = await this.authenticate();
      if (!authResult) {
        return { success: false, message: 'Authentication failed' };
      }

      if (this.config.thingId) {
        await this.getThingStatus();
        return { success: true, message: 'Connection successful' };
      }

      return { success: true, message: 'Authentication successful (no thing configured)' };
    } catch (error) {
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Connection failed' 
      };
    }
  }
}