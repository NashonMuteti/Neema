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
  receiveNotifications: boolean; // Added receiveNotifications
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
    console.log("AuthContext: fetchUserProfile called with user:", user);
    if (user) {
      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        console.log("AuthContext: Profile data from DB:", profile);
        console.log("AuthContext: Profile error from DB:", error);

        let userRole = "Contributor"; // Default role
        let userStatus: "Active" | "Inactive" | "Suspended" = "Active";
        let userEnableLogin = true;
        let userImageUrl: string | undefined = undefined;
        let userReceiveNotifications = true;
        let userName = user.user_metadata?.full_name || user.email || "User";
        let userEmail = user.email || "";

        if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
          console.error("AuthContext: Error fetching user profile from DB, falling back to metadata:", error);
          // Fallback to user_metadata if DB fetch fails (but not if row simply doesn't exist)
          userRole = user.user_metadata?.role || "Contributor";
          userStatus = user.user_metadata?.status || "Active";
          userEnableLogin = user.user_metadata?.enable_login ?? true;
          userImageUrl = user.user_metadata?.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${user.email}`;
          userReceiveNotifications = user.user_metadata?.receive_notifications ?? true;
        } else if (profile) {
          // Use profile data if available
          userRole = profile.role || user.user_metadata?.role || "Contributor";
          userStatus = profile.status || "Active";
          userEnableLogin = profile.enable_login ?? true;
          userImageUrl = profile.image_url || user.user_metadata?.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${profile.name || user.email}`;
          userReceiveNotifications = profile.receive_notifications ?? true;
          userName = profile.name || user.user_metadata?.full_name || user.email || "User";
          userEmail = profile.email || user.email || "";
        } else {
          // Profile not found in DB, likely a new user or a user whose profile wasn't created by trigger
          console.warn("AuthContext: User profile not found in public.profiles, using user_metadata defaults.");
          userRole = user.user_metadata?.role || "Contributor";
          userStatus = user.user_metadata?.status || "Active";
          userEnableLogin = user.user_metadata?.enable_login ?? true;
          userImageUrl = user.user_metadata?.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${user.email}`;
          userReceiveNotifications = user.user_metadata?.receive_notifications ?? true;
        }

        const finalUser: User = {
          id: user.id,
          name: userName,
          email: userEmail,
          role: userRole,
          status: userStatus,
          enableLogin: userEnableLogin,
          imageUrl: userImageUrl,
          receiveNotifications: userReceiveNotifications,
        };
        setCurrentUser(finalUser);
        console.log("AuthContext: Current User set to:", finalUser);

      } catch (error) {
        console.error("AuthContext: Error in fetchUserProfile:", error);
        setCurrentUser(null);
      }
    } else {
      console.log("AuthContext: User is null, setting currentUser to null.");
      setCurrentUser(null);
    }
  };

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log("AuthContext: onAuthStateChange event:", event);
        console.log("AuthContext: onAuthStateChange session:", currentSession);
        setSession(currentSession);
        setSupabaseUser(currentSession?.user || null);
        await fetchUserProfile(currentSession?.user || null);
        setIsLoading(false);
      }
    );

    // Initial session check
    supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      console.log("AuthContext: Initial session check:", initialSession);
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