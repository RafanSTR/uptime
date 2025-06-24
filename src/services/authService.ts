import { supabase, isEnvConfigured } from '../lib/supabase';
import bcrypt from 'bcryptjs';

export interface AdminUser {
  id: string;
  username: string;
  created_at: string;
  updated_at: string;
}

export const authService = {
  async login(username: string, password: string): Promise<AdminUser | null> {
    try {
      if (!isEnvConfigured || !supabase) {
        console.error('Supabase not configured');
        return null;
      }

      const { data: user, error } = await supabase
        .from('admin_users')
        .select('id, username, password_hash, created_at, updated_at')
        .eq('username', username)
        .single();

      if (error || !user) {
        console.error('User not found:', error);
        return null;
      }

      // Verify password using bcrypt
      const isValidPassword = await bcrypt.compare(password, user.password_hash);

      if (!isValidPassword) {
        console.error('Invalid password');
        return null;
      }

      console.log('✅ Login successful for user:', username);
      return {
        id: user.id,
        username: user.username,
        created_at: user.created_at,
        updated_at: user.updated_at
      };
    } catch (error) {
      console.error('Login error:', error);
      return null;
    }
  },

  async updateCredentials(userId: string, newUsername: string, newPassword: string): Promise<boolean> {
    try {
      if (!isEnvConfigured || !supabase) {
        console.error('Supabase not configured');
        return false;
      }

      console.log('🔄 Updating credentials for user:', userId);

      // Hash the new password with a higher salt rounds for security
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(newPassword, saltRounds);

      console.log('🔐 Password hashed successfully');

      const { data, error } = await supabase
        .from('admin_users')
        .update({
          username: newUsername,
          password_hash: passwordHash,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select();

      if (error) {
        console.error('❌ Database update error:', error);
        return false;
      }

      if (!data || data.length === 0) {
        console.error('❌ No user updated - user not found');
        return false;
      }

      console.log('✅ Credentials updated successfully:', {
        userId,
        newUsername,
        updatedAt: data[0].updated_at
      });

      return true;
    } catch (error) {
      console.error('❌ Update credentials error:', error);
      return false;
    }
  },

  async verifyCurrentPassword(userId: string, currentPassword: string): Promise<boolean> {
    try {
      if (!isEnvConfigured || !supabase) {
        console.error('Supabase not configured');
        return false;
      }

      const { data: user, error } = await supabase
        .from('admin_users')
        .select('password_hash')
        .eq('id', userId)
        .single();

      if (error || !user) {
        console.error('User not found for password verification:', error);
        return false;
      }

      const isValid = await bcrypt.compare(currentPassword, user.password_hash);
      console.log('🔐 Current password verification:', isValid ? 'valid' : 'invalid');
      
      return isValid;
    } catch (error) {
      console.error('Password verification error:', error);
      return false;
    }
  },

  async getCurrentUser(userId: string): Promise<AdminUser | null> {
    try {
      if (!isEnvConfigured || !supabase) {
        console.error('Supabase not configured');
        return null;
      }

      const { data: user, error } = await supabase
        .from('admin_users')
        .select('id, username, created_at, updated_at')
        .eq('id', userId)
        .single();

      if (error || !user) {
        return null;
      }

      return user;
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  }
};