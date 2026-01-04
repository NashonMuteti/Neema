import { supabase } from "@/integrations/supabase/client";
import { User } from "@/context/AuthContext"; // Assuming User interface is available

/**
 * Logs a user activity to the user_activity_logs table.
 * @param user The current user object (from AuthContext).
 * @param action A descriptive string of the action performed (e.g., "Logged in", "Created Project").
 * @param details Optional JSONB object for additional context (e.g., { projectId: '...', oldStatus: '...', newStatus: '...' }).
 */
export const logUserActivity = async (user: User | null, action: string, details?: Record<string, any>) => {
  if (!user) {
    console.warn("Attempted to log activity without a logged-in user:", action, details);
    return;
  }

  try {
    const { error } = await supabase
      .from('user_activity_logs')
      .insert({
        user_id: user.id,
        action: action,
        details: details || {},
      });

    if (error) {
      console.error("Error logging user activity:", error);
    }
  } catch (err) {
    console.error("Unexpected error in logUserActivity:", err);
  }
};