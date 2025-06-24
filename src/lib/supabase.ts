import { createClient } from '@supabase/supabase-js';

// Enhanced environment variable detection for Vercel and other platforms
const getEnvVar = (name: string): string => {
  // Try multiple ways to get environment variables
  const value = import.meta.env[name] || 
                process?.env?.[name] || 
                (typeof window !== 'undefined' && (window as any).__ENV__?.[name]) ||
                '';
  
  console.log(`🔍 Environment variable ${name}:`, {
    value: value ? `${value.substring(0, 30)}...` : 'undefined',
    length: value?.length || 0,
    type: typeof value,
    isEmpty: !value || value === 'undefined' || value.trim() === '',
    source: import.meta.env[name] ? 'import.meta.env' : 
            process?.env?.[name] ? 'process.env' : 
            'not found'
  });
  
  return value;
};

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY');

// Enhanced validation
const isValidUrl = (url: string): boolean => {
  if (!url || url === 'undefined' || url.trim() === '') return false;
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.includes('supabase') && (urlObj.protocol === 'https:' || urlObj.protocol === 'http:');
  } catch {
    return false;
  }
};

const isValidKey = (key: string): boolean => {
  if (!key || key === 'undefined' || key.trim() === '') return false;
  // Supabase anon keys are JWT tokens, should be quite long and contain dots
  return key.length > 100 && key.includes('.');
};

console.log('🔍 Supabase Configuration Validation:', {
  hasUrl: !!supabaseUrl,
  hasKey: !!supabaseAnonKey,
  urlValid: isValidUrl(supabaseUrl),
  keyValid: isValidKey(supabaseAnonKey),
  urlValue: supabaseUrl ? `${supabaseUrl.substring(0, 50)}...` : 'missing',
  keyLength: supabaseAnonKey?.length || 0,
  mode: import.meta.env.MODE,
  dev: import.meta.env.DEV,
  prod: import.meta.env.PROD,
  allEnvVars: Object.keys(import.meta.env).filter(key => key.startsWith('VITE_'))
});

// Create a flag to track if environment is properly configured
export const isEnvConfigured = isValidUrl(supabaseUrl) && isValidKey(supabaseAnonKey);

// Create supabase client only if environment is configured
export const supabase = isEnvConfigured ? createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  },
  global: {
    headers: {
      'X-Client-Info': 'uptime-monitor'
    }
  }
}) : null;

// Export environment variables for use in components
export const envVars = {
  supabaseUrl,
  supabaseAnonKey,
  isConfigured: isEnvConfigured,
  isValidUrl: isValidUrl(supabaseUrl),
  isValidKey: isValidKey(supabaseAnonKey)
};

// Test connection function
export const testSupabaseConnection = async () => {
  if (!supabase) {
    return { success: false, error: 'Supabase client not initialized - check environment variables' };
  }
  
  try {
    const { data, error } = await supabase.from('monitors').select('count').limit(1);
    return { success: !error, error: error?.message };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

// Database types
export interface Database {
  public: {
    Tables: {
      admin_users: {
        Row: {
          id: string;
          username: string;
          password_hash: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          username: string;
          password_hash: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          password_hash?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      monitors: {
        Row: {
          id: string;
          name: string;
          url: string;
          method: 'http' | 'ping';
          status: 'up' | 'down' | 'checking';
          response_time: number;
          uptime: number;
          check_interval: number;
          last_checked: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          url: string;
          method: 'http' | 'ping';
          status?: 'up' | 'down' | 'checking';
          response_time?: number;
          uptime?: number;
          check_interval?: number;
          last_checked?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          url?: string;
          method?: 'http' | 'ping';
          status?: 'up' | 'down' | 'checking';
          response_time?: number;
          uptime?: number;
          check_interval?: number;
          last_checked?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      status_checks: {
        Row: {
          id: string;
          monitor_id: string;
          status: 'up' | 'down';
          response_time: number;
          checked_at: string;
        };
        Insert: {
          id?: string;
          monitor_id: string;
          status: 'up' | 'down';
          response_time?: number;
          checked_at?: string;
        };
        Update: {
          id?: string;
          monitor_id?: string;
          status?: 'up' | 'down';
          response_time?: number;
          checked_at?: string;
        };
      };
      monitoring_settings: {
        Row: {
          id: string;
          global_check_interval: number;
          enable_global_interval: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          global_check_interval?: number;
          enable_global_interval?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          global_check_interval?: number;
          enable_global_interval?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}