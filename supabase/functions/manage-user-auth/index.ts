import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const FUNCTION_NAME = "manage-user-auth";

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

const getServiceClient = () =>
  createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

const getSafeUserMetadata = (userMetadata: Record<string, unknown> = {}) => {
  const safeUserMetadata: Record<string, unknown> = {};

  if (typeof userMetadata.full_name === "string") {
    safeUserMetadata.full_name = userMetadata.full_name;
  }

  if (typeof userMetadata.avatar_url === "string") {
    safeUserMetadata.avatar_url = userMetadata.avatar_url;
  }

  if (typeof userMetadata.receive_notifications === "boolean") {
    safeUserMetadata.receive_notifications = userMetadata.receive_notifications;
  }

  return safeUserMetadata;
};

const getSafeAppMetadata = (appMetadata: Record<string, unknown> = {}) => ({
  role: typeof appMetadata.role === "string" && appMetadata.role.length > 0 ? appMetadata.role : "New user",
  status:
    appMetadata.status === "Active" || appMetadata.status === "Inactive" || appMetadata.status === "Suspended"
      ? appMetadata.status
      : "Inactive",
  enable_login: appMetadata.enable_login === true,
});

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

    const supabaseServiceRole = getServiceClient();
    const token = authHeader.replace("Bearer ", "");

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
      console.warn(`[${FUNCTION_NAME}] Unauthorized admin action blocked`, { userId: user.id, role: profile.role });
      return errorResponse("Forbidden: Insufficient privileges to manage user authentication", 403);
    }

    const { action, payload } = await req.json();

    switch (action) {
      case "createUser": {
        const email = typeof payload?.email === "string" ? payload.email : "";
        const password = typeof payload?.password === "string" ? payload.password : "";
        const userMetadata = getSafeUserMetadata(payload?.user_metadata ?? {});
        const appMetadata = getSafeAppMetadata(payload?.app_metadata ?? payload?.user_metadata ?? {});

        if (!email || !password) {
          return errorResponse("Bad Request: email and password are required", 400);
        }

        const { data, error } = await supabaseServiceRole.auth.admin.createUser({
          email,
          password,
          user_metadata: userMetadata,
          app_metadata: appMetadata,
        });

        if (error) {
          console.error(`[${FUNCTION_NAME}] Failed to create user`, { message: error.message, email });
          return errorResponse(error.message, 400);
        }

        return jsonResponse(data);
      }

      case "updateUserById": {
        const userId = typeof payload?.userId === "string" ? payload.userId : "";
        const updates = payload?.updates ?? {};

        if (!userId) {
          return errorResponse("Bad Request: userId is required", 400);
        }

        const safeUpdates: Record<string, unknown> = {};

        if (typeof updates.email === "string" && updates.email.length > 0) {
          safeUpdates.email = updates.email;
        }

        if (updates.user_metadata) {
          safeUpdates.user_metadata = getSafeUserMetadata(updates.user_metadata);
        }

        if (updates.app_metadata) {
          safeUpdates.app_metadata = getSafeAppMetadata(updates.app_metadata);
        }

        const { data, error } = await supabaseServiceRole.auth.admin.updateUserById(userId, safeUpdates);

        if (error) {
          console.error(`[${FUNCTION_NAME}] Failed to update user`, { message: error.message, userId });
          return errorResponse(error.message, 400);
        }

        return jsonResponse(data);
      }

      case "inviteUserByEmail": {
        const email = typeof payload?.email === "string" ? payload.email : "";
        const options = payload?.options;

        if (!email) {
          return errorResponse("Bad Request: email is required", 400);
        }

        const { data, error } = await supabaseServiceRole.auth.admin.inviteUserByEmail(email, options);

        if (error) {
          console.error(`[${FUNCTION_NAME}] Failed to invite user`, { message: error.message, email });
          return errorResponse(error.message, 400);
        }

        return jsonResponse(data);
      }

      case "deleteUserById": {
        const userId = typeof payload?.userId === "string" ? payload.userId : "";

        if (!userId) {
          return errorResponse("Bad Request: userId is required", 400);
        }

        const { data, error } = await supabaseServiceRole.auth.admin.deleteUser(userId);

        if (error) {
          console.error(`[${FUNCTION_NAME}] Failed to delete user`, { message: error.message, userId });
          return errorResponse(error.message, 400);
        }

        return jsonResponse(data);
      }

      default:
        console.warn(`[${FUNCTION_NAME}] Unknown action requested`, { action });
        return errorResponse("Bad Request: Unknown action", 400);
    }
  } catch (error) {
    console.error(`[${FUNCTION_NAME}] Unexpected error`, { error });
    return errorResponse(error instanceof Error ? error.message : "Unexpected error", 500);
  }
});
