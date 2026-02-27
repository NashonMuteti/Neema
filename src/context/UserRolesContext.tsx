"use client";
import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { UserRole as UserRoleType } from '@/components/admin/AddEditUserRoleDialog';
import { allPrivilegeNames } from '@/lib/privileges';
import { useAuth } from './AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';
import { canManageRoles, logSecurityEvent } from '@/utils/security';
import { perfMark, perfStart } from '@/utils/perf';

interface UserRolesContextType {
  userRoles: UserRoleType[];
  addRole: (role: Omit<UserRoleType, 'id'>) => Promise<void>;
  updateRole: (role: UserRoleType) => Promise<void>;
  deleteRole: (roleId: string) => Promise<void>;
  fetchRoles: () => Promise<void>;
}

const UserRolesContext = createContext<UserRolesContextType | undefined>(undefined);

export const UserRolesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { currentUser, session, isLoading: authLoading } = useAuth();
  const [userRoles, setUserRoles] = useState<UserRoleType[]>([]);

  const fetchRoles = useCallback(async () => {
    const end = perfStart('UserRolesContext:fetchRoles');
    const { data, error } = await supabase
      .from('roles')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error("Error fetching roles:", error);
      showError("Failed to load user roles.");
      setUserRoles([]);
      end({ ok: false, errorCode: error.code });
      return;
    }

    let fetchedRoles: UserRoleType[] = data.map(role => ({
      id: role.id,
      name: role.name,
      description: role.description || '',
      menuPrivileges: role.menu_privileges || [],
    }));

    // Ensure Super Admin always has all privileges in the UI when the current user is Super Admin.
    if (currentUser?.role === "Super Admin") {
      fetchedRoles = fetchedRoles.map(role => {
        if (role.name !== "Super Admin") return role;

        const updatedPrivileges = Array.from(new Set([...role.menuPrivileges, ...allPrivilegeNames])).sort();
        return {
          ...role,
          menuPrivileges: updatedPrivileges,
        };
      });
    }

    setUserRoles(fetchedRoles);
    // eslint-disable-next-line no-console
    console.debug("[perf] UserRolesContext: roles loaded", { count: fetchedRoles.length });
    end({ ok: true, rows: data.length });
  }, [currentUser?.role]);

  useEffect(() => {
    perfMark('UserRolesContext:mount');
    // Fetch roles as soon as we have a session, so privilege-gated UI doesn't flicker/deny.
    if (!authLoading && session) {
      fetchRoles();
    }
  }, [fetchRoles, session, authLoading]);

  const addRole = async (role: Omit<UserRoleType, 'id'>) => {
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
      await fetchRoles();
    }
  };

  const updateRole = async (updatedRole: UserRoleType) => {
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
      await fetchRoles();
    }
  };

  const deleteRole = async (roleId: string) => {
    if (!currentUser || !(await canManageRoles(currentUser.id))) {
      logSecurityEvent('Unauthorized role deletion attempt', {
        userId: currentUser?.id,
        roleId: roleId
      });
      showError("You are not authorized to delete roles.");
      return;
    }

    const roleName = userRoles.find(r => r.id === roleId)?.name;

    // Before deleting a role, check if any users are assigned to it
    const { count, error: countError } = await supabase
      .from('profiles')
      .select('id', { count: 'exact' })
      .eq('role', roleName);

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
      await fetchRoles();
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