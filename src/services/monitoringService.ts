import { supabase, isEnvConfigured } from '../lib/supabase';
import { MonitoringSettings } from '../types/monitor';

export const monitoringService = {
  async getSettings(): Promise<MonitoringSettings | null> {
    try {
      if (!isEnvConfigured || !supabase) {
        console.error('Supabase not configured');
        return null;
      }

      const { data, error } = await supabase
        .from('monitoring_settings')
        .select('*')
        .single();

      if (error || !data) {
        console.error('Error fetching monitoring settings:', error);
        return null;
      }

      return {
        globalCheckInterval: data.global_check_interval,
        enableGlobalInterval: data.enable_global_interval
      };
    } catch (error) {
      console.error('Error fetching monitoring settings:', error);
      return null;
    }
  },

  async updateSettings(settings: MonitoringSettings): Promise<boolean> {
    try {
      if (!isEnvConfigured || !supabase) {
        console.error('Supabase not configured');
        return false;
      }

      const { error } = await supabase
        .from('monitoring_settings')
        .update({
          global_check_interval: settings.globalCheckInterval,
          enable_global_interval: settings.enableGlobalInterval,
          updated_at: new Date().toISOString()
        })
        .eq('id', (await this.getSettingsId()));

      return !error;
    } catch (error) {
      console.error('Error updating monitoring settings:', error);
      return false;
    }
  },

  async getSettingsId(): Promise<string | null> {
    try {
      if (!isEnvConfigured || !supabase) {
        return null;
      }

      const { data, error } = await supabase
        .from('monitoring_settings')
        .select('id')
        .single();

      if (error || !data) {
        return null;
      }

      return data.id;
    } catch (error) {
      console.error('Error getting settings ID:', error);
      return null;
    }
  }
};