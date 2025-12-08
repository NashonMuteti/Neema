"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useSession } from './SessionContext'; // New import

// Centralized User interface
export interface User {
  id: string;
  name: string;
  email: string;
  role: string; // Changed to string to support custom roles
  status: "Active" | "Inactive" | "Suspended";
  enableLogin: boolean;
  imageUrl?: string;
  receiveNotifications?: boolean; // Added for UserSettings
}

interface AuthContextType {
  userRoles: string[];
  isAdmin: boolean;
  currentUserId: string | null;
  currentUser: User | null;
  setUserRoles: (roles: string[]) => void;
  toggleAdmin: () => void;
  setCurrentUserId: (userId: string | null) => void; // Kept for potential external use, though internal logic will use Supabase
  setCurrentUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user: supabaseUser, loading: sessionLoading } = useSession(); // Get Supabase user from SessionContext

  // Initial states for roles and admin status (can be fetched from a profiles table later)
  const [userRoles, setUserRolesState] = useState<string[]>(['Contributor']); // Default to Contributor
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUserState, setCurrentUserState] = useState<User | null>(null);

  useEffect(() => {
    if (!sessionLoading) {
      if (supabaseUser) {
        // Map Supabase user to our internal User interface
        const mappedUser: User = {
          id: supabaseUser.id,
          name: supabaseUser.user_metadata.name || supabaseUser.email || 'User',
          email: supabaseUser.email || '',
          role: 'Contributor', // Default role, will be overridden if a profile exists
          status: 'Active', // Default status
          enableLogin: true, // Supabase user is logged in
          imageUrl: supabaseUser.user_metadata.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${supabaseUser.user_metadata.name || supabaseUser.email}`,
          receiveNotifications: true, // Default preference
        };

        // For demonstration, if the user is 'alice@example.com', make them an Admin
        if (supabaseUser.email === 'alice@example.com') {
          mappedUser.role = 'Admin';
          setUserRolesState(['Admin']);
          setIsAdmin(true);
        } else if (supabaseUser.email === 'bob@example.com') {
          mappedUser.role = 'Project Manager';
          setUserRolesState(['Project Manager']);
          setIsAdmin(false);
        } else {
          setUserRolesState(['Contributor']);
          setIsAdmin(false);
        }

        setCurrentUserState(mappedUser);
      } else {
        setCurrentUserState(null);
        setUserRolesState([]);
        setIsAdmin(false);
      }
    }
  }, [supabaseUser, sessionLoading]);

  const toggleAdmin = () => {
    // This toggle is for demonstration purposes of UI changes based on admin status.
    // In a real app, role changes would be managed via backend/database.
    setIsAdmin(prev => !prev);
    setUserRolesState(prev => prev.includes('Admin') ? prev.filter(role => role !== 'Admin') : [...prev, 'Admin']);
  };

  const setCurrentUserId = (userId: string | null) => {
    // This setter is less relevant now that user comes from Supabase session,
    // but kept for compatibility if other parts of the app rely on it.
    // It should ideally trigger a re-fetch of the user from Supabase or a profiles table.
    console.warn("setCurrentUserId is deprecated. Use setCurrentUser with a full User object.");
  };

  const setUserRoles = (roles: string[]) => {
    setUserRolesState(roles);
    setIsAdmin(roles.includes('Admin'));
  };

  return (
    <AuthContext.Provider value={{
      userRoles: userRoles,
      isAdmin: isAdmin,
      currentUserId: currentUserState?.id || null,
      currentUser: currentUserState,
      setUserRoles,
      toggleAdmin,
      setCurrentUserId,
      setCurrentUser: setCurrentUserState,
    }}>
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