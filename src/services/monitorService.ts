import { supabase, isEnvConfigured } from '../lib/supabase';
import { Monitor, MonitorFormData } from '../types/monitor';

export const monitorService = {
  async getAllMonitors(): Promise<Monitor[]> {
    try {
      if (!isEnvConfigured || !supabase) {
        console.error('Supabase not configured');
        return [];
      }

      const { data, error } = await supabase
        .from('monitors')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching monitors:', error);
        return [];
      }

      return data.map(monitor => ({
        id: monitor.id,
        name: monitor.name,
        url: monitor.url,
        method: monitor.method,
        status: monitor.status,
        responseTime: monitor.response_time,
        uptime: monitor.uptime,
        checkInterval: monitor.check_interval || 5,
        lastChecked: new Date(monitor.last_checked),
        createdAt: new Date(monitor.created_at)
      }));
    } catch (error) {
      console.error('Error fetching monitors:', error);
      return [];
    }
  },

  async createMonitor(data: MonitorFormData): Promise<Monitor | null> {
    try {
      if (!isEnvConfigured || !supabase) {
        console.error('Supabase not configured');
        return null;
      }

      const { data: monitor, error } = await supabase
        .from('monitors')
        .insert({
          name: data.name,
          url: data.url,
          method: data.method,
          check_interval: data.checkInterval,
          status: 'checking',
          response_time: 0,
          uptime: 100.0,
          last_checked: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error || !monitor) {
        console.error('Error creating monitor:', error);
        return null;
      }

      return {
        id: monitor.id,
        name: monitor.name,
        url: monitor.url,
        method: monitor.method,
        status: monitor.status,
        responseTime: monitor.response_time,
        uptime: monitor.uptime,
        checkInterval: monitor.check_interval,
        lastChecked: new Date(monitor.last_checked),
        createdAt: new Date(monitor.created_at)
      };
    } catch (error) {
      console.error('Error creating monitor:', error);
      return null;
    }
  },

  async updateMonitor(id: string, data: MonitorFormData): Promise<boolean> {
    try {
      if (!isEnvConfigured || !supabase) {
        console.error('Supabase not configured');
        return false;
      }

      const { error } = await supabase
        .from('monitors')
        .update({
          name: data.name,
          url: data.url,
          method: data.method,
          check_interval: data.checkInterval,
          status: 'checking',
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      return !error;
    } catch (error) {
      console.error('Error updating monitor:', error);
      return false;
    }
  },

  async deleteMonitor(id: string): Promise<boolean> {
    try {
      if (!isEnvConfigured || !supabase) {
        console.error('Supabase not configured');
        return false;
      }

      const { error } = await supabase
        .from('monitors')
        .delete()
        .eq('id', id);

      return !error;
    } catch (error) {
      console.error('Error deleting monitor:', error);
      return false;
    }
  },

  async updateMonitorStatus(id: string, status: 'up' | 'down' | 'checking', responseTime: number, uptime: number): Promise<boolean> {
    try {
      if (!isEnvConfigured || !supabase) {
        console.error('Supabase not configured');
        return false;
      }

      const { error } = await supabase
        .from('monitors')
        .update({
          status,
          response_time: responseTime,
          uptime,
          last_checked: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      return !error;
    } catch (error) {
      console.error('Error updating monitor status:', error);
      return false;
    }
  },

  async getMonitorsForCheck(): Promise<Monitor[]> {
    try {
      if (!isEnvConfigured || !supabase) {
        console.error('Supabase not configured');
        return [];
      }

      const { data, error } = await supabase
        .from('monitors')
        .select('*')
        .in('status', ['up', 'down', 'checking']);

      if (error) {
        console.error('Error fetching monitors for check:', error);
        return [];
      }

      return data.map(monitor => ({
        id: monitor.id,
        name: monitor.name,
        url: monitor.url,
        method: monitor.method,
        status: monitor.status,
        responseTime: monitor.response_time,
        uptime: monitor.uptime,
        checkInterval: monitor.check_interval || 5,
        lastChecked: new Date(monitor.last_checked),
        createdAt: new Date(monitor.created_at)
      }));
    } catch (error) {
      console.error('Error fetching monitors for check:', error);
      return [];
    }
  }
};