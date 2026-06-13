'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { track } from '@vercel/analytics';
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
  if (configured) {
    try {
      const currentUrl = new URL(window.location.origin);
      const isLocalCurrent = ['localhost', '127.0.0.1'].includes(currentUrl.hostname);

      if (isLocalCurrent) {
        return window.location.origin;
      }
    } catch {
      // Fall through and use the configured value after trimming.
    }
    return configured.replace(/\/$/, '');
  }
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

    let active = true;

    // Get initial session. A corrupted or legacy value in storage makes the
    // Supabase SDK throw while parsing it (e.g. "Invalid or unexpected token"),
    // and without a catch that surfaces as an uncaught promise rejection that
    // breaks sign-in. Recover by clearing the bad session and loading as
    // signed-out instead of crashing the auth provider.
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!active) return;
        setSession(session);
        setUser(session?.user ?? null);
      } catch (err) {
        console.warn('[auth] Could not read stored session, clearing it:', err?.message || err);
        // Don't clear storage while an OAuth code exchange is in flight on the
        // callback route — that would also wipe the PKCE code-verifier and break
        // the sign-in. On every other route, purge the bad session so the app
        // recovers as signed-out and the next sign-in writes a clean session.
        const onAuthCallback = typeof window !== 'undefined'
          && window.location.pathname.startsWith('/auth/callback');
        if (!onAuthCallback) {
          try {
            await supabase.auth.signOut({ scope: 'local' });
          } catch {
            // ignore — best-effort
          }
          try {
            for (let i = window.localStorage.length - 1; i >= 0; i--) {
              const k = window.localStorage.key(i);
              if (k && k.startsWith('sb-')) window.localStorage.removeItem(k);
            }
          } catch {
            // ignore — storage may be unavailable
          }
        }
        if (active) {
          setSession(null);
          setUser(null);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const signInWithGoogle = async ({ next } = {}) => {
    if (!supabase) return { error: new Error('Supabase not configured') };
    const nextPath = next || `${window.location.pathname}${window.location.search}`;
    // Fire-and-forget click tracking before the OAuth redirect takes over. This
    // is the only signal we get for sign-in *intent* — completed sign-ins land in
    // Supabase auth, but abandoned ones (bounce at Google) leave no other trace.
    track('sign_in_click', { method: 'google', from: nextPath });
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
    track('sign_in_click', { method: 'email' });

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

