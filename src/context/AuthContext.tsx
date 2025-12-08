"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';

// Centralized User interface
export interface User {
  id: string;
  name: string;
  email: string;
  role: string; // Changed to string to support custom roles
  status: "Active" | "Inactive" | "Suspended";
  enableLogin: boolean;
  imageUrl?: string;
}

interface AuthContextType {
  userRoles: string[];
  isAdmin: boolean;
  currentUserId: string | null;
  currentUser: User | null; // Added currentUser
  setUserRoles: (roles: string[]) => void;
  toggleAdmin: () => void;
  setCurrentUserId: (userId: string | null) => void;
  setCurrentUser: (user: User | null) => void; // Added setter for currentUser
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // For demonstration, start with 'Admin' role and a default user ID and user object.
  // In a real app, these would come from authentication.
  const [userRoles, setUserRoles] = useState<string[]>(['Admin']); 
  const [currentUserId, setCurrentUserIdState] = useState<string | null>("u1"); // Renamed to avoid conflict
  const [currentUser, setCurrentUserState] = useState<User | null>({ // Default to 'u1' for demonstration
    id: "u1",
    name: "Alice Johnson",
    email: "alice@example.com",
    role: "Admin",
    status: "Active",
    enableLogin: true,
    imageUrl: "https://api.dicebear.com/8.x/initials/svg?seed=Alice",
  });

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

  // Custom setter for currentUserId that also updates currentUser
  const setCurrentUserId = (userId: string | null) => {
    setCurrentUserIdState(userId);
    // In a real app, you would fetch the full user object here based on userId
    // For now, we'll just set a dummy user if an ID is provided, or null if cleared.
    if (userId === "u1") { // Example: if u1 is logged in
      setCurrentUserState({
        id: "u1",
        name: "Alice Johnson",
        email: "alice@example.com",
        role: "Admin",
        status: "Active",
        enableLogin: true,
        imageUrl: "https://api.dicebear.com/8.x/initials/svg?seed=Alice",
      });
    } else if (userId === "u2") { // Example: if u2 is logged in
      setCurrentUserState({
        id: "u2",
        name: "Bob Williams",
        email: "bob@example.com",
        role: "Project Manager",
        status: "Active",
        enableLogin: true,
        imageUrl: "https://api.dicebear.com/8.x/initials/svg?seed=Bob",
      });
    } else {
      setCurrentUserState(null);
    }
  };

  // Custom setter for currentUser
  const setCurrentUser = (user: User | null) => {
    setCurrentUserState(user);
    setCurrentUserIdState(user ? user.id : null);
    setUserRoles(user ? [user.role] : []); // Update roles based on the user's role
  };


  return (
    <AuthContext.Provider value={{ userRoles, isAdmin, currentUserId, currentUser, setUserRoles, toggleAdmin, setCurrentUserId, setCurrentUser }}>
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