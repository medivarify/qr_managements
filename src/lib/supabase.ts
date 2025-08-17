import { createClient } from '@supabase/supabase-js';
import { QRCodeData, ScanSession } from '../types';

// Supabase configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'http://localhost:54321';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

export const supabase = createClient(supabaseUrl, supabaseKey);

// Database service class
export class QRDatabaseService {
  /**
   * Insert a new QR code record
   */
  static async insertQRCode(qrData: Omit<QRCodeData, 'id' | 'user_id'>): Promise<QRCodeData | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('qr_codes')
        .insert([{
          ...qrData,
          user_id: user.id
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error inserting QR code:', error);
      return null;
    }
  }

  /**
   * Get all QR codes for the current user
   */
  static async getUserQRCodes(): Promise<QRCodeData[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('qr_codes')
        .select('*')
        .eq('user_id', user.id)
        .order('scan_timestamp', { ascending: false });

      if (error) throw error;
      return data || [];
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
      const { error } = await supabase
        .from('qr_codes')
        .update({ arduino_sync_status: syncStatus })
        .eq('id', id);

      if (error) throw error;
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
      const { error } = await supabase
        .from('qr_codes')
        .delete()
        .eq('id', id);

      if (error) throw error;
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .rpc('get_user_qr_statistics', { user_uuid: user.id });

      if (error) throw error;
      return data;
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('scan_sessions')
        .insert([{
          user_id: user.id,
          start_time: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;
      return data.id;
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
      const { error } = await supabase
        .from('scan_sessions')
        .update(stats)
        .eq('id', sessionId);

      if (error) throw error;
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
      const { error } = await supabase
        .from('arduino_sync_logs')
        .insert([{
          qr_code_id: qrCodeId,
          sync_timestamp: new Date().toISOString(),
          ...syncData
        }]);

      if (error) throw error;
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
}

// Authentication helpers
export class AuthService {
  /**
   * Sign up with email and password
   */
  static async signUp(email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password
    });
    return { data, error };
  }

  /**
   * Sign in with email and password
   */
  static async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    return { data, error };
  }

  /**
   * Sign out
   */
  static async signOut() {
    const { error } = await supabase.auth.signOut();
    return { error };
  }

  /**
   * Get current user
   */
  static async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  }

  /**
   * Listen to auth changes
   */
  static onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback);
  }
}