/*
  # Complete Medicine Tracking Database Schema

  1. New Tables
    - `qr_codes` - Stores medicine QR code data with full tracking information
    - `scan_sessions` - Tracks medicine scanning sessions for analytics
    - `arduino_sync_logs` - Logs IoT device synchronization attempts

  2. Custom Types
    - `qr_data_type` - Defines supported QR code data types including medicine tracking
    - `validation_status` - Medicine verification and validation status
    - `arduino_sync_status` - IoT device synchronization status

  3. Security
    - Enable RLS on all tables
    - User-specific policies for data isolation
    - Secure CRUD operations

  4. Performance
    - Optimized indexes for fast queries
    - JSON indexes for medicine metadata
    - Automatic timestamp updates

  5. Analytics
    - Statistics function for medicine tracking insights
    - User-specific data aggregation
*/

-- Drop existing objects safely
DROP TABLE IF EXISTS arduino_sync_logs CASCADE;
DROP TABLE IF EXISTS scan_sessions CASCADE;
DROP TABLE IF EXISTS qr_codes CASCADE;
DROP FUNCTION IF EXISTS get_user_qr_statistics(uuid) CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP TYPE IF EXISTS arduino_sync_status CASCADE;
DROP TYPE IF EXISTS validation_status CASCADE;
DROP TYPE IF EXISTS qr_data_type CASCADE;

-- Create custom types
CREATE TYPE qr_data_type AS ENUM (
  'text',
  'url', 
  'email',
  'phone',
  'sms',
  'wifi',
  'vcard',
  'event',
  'geo',
  'json',
  'xml',
  'multidimensional',
  'medicine_tracking',
  'custom'
);

CREATE TYPE validation_status AS ENUM (
  'valid',
  'invalid',
  'corrupted',
  'incomplete',
  'pending'
);

CREATE TYPE arduino_sync_status AS ENUM (
  'not_synced',
  'pending',
  'synced',
  'failed',
  'partial'
);

-- Create update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create main QR codes table
CREATE TABLE qr_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  raw_data text NOT NULL,
  parsed_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  data_type qr_data_type NOT NULL DEFAULT 'text',
  dimensions integer NOT NULL DEFAULT 1,
  scan_timestamp timestamptz NOT NULL DEFAULT now(),
  scan_location jsonb,
  device_info jsonb,
  validation_status validation_status NOT NULL DEFAULT 'pending',
  arduino_sync_status arduino_sync_status NOT NULL DEFAULT 'not_synced',
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create scan sessions table
CREATE TABLE scan_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  start_time timestamptz NOT NULL DEFAULT now(),
  end_time timestamptz,
  total_scans integer DEFAULT 0,
  successful_scans integer DEFAULT 0,
  failed_scans integer DEFAULT 0,
  session_metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create Arduino sync logs table
CREATE TABLE arduino_sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_code_id uuid REFERENCES qr_codes(id) ON DELETE CASCADE NOT NULL,
  sync_timestamp timestamptz NOT NULL DEFAULT now(),
  sync_status arduino_sync_status NOT NULL,
  error_message text,
  arduino_thing_id text,
  sync_data jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE arduino_sync_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for qr_codes
CREATE POLICY "Users can read own QR codes"
  ON qr_codes
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own QR codes"
  ON qr_codes
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own QR codes"
  ON qr_codes
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own QR codes"
  ON qr_codes
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create RLS policies for scan_sessions
CREATE POLICY "Users can read own scan sessions"
  ON scan_sessions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own scan sessions"
  ON scan_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own scan sessions"
  ON scan_sessions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for arduino_sync_logs
CREATE POLICY "Users can read own sync logs"
  ON arduino_sync_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM qr_codes 
      WHERE qr_codes.id = arduino_sync_logs.qr_code_id 
      AND qr_codes.user_id = auth.uid()
    )
  );

CREATE POLICY "Service can insert sync logs"
  ON arduino_sync_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM qr_codes 
      WHERE qr_codes.id = arduino_sync_logs.qr_code_id 
      AND qr_codes.user_id = auth.uid()
    )
  );

-- Create indexes for performance
CREATE INDEX idx_qr_codes_user_id ON qr_codes(user_id);
CREATE INDEX idx_qr_codes_scan_timestamp ON qr_codes(scan_timestamp DESC);
CREATE INDEX idx_qr_codes_data_type ON qr_codes(data_type);
CREATE INDEX idx_qr_codes_validation_status ON qr_codes(validation_status);
CREATE INDEX idx_qr_codes_arduino_sync_status ON qr_codes(arduino_sync_status);
CREATE INDEX idx_qr_codes_parsed_data_gin ON qr_codes USING gin(parsed_data);
CREATE INDEX idx_qr_codes_metadata_gin ON qr_codes USING gin(metadata);

CREATE INDEX idx_scan_sessions_user_id ON scan_sessions(user_id);
CREATE INDEX idx_scan_sessions_start_time ON scan_sessions(start_time DESC);

CREATE INDEX idx_arduino_sync_logs_qr_code_id ON arduino_sync_logs(qr_code_id);
CREATE INDEX idx_arduino_sync_logs_sync_timestamp ON arduino_sync_logs(sync_timestamp DESC);

-- Create triggers
CREATE TRIGGER update_qr_codes_updated_at
  BEFORE UPDATE ON qr_codes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create analytics function
CREATE OR REPLACE FUNCTION get_user_qr_statistics(user_uuid uuid)
RETURNS json AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'total_scans', COUNT(*),
    'valid_scans', COUNT(*) FILTER (WHERE validation_status = 'valid'),
    'invalid_scans', COUNT(*) FILTER (WHERE validation_status = 'invalid'),
    'pending_scans', COUNT(*) FILTER (WHERE validation_status = 'pending'),
    'synced_count', COUNT(*) FILTER (WHERE arduino_sync_status = 'synced'),
    'not_synced_count', COUNT(*) FILTER (WHERE arduino_sync_status = 'not_synced'),
    'medicine_count', COUNT(*) FILTER (WHERE data_type = 'medicine_tracking'),
    'expired_medicines', COUNT(*) FILTER (WHERE 
      data_type = 'medicine_tracking' AND 
      parsed_data->>'is_expired' = 'true'
    ),
    'data_types', json_object_agg(data_type, type_count)
  ) INTO result
  FROM (
    SELECT 
      data_type,
      COUNT(*) as type_count
    FROM qr_codes 
    WHERE user_id = user_uuid
    GROUP BY data_type
  ) type_stats
  RIGHT JOIN (
    SELECT * FROM qr_codes WHERE user_id = user_uuid
  ) all_codes ON true;
  
  RETURN COALESCE(result, '{
    "total_scans": 0,
    "valid_scans": 0,
    "invalid_scans": 0,
    "pending_scans": 0,
    "synced_count": 0,
    "not_synced_count": 0,
    "medicine_count": 0,
    "expired_medicines": 0,
    "data_types": {}
  }'::json);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;