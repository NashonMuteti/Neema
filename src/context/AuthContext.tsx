"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface AuthContextType {
  userRoles: string[];
  isAdmin: boolean;
  currentUserId: string | null; // Added currentUserId
  setUserRoles: (roles: string[]) => void;
  toggleAdmin: () => void;
  setCurrentUserId: (userId: string | null) => void; // Added setter for currentUserId
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // For demonstration, start with 'Admin' role and a default user ID.
  // In a real app, these would come from authentication.
  const [userRoles, setUserRoles] = useState<string[]>(['Admin']); 
  const [currentUserId, setCurrentUserId] = useState<string | null>("u1"); // Default to 'u1' for demonstration

  const isAdmin = userRoles.includes('Admin');

  const toggleAdmin = () => {
    setUserRoles(prevRoles => {
      if (prevRoles.includes('Admin')) {
        return prevRoles.filter(role => role !== 'Admin');
      } else {
        return [...prevRoles, 'Admin'];
      }
    });
  };

  return (
    <AuthContext.Provider value={{ userRoles, isAdmin, currentUserId, setUserRoles, toggleAdmin, setCurrentUserId }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an an AuthProvider');
  }
  return context;
};