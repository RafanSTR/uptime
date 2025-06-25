import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('⏰ Starting scheduled monitoring trigger...');

    // Call the monitor-checker function
    const monitorCheckerUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/monitor-checker`;
    
    const response = await fetch(monitorCheckerUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        'Content-Type': 'application/json'
      }
    });

    const result = await response.json();
    
    console.log('✅ Scheduled monitoring completed:', result);

    return new Response(
      JSON.stringify({
        message: 'Scheduled monitoring triggered successfully',
        result: result,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Scheduled monitoring error:', error);
    return new Response(
      JSON.stringify({ error: 'Scheduled monitoring failed', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
