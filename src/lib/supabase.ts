import { createClient } from '@supabase/supabase-js';
import { QRCodeData, ScanSession } from '../types';

// Supabase configuration with proper error handling
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('Supabase configuration missing. Using localStorage fallback.');
}

export const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null;

// Database service class with error handling
export class QRDatabaseService {
  /**
   * Insert a new QR code record
   */
  static async insertQRCode(qrData: Omit<QRCodeData, 'id' | 'user_id'>): Promise<QRCodeData | null> {
    if (!supabase) {
      console.warn('Supabase not configured, using localStorage');
      return this.insertQRCodeLocal(qrData);
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('User not authenticated');
        return null;
      }

      console.log('Inserting QR code to Supabase:', qrData);
      
      const insertData = {
        user_id: user.id,
        raw_data: qrData.raw_data,
        parsed_data: qrData.parsed_data || {},
        data_type: qrData.data_type,
        dimensions: qrData.dimensions || 1,
        scan_timestamp: qrData.scan_timestamp || new Date().toISOString(),
        scan_location: qrData.scan_location || null,
        device_info: qrData.device_info || null,
        validation_status: qrData.validation_status || 'pending',
        arduino_sync_status: qrData.arduino_sync_status || 'not_synced',
        metadata: qrData.metadata || {}
      };

      const { data, error } = await supabase
        .from('qr_codes')
        .insert([insertData])
        .select()
        .single();

      if (error) {
        console.error('Supabase insert error:', error);
        throw error;
      }
      
      console.log('Successfully inserted QR code to Supabase:', data);
      return data;
    } catch (error) {
      console.error('Error inserting QR code to Supabase:', error);
      // Fallback to localStorage
      return this.insertQRCodeLocal(qrData);
    }
  }

  /**
   * Get all QR codes for the current user
   */
  static async getUserQRCodes(): Promise<QRCodeData[]> {
    if (!supabase) {
      return this.getUserQRCodesLocal();
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.warn('User not authenticated, using localStorage');
        return this.getUserQRCodesLocal();
      }

      const { data, error } = await supabase
        .from('qr_codes')
        .select('*')
        .eq('user_id', user.id)
        .order('scan_timestamp', { ascending: false });

      if (error) {
        console.error('Error fetching QR codes from Supabase:', error);
        return this.getUserQRCodesLocal();
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching QR codes:', error);
      return this.getUserQRCodesLocal();
    }
  }

  /**
   * Update QR code sync status
   */
  static async updateSyncStatus(id: string, syncStatus: string): Promise<boolean> {
    if (!supabase) {
      return this.updateSyncStatusLocal(id, syncStatus);
    }

    try {
      const { error } = await supabase
        .from('qr_codes')
        .update({ arduino_sync_status: syncStatus })
        .eq('id', id);

      if (error) {
        console.error('Error updating sync status in Supabase:', error);
        return this.updateSyncStatusLocal(id, syncStatus);
      }

      return true;
    } catch (error) {
      console.error('Error updating sync status:', error);
      return this.updateSyncStatusLocal(id, syncStatus);
    }
  }

  /**
   * Delete a QR code record
   */
  static async deleteQRCode(id: string): Promise<boolean> {
    if (!supabase) {
      return this.deleteQRCodeLocal(id);
    }

    try {
      const { error } = await supabase
        .from('qr_codes')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting QR code from Supabase:', error);
        return this.deleteQRCodeLocal(id);
      }

      return true;
    } catch (error) {
      console.error('Error deleting QR code:', error);
      return this.deleteQRCodeLocal(id);
    }
  }

  /**
   * Get user statistics
   */
  static async getUserStatistics(): Promise<any> {
    if (!supabase) {
      return this.getUserStatisticsLocal();
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return this.getUserStatisticsLocal();
      }

      const { data, error } = await supabase
        .rpc('get_user_qr_statistics', { user_uuid: user.id });

      if (error) {
        console.error('Error fetching statistics from Supabase:', error);
        return this.getUserStatisticsLocal();
      }

      return data;
    } catch (error) {
      console.error('Error fetching statistics:', error);
      return this.getUserStatisticsLocal();
    }
  }

  /**
   * Start a new scan session
   */
  static async startScanSession(): Promise<string | null> {
    if (!supabase) {
      return this.startScanSessionLocal();
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return this.startScanSessionLocal();
      }

      const { data, error } = await supabase
        .from('scan_sessions')
        .insert([{
          user_id: user.id,
          start_time: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) {
        console.error('Error starting scan session in Supabase:', error);
        return this.startScanSessionLocal();
      }

      return data.id;
    } catch (error) {
      console.error('Error starting scan session:', error);
      return this.startScanSessionLocal();
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
    if (!supabase) {
      return this.updateScanSessionLocal(sessionId, stats);
    }

    try {
      const { error } = await supabase
        .from('scan_sessions')
        .update(stats)
        .eq('id', sessionId);

      if (error) {
        console.error('Error updating scan session in Supabase:', error);
        return this.updateScanSessionLocal(sessionId, stats);
      }

      return true;
    } catch (error) {
      console.error('Error updating scan session:', error);
      return this.updateScanSessionLocal(sessionId, stats);
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
    if (!supabase) {
      console.log('Arduino sync logged locally:', { qrCodeId, ...syncData });
      return true;
    }

    try {
      const { error } = await supabase
        .from('arduino_sync_logs')
        .insert([{
          qr_code_id: qrCodeId,
          sync_timestamp: new Date().toISOString(),
          ...syncData
        }]);

      if (error) {
        console.error('Error logging Arduino sync to Supabase:', error);
      }

      return true;
    } catch (error) {
      console.error('Error logging Arduino sync:', error);
      return true;
    }
  }

  /**
   * Export QR codes data
   */
  static async exportQRCodes(): Promise<string | null> {
    try {
      const qrCodes = await this.getUserQRCodes();
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

  // LocalStorage fallback methods
  private static readonly QR_CODES_KEY = 'mediverify_qr_codes';
  private static readonly SCAN_SESSIONS_KEY = 'mediverify_scan_sessions';
  private static readonly USER_KEY = 'mediverify_user';

  private static async insertQRCodeLocal(qrData: Omit<QRCodeData, 'id' | 'user_id'>): Promise<QRCodeData | null> {
    try {
      const user = this.getCurrentUserLocal();
      if (!user) return null;

      const newQRCode: QRCodeData = {
        ...qrData,
        id: crypto.randomUUID(),
        user_id: user.id
      };

      const existingCodes = this.getUserQRCodesLocal();
      const updatedCodes = [newQRCode, ...existingCodes];
      
      localStorage.setItem(this.QR_CODES_KEY, JSON.stringify(updatedCodes));
      return newQRCode;
    } catch (error) {
      console.error('Error inserting QR code to localStorage:', error);
      return null;
    }
  }

  private static getUserQRCodesLocal(): QRCodeData[] {
    try {
      const user = this.getCurrentUserLocal();
      if (!user) return [];

      const stored = localStorage.getItem(this.QR_CODES_KEY);
      if (!stored) return [];

      const allCodes: QRCodeData[] = JSON.parse(stored);
      return allCodes.filter(code => code.user_id === user.id);
    } catch (error) {
      console.error('Error fetching QR codes from localStorage:', error);
      return [];
    }
  }

  private static updateSyncStatusLocal(id: string, syncStatus: string): boolean {
    try {
      const allCodes = JSON.parse(localStorage.getItem(this.QR_CODES_KEY) || '[]');
      const updatedCodes = allCodes.map((code: QRCodeData) =>
        code.id === id ? { ...code, arduino_sync_status: syncStatus } : code
      );
      
      localStorage.setItem(this.QR_CODES_KEY, JSON.stringify(updatedCodes));
      return true;
    } catch (error) {
      console.error('Error updating sync status in localStorage:', error);
      return false;
    }
  }

  private static deleteQRCodeLocal(id: string): boolean {
    try {
      const allCodes = JSON.parse(localStorage.getItem(this.QR_CODES_KEY) || '[]');
      const filteredCodes = allCodes.filter((code: QRCodeData) => code.id !== id);
      
      localStorage.setItem(this.QR_CODES_KEY, JSON.stringify(filteredCodes));
      return true;
    } catch (error) {
      console.error('Error deleting QR code from localStorage:', error);
      return false;
    }
  }

  private static getUserStatisticsLocal(): any {
    try {
      const qrCodes = this.getUserQRCodesLocal();
      
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
      console.error('Error fetching statistics from localStorage:', error);
      return null;
    }
  }

  private static startScanSessionLocal(): string | null {
    try {
      const user = this.getCurrentUserLocal();
      if (!user) return null;

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
      console.error('Error starting scan session in localStorage:', error);
      return null;
    }
  }

  private static updateScanSessionLocal(sessionId: string, stats: any): boolean {
    try {
      const sessions = JSON.parse(localStorage.getItem(this.SCAN_SESSIONS_KEY) || '[]');
      const updatedSessions = sessions.map((session: any) =>
        session.id === sessionId ? { ...session, ...stats } : session
      );
      
      localStorage.setItem(this.SCAN_SESSIONS_KEY, JSON.stringify(updatedSessions));
      return true;
    } catch (error) {
      console.error('Error updating scan session in localStorage:', error);
      return false;
    }
  }

  private static getCurrentUserLocal() {
    try {
      const stored = localStorage.getItem(this.USER_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      return null;
    }
  }
}

// Authentication helpers with fallback
export class AuthService {
  /**
   * Sign up with email and password
   */
  static async signUp(email: string, password: string) {
    if (!supabase) {
      return this.signUpLocal(email, password);
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password
      });
      return { data, error };
    } catch (error) {
      console.error('Supabase signup error:', error);
      return this.signUpLocal(email, password);
    }
  }

  /**
   * Sign in with email and password
   */
  static async signIn(email: string, password: string) {
    if (!supabase) {
      return this.signInLocal(email, password);
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      return { data, error };
    } catch (error) {
      console.error('Supabase signin error:', error);
      return this.signInLocal(email, password);
    }
  }

  /**
   * Sign out
   */
  static async signOut() {
    if (!supabase) {
      return this.signOutLocal();
    }

    try {
      const { error } = await supabase.auth.signOut();
      this.signOutLocal(); // Also clear localStorage
      return { error };
    } catch (error) {
      console.error('Supabase signout error:', error);
      return this.signOutLocal();
    }
  }

  /**
   * Get current user
   */
  static async getCurrentUser() {
    if (!supabase) {
      return this.getCurrentUserLocal();
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    } catch (error) {
      console.error('Error getting current user from Supabase:', error);
      return this.getCurrentUserLocal();
    }
  }

  /**
   * Listen to auth changes
   */
  static onAuthStateChange(callback: (event: string, session: any) => void) {
    if (!supabase) {
      // Simple simulation for localStorage
      const user = this.getCurrentUserLocal();
      callback(user ? 'SIGNED_IN' : 'SIGNED_OUT', user ? { user } : null);
      return { data: { subscription: { unsubscribe: () => {} } } };
    }

    return supabase.auth.onAuthStateChange(callback);
  }

  // LocalStorage fallback methods
  private static readonly USER_KEY = 'mediverify_user';

  private static signUpLocal(email: string, password: string) {
    const user = {
      id: crypto.randomUUID(),
      email,
      created_at: new Date().toISOString()
    };
    
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    return { data: { user }, error: null };
  }

  private static signInLocal(email: string, password: string) {
    let user = this.getCurrentUserLocal();
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

  private static signOutLocal() {
    localStorage.removeItem(this.USER_KEY);
    return { error: null };
  }

  private static getCurrentUserLocal() {
    try {
      const stored = localStorage.getItem(this.USER_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      return null;
    }
  }
}