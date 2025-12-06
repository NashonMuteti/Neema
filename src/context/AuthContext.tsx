"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface AuthContextType {
  userRoles: string[];
  isAdmin: boolean;
  setUserRoles: (roles: string[]) => void;
  toggleAdmin: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // For demonstration, start with 'Admin' role. In a real app, this would come from authentication.
  const [userRoles, setUserRoles] = useState<string[]>(['Admin']); 

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
    <AuthContext.Provider value={{ userRoles, isAdmin, setUserRoles, toggleAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};