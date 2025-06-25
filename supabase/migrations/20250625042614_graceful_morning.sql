/*
  # Create branding settings table

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

-- Allow SELECT for branding settings
CREATE POLICY "Allow SELECT for branding settings"
  ON branding_settings
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Allow INSERT for branding settings
CREATE POLICY "Allow INSERT for branding settings"
  ON branding_settings
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow UPDATE for branding settings
CREATE POLICY "Allow UPDATE for branding settings"
  ON branding_settings
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Allow DELETE for branding settings (for reset functionality)
CREATE POLICY "Allow DELETE for branding settings"
  ON branding_settings
  FOR DELETE
  TO anon
  USING (true);

-- Insert default branding settings if not exists
INSERT INTO branding_settings (app_name, logo_url, favicon_url, primary_color, secondary_color)
SELECT 'UptimeWatch', '', '/vite.svg', '#2563eb', '#1e40af'
WHERE NOT EXISTS (SELECT 1 FROM branding_settings);