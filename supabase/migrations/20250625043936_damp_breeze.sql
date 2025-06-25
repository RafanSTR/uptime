/*
  # Add Branding Settings Table to Existing Database

  1. New Tables
    - `branding_settings`
      - `id` (uuid, primary key)
      - `app_name` (text, default 'UptimeWatch')
      - `logo_url` (text, nullable)
      - `favicon_url` (text, default '/vite.svg')
      - `primary_color` (text, default '#2563eb')
      - `secondary_color` (text, default '#1e40af')
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `branding_settings` table
    - Add policies for read/write access
    - Grant permissions to anon role

  3. Default Data
    - Insert default branding settings
*/

-- Create branding_settings table
CREATE TABLE IF NOT EXISTS branding_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_name text DEFAULT 'UptimeWatch' NOT NULL,
  logo_url text DEFAULT '',
  favicon_url text DEFAULT '/vite.svg' NOT NULL,
  primary_color text DEFAULT '#2563eb' NOT NULL,
  secondary_color text DEFAULT '#1e40af' NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on branding_settings
ALTER TABLE branding_settings ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions to anon role BEFORE creating RLS policies
GRANT SELECT, INSERT, UPDATE, DELETE ON public.branding_settings TO anon;

-- Allow SELECT for branding settings
DROP POLICY IF EXISTS "Allow SELECT for branding settings" ON branding_settings;
CREATE POLICY "Allow SELECT for branding settings"
  ON branding_settings
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Allow INSERT for branding settings
DROP POLICY IF EXISTS "Allow INSERT for branding settings" ON branding_settings;
CREATE POLICY "Allow INSERT for branding settings"
  ON branding_settings
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow UPDATE for branding settings
DROP POLICY IF EXISTS "Allow UPDATE for branding settings" ON branding_settings;
CREATE POLICY "Allow UPDATE for branding settings"
  ON branding_settings
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Allow DELETE for branding settings (for reset functionality)
DROP POLICY IF EXISTS "Allow DELETE for branding settings" ON branding_settings;
CREATE POLICY "Allow DELETE for branding settings"
  ON branding_settings
  FOR DELETE
  TO anon
  USING (true);

-- Insert default branding settings if not exists
INSERT INTO branding_settings (app_name, logo_url, favicon_url, primary_color, secondary_color)
SELECT 'UptimeWatch', '', '/vite.svg', '#2563eb', '#1e40af'
WHERE NOT EXISTS (SELECT 1 FROM branding_settings);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_branding_settings_app_name ON branding_settings(app_name);

-- Verify the table was created successfully
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'branding_settings') THEN
    RAISE NOTICE '✅ branding_settings table created successfully';
  ELSE
    RAISE EXCEPTION '❌ Failed to create branding_settings table';
  END IF;
END $$;