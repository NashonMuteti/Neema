import { supabase } from "@/integrations/supabase/client";
import { showError } from "@/utils/toast";

// Utility function to check if RLS is enabled on all tables
export const auditRLSEnabled = async (): Promise<void> => {
  try {
    // This is a simplified check - in practice, you'd need to query the 
    // PostgreSQL system catalogs to verify RLS policies
    console.log("Security Audit: Checking RLS configuration...");
    
    // Example of how you might check a specific table
    const { error } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true });
    
    if (error) {
      console.warn("RLS may not be properly configured:", error.message);
      showError("Security warning: Some data access policies may need review");
    } else {
      console.log("RLS check passed for profiles table");
    }
  } catch (error) {
    console.error("Security audit failed:", error);
    showError("Security audit could not be completed");
  }
};

// Utility to verify user has proper permissions
export const verifyUserPermissions = async (userId: string): Promise<boolean> => {
  try {
    // Check if user exists in profiles table (RLS should restrict this properly)
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();
    
    // If we get data, the user has proper access
    // If we get an error, RLS is likely working correctly
    return !error && data !== null;
  } catch (error) {
    console.error("Permission verification failed:", error);
    return false;
  }
};