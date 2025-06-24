/*
  # Fix Admin Login Authentication

  1. Security Changes
    - Drop restrictive policy that blocks all anonymous access
    - Allow SELECT operations for authentication purposes
    - Create separate policies to prevent modifications by anonymous users

  2. Policy Updates
    - Enable SELECT access for admin_users table for authentication
    - Block INSERT, UPDATE, DELETE operations from anonymous users
    - Maintain security while allowing login functionality
*/

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "No public access to admin_users" ON admin_users;

-- Allow SELECT operations for authentication
CREATE POLICY "Allow SELECT for admin authentication"
  ON admin_users
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Prevent INSERT from anonymous users
CREATE POLICY "Prevent anonymous INSERT to admin_users"
  ON admin_users
  FOR INSERT
  TO anon
  WITH CHECK (false);

-- Prevent UPDATE from anonymous users
CREATE POLICY "Prevent anonymous UPDATE to admin_users"
  ON admin_users
  FOR UPDATE
  TO anon
  USING (false);

-- Prevent DELETE from anonymous users
CREATE POLICY "Prevent anonymous DELETE to admin_users"
  ON admin_users
  FOR DELETE
  TO anon
  USING (false);