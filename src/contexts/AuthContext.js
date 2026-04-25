'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';

const AuthContext = createContext({
  user: null,
  session: null,
  loading: true,
  signInWithGoogle: async () => {},
  signInWithEmail: async () => {},
  signUp: async () => {},
  signOut: async () => {},
  isSupabaseConfigured: false,
});

const AUTH_NEXT_PATH_KEY = 'eurotrip.auth.nextPath';

function getAuthRedirectOrigin() {
  const configured = process.env.NEXT_PUBLIC_AUTH_REDIRECT_ORIGIN?.trim();
  if (configured) return configured.replace(/\/$/, '');
  return window.location.origin;
}

function rememberAuthNextPath(nextPath) {
  if (typeof window === 'undefined') return;
  const safeNext = nextPath?.startsWith('/') ? nextPath : '/saved-trips';
  window.localStorage.setItem(AUTH_NEXT_PATH_KEY, safeNext);
}

function buildAuthCallbackUrl() {
  return new URL('/auth/callback', getAuthRedirectOrigin()).toString();
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const supabase = getSupabaseClient();
  const isSupabaseConfigured = !!supabase;

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, [supabase]);

  const signInWithGoogle = async ({ next } = {}) => {
    if (!supabase) return { error: new Error('Supabase not configured') };
    const nextPath = next || `${window.location.pathname}${window.location.search}`;
    rememberAuthNextPath(nextPath);
    const redirectTo = buildAuthCallbackUrl();
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: {
          prompt: 'select_account',
        },
      },
    });
    return { data, error };
  };

  const signInWithEmail = async (email, password) => {
    if (!supabase) return { error: new Error('Supabase not configured') };
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  };

  const signUp = async (email, password) => {
    if (!supabase) return { error: new Error('Supabase not configured') };
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: buildAuthCallbackUrl(),
      },
    });
    return { data, error };
  };

  const signOut = async () => {
    if (!supabase) return { error: new Error('Supabase not configured') };
    
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  const value = {
    user,
    session,
    loading,
    signInWithGoogle,
    signInWithEmail,
    signUp,
    signOut,
    isSupabaseConfigured,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

