/*
  # Fix RLS Policy for Status Checks Insert Operations

  1. Security Updates
    - Add missing INSERT policy for status_checks table
    - Ensure anon role can insert status check records
    - Grant necessary permissions to anon role

  2. Changes Made
    - Create INSERT policy for status_checks table
    - Grant INSERT permission to anon role on status_checks table
*/

-- Grant INSERT permission to anon role for status_checks table
GRANT INSERT ON public.status_checks TO anon;

-- Create INSERT policy for status_checks table
DROP POLICY IF EXISTS "Allow INSERT for status tracking" ON status_checks;
CREATE POLICY "Allow INSERT for status tracking"
  ON status_checks
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Ensure the existing SELECT policy is still in place
DROP POLICY IF EXISTS "Anyone can read status_checks" ON status_checks;
CREATE POLICY "Anyone can read status_checks"
  ON status_checks
  FOR SELECT
  TO anon, authenticated
  USING (true);