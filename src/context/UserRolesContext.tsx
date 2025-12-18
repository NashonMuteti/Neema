"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { UserRole as UserRoleType } from '@/components/admin/AddEditUserRoleDialog';
import { allPrivilegeNames } from '@/lib/privileges';
import { useAuth } from './AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';

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
        memberUserIds: [], // This will be populated dynamically in UserRolesSettings
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

  // Effect to dynamically assign the current user's ID to their corresponding role
  // This is now handled by the `profiles` table directly, so this logic is less critical here
  // but can be used to ensure the `currentUser`'s role is always in the `userRoles` list.
  useEffect(() => {
    if (currentUser && userRoles.length > 0) {
      setUserRoles(prevRoles => {
        const updatedRoles = prevRoles.map(role => {
          // If this is the current user's role, ensure their ID is conceptually associated
          // (though not stored in the roles table itself)
          if (role.name === currentUser.role) {
            // For display purposes, we can add the current user's ID if it's not there
            if (!role.memberUserIds.includes(currentUser.id)) {
              return { ...role, memberUserIds: [...role.memberUserIds, currentUser.id] };
            }
          } else {
            // Ensure current user's ID is removed from other roles if they changed roles
            return { ...role, memberUserIds: role.memberUserIds.filter(id => id !== currentUser.id) };
          }
          return role;
        });
        return updatedRoles;
      });
    }
  }, [currentUser, userRoles]);

  // New effect to ensure Super Admin always has all privileges
  useEffect(() => {
    if (currentUser?.role === "Super Admin" && userRoles.length > 0) {
      setUserRoles(prevRoles => {
        const updatedRoles = prevRoles.map(role => {
          if (role.name === "Super Admin") {
            // Ensure Super Admin role has ALL privileges defined in allPrivilegeNames
            const updatedPrivileges = Array.from(new Set([...role.menuPrivileges, ...allPrivilegeNames]));
            const newRole = { ...role, menuPrivileges: updatedPrivileges };
            console.log("UserRolesContext: Super Admin role after privilege injection", newRole); // Added log
            return newRole;
          }
          return role;
        });
        return updatedRoles;
      });
    }
  }, [currentUser, userRoles]);


  const addRole = async (role: Omit<UserRoleType, 'id'>) => {
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