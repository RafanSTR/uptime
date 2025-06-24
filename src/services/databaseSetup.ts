import { supabase, isEnvConfigured } from '../lib/supabase';

export interface SetupResult {
  success: boolean;
  message: string;
  details?: string[];
}

export const databaseSetup = {
  async checkConnection(): Promise<boolean> {
    try {
      console.log('🔍 Checking database connection...');
      
      if (!isEnvConfigured || !supabase) {
        console.log('❌ Environment not configured or Supabase client not available');
        return false;
      }
      
      // Test basic connection by trying to query monitors table
      const { data, error } = await supabase
        .from('monitors')
        .select('count')
        .limit(1);
      
      if (error) {
        console.log('❌ Database connection failed:', error.message);
        return false;
      }
      
      console.log('✅ Database connection successful');
      return true;
    } catch (error) {
      console.log('❌ Database connection error:', error);
      return false;
    }
  }
};