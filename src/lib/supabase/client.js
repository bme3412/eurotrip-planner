'use client';

import { createClient } from '@supabase/supabase-js';

// Create a singleton Supabase client for browser use
let supabase = null;

export function getSupabaseClient() {
  if (supabase) return supabase;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase environment variables not configured. Auth features disabled.');
    return null;
  }

  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return supabase;
}

// Export a direct client for convenience (may be null if not configured)
export const supabaseClient = typeof window !== 'undefined' ? getSupabaseClient() : null;

