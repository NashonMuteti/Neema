"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { UserRole as UserRoleType } from '@/components/admin/AddEditUserRoleDialog'; // Import the UserRole interface
import { allPrivilegeNames } from '@/lib/privileges'; // Import allPrivilegeNames

interface UserRolesContextType {
  userRoles: UserRoleType[];
  addRole: (role: Omit<UserRoleType, 'id'>) => void;
  updateRole: (role: UserRoleType) => void;
  deleteRole: (roleId: string) => void;
}

const UserRolesContext = createContext<UserRolesContextType | undefined>(undefined);

export const UserRolesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [userRoles, setUserRoles] = useState<UserRoleType[]>([
    {
      id: "r1",
      name: "Admin",
      description: "Full access to all features and settings.",
      memberUserIds: ["u1"],
      menuPrivileges: allPrivilegeNames, // Admin role gets all privileges
    },
    {
      id: "r2",
      name: "Project Manager",
      description: "Can create and manage projects, view reports.",
      memberUserIds: ["u2"],
      menuPrivileges: [
        "View Dashboard",
        "View Project Accounts", "Manage Projects",
        "View Petty Cash", "Manage Petty Cash",
        "View Pledges", "Manage Pledges",
        "View Income", "Manage Income",
        "View Expenditure", "Manage Expenditure",
        "View Sales Management", "View Stocks", "View Daily Sales", "View Debts",
        "View Members",
        "View Reports", "View Member Contributions Report", "View Petty Cash Report", "View Pledge Report", "View Table Banking Summary",
        "View My Contributions",
      ]
    },
    {
      id: "r3",
      name: "Contributor",
      description: "Can record contributions and view personal reports.",
      memberUserIds: ["u3", "u4"],
      menuPrivileges: [
        "View Dashboard",
        "View My Contributions",
        "View Members", // Can view members list
      ]
    },
  ]);

  const addRole = (role: Omit<UserRoleType, 'id'>) => {
    const newRole: UserRoleType = {
      ...role,
      id: `r${userRoles.length + 1}`, // Simple ID generation
      memberUserIds: [], // New roles start with no members
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