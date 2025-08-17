import { QRCodeData, ScanSession } from '../types';

/**
 * Local Storage Service for QR Code Management
 * Replaces Supabase with browser local storage
 */
export class LocalStorageService {
  private static readonly QR_CODES_KEY = 'mediverify_qr_codes';
  private static readonly SCAN_SESSIONS_KEY = 'mediverify_scan_sessions';
  private static readonly USER_KEY = 'mediverify_user';

  /**
   * Insert a new QR code record
   */
  static async insertQRCode(qrData: Omit<QRCodeData, 'id' | 'user_id'>): Promise<QRCodeData | null> {
    try {
      const user = this.getCurrentUser();
      if (!user) throw new Error('User not authenticated');

      const newQRCode: QRCodeData = {
        ...qrData,
        id: crypto.randomUUID(),
        user_id: user.id
      };

      console.log('Inserting QR code to localStorage:', newQRCode);
      
      const existingCodes = this.getUserQRCodes();
      const updatedCodes = [newQRCode, ...existingCodes];
      
      localStorage.setItem(this.QR_CODES_KEY, JSON.stringify(updatedCodes));
      
      console.log('Successfully inserted QR code:', newQRCode);
      return newQRCode;
    } catch (error) {
      console.error('Error inserting QR code:', error);
      return null;
    }
  }

  /**
   * Get all QR codes for the current user
   */
  static getUserQRCodes(): QRCodeData[] {
    try {
      const user = this.getCurrentUser();
      if (!user) return [];

      const stored = localStorage.getItem(this.QR_CODES_KEY);
      if (!stored) return [];

      const allCodes: QRCodeData[] = JSON.parse(stored);
      return allCodes.filter(code => code.user_id === user.id);
    } catch (error) {
      console.error('Error fetching QR codes:', error);
      return [];
    }
  }

  /**
   * Update QR code sync status
   */
  static async updateSyncStatus(id: string, syncStatus: string): Promise<boolean> {
    try {
      const allCodes = JSON.parse(localStorage.getItem(this.QR_CODES_KEY) || '[]');
      const updatedCodes = allCodes.map((code: QRCodeData) =>
        code.id === id ? { ...code, arduino_sync_status: syncStatus } : code
      );
      
      localStorage.setItem(this.QR_CODES_KEY, JSON.stringify(updatedCodes));
      return true;
    } catch (error) {
      console.error('Error updating sync status:', error);
      return false;
    }
  }

  /**
   * Delete a QR code record
   */
  static async deleteQRCode(id: string): Promise<boolean> {
    try {
      const allCodes = JSON.parse(localStorage.getItem(this.QR_CODES_KEY) || '[]');
      const filteredCodes = allCodes.filter((code: QRCodeData) => code.id !== id);
      
      localStorage.setItem(this.QR_CODES_KEY, JSON.stringify(filteredCodes));
      return true;
    } catch (error) {
      console.error('Error deleting QR code:', error);
      return false;
    }
  }

  /**
   * Get user statistics
   */
  static async getUserStatistics(): Promise<any> {
    try {
      const qrCodes = this.getUserQRCodes();
      
      return {
        total_scans: qrCodes.length,
        valid_scans: qrCodes.filter(qr => qr.validation_status === 'valid').length,
        expired_medicines: qrCodes.filter(qr => qr.parsed_data.is_expired).length,
        synced_count: qrCodes.filter(qr => qr.arduino_sync_status === 'synced').length,
        medicine_types: qrCodes.reduce((acc, qr) => {
          const type = qr.data_type;
          acc[type] = (acc[type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      };
    } catch (error) {
      console.error('Error fetching statistics:', error);
      return null;
    }
  }

  /**
   * Start a new scan session
   */
  static async startScanSession(): Promise<string | null> {
    try {
      const user = this.getCurrentUser();
      if (!user) throw new Error('User not authenticated');

      const sessionId = crypto.randomUUID();
      const session = {
        id: sessionId,
        user_id: user.id,
        start_time: new Date().toISOString(),
        total_scans: 0,
        successful_scans: 0,
        failed_scans: 0
      };

      const sessions = JSON.parse(localStorage.getItem(this.SCAN_SESSIONS_KEY) || '[]');
      sessions.push(session);
      localStorage.setItem(this.SCAN_SESSIONS_KEY, JSON.stringify(sessions));
      
      return sessionId;
    } catch (error) {
      console.error('Error starting scan session:', error);
      return null;
    }
  }

  /**
   * Update scan session statistics
   */
  static async updateScanSession(sessionId: string, stats: {
    total_scans?: number;
    successful_scans?: number;
    failed_scans?: number;
    end_time?: string;
  }): Promise<boolean> {
    try {
      const sessions = JSON.parse(localStorage.getItem(this.SCAN_SESSIONS_KEY) || '[]');
      const updatedSessions = sessions.map((session: any) =>
        session.id === sessionId ? { ...session, ...stats } : session
      );
      
      localStorage.setItem(this.SCAN_SESSIONS_KEY, JSON.stringify(updatedSessions));
      return true;
    } catch (error) {
      console.error('Error updating scan session:', error);
      return false;
    }
  }

  /**
   * Log Arduino sync attempt
   */
  static async logArduinoSync(qrCodeId: string, syncData: {
    sync_status: string;
    error_message?: string;
    arduino_thing_id?: string;
    sync_data?: any;
  }): Promise<boolean> {
    try {
      // For localStorage, we'll just log this to console
      console.log('Arduino sync logged:', { qrCodeId, ...syncData });
      return true;
    } catch (error) {
      console.error('Error logging Arduino sync:', error);
      return false;
    }
  }

  /**
   * Export QR codes data
   */
  static async exportQRCodes(): Promise<string | null> {
    try {
      const qrCodes = this.getUserQRCodes();
      const exportData = qrCodes.map(qr => ({
        id: qr.id,
        raw_data: qr.raw_data,
        data_type: qr.data_type,
        parsed_data: qr.parsed_data,
        scan_timestamp: qr.scan_timestamp,
        validation_status: qr.validation_status,
        arduino_sync_status: qr.arduino_sync_status,
        dimensions: qr.dimensions
      }));

      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      console.error('Error exporting QR codes:', error);
      return null;
    }
  }

  // Simple authentication simulation
  static signUp(email: string, password: string) {
    const user = {
      id: crypto.randomUUID(),
      email,
      created_at: new Date().toISOString()
    };
    
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    return { data: { user }, error: null };
  }

  static signIn(email: string, password: string) {
    // For demo purposes, create user if not exists
    let user = this.getCurrentUser();
    if (!user || user.email !== email) {
      user = {
        id: crypto.randomUUID(),
        email,
        created_at: new Date().toISOString()
      };
      localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    }
    
    return { data: { user }, error: null };
  }

  static signOut() {
    localStorage.removeItem(this.USER_KEY);
    return { error: null };
  }

  static getCurrentUser() {
    try {
      const stored = localStorage.getItem(this.USER_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      return null;
    }
  }

  static onAuthStateChange(callback: (event: string, session: any) => void) {
    // Simple simulation - just call callback with current user
    const user = this.getCurrentUser();
    callback(user ? 'SIGNED_IN' : 'SIGNED_OUT', user ? { user } : null);
    
    // Return unsubscribe function
    return { data: { subscription: { unsubscribe: () => {} } } };
  }
}

// Export aliases for compatibility
export const QRDatabaseService = LocalStorageService;
export const AuthService = LocalStorageService;