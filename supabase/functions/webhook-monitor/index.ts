import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🎯 Webhook monitor triggered...');

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get request info for logging
    const userAgent = req.headers.get('user-agent') || 'Unknown';
    const ipAddress = req.headers.get('x-forwarded-for') || 
                     req.headers.get('x-real-ip') || 
                     'Unknown';

    // Log webhook call
    const { data: webhookLog, error: logError } = await supabase
      .from('webhook_logs')
      .insert({
        webhook_data: {
          method: req.method,
          url: req.url,
          headers: Object.fromEntries(req.headers.entries()),
          timestamp: new Date().toISOString()
        },
        ip_address: ipAddress,
        user_agent: userAgent,
        status: 'received',
        received_at: new Date().toISOString()
      })
      .select()
      .single();

    if (logError) {
      console.error('❌ Error logging webhook call:', logError);
    } else {
      console.log('📝 Webhook call logged:', webhookLog?.id);
    }

    // Check if cleanup should run (every 24 hours)
    const shouldRunCleanup = await checkIfCleanupNeeded(supabase);
    
    let cleanupResult = null;
    if (shouldRunCleanup) {
      console.log('🧹 Running automatic cleanup...');
      cleanupResult = await runCleanup(supabase);
    }

    // Call the background monitor function
    console.log('🚀 Triggering background monitor...');
    
    const backgroundMonitorUrl = `${supabaseUrl}/functions/v1/background-monitor`;
    
    const monitorResponse = await fetch(backgroundMonitorUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'WebhookMonitor/1.0'
      }
    });

    const monitorResult = await monitorResponse.json();
    
    // Update webhook log with processing status
    if (webhookLog?.id) {
      await supabase
        .from('webhook_logs')
        .update({
          status: monitorResponse.ok ? 'processed' : 'failed',
          processed_at: new Date().toISOString(),
          webhook_data: {
            ...webhookLog.webhook_data,
            monitor_result: monitorResult,
            cleanup_result: cleanupResult,
            response_status: monitorResponse.status
          }
        })
        .eq('id', webhookLog.id);
    }

    if (!monitorResponse.ok) {
      console.error('❌ Background monitor failed:', monitorResult);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Background monitor failed',
          details: monitorResult,
          cleanup_result: cleanupResult,
          webhook_id: webhookLog?.id,
          timestamp: new Date().toISOString()
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Webhook monitor completed successfully:', {
      checked: monitorResult.checked || 0,
      successful: monitorResult.successful || 0,
      errors: monitorResult.errors || 0,
      cleanup_ran: !!cleanupResult,
      cleanup_deleted: cleanupResult?.results?.totalDeleted || 0,
      webhook_id: webhookLog?.id
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Webhook monitor completed successfully',
        monitor_result: monitorResult,
        cleanup_result: cleanupResult,
        webhook_id: webhookLog?.id,
        ip_address: ipAddress,
        user_agent: userAgent,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Webhook monitor error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Webhook monitor failed',
        details: error.message,
        timestamp: new Date().toISOString()
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Check if cleanup should run (every 24 hours)
async function checkIfCleanupNeeded(supabase: any): Promise<boolean> {
  try {
    // Check last cleanup from webhook logs
    const { data: lastCleanup, error } = await supabase
      .from('webhook_logs')
      .select('webhook_data, received_at')
      .not('webhook_data->cleanup_result', 'is', null)
      .order('received_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Error checking last cleanup:', error);
      return true; // Run cleanup if we can't determine last run
    }

    if (!lastCleanup) {
      console.log('🧹 No previous cleanup found, running cleanup...');
      return true; // First time, run cleanup
    }

    const lastCleanupTime = new Date(lastCleanup.received_at);
    const now = new Date();
    const hoursSinceLastCleanup = (now.getTime() - lastCleanupTime.getTime()) / (1000 * 60 * 60);

    console.log(`🕐 Last cleanup was ${Math.round(hoursSinceLastCleanup)} hours ago`);

    // Run cleanup every 24 hours
    return hoursSinceLastCleanup >= 24;

  } catch (error) {
    console.error('Error checking cleanup schedule:', error);
    return true; // Default to running cleanup if check fails
  }
}

// Run cleanup function
async function runCleanup(supabase: any): Promise<any> {
  try {
    const results = {
      statusChecksDeleted: 0,
      webhookLogsDeleted: 0,
      errors: []
    };

    // Cleanup old status checks (older than 90 days)
    try {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      console.log(`🗑️ Cleaning up status checks older than ${ninetyDaysAgo.toISOString()}`);

      // Count records to be deleted
      const { count: statusCheckCount, error: countError } = await supabase
        .from('status_checks')
        .select('*', { count: 'exact', head: true })
        .lt('checked_at', ninetyDaysAgo.toISOString());

      if (countError) {
        throw new Error(`Error counting status checks: ${countError.message}`);
      }

      results.statusChecksDeleted = statusCheckCount || 0;

      if (results.statusChecksDeleted > 0) {
        // Delete old status checks
        const { error: deleteError } = await supabase
          .from('status_checks')
          .delete()
          .lt('checked_at', ninetyDaysAgo.toISOString());

        if (deleteError) {
          throw new Error(`Error deleting status checks: ${deleteError.message}`);
        }

        console.log(`✅ Deleted ${results.statusChecksDeleted} old status checks`);
      } else {
        console.log('ℹ️ No old status checks to delete');
      }

    } catch (error) {
      console.error('❌ Error cleaning up status checks:', error);
      results.errors.push(`Status checks cleanup failed: ${error.message}`);
    }

    // Cleanup old webhook logs (older than 30 days)
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      console.log(`🗑️ Cleaning up webhook logs older than ${thirtyDaysAgo.toISOString()}`);

      // Count records to be deleted
      const { count: webhookCount, error: countError } = await supabase
        .from('webhook_logs')
        .select('*', { count: 'exact', head: true })
        .lt('received_at', thirtyDaysAgo.toISOString());

      if (countError) {
        throw new Error(`Error counting webhook logs: ${countError.message}`);
      }

      results.webhookLogsDeleted = webhookCount || 0;

      if (results.webhookLogsDeleted > 0) {
        // Delete old webhook logs
        const { error: deleteError } = await supabase
          .from('webhook_logs')
          .delete()
          .lt('received_at', thirtyDaysAgo.toISOString());

        if (deleteError) {
          throw new Error(`Error deleting webhook logs: ${deleteError.message}`);
        }

        console.log(`✅ Deleted ${results.webhookLogsDeleted} old webhook logs`);
      } else {
        console.log('ℹ️ No old webhook logs to delete');
      }

    } catch (error) {
      console.error('❌ Error cleaning up webhook logs:', error);
      results.errors.push(`Webhook logs cleanup failed: ${error.message}`);
    }

    const success = results.errors.length === 0;
    const totalDeleted = results.statusChecksDeleted + results.webhookLogsDeleted;

    console.log('📊 Cleanup completed:', {
      success,
      statusChecksDeleted: results.statusChecksDeleted,
      webhookLogsDeleted: results.webhookLogsDeleted,
      totalDeleted,
      errors: results.errors.length
    });

    return {
      success,
      message: success ? 'Cleanup completed successfully' : 'Cleanup completed with errors',
      results: {
        statusChecksDeleted: results.statusChecksDeleted,
        webhookLogsDeleted: results.webhookLogsDeleted,
        totalDeleted,
        errors: results.errors
      },
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('❌ Cleanup error:', error);
    return {
      success: false,
      error: 'Cleanup failed',
      details: error.message,
      timestamp: new Date().toISOString()
    };
  }
}
