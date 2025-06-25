import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

interface Monitor {
  id: string;
  name: string;
  url: string;
  method: 'http' | 'ping';
  check_interval: number;
  last_checked: string;
}

interface CheckResult {
  status: 'up' | 'down';
  responseTime: number;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🔄 Starting background monitor check...');

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all monitors that need checking
    const { data: monitors, error: monitorsError } = await supabase
      .from('monitors')
      .select('*')
      .in('status', ['up', 'down', 'checking']);

    if (monitorsError) {
      console.error('❌ Error fetching monitors:', monitorsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch monitors' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!monitors || monitors.length === 0) {
      console.log('ℹ️ No monitors found to check');
      return new Response(
        JSON.stringify({ message: 'No monitors to check', checked: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get monitoring settings
    const { data: settings } = await supabase
      .from('monitoring_settings')
      .select('*')
      .single();

    const globalInterval = settings?.enable_global_interval ? settings.global_check_interval : null;

    // Filter monitors that need checking
    const now = new Date();
    const monitorsToCheck = monitors.filter((monitor: Monitor) => {
      const lastChecked = new Date(monitor.last_checked);
      const interval = globalInterval || monitor.check_interval || 5;
      const nextCheckTime = new Date(lastChecked.getTime() + (interval * 60 * 1000));
      
      return now >= nextCheckTime;
    });

    console.log(`📊 Found ${monitorsToCheck.length} monitors that need checking out of ${monitors.length} total`);

    if (monitorsToCheck.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No monitors need checking at this time', checked: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check each monitor
    const results = [];
    for (const monitor of monitorsToCheck) {
      try {
        console.log(`🔄 Checking monitor: ${monitor.name} (${monitor.url})`);
        
        // Update status to checking
        await supabase
          .from('monitors')
          .update({ 
            status: 'checking',
            updated_at: new Date().toISOString()
          })
          .eq('id', monitor.id);

        // Perform the actual check
        const checkResult = await performCheck(monitor.url, monitor.method);
        
        // Save status check to history
        await supabase
          .from('status_checks')
          .insert({
            monitor_id: monitor.id,
            status: checkResult.status,
            response_time: checkResult.responseTime,
            checked_at: new Date().toISOString()
          });

        // Calculate uptime from history
        const uptime = await calculateUptime(supabase, monitor.id);

        // Update monitor with results
        await supabase
          .from('monitors')
          .update({
            status: checkResult.status,
            response_time: checkResult.responseTime,
            uptime: uptime,
            last_checked: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', monitor.id);

        results.push({
          id: monitor.id,
          name: monitor.name,
          status: checkResult.status,
          responseTime: checkResult.responseTime,
          uptime: uptime
        });

        console.log(`✅ Monitor ${monitor.name} checked: ${checkResult.status} (${checkResult.responseTime}ms, ${uptime}% uptime)`);

      } catch (error) {
        console.error(`❌ Error checking monitor ${monitor.name}:`, error);
        
        // Save failed check
        await supabase
          .from('status_checks')
          .insert({
            monitor_id: monitor.id,
            status: 'down',
            response_time: 0,
            checked_at: new Date().toISOString()
          });

        // Calculate uptime after failed check
        const uptime = await calculateUptime(supabase, monitor.id);

        // Update monitor as down
        await supabase
          .from('monitors')
          .update({
            status: 'down',
            response_time: 0,
            uptime: uptime,
            last_checked: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', monitor.id);

        results.push({
          id: monitor.id,
          name: monitor.name,
          status: 'down',
          responseTime: 0,
          uptime: uptime,
          error: error.message
        });
      }
    }

    console.log(`✅ Background check completed. Checked ${results.length} monitors`);

    return new Response(
      JSON.stringify({
        message: 'Background monitoring completed',
        checked: results.length,
        results: results,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Background monitoring error:', error);
    return new Response(
      JSON.stringify({ error: 'Background monitoring failed', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function performCheck(url: string, method: 'http' | 'ping'): Promise<CheckResult> {
  const API_ENDPOINT = 'https://api.autsc.my.id/status';
  const formattedUrl = formatUrlForApi(url, method);
  
  try {
    // Determine API method
    let apiMethod = method;
    if (method === 'http') {
      apiMethod = formattedUrl.startsWith('https://') ? 'https' : 'http';
    }
    
    const apiUrl = `${API_ENDPOINT}?domain=${encodeURIComponent(formattedUrl)}&method=${apiMethod}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'UptimeMonitor-Background/1.0'
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();
    const isUp = data.status === 'online';
    const responseTime = Math.round(Number(data.latency_ms) || 0);

    return {
      status: isUp ? 'up' : 'down',
      responseTime: responseTime
    };

  } catch (error) {
    console.error(`Check failed for ${formattedUrl}:`, error);
    return {
      status: 'down',
      responseTime: 0
    };
  }
}

function formatUrlForApi(url: string, method: 'http' | 'ping'): string {
  if (method === 'ping') {
    // Extract hostname for ping
    try {
      if (url.startsWith('http://') || url.startsWith('https://')) {
        return new URL(url).hostname;
      }
      return url;
    } catch {
      return url;
    }
  } else {
    // For HTTP, ensure protocol
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return `https://${url}`;
    }
    return url;
  }
}

async function calculateUptime(supabase: any, monitorId: string): Promise<number> {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: statusChecks, error } = await supabase
      .from('status_checks')
      .select('status')
      .eq('monitor_id', monitorId)
      .gte('checked_at', thirtyDaysAgo.toISOString());

    if (error || !statusChecks || statusChecks.length === 0) {
      return 100; // Default for new monitors
    }

    const upChecks = statusChecks.filter((check: any) => check.status === 'up').length;
    const totalChecks = statusChecks.length;
    
    return Math.round((upChecks / totalChecks) * 100);
  } catch (error) {
    console.error('Error calculating uptime:', error);
    return 100;
  }
      }
