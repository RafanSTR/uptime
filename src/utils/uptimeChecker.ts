import { Monitor } from '../types/monitor';

// API endpoint untuk pengecekan uptime
const UPTIME_API_BASE = 'https://api.autsc.my.id/status';

export const checkUptime = async (url: string, method: 'http' | 'ping'): Promise<{ status: 'up' | 'down'; responseTime: number }> => {
  const formattedUrl = formatUrlForApi(url, method);
  
  try {
    console.log(`Checking uptime for ${formattedUrl} using ${method} method`);
    
    // Tentukan metode API berdasarkan input
    let apiMethod = method;
    if (method === 'http') {
      // Untuk HTTP, gunakan https jika URL sudah memiliki protokol https, atau http jika tidak
      if (formattedUrl.startsWith('https://')) {
        apiMethod = 'https';
      } else {
        apiMethod = 'http';
      }
    }
    
    // Buat URL API
    const apiUrl = `${UPTIME_API_BASE}?domain=${encodeURIComponent(formattedUrl)}&method=${apiMethod}`;
    console.log(`API URL: ${apiUrl}`);
    
    // Buat AbortController untuk timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 detik timeout
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'UptimeMonitor/1.0'
      },
      signal: controller.signal,
      mode: 'cors'
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`API request failed with status: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`Raw API response for ${formattedUrl}:`, data);
    
    // Parse response dari API - pastikan mengambil nilai yang benar
    const isUp = data.status === 'online';
    
    // Pastikan latency_ms adalah number dan dalam range yang wajar
    let responseTime = 0;
    if (data.latency_ms !== undefined && data.latency_ms !== null) {
      const rawLatency = Number(data.latency_ms);
      
      // PENTING: Pastikan ini adalah latensi dari API, bukan dari interval monitoring
      // Latensi normal biasanya di bawah 5000ms (5 detik)
      if (rawLatency > 0 && rawLatency < 10000) { // Maksimal 10 detik untuk latensi normal
        responseTime = Math.round(rawLatency);
      } else if (rawLatency >= 10000) {
        console.warn(`Latency sangat tinggi (${rawLatency}ms) untuk ${formattedUrl}, kemungkinan ada masalah dengan API atau koneksi`);
        responseTime = Math.round(rawLatency); // Tetap tampilkan nilai asli tapi dengan warning
      } else {
        console.warn(`Invalid latency value (${rawLatency}ms) untuk ${formattedUrl}, setting to 0`);
        responseTime = 0;
      }
    }
    
    console.log(`✅ Uptime check result for ${formattedUrl}:`, {
      status: isUp ? 'up' : 'down',
      responseTime: responseTime,
      apiMethod: apiMethod,
      rawApiLatency: data.latency_ms,
      processedLatency: responseTime,
      isValidLatency: responseTime > 0 && responseTime < 10000
    });
    
    return {
      status: isUp ? 'up' : 'down',
      responseTime: responseTime
    };
    
  } catch (error) {
    console.error(`❌ Uptime check failed for ${formattedUrl}:`, error);
    
    // Fallback: Return down status dengan response time 0
    return {
      status: 'down',
      responseTime: 0
    };
  }
};

export const calculateUptime = async (monitorId: string): Promise<number> => {
  try {
    // Import supabase di dalam function untuk menghindari circular dependency
    const { supabase, isEnvConfigured } = await import('../lib/supabase');
    
    if (!isEnvConfigured || !supabase) {
      console.warn('Supabase not configured, returning default uptime');
      return 100;
    }

    // Ambil status checks dalam 30 hari terakhir
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: statusChecks, error } = await supabase
      .from('status_checks')
      .select('status')
      .eq('monitor_id', monitorId)
      .gte('checked_at', thirtyDaysAgo.toISOString())
      .order('checked_at', { ascending: false });

    if (error) {
      console.error('Error fetching status checks for uptime calculation:', error);
      return 100; // Default fallback
    }

    if (!statusChecks || statusChecks.length === 0) {
      // Jika belum ada history, return 100% untuk monitor baru
      console.log(`No status history found for monitor ${monitorId}, returning 100%`);
      return 100;
    }

    // Hitung uptime berdasarkan history real
    const upChecks = statusChecks.filter(check => check.status === 'up').length;
    const totalChecks = statusChecks.length;
    const uptime = Math.round((upChecks / totalChecks) * 100);

    console.log(`📊 Uptime calculation for monitor ${monitorId}:`, {
      totalChecks,
      upChecks,
      downChecks: totalChecks - upChecks,
      uptime: `${uptime}%`,
      period: '30 days'
    });

    return uptime;
  } catch (error) {
    console.error('Error calculating uptime:', error);
    return 100; // Fallback
  }
};

// Fungsi untuk menyimpan status check ke database
export const saveStatusCheck = async (monitorId: string, status: 'up' | 'down', responseTime: number): Promise<boolean> => {
  try {
    const { supabase, isEnvConfigured } = await import('../lib/supabase');
    
    if (!isEnvConfigured || !supabase) {
      console.warn('Supabase not configured, cannot save status check');
      return false;
    }

    const { error } = await supabase
      .from('status_checks')
      .insert({
        monitor_id: monitorId,
        status: status,
        response_time: responseTime,
        checked_at: new Date().toISOString()
      });

    if (error) {
      console.error('Error saving status check:', error);
      return false;
    }

    console.log(`✅ Status check saved for monitor ${monitorId}: ${status} (${responseTime}ms)`);
    return true;
  } catch (error) {
    console.error('Error saving status check:', error);
    return false;
  }
};

// Fungsi untuk cleanup old status checks (opsional, untuk menjaga ukuran database)
export const cleanupOldStatusChecks = async (): Promise<void> => {
  try {
    const { supabase, isEnvConfigured } = await import('../lib/supabase');
    
    if (!isEnvConfigured || !supabase) {
      return;
    }

    // Hapus status checks yang lebih dari 90 hari
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const { error } = await supabase
      .from('status_checks')
      .delete()
      .lt('checked_at', ninetyDaysAgo.toISOString());

    if (error) {
      console.error('Error cleaning up old status checks:', error);
    } else {
      console.log('✅ Old status checks cleaned up (older than 90 days)');
    }
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
};

export const extractHostname = (url: string): string => {
  try {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return new URL(url).hostname;
    }
    return url;
  } catch {
    return url;
  }
};

// Helper function untuk format URL untuk API call
export const formatUrlForApi = (url: string, method: 'http' | 'ping'): string => {
  if (method === 'ping') {
    // Untuk ping, extract hostname/IP saja
    return extractHostname(url);
  } else {
    // Untuk HTTP, pastikan ada protokol yang benar
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      // Default ke https jika tidak ada protokol
      return `https://${url}`;
    }
    return url;
  }
};

// Utility function untuk test konektivitas API
export const testApiConnectivity = async (): Promise<{ status: 'working' | 'failed'; error?: string }> => {
  try {
    const testUrl = `${UPTIME_API_BASE}?domain=google.com&method=https`;
    const response = await fetch(testUrl, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(5000)
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('API connectivity test result:', data);
      return {
        status: 'working'
      };
    } else {
      return {
        status: 'failed',
        error: `HTTP ${response.status}`
      };
    }
  } catch (error) {
    return {
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};