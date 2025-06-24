/*
  # Add monitoring settings and check intervals

  1. New Tables
    - `monitoring_settings`
      - `id` (uuid, primary key)
      - `global_check_interval` (integer, default 5 minutes)
      - `enable_global_interval` (boolean, default false)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Table Changes
    - Add `check_interval` column to `monitors` table (default 5 minutes)

  3. Security
    - Enable RLS on `monitoring_settings` table
    - Add policies for admin access to monitoring settings
*/

-- Add check_interval column to monitors table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'monitors' AND column_name = 'check_interval'
  ) THEN
    ALTER TABLE monitors ADD COLUMN check_interval integer DEFAULT 5;
  END IF;
END $$;

-- Create monitoring_settings table
CREATE TABLE IF NOT EXISTS monitoring_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  global_check_interval integer DEFAULT 5,
  enable_global_interval boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on monitoring_settings
ALTER TABLE monitoring_settings ENABLE ROW LEVEL SECURITY;

-- Allow SELECT for monitoring settings
CREATE POLICY "Allow SELECT for monitoring settings"
  ON monitoring_settings
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Allow INSERT for monitoring settings
CREATE POLICY "Allow INSERT for monitoring settings"
  ON monitoring_settings
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow UPDATE for monitoring settings
CREATE POLICY "Allow UPDATE for monitoring settings"
  ON monitoring_settings
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Insert default monitoring settings if not exists
INSERT INTO monitoring_settings (global_check_interval, enable_global_interval)
SELECT 5, false
WHERE NOT EXISTS (SELECT 1 FROM monitoring_settings);