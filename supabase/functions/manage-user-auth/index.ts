import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response('Unauthorized: Missing Authorization header', { status: 401, headers: corsHeaders });
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Create a Supabase client with the service role key to bypass RLS for admin actions
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
      return new Response('Forbidden: Insufficient privileges to manage user authentication', { status: 403, headers: corsHeaders });
    }

    const { action, payload } = await req.json();

    switch (action) {
      case 'createUser': {
        const { email, password, user_metadata } = payload;
        const { data, error } = await supabaseServiceRole.auth.admin.createUser({
          email,
          password, // Password is required for createUser, but we'll use inviteUserByEmail
          user_metadata,
        });
        if (error) throw error;
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      }
      case 'updateUserById': {
        const { userId, updates } = payload;
        const { data, error } = await supabaseServiceRole.auth.admin.updateUserById(userId, updates);
        if (error) throw error;
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      }
      case 'inviteUserByEmail': {
        const { email, options } = payload;
        const { data, error } = await supabaseServiceRole.auth.admin.inviteUserByEmail(email, options);
        if (error) throw error;
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      }
      case 'deleteUserById': {
        const { userId } = payload;
        const { data, error } = await supabaseServiceRole.auth.admin.deleteUser(userId);
        if (error) throw error;
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      }
      default:
        return new Response('Bad Request: Unknown action', { status: 400, headers: corsHeaders });
    }

  } catch (error) {
    console.error("Unexpected error in Edge Function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});