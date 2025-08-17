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
      const response = await fetch(`${this.config.baseUrl}/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          audience: 'https://api.arduino.cc/iot',
        }),
      });

      if (!response.ok) {
        throw new Error(`Authentication failed: ${response.statusText}`);
      }

      const data = await response.json();
      this.accessToken = data.access_token;
      this.tokenExpiry = new Date(Date.now() + data.expires_in * 1000);

      return true;
    } catch (error) {
      console.error('Arduino Cloud authentication failed:', error);
      return false;
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

      // Send to Arduino Cloud Thing property
      const response = await fetch(
        `${this.config.baseUrl}/iot/v2/things/${this.config.thingId}/properties/${this.config.propertyName}/publish`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(cloudData),
        }
      );

      if (response.ok) {
        return ArduinoSyncStatus.SYNCED;
      } else if (response.status >= 500) {
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

      const response = await fetch(
        `${this.config.baseUrl}/iot/v2/things/${this.config.thingId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

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