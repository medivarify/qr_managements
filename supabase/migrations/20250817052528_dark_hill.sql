/*
  # QR Management System Database Schema

  1. New Tables
    - `qr_codes`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `raw_data` (text, the original QR code content)
      - `parsed_data` (jsonb, structured data extracted from QR)
      - `data_type` (enum, type of QR code data)
      - `dimensions` (integer, complexity/layers of data)
      - `scan_timestamp` (timestamptz, when scanned)
      - `scan_location` (jsonb, optional GPS coordinates)
      - `device_info` (jsonb, optional device information)
      - `validation_status` (enum, data integrity status)
      - `arduino_sync_status` (enum, sync status with Arduino Cloud)
      - `metadata` (jsonb, additional flexible data)
      - `created_at` (timestamptz, record creation time)
      - `updated_at` (timestamptz, last update time)

    - `scan_sessions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `start_time` (timestamptz, session start)
      - `end_time` (timestamptz, session end)
      - `total_scans` (integer, total QR codes scanned)
      - `successful_scans` (integer, valid scans)
      - `failed_scans` (integer, failed/invalid scans)
      - `session_metadata` (jsonb, session details)

    - `arduino_sync_logs`
      - `id` (uuid, primary key)
      - `qr_code_id` (uuid, foreign key to qr_codes)
      - `sync_timestamp` (timestamptz, when sync attempted)
      - `sync_status` (enum, result of sync attempt)
      - `error_message` (text, error details if failed)
      - `arduino_thing_id` (text, Arduino Cloud thing identifier)
      - `sync_data` (jsonb, data sent to Arduino)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
    - Users can only access their own QR codes and sessions

  3. Performance
    - Indexes on user_id, timestamps, and status fields
    - GIN indexes for JSON data searching
    - Statistics function for analytics dashboard

  4. Functions
    - Update trigger for updated_at timestamps
    - Statistics function for user analytics
*/

-- Create custom types only if they don't exist
DO $$ BEGIN
    CREATE TYPE qr_data_type AS ENUM (
        'text', 'url', 'email', 'phone', 'sms', 'wifi', 'vcard', 
        'event', 'geo', 'json', 'xml', 'multidimensional', 'custom'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE validation_status AS ENUM (
        'valid', 'invalid', 'corrupted', 'incomplete', 'pending'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE arduino_sync_status AS ENUM (
        'not_synced', 'pending', 'synced', 'failed', 'partial'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create update_updated_at_column function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create qr_codes table
CREATE TABLE IF NOT EXISTS qr_codes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    raw_data text NOT NULL,
    parsed_data jsonb NOT NULL DEFAULT '{}'::jsonb,
    data_type qr_data_type NOT NULL DEFAULT 'text'::qr_data_type,
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

-- Create scan_sessions table
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

-- Create arduino_sync_logs table
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
    USING (EXISTS (
        SELECT 1 FROM qr_codes 
        WHERE qr_codes.id = arduino_sync_logs.qr_code_id 
        AND qr_codes.user_id = auth.uid()
    ));

CREATE POLICY "Service can insert sync logs"
    ON arduino_sync_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (EXISTS (
        SELECT 1 FROM qr_codes 
        WHERE qr_codes.id = arduino_sync_logs.qr_code_id 
        AND qr_codes.user_id = auth.uid()
    ));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_qr_codes_user_id ON qr_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_qr_codes_scan_timestamp ON qr_codes(scan_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_qr_codes_data_type ON qr_codes(data_type);
CREATE INDEX IF NOT EXISTS idx_qr_codes_validation_status ON qr_codes(validation_status);
CREATE INDEX IF NOT EXISTS idx_qr_codes_arduino_sync_status ON qr_codes(arduino_sync_status);
CREATE INDEX IF NOT EXISTS idx_qr_codes_parsed_data_gin ON qr_codes USING gin(parsed_data);
CREATE INDEX IF NOT EXISTS idx_qr_codes_metadata_gin ON qr_codes USING gin(metadata);

CREATE INDEX IF NOT EXISTS idx_scan_sessions_user_id ON scan_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_scan_sessions_start_time ON scan_sessions(start_time DESC);

CREATE INDEX IF NOT EXISTS idx_arduino_sync_logs_qr_code_id ON arduino_sync_logs(qr_code_id);
CREATE INDEX IF NOT EXISTS idx_arduino_sync_logs_sync_timestamp ON arduino_sync_logs(sync_timestamp DESC);

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_qr_codes_updated_at ON qr_codes;
CREATE TRIGGER update_qr_codes_updated_at
    BEFORE UPDATE ON qr_codes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create statistics function for analytics
CREATE OR REPLACE FUNCTION get_user_qr_statistics(user_uuid uuid)
RETURNS TABLE(
    total_scans bigint,
    valid_scans bigint,
    invalid_scans bigint,
    synced_scans bigint,
    data_types jsonb,
    recent_scans bigint
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_scans,
        COUNT(*) FILTER (WHERE validation_status = 'valid') as valid_scans,
        COUNT(*) FILTER (WHERE validation_status != 'valid') as invalid_scans,
        COUNT(*) FILTER (WHERE arduino_sync_status = 'synced') as synced_scans,
        jsonb_object_agg(data_type, type_count) as data_types,
        COUNT(*) FILTER (WHERE scan_timestamp > now() - interval '24 hours') as recent_scans
    FROM (
        SELECT 
            validation_status,
            arduino_sync_status,
            data_type,
            scan_timestamp,
            COUNT(*) as type_count
        FROM qr_codes 
        WHERE user_id = user_uuid
        GROUP BY validation_status, arduino_sync_status, data_type, scan_timestamp
    ) stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;