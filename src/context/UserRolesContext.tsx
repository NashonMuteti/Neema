"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { UserRole as UserRoleType } from '@/components/admin/AddEditUserRoleDialog';
import { allPrivilegeNames } from '@/lib/privileges';
import { useAuth } from './AuthContext';

interface UserRolesContextType {
  userRoles: UserRoleType[];
  addRole: (role: Omit<UserRoleType, 'id'>) => void;
  updateRole: (role: UserRoleType) => void;
  deleteRole: (roleId: string) => void;
}

const UserRolesContext = createContext<UserRolesContextType | undefined>(undefined);

export const UserRolesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();

  const [userRoles, setUserRoles] = useState<UserRoleType[]>([
    {
      id: "r0", // New ID for Super Admin
      name: "Super Admin",
      description: "Full access to all features and settings, including critical system configurations.",
      memberUserIds: [], // Will be dynamically updated
      menuPrivileges: allPrivilegeNames, // Super Admin role gets all privileges
    },
    {
      id: "r1",
      name: "Admin",
      description: "Full access to all features and settings.",
      memberUserIds: [], // Will be dynamically updated
      menuPrivileges: [...allPrivilegeNames.filter(p => p !== "Manage Database Maintenance" && p !== "Initialize Balances"), "Manage Default Password"], // Admin role gets all privileges except critical maintenance, but includes default password
    },
    {
      id: "r2",
      name: "Project Manager",
      description: "Can create and manage projects, view reports.",
      memberUserIds: [], // Will be dynamically updated
      menuPrivileges: [
        "View Dashboard",
        "View Project Accounts", "Manage Projects",
        "View Petty Cash", "Manage Petty Cash",
        "View Pledges", "Manage Pledges",
        "View Income", "Manage Income",
        "View Expenditure", "Manage Expenditure",
        "View Sales Management", "View Stocks", "View Daily Sales", "View Debts",
        "View Members", "Export Member List PDF", "Export Member List Excel",
        "View Board Members",
        "View Reports", "View Member Contributions Report", "View Petty Cash Report", "View Pledge Report", "View Table Banking Summary",
        "View My Contributions",
      ]
    },
    {
      id: "r3",
      name: "Contributor",
      description: "Can record contributions and view personal reports.",
      memberUserIds: [], // Will be dynamically updated
      menuPrivileges: [
        "View Dashboard",
        "View My Contributions",
        "View Members",
      ]
    },
  ]);

  // Effect to dynamically assign the current user's ID to their corresponding role
  React.useEffect(() => {
    if (currentUser) {
      setUserRoles(prevRoles => {
        const updatedRoles = prevRoles.map(role => {
          // Remove current user's ID from any role they might have been in previously
          const filteredMemberUserIds = role.memberUserIds.filter(id => id !== currentUser.id);

          // If this is the current user's role, add their ID
          if (role.name === currentUser.role) {
            return { ...role, memberUserIds: [...filteredMemberUserIds, currentUser.id] };
          }
          return { ...role, memberUserIds: filteredMemberUserIds };
        });
        return updatedRoles;
      });
    }
  }, [currentUser]);


  const addRole = (role: Omit<UserRoleType, 'id'>) => {
    const newRole: UserRoleType = {
      ...role,
      id: `r${userRoles.length + 1}`,
      memberUserIds: [],
      menuPrivileges: role.menuPrivileges || [],
    };
    setUserRoles(prev => [...prev, newRole]);
  };

  const updateRole = (updatedRole: UserRoleType) => {
    setUserRoles(prev =>
      prev.map(role => (role.id === updatedRole.id ? updatedRole : role))
    );
  };

  const deleteRole = (roleId: string) => {
    setUserRoles(prev => prev.filter(role => role.id !== roleId));
  };

  return (
    <UserRolesContext.Provider value={{ userRoles, addRole, updateRole, deleteRole }}>
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