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
    try {
      const { data: { session: refreshedSession }, error } = await supabase.auth.refreshSession();
      if (error) throw error;
      
      if (refreshedSession) {
        setSession(refreshedSession);
        setSupabaseUser(refreshedSession.user);
        await fetchUserProfile(refreshedSession.user);
      }
    } catch (error) {
      console.error("Error refreshing session:", error);
    }
  };

  // Function to fetch and set the application's currentUser profile
  const fetchUserProfile = async (user: SupabaseUser | null) => {
    if (user) {
      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
          console.error("Error fetching user profile:", error);
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
        }
      } catch (error) {
        console.error("Error in fetchUserProfile:", error);
        setCurrentUser(null);
      }
    } else {
      setCurrentUser(null);
    }
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
  }, []);

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