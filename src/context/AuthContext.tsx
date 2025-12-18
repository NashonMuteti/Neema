"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client'; // Import Supabase client
import { Session, User as SupabaseUser } from '@supabase/supabase-js'; // Import Supabase types
// Removed: import { useUserRoles } from './UserRolesContext'; // Import useUserRoles to get role definitions

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
  session: Session | null; // Supabase session
  supabaseUser: SupabaseUser | null; // Supabase user object
  currentUser: User | null; // Our application's user object
  isLoading: boolean; // To indicate if auth state is being loaded
  // Removed setCurrentUser as it will now be derived from Supabase
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null); // Our app's user object
  const [isLoading, setIsLoading] = useState(true);
  // Removed: const { userRoles: definedRoles } = useUserRoles(); // Get all defined roles from context

  // Function to fetch and set the application's currentUser profile
  const fetchUserProfile = async (user: SupabaseUser | null) => {
    if (user) {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found (new user)
        console.error("Error fetching user profile:", error);
        // Even if there's an error, try to create a basic user
        setCurrentUser({
          id: user.id,
          name: user.user_metadata.full_name || user.email || "User",
          email: user.email || "",
          role: "Contributor", // Default role if profile fetch fails
          status: "Active",
          enableLogin: true,
          imageUrl: user.user_metadata.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${user.email}`,
        });
        return;
      }

      if (profile) {
        setCurrentUser({
          id: profile.id,
          name: profile.name || user.user_metadata.full_name || user.email || "User",
          email: profile.email || user.email || "",
          role: profile.role || "Contributor", // Use role from profile, default to Contributor
          status: profile.status || "Active",
          enableLogin: profile.enable_login ?? true, // Default to true if null
          imageUrl: profile.image_url || user.user_metadata.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${profile.name || user.email}`,
        });
      } else {
        // This case should ideally be handled by the handle_new_user trigger,
        // but as a fallback, create a basic profile if it somehow doesn't exist.
        console.warn("No profile found for user, creating a default one (this should be handled by trigger).");
        setCurrentUser({
          id: user.id,
          name: user.user_metadata.full_name || user.email || "User",
          email: user.email || "",
          role: "Contributor", // Default role for new users
          status: "Active",
          enableLogin: true,
          imageUrl: user.user_metadata.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${user.email}`,
        });
      }
    } else {
      setCurrentUser(null);
    }
    console.log("AuthContext: currentUser", currentUser); // Log currentUser
  };

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        setSession(currentSession);
        setSupabaseUser(currentSession?.user || null);
        await fetchUserProfile(currentSession?.user || null);
        setIsLoading(false);
      }
    );

    // Initial session check
    supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      setSession(initialSession);
      setSupabaseUser(initialSession?.user || null);
      await fetchUserProfile(initialSession?.user || null);
      setIsLoading(false);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []); // Removed definedRoles from dependency array

  return (
    <AuthContext.Provider value={{ session, supabaseUser, currentUser, isLoading }}>
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