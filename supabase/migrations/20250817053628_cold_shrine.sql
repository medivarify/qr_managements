/*
  # Medicine Tracking Database Schema

  1. New Tables
    - `qr_codes`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `raw_data` (text, the raw QR code data)
      - `parsed_data` (jsonb, structured medicine data)
      - `data_type` (enum, type of QR code)
      - `dimensions` (integer, data complexity level)
      - `scan_timestamp` (timestamptz, when scanned)
      - `scan_location` (jsonb, GPS coordinates if available)
      - `device_info` (jsonb, scanning device information)
      - `validation_status` (enum, verification status)
      - `arduino_sync_status` (enum, IoT sync status)
      - `metadata` (jsonb, additional medicine metadata)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `scan_sessions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `start_time` (timestamptz)
      - `end_time` (timestamptz)
      - `total_scans` (integer)
      - `successful_scans` (integer)
      - `failed_scans` (integer)
      - `session_metadata` (jsonb)
      - `created_at` (timestamptz)

    - `arduino_sync_logs`
      - `id` (uuid, primary key)
      - `qr_code_id` (uuid, foreign key to qr_codes)
      - `sync_timestamp` (timestamptz)
      - `sync_status` (enum)
      - `error_message` (text)
      - `arduino_thing_id` (text)
      - `sync_data` (jsonb)
      - `created_at` (timestamptz)

  2. Custom Types
    - `qr_data_type` - Types of QR codes (medicine_tracking, text, url, etc.)
    - `validation_status` - Medicine verification status
    - `arduino_sync_status` - IoT device sync status

  3. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
    - Users can only access their own medicine records

  4. Performance
    - Indexes on frequently queried columns
    - GIN indexes for JSON data
    - Statistics function for analytics dashboard

  5. Functions
    - `update_updated_at_column()` - Automatic timestamp updates
    - `get_user_qr_statistics()` - Medicine analytics
*/

-- Create custom types for medicine tracking
CREATE TYPE qr_data_type AS ENUM (
  'medicine_tracking',
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

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create main QR codes table for medicine tracking
CREATE TABLE IF NOT EXISTS qr_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  raw_data text NOT NULL,
  parsed_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  data_type qr_data_type NOT NULL DEFAULT 'medicine_tracking'::qr_data_type,
  dimensions integer NOT NULL DEFAULT 1,
  scan_timestamp timestamptz NOT NULL DEFAULT now(),
  scan_location jsonb,
  device_info jsonb,
  validation_status validation_status NOT NULL DEFAULT 'pending'::validation_status,
  arduino_sync_status arduino_sync_status NOT NULL DEFAULT 'not_synced'::arduino_sync_status,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create scan sessions table
CREATE TABLE IF NOT EXISTS scan_sessions (
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
CREATE TABLE IF NOT EXISTS arduino_sync_logs (
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
CREATE INDEX IF NOT EXISTS idx_qr_codes_user_id ON qr_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_qr_codes_scan_timestamp ON qr_codes(scan_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_qr_codes_data_type ON qr_codes(data_type);
CREATE INDEX IF NOT EXISTS idx_qr_codes_validation_status ON qr_codes(validation_status);
CREATE INDEX IF NOT EXISTS idx_qr_codes_arduino_sync_status ON qr_codes(arduino_sync_status);

-- GIN indexes for JSON data
CREATE INDEX IF NOT EXISTS idx_qr_codes_parsed_data_gin ON qr_codes USING gin(parsed_data);
CREATE INDEX IF NOT EXISTS idx_qr_codes_metadata_gin ON qr_codes USING gin(metadata);

-- Indexes for scan_sessions
CREATE INDEX IF NOT EXISTS idx_scan_sessions_user_id ON scan_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_scan_sessions_start_time ON scan_sessions(start_time DESC);

-- Indexes for arduino_sync_logs
CREATE INDEX IF NOT EXISTS idx_arduino_sync_logs_qr_code_id ON arduino_sync_logs(qr_code_id);
CREATE INDEX IF NOT EXISTS idx_arduino_sync_logs_sync_timestamp ON arduino_sync_logs(sync_timestamp DESC);

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_qr_codes_updated_at
  BEFORE UPDATE ON qr_codes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create statistics function for medicine analytics
CREATE OR REPLACE FUNCTION get_user_qr_statistics(user_uuid uuid)
RETURNS json AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'total_medicines', COUNT(*),
    'valid_medicines', COUNT(*) FILTER (WHERE validation_status = 'valid'),
    'expired_medicines', COUNT(*) FILTER (WHERE parsed_data->>'is_expired' = 'true'),
    'synced_medicines', COUNT(*) FILTER (WHERE arduino_sync_status = 'synced'),
    'recent_scans', COUNT(*) FILTER (WHERE scan_timestamp > now() - interval '24 hours'),
    'medicine_types', json_object_agg(
      COALESCE(parsed_data->>'dosage_form', 'Unknown'),
      COUNT(*) FILTER (WHERE parsed_data->>'dosage_form' IS NOT NULL)
    ),
    'manufacturers', json_object_agg(
      COALESCE(parsed_data->>'manufacturer', 'Unknown'),
      COUNT(*) FILTER (WHERE parsed_data->>'manufacturer' IS NOT NULL)
    )
  ) INTO result
  FROM qr_codes
  WHERE user_id = user_uuid;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;