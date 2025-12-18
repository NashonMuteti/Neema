import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';

// Financial amount validation schema
export const financialAmountSchema = z.number().positive("Amount must be positive").min(0.01, "Amount must be at least 0.01");

// File upload validation schema
export const fileUploadSchema = z.object({
  type: z.string().refine(
    (type) => type.startsWith('image/'),
    "Only image files are allowed"
  ),
  size: z.number().max(5 * 1024 * 1024, "File size must be less than 5MB") // 5MB limit
});

// Authorization check for accessing member data
export const canAccessMemberData = async (currentUserId: string, targetMemberId: string): Promise<boolean> => {
  // Users can always access their own data
  if (currentUserId === targetMemberId) {
    return true;
  }

  // Check if current user has admin privileges
  const { data: currentUserProfile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', currentUserId)
    .single();

  if (error) {
    console.error('Error checking user role:', error);
    return false;
  }

  // Admins and Super Admins can access other users' data
  const adminRoles = ['Admin', 'Super Admin'];
  return adminRoles.includes(currentUserProfile?.role || '');
};

// Authorization check for role management operations
export const canManageRoles = async (userId: string): Promise<boolean> => {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error checking role management permission:', error);
    return false;
  }

  // Only Super Admins can manage roles
  return profile?.role === 'Super Admin';
};

// Log security events
export const logSecurityEvent = (event: string, details: Record<string, any>) => {
  console.log(`SECURITY EVENT: ${event}`, {
    timestamp: new Date().toISOString(),
    ...details
  });
};

// Validate financial transaction
export const validateFinancialTransaction = (amount: number, accountId: string, userId: string) => {
  try {
    // Validate amount
    financialAmountSchema.parse(amount);
    
    // Additional server-side validations would go here
    // For example, checking account ownership, balance sufficiency, etc.
    
    return { isValid: true, error: null };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { isValid: false, error: error.errors[0].message };
    }
    return { isValid: false, error: 'Invalid transaction data' };
  }
};