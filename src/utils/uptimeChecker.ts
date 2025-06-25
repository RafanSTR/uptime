import { Monitor } from '../types/monitor';

// Multiple API endpoints untuk HTTP/HTTPS dengan load balancing
const HTTP_HTTPS_API_ENDPOINTS = [
    'https://cek.apiii.workers.dev/status',
    'http://cf1.apicek.workers.dev/status',
    'https://cf2.apicek2.workers.dev/status',
    'https://cf3.apicek3.workers.dev/status',
    'https://cf4.apicek4.workers.dev/status'
];

// API endpoint untuk ping (tetap menggunakan yang original)
const PING_API_ENDPOINT = 'https://api.autsc.my.id/status';

// Fungsi untuk memilih endpoint HTTP/HTTPS secara acak
const getRandomHttpApiEndpoint = (): string => {
  const randomIndex = Math.floor(Math.random() * HTTP_HTTPS_API_ENDPOINTS.length);
  const selectedEndpoint = HTTP_HTTPS_API_ENDPOINTS[randomIndex];
  console.log(`🎲 Selected random HTTP/HTTPS API endpoint: ${selectedEndpoint} (${randomIndex + 1}/${HTTP_HTTPS_API_ENDPOINTS.length})`);
  return selectedEndpoint;
};

// Fungsi untuk mendapatkan endpoint berdasarkan method
const getApiEndpoint = (method: 'http' | 'ping'): string => {
  if (method === 'ping') {
    return PING_API_ENDPOINT;
  } else {
    return getRandomHttpApiEndpoint();
  }
};

export const checkUptime = async (url: string, method: 'http' | 'ping'): Promise<{ status: 'up' | 'down'; responseTime: number }> => {
  const formattedUrl = formatUrlForApi(url, method);
  const maxRetries = 3;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Pilih endpoint API
      const apiEndpoint = getApiEndpoint(method);
      
      console.log(`🔄 Attempt ${attempt}/${maxRetries} - Checking uptime for ${formattedUrl} using ${method} method via ${apiEndpoint}`);
      
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
      const apiUrl = `${apiEndpoint}?domain=${encodeURIComponent(formattedUrl)}&method=${apiMethod}`;
      console.log(`📡 API URL: ${apiUrl}`);
      
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
      console.log(`📊 Raw API response for ${formattedUrl} via ${apiEndpoint}:`, data);
      
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
          console.warn(`⚠️ Latency sangat tinggi (${rawLatency}ms) untuk ${formattedUrl}, kemungkinan ada masalah dengan API atau koneksi`);
          responseTime = Math.round(rawLatency); // Tetap tampilkan nilai asli tapi dengan warning
        } else {
          console.warn(`⚠️ Invalid latency value (${rawLatency}ms) untuk ${formattedUrl}, setting to 0`);
          responseTime = 0;
        }
      }
      
      console.log(`✅ Uptime check successful for ${formattedUrl} via ${apiEndpoint}:`, {
        status: isUp ? 'up' : 'down',
        responseTime: responseTime,
        apiMethod: apiMethod,
        apiEndpoint: apiEndpoint,
        attempt: attempt,
        rawApiLatency: data.latency_ms,
        processedLatency: responseTime
      });
      
      return {
        status: isUp ? 'up' : 'down',
        responseTime: responseTime
      };
      
    } catch (error) {
      console.error(`❌ Attempt ${attempt}/${maxRetries} failed for ${formattedUrl}:`, error);
      
      // Jika ini bukan attempt terakhir, coba lagi dengan endpoint berbeda
      if (attempt < maxRetries) {
        console.log(`🔄 Retrying with different endpoint... (${attempt + 1}/${maxRetries})`);
        continue;
      }
      
      // Jika semua attempts gagal
      console.error(`❌ All ${maxRetries} attempts failed for ${formattedUrl}`);
    }
  }
  
  // Fallback: Return down status dengan response time 0 jika semua attempts gagal
  return {
    status: 'down',
    responseTime: 0
  };
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

