"use client";
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';

// Centralized User interface
export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: "Active" | "Inactive" | "Suspended";
  enableLogin: boolean;
  imageUrl?: string;
}

interface AuthContextType {
  session: Session | null;
  supabaseUser: SupabaseUser | null;
  currentUser: User | null;
  isLoading: boolean;
  refreshSession: () => Promise<void>; // Added method to refresh session
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Function to refresh the session
  const refreshSession = async () => {
    console.log("AuthContext: Attempting to refresh session...");
    try {
      const { data: { session: refreshedSession }, error } = await supabase.auth.refreshSession();
      if (error) throw error;
      
      if (refreshedSession) {
        setSession(refreshedSession);
        setSupabaseUser(refreshedSession.user);
        console.log("AuthContext: Session refreshed, fetching user profile...");
        await fetchUserProfile(refreshedSession.user);
      } else {
        console.log("AuthContext: Session refresh returned no session.");
      }
    } catch (error) {
      console.error("AuthContext: Error refreshing session:", error);
    }
  };

  // Function to fetch and set the application's currentUser profile
  const fetchUserProfile = async (user: SupabaseUser | null) => {
    console.log("AuthContext: fetchUserProfile called with user:", user ? user.id : "null");
    if (user) {
      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
          console.error("AuthContext: Error fetching user profile from DB:", error);
          // Create a minimal user object if profile fetch fails
          setCurrentUser({
            id: user.id,
            name: user.user_metadata?.full_name || user.email || "User",
            email: user.email || "",
            role: "Contributor",
            status: "Active",
            enableLogin: true,
            imageUrl: user.user_metadata?.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${user.email}`,
          });
          console.log("AuthContext: Set minimal currentUser due to profile fetch error.");
          return;
        }

        if (profile) {
          setCurrentUser({
            id: profile.id,
            name: profile.name || user.user_metadata?.full_name || user.email || "User",
            email: profile.email || user.email || "",
            role: profile.role || "Contributor",
            status: profile.status || "Active",
            enableLogin: profile.enable_login ?? true,
            imageUrl: profile.image_url || user.user_metadata?.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${profile.name || user.email}`,
          });
          console.log("AuthContext: Set currentUser from fetched profile:", profile.name);
        } else {
          // Fallback for new users
          setCurrentUser({
            id: user.id,
            name: user.user_metadata?.full_name || user.email || "User",
            email: user.email || "",
            role: "Contributor",
            status: "Active",
            enableLogin: true,
            imageUrl: user.user_metadata?.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${user.email}`,
          });
          console.log("AuthContext: Set fallback currentUser (no profile found).");
        }
      } catch (error) {
        console.error("AuthContext: Unexpected error in fetchUserProfile:", error);
        setCurrentUser(null);
      }
    } else {
      setCurrentUser(null);
      console.log("AuthContext: fetchUserProfile called with null user, setting currentUser to null.");
    }
  };

  useEffect(() => {
    console.log("AuthContext: Setting up auth state change listener.");
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log(`AuthContext: onAuthStateChange event: ${event}, session: ${currentSession ? 'present' : 'null'}`);
        setSession(currentSession);
        setSupabaseUser(currentSession?.user || null);
        await fetchUserProfile(currentSession?.user || null);
        setIsLoading(false);
        console.log("AuthContext: onAuthStateChange completed, isLoading set to false.");
      }
    );

    console.log("AuthContext: Initial session check...");
    supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      console.log(`AuthContext: Initial getSession result: ${initialSession ? 'present' : 'null'}`);
      setSession(initialSession);
      setSupabaseUser(initialSession?.user || null);
      await fetchUserProfile(initialSession?.user || null);
      setIsLoading(false);
      console.log("AuthContext: Initial session check completed, isLoading set to false.");
    });

    return () => {
      console.log("AuthContext: Unsubscribing from auth state change listener.");
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Add a log for the context values to see what's being provided
  useEffect(() => {
    console.log("AuthContext: Current context values:", {
      session: !!session,
      supabaseUser: !!supabaseUser,
      currentUser: !!currentUser,
      isLoading,
    });
  }, [session, supabaseUser, currentUser, isLoading]);

  return (
    <AuthContext.Provider value={{ 
      session, 
      supabaseUser, 
      currentUser, 
      isLoading,
      refreshSession
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