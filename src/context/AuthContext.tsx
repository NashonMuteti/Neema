"use client";
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { perfMark, perfStart } from '@/utils/perf';

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
    const end = perfStart('AuthContext:refreshSession');
    try {
      const { data: { session: refreshedSession }, error } = await supabase.auth.refreshSession();
      if (error) throw error;

      setSession(refreshedSession);
      setSupabaseUser(refreshedSession?.user || null);
      // NOTE: do NOT run Supabase queries from inside auth callbacks/refresh flows.
      // Profile fetching is handled by a separate effect below.
    } catch (error) {
      console.error("Error refreshing session:", error);
    } finally {
      end({ hasSession: !!session, hasSupabaseUser: !!supabaseUser });
    }
  };

  // Function to fetch and set the application's currentUser profile
  const fetchUserProfile = async (user: SupabaseUser | null) => {
    const end = perfStart('AuthContext:fetchUserProfile');
    if (user) {
      try {
        const fetchProfileEnd = perfStart('AuthContext:fetchUserProfile:profiles.select');
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        fetchProfileEnd({ hasProfileRow: !!profileData, errorCode: profileError?.code });

        let userRole = "Contributor"; // Default role
        let userStatus: "Active" | "Inactive" | "Suspended" = "Active";
        let userEnableLogin = true;
        let userImageUrl: string | undefined = undefined;
        let userReceiveNotifications = true;
        let userName = user.user_metadata?.full_name || user.email || "User";
        let userEmail = user.email || "";

        if (profileError && profileError.code !== 'PGRST116') { // PGRST116 means no rows found
          console.error("AuthContext: Error fetching user profile from DB, falling back to metadata:", profileError);
          // Fallback to user_metadata if DB fetch fails (but not if row simply doesn't exist)
          userRole = user.user_metadata?.role || "Contributor";
          userStatus = user.user_metadata?.status || "Active";
          userEnableLogin = user.user_metadata?.enable_login ?? true;
          userImageUrl = user.user_metadata?.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${user.email}`;
          userReceiveNotifications = user.user_metadata?.receive_notifications ?? true;
        } else if (profileData) {
          // Use full profile data if available
          userRole = profileData.role || user.user_metadata?.role || "Contributor";
          userStatus = profileData.status || "Active";
          userEnableLogin = profileData.enable_login ?? true;
          userImageUrl = profileData.image_url || user.user_metadata?.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${profileData.name || user.email}`;
          userReceiveNotifications = profileData.receive_notifications ?? true;
          userName = profileData.name || user.user_metadata?.full_name || user.email || "User";
          userEmail = profileData.email || user.email || "";
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

      } catch (error) {
        console.error("AuthContext: Error in fetchUserProfile:", error);
        setCurrentUser(null);
      } finally {
        end({ hasUser: true });
      }
    } else {
      setCurrentUser(null);
      end({ hasUser: false });
    }
  };

  useEffect(() => {
    perfMark('AuthContext:mount');

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        // Workaround for Supabase JS issue (#762): avoid doing Supabase queries inside
        // onAuthStateChange, as it can cause subsequent queries to hang.
        const end = perfStart(`AuthContext:onAuthStateChange:${event}`);
        setSession(currentSession);
        setSupabaseUser(currentSession?.user || null);
        end({ hasSession: !!currentSession, hasUser: !!currentSession?.user });
      }
    );

    // Initial session check
    const initialEnd = perfStart('AuthContext:getSession');
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      setSupabaseUser(initialSession?.user || null);
      initialEnd({ hasSession: !!initialSession, hasUser: !!initialSession?.user });
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Fetch profile OUTSIDE auth callbacks (see Supabase JS issue #762)
  useEffect(() => {
    const run = async () => {
      if (!supabaseUser) {
        setCurrentUser(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      const end = perfStart('AuthContext:profileFetchEffect');
      await fetchUserProfile(supabaseUser);
      setIsLoading(false);
      end({ userId: supabaseUser.id });
    };

    run();
  }, [supabaseUser?.id]);

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