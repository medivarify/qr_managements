-- Safe SQL commands to remove everything from Supabase database
-- Run these commands in your Supabase SQL Editor

-- 1. Drop all tables (this will also drop dependent objects)
DROP TABLE IF EXISTS arduino_sync_logs CASCADE;
DROP TABLE IF EXISTS scan_sessions CASCADE;
DROP TABLE IF EXISTS qr_codes CASCADE;

-- 2. Drop all custom types
DROP TYPE IF EXISTS arduino_sync_status CASCADE;
DROP TYPE IF EXISTS validation_status CASCADE;
DROP TYPE IF EXISTS qr_data_type CASCADE;

-- 3. Drop any functions
DROP FUNCTION IF EXISTS get_user_qr_statistics(uuid) CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- 4. Clean up any remaining objects (indexes, triggers, etc.)
-- Note: Most will be automatically dropped with CASCADE above

-- Verify cleanup - these should return no results:
-- SELECT * FROM information_schema.tables WHERE table_schema = 'public';
-- SELECT * FROM pg_type WHERE typname IN ('qr_data_type', 'validation_status', 'arduino_sync_status');

-- You can now safely create new schema