import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const FUNCTION_NAME = "export-database-data";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const errorResponse = (message: string, status: number) => jsonResponse({ error: message }, status);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.error(`[${FUNCTION_NAME}] Missing or invalid authorization header`);
      return errorResponse("Unauthorized: Missing Authorization header", 401);
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseServiceRole = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const {
      data: { user },
      error: authError,
    } = await supabaseServiceRole.auth.getUser(token);

    if (authError || !user) {
      console.error(`[${FUNCTION_NAME}] Auth error`, { message: authError?.message });
      return errorResponse("Unauthorized: Invalid or expired token", 401);
    }

    const { data: profile, error: profileError } = await supabaseServiceRole
      .from("profiles")
      .select("role, status, enable_login")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      console.error(`[${FUNCTION_NAME}] Profile lookup failed`, { message: profileError?.message, userId: user.id });
      return errorResponse("Forbidden: User profile not found or access denied", 403);
    }

    const allowedRoles = ["Admin", "Super Admin"];
    const isAuthorized =
      allowedRoles.includes(profile.role) && profile.status === "Active" && profile.enable_login === true;

    if (!isAuthorized) {
      console.warn(`[${FUNCTION_NAME}] Unauthorized export blocked`, { userId: user.id, role: profile.role });
      return errorResponse("Forbidden: Insufficient privileges", 403);
    }

    const tablesToExport = [
      "profiles",
      "financial_accounts",
      "income_transactions",
      "expenditure_transactions",
      "projects",
      "project_collections",
      "project_pledges",
      "board_members",
      "roles",
      "settings",
    ];

    const exportedData: Record<string, unknown[]> = {};

    for (const tableName of tablesToExport) {
      const { data, error } = await supabaseServiceRole.from(tableName).select("*");

      if (error) {
        console.error(`[${FUNCTION_NAME}] Failed to export table`, { tableName, message: error.message });
        exportedData[tableName] = [];
        continue;
      }

      exportedData[tableName] = data ?? [];
    }

    return jsonResponse(exportedData);
  } catch (error) {
    console.error(`[${FUNCTION_NAME}] Unexpected error`, { error });
    return errorResponse(error instanceof Error ? error.message : "Unexpected error", 500);
  }
});
