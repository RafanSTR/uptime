/*
  # Fix RLS policies for monitors table

  1. Security Updates
    - Add policy for INSERT operations on monitors table
    - Add policy for UPDATE operations on monitors table  
    - Add policy for DELETE operations on monitors table
    - These policies allow anonymous users to perform admin operations
    - Note: This is a temporary solution for the current custom auth system

  2. Important Security Note
    - Current implementation allows anonymous users to modify monitors
    - This is necessary because the app uses custom authentication that doesn't establish Supabase sessions
    - For production use, consider migrating to Supabase Auth for proper security
*/

-- Allow anonymous users to insert monitors
-- This is needed because the current custom auth doesn't establish Supabase sessions
CREATE POLICY "Allow INSERT for monitor management"
  ON monitors
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow anonymous users to update monitors
-- This is needed for status updates and admin edits
CREATE POLICY "Allow UPDATE for monitor management"
  ON monitors
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Allow anonymous users to delete monitors
-- This is needed for admin delete operations
CREATE POLICY "Allow DELETE for monitor management"
  ON monitors
  FOR DELETE
  TO anon
  USING (true);

-- Also allow authenticated users to perform all operations
CREATE POLICY "Allow all operations for authenticated users"
  ON monitors
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);