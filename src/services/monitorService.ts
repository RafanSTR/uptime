import { supabase, isEnvConfigured } from '../lib/supabase';
import { Monitor, MonitorFormData } from '../types/monitor';
import { calculateUptime, saveStatusCheck } from '../utils/uptimeChecker';

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

      // Calculate real uptime for each monitor
      const monitorsWithUptime = await Promise.all(
        data.map(async (monitor) => {
          const realUptime = await calculateUptime(monitor.id);
          return {
            id: monitor.id,
            name: monitor.name,
            url: monitor.url,
            method: monitor.method,
            status: monitor.status,
            responseTime: monitor.response_time,
            uptime: realUptime, // Use calculated uptime instead of stored value
            checkInterval: monitor.check_interval || 5,
            lastChecked: new Date(monitor.last_checked),
            createdAt: new Date(monitor.created_at)
          };
        })
      );

      return monitorsWithUptime;
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
        uptime: 100, // New monitor starts with 100%
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

      // Save status check to history if not checking
      if (status !== 'checking') {
        await saveStatusCheck(id, status, responseTime);
      }

      // Calculate real uptime from history
      const realUptime = await calculateUptime(id);

      const { error } = await supabase
        .from('monitors')
        .update({
          status,
          response_time: responseTime,
          uptime: realUptime, // Use calculated uptime
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
  },

  async getMonitorStatusHistory(id: string, days: number = 7): Promise<Array<{timestamp: Date, status: 'up' | 'down', responseTime: number}>> {
    try {
      if (!isEnvConfigured || !supabase) {
        console.error('Supabase not configured');
        return [];
      }

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('status_checks')
        .select('status, response_time, checked_at')
        .eq('monitor_id', id)
        .gte('checked_at', startDate.toISOString())
        .order('checked_at', { ascending: true });

      if (error) {
        console.error('Error fetching status history:', error);
        return [];
      }

      return data.map(check => ({
        timestamp: new Date(check.checked_at),
        status: check.status,
        responseTime: check.response_time
      }));
    } catch (error) {
      console.error('Error fetching status history:', error);
      return [];
    }
  }
};