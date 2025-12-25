import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response('Unauthorized: Missing Authorization header', { status: 401, headers: corsHeaders });
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Create a Supabase client with the service role key to bypass RLS for data fetching
    // This is necessary for a backup function that needs to read all data.
    const supabaseServiceRole = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify the JWT token to get the user's ID
    const { data: { user }, error: authError } = await supabaseServiceRole.auth.getUser(token);

    if (authError || !user) {
      console.error("Edge Function Auth Error:", authError?.message);
      return new Response('Unauthorized: Invalid or expired token', { status: 401, headers: corsHeaders });
    }

    // Fetch the user's role from the profiles table using the service role client
    const { data: profile, error: profileError } = await supabaseServiceRole
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      console.error("Edge Function Profile Error:", profileError?.message);
      return new Response('Forbidden: User profile not found or access denied', { status: 403, headers: corsHeaders });
    }

    const userRole = profile.role;
    const allowedRoles = ['Admin', 'Super Admin'];

    if (!allowedRoles.includes(userRole)) {
      return new Response('Forbidden: Insufficient privileges', { status: 403, headers: corsHeaders });
    }

    // Fetch data from all relevant tables
    const tablesToExport = [
      'profiles',
      'financial_accounts',
      'income_transactions',
      'expenditure_transactions',
      'petty_cash_transactions',
      'projects',
      'project_collections',
      'project_pledges',
      'board_members',
      'roles',
      'settings',
    ];

    const exportedData: { [key: string]: any[] } = {};
    for (const tableName of tablesToExport) {
      const { data, error } = await supabaseServiceRole.from(tableName).select('*');
      if (error) {
        console.error(`Error fetching data from ${tableName}:`, error);
        // Decide whether to fail the whole backup or continue with partial data
        // For now, we'll include the error in the response or skip the table
        exportedData[tableName] = []; // Skip table on error
      } else {
        exportedData[tableName] = data || [];
      }
    }

    return new Response(JSON.stringify(exportedData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error("Unexpected error in Edge Function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});