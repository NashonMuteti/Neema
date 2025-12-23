"use client";
import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { UserRole as UserRoleType } from '@/components/admin/AddEditUserRoleDialog';
import { allPrivilegeNames } from '@/lib/privileges';
import { useAuth } from './AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';
import { canManageRoles, logSecurityEvent } from '@/utils/security';

interface UserRolesContextType {
  userRoles: UserRoleType[];
  addRole: (role: Omit<UserRoleType, 'id'>) => Promise<void>;
  updateRole: (role: UserRoleType) => Promise<void>;
  deleteRole: (roleId: string) => Promise<void>;
  fetchRoles: () => Promise<void>; // Add fetchRoles to context
}

const UserRolesContext = createContext<UserRolesContextType | undefined>(undefined);

export const UserRolesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { currentUser, isLoading: authLoading } = useAuth(); // Get authLoading from useAuth
  const [userRoles, setUserRoles] = useState<UserRoleType[]>([]);
  
  const fetchRoles = useCallback(async () => {
    const { data, error } = await supabase
      .from('roles')
      .select('*')
      .order('name', { ascending: true });
      
    if (error) {
      console.error("Error fetching roles:", error);
      showError("Failed to load user roles.");
      setUserRoles([]);
    } else {
      // Map Supabase data to our UserRoleType interface
      const fetchedRoles: UserRoleType[] = data.map(role => ({
        id: role.id,
        name: role.name,
        description: role.description || '',
        // Removed: memberUserIds: [], // This will be populated dynamically in UserRolesSettings
        menuPrivileges: role.menu_privileges || [],
      }));
      
      setUserRoles(fetchedRoles);
      console.log("UserRolesContext: fetchedRoles", fetchedRoles); // Log fetched roles
    }
  }, []);

  useEffect(() => {
    // Fetch roles only when auth is not loading and currentUser is available
    if (!authLoading && currentUser) {
      fetchRoles();
    }
  }, [fetchRoles, currentUser, authLoading]); // Add currentUser and authLoading to dependencies

  // Removed: Effect to dynamically assign the current user's ID to their corresponding role
  // This logic was causing an infinite loop and is not needed as member counts are fetched separately.

  // New effect to ensure Super Admin always has all privileges, optimized to prevent infinite loops
  useEffect(() => {
    if (currentUser?.role === "Super Admin" && userRoles.length > 0) {
      setUserRoles(prevRoles => {
        let rolesChanged = false;
        const updatedRoles = prevRoles.map(role => {
          if (role.name === "Super Admin") {
            const currentPrivilegesSet = new Set(role.menuPrivileges);
            const allPrivilegesSet = new Set(allPrivilegeNames);
            
            // Check if current privileges already include allPrivilegeNames
            const hasAllPrivileges = allPrivilegesSet.size === currentPrivilegesSet.size &&
                                     Array.from(allPrivilegesSet).every(priv => currentPrivilegesSet.has(priv));

            if (!hasAllPrivileges) {
              // Only update if privileges are actually missing
              const mergedPrivileges = Array.from(new Set([...role.menuPrivileges, ...allPrivilegeNames]));
              rolesChanged = true; // Mark that a change occurred
              const newRole = {
                ...role,
                menuPrivileges: mergedPrivileges
              };
              console.log("UserRolesContext: Super Admin role privileges updated.", newRole);
              return newRole;
            }
          }
          return role; // Return original role if no change needed
        });
        
        // Only update state if any role object in the array actually changed
        if (rolesChanged) {
          return updatedRoles;
        }
        return prevRoles; // No actual changes, return previous state
      });
    }
  }, [currentUser, userRoles]); // `userRoles` is a dependency here, but the internal check prevents infinite loop

  const addRole = async (role: Omit<UserRoleType, 'id'>) => {
    // Security check: Only Super Admins can manage roles
    if (!currentUser || !(await canManageRoles(currentUser.id))) {
      logSecurityEvent('Unauthorized role creation attempt', {
        userId: currentUser?.id,
        roleName: role.name
      });
      showError("You are not authorized to create roles.");
      return;
    }
    
    const { error } = await supabase
      .from('roles')
      .insert({
        name: role.name,
        description: role.description,
        menu_privileges: role.menuPrivileges,
      });
      
    if (error) {
      console.error("Error adding role:", error);
      showError("Failed to add new role.");
    } else {
      await fetchRoles(); // Re-fetch roles to update state
    }
  };

  const updateRole = async (updatedRole: UserRoleType) => {
    // Security check: Only Super Admins can manage roles
    if (!currentUser || !(await canManageRoles(currentUser.id))) {
      logSecurityEvent('Unauthorized role update attempt', {
        userId: currentUser?.id,
        roleId: updatedRole.id,
        roleName: updatedRole.name
      });
      showError("You are not authorized to update roles.");
      return;
    }
    
    const { error } = await supabase
      .from('roles')
      .update({
        name: updatedRole.name,
        description: updatedRole.description,
        menu_privileges: updatedRole.menuPrivileges,
      })
      .eq('id', updatedRole.id);
      
    if (error) {
      console.error("Error updating role:", error);
      showError("Failed to update role.");
    } else {
      await fetchRoles(); // Re-fetch roles to update state
    }
  };

  const deleteRole = async (roleId: string) => {
    // Security check: Only Super Admins can manage roles
    if (!currentUser || !(await canManageRoles(currentUser.id))) {
      logSecurityEvent('Unauthorized role deletion attempt', {
        userId: currentUser?.id,
        roleId: roleId
      });
      showError("You are not authorized to delete roles.");
      return;
    }
    
    // Before deleting a role, check if any users are assigned to it
    const { count, error: countError } = await supabase
      .from('profiles')
      .select('id', { count: 'exact' })
      .eq('role', userRoles.find(r => r.id === roleId)?.name);
      
    if (countError) {
      console.error("Error checking users in role:", countError);
      showError("Failed to check if users are assigned to this role.");
      return;
    }
    
    if (count && count > 0) {
      showError(`Cannot delete role: ${count} users are currently assigned to it. Please reassign them first.`);
      return;
    }
    
    const { error } = await supabase
      .from('roles')
      .delete()
      .eq('id', roleId);
      
    if (error) {
      console.error("Error deleting role:", error);
      showError("Failed to delete role.");
    } else {
      await fetchRoles(); // Re-fetch roles to update state
    }
  };

  return (
    <UserRolesContext.Provider value={{ userRoles, addRole, updateRole, deleteRole, fetchRoles }}>
      {children}
    </UserRolesContext.Provider>
  );
};

export const useUserRoles = () => {
  const context = useContext(UserRolesContext);
  if (context === undefined) {
    throw new Error('useUserRoles must be used within a UserRolesProvider');
  }
  return context;
};