"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { perfMark, perfStart } from '@/utils/perf';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  otherDetails?: string;
  role: string;
  status: "Active" | "Inactive" | "Suspended";
  enableLogin: boolean;
  imageUrl?: string;
  receiveNotifications: boolean;
}

interface AuthContextType {
  session: Session | null;
  supabaseUser: SupabaseUser | null;
  currentUser: User | null;
  isLoading: boolean;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const getSafeRole = (user: SupabaseUser | null) => {
  const role = user?.app_metadata?.role;
  return typeof role === 'string' && role.length > 0 ? role : 'New user';
};

const getSafeStatus = (user: SupabaseUser | null): User['status'] => {
  const status = user?.app_metadata?.status;
  return status === 'Active' || status === 'Inactive' || status === 'Suspended' ? status : 'Inactive';
};

const getSafeEnableLogin = (user: SupabaseUser | null) => {
  return user?.app_metadata?.enable_login === true;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshSession = async () => {
    const end = perfStart('AuthContext:refreshSession');
    try {
      const { data: { session: refreshedSession }, error } = await supabase.auth.refreshSession();
      if (error) throw error;

      setSession(refreshedSession);
      setSupabaseUser(refreshedSession?.user || null);
    } catch (error) {
      console.error('Error refreshing session:', error);
    } finally {
      end({ hasSession: !!session, hasSupabaseUser: !!supabaseUser });
    }
  };

  const fetchUserProfile = async (user: SupabaseUser | null) => {
    const end = perfStart('AuthContext:fetchUserProfile');

    if (!user) {
      setCurrentUser(null);
      end({ hasUser: false });
      return;
    }

    try {
      const fetchProfileEnd = perfStart('AuthContext:fetchUserProfile:profiles.select');
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      fetchProfileEnd({ hasProfileRow: !!profileData, errorCode: profileError?.code });

      const fallbackRole = getSafeRole(user);
      const fallbackStatus = getSafeStatus(user);
      const fallbackEnableLogin = getSafeEnableLogin(user);

      let userRole = fallbackRole;
      let userStatus: User['status'] = fallbackStatus;
      let userEnableLogin = fallbackEnableLogin;
      let userImageUrl: string | undefined = user.user_metadata?.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${user.email}`;
      let userReceiveNotifications = user.user_metadata?.receive_notifications ?? true;
      let userName = user.user_metadata?.full_name || user.email || 'User';
      let userEmail = user.email || '';
      let userPhone: string | undefined = undefined;
      let userOtherDetails: string | undefined = undefined;

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('AuthContext: Error fetching user profile from DB, using secure auth defaults:', profileError);
      } else if (profileData) {
        userRole = profileData.role || fallbackRole;
        userStatus = profileData.status || fallbackStatus;
        userEnableLogin = profileData.enable_login ?? fallbackEnableLogin;
        userImageUrl = profileData.image_url || userImageUrl;
        userReceiveNotifications = profileData.receive_notifications ?? userReceiveNotifications;
        userName = profileData.name || userName;
        userEmail = profileData.email || userEmail;
        userPhone = profileData.phone || undefined;
        userOtherDetails = profileData.other_details || undefined;
      } else {
        console.warn('AuthContext: User profile not found in public.profiles, using secure auth defaults.');
      }

      const finalUser: User = {
        id: user.id,
        name: userName,
        email: userEmail,
        phone: userPhone,
        otherDetails: userOtherDetails,
        role: userRole,
        status: userStatus,
        enableLogin: userEnableLogin,
        imageUrl: userImageUrl,
        receiveNotifications: userReceiveNotifications,
      };

      setCurrentUser(finalUser);
    } catch (error) {
      console.error('AuthContext: Error in fetchUserProfile:', error);
      setCurrentUser(null);
    } finally {
      end({ hasUser: true });
    }
  };

  useEffect(() => {
    perfMark('AuthContext:mount');

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      const end = perfStart(`AuthContext:onAuthStateChange:${event}`);
      setSession(currentSession);
      setSupabaseUser(currentSession?.user || null);
      end({ hasSession: !!currentSession, hasUser: !!currentSession?.user });
    });

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
    <AuthContext.Provider
      value={{
        session,
        supabaseUser,
        currentUser,
        isLoading,
        refreshSession,
      }}
    >
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