// Fungsi untuk cleanup old status checks - ENHANCED dengan logging yang lebih baik
export const cleanupOldStatusChecks = async (): Promise<{ success: boolean; deletedCount: number; error?: string }> => {
  try {
    const { supabase, isEnvConfigured } = await import('../lib/supabase');
    
    if (!isEnvConfigured || !supabase) {
      console.warn('🧹 Cleanup skipped: Supabase not configured');
      return { success: false, deletedCount: 0, error: 'Supabase not configured' };
    }

    // Hapus status checks yang lebih dari 90 hari
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    console.log(`🧹 Starting cleanup of status checks older than ${ninetyDaysAgo.toISOString()}`);

    // Hitung jumlah records yang akan dihapus terlebih dahulu
    const { count: recordsToDelete, error: countError } = await supabase
      .from('status_checks')
      .select('*', { count: 'exact', head: true })
      .lt('checked_at', ninetyDaysAgo.toISOString());

    if (countError) {
      console.error('❌ Error counting records for cleanup:', countError);
      return { success: false, deletedCount: 0, error: countError.message };
    }

    const recordCount = recordsToDelete || 0;
    console.log(`🧹 Found ${recordCount} old records to cleanup`);

    if (recordCount === 0) {
      console.log('✅ No old records to cleanup');
      return { success: true, deletedCount: 0 };
    }

    // Lakukan penghapusan
    const { error: deleteError } = await supabase
      .from('status_checks')
      .delete()
      .lt('checked_at', ninetyDaysAgo.toISOString());

    if (deleteError) {
      console.error('❌ Error during cleanup:', deleteError);
      return { success: false, deletedCount: 0, error: deleteError.message };
    }

    console.log(`✅ Cleanup completed successfully: ${recordCount} old status checks deleted`);
    
    // Log statistik database setelah cleanup
    const { count: remainingRecords } = await supabase
      .from('status_checks')
      .select('*', { count: 'exact', head: true });

    console.log(`📊 Database stats after cleanup: ${remainingRecords || 0} records remaining`);

    return { success: true, deletedCount: recordCount };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Cleanup error:', error);
    return { success: false, deletedCount: 0, error: errorMessage };
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

// Utility function untuk test konektivitas semua API endpoints
export const testApiConnectivity = async (): Promise<{ 
  httpHttpsEndpoints: Array<{ endpoint: string; status: 'working' | 'failed'; error?: string }>;
  pingEndpoint: { endpoint: string; status: 'working' | 'failed'; error?: string };
}> => {
  console.log('🧪 Testing connectivity to all API endpoints...');
  
  // Test HTTP/HTTPS endpoints
  const httpHttpsResults = await Promise.all(
    HTTP_HTTPS_API_ENDPOINTS.map(async (endpoint) => {
      try {
        const testUrl = `${endpoint}?domain=google.com&method=https`;
        const response = await fetch(testUrl, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(5000)
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log(`✅ ${endpoint} is working:`, data);
          return { endpoint, status: 'working' as const };
        } else {
          return { endpoint, status: 'failed' as const, error: `HTTP ${response.status}` };
        }
      } catch (error) {
        return { 
          endpoint, 
          status: 'failed' as const, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
      }
    })
  );

  // Test Ping endpoint
  let pingResult;
  try {
    const testUrl = `${PING_API_ENDPOINT}?domain=google.com&method=ping`;
    const response = await fetch(testUrl, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(5000)
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Ping endpoint is working:`, data);
      pingResult = { endpoint: PING_API_ENDPOINT, status: 'working' as const };
    } else {
      pingResult = { endpoint: PING_API_ENDPOINT, status: 'failed' as const, error: `HTTP ${response.status}` };
    }
  } catch (error) {
    pingResult = { 
      endpoint: PING_API_ENDPOINT, 
      status: 'failed' as const, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }

  console.log('🧪 API connectivity test completed:', {
    httpHttpsWorking: httpHttpsResults.filter(r => r.status === 'working').length,
    httpHttpsTotal: httpHttpsResults.length,
    pingWorking: pingResult.status === 'working'
  });

  return {
    httpHttpsEndpoints: httpHttpsResults,
    pingEndpoint: pingResult
  };
};

// Utility function untuk mendapatkan statistik penggunaan API
export const getApiUsageStats = (): { 
  httpHttpsEndpoints: string[];
  pingEndpoint: string;
  totalEndpoints: number;
  loadBalancing: boolean;
} => {
  return {
    httpHttpsEndpoints: HTTP_HTTPS_API_ENDPOINTS,
    pingEndpoint: PING_API_ENDPOINT,
    totalEndpoints: HTTP_HTTPS_API_ENDPOINTS.length + 1,
    loadBalancing: true
  };
};
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

// Fungsi untuk cleanup old status checks - ENHANCED dengan logging yang lebih baik
export const cleanupOldStatusChecks = async (): Promise<{ success: boolean; deletedCount: number; error?: string }> => {
  try {
    const { supabase, isEnvConfigured } = await import('../lib/supabase');
    
    if (!isEnvConfigured || !supabase) {
      console.warn('🧹 Cleanup skipped: Supabase not configured');
      return { success: false, deletedCount: 0, error: 'Supabase not configured' };
    }

    // Hapus status checks yang lebih dari 90 hari
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    console.log(`🧹 Starting cleanup of status checks older than ${ninetyDaysAgo.toISOString()}`);

    // Hitung jumlah records yang akan dihapus terlebih dahulu
    const { count: recordsToDelete, error: countError } = await supabase
      .from('status_checks')
      .select('*', { count: 'exact', head: true })
      .lt('checked_at', ninetyDaysAgo.toISOString());

    if (countError) {
      console.error('❌ Error counting records for cleanup:', countError);
      return { success: false, deletedCount: 0, error: countError.message };
    }

    const recordCount = recordsToDelete || 0;
    console.log(`🧹 Found ${recordCount} old records to cleanup`);

    if (recordCount === 0) {
      console.log('✅ No old records to cleanup');
      return { success: true, deletedCount: 0 };
    }

    // Lakukan penghapusan
    const { error: deleteError } = await supabase
      .from('status_checks')
      .delete()
      .lt('checked_at', ninetyDaysAgo.toISOString());

    if (deleteError) {
      console.error('❌ Error during cleanup:', deleteError);
      return { success: false, deletedCount: 0, error: deleteError.message };
    }

    console.log(`✅ Cleanup completed successfully: ${recordCount} old status checks deleted`);
    
    // Log statistik database setelah cleanup
    const { count: remainingRecords } = await supabase
      .from('status_checks')
      .select('*', { count: 'exact', head: true });

    console.log(`📊 Database stats after cleanup: ${remainingRecords || 0} records remaining`);

    return { success: true, deletedCount: recordCount };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Cleanup error:', error);
    return { success: false, deletedCount: 0, error: errorMessage };
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
