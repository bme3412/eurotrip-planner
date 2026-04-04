'use server';

import { createClient } from '@supabase/supabase-js';

const globalForSupabase = globalThis;

if (!globalForSupabase.__supabaseAdminClient) {
  globalForSupabase.__supabaseAdminClient = null;
}

export async function getSupabaseAdmin() {
  if (globalForSupabase.__supabaseAdminClient) {
    return globalForSupabase.__supabaseAdminClient;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable.');
  }

  if (!serviceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable.');
  }

  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
    },
    global: {
      headers: {
        'x-application-name': 'paris-mvp',
      },
    },
  });

  globalForSupabase.__supabaseAdminClient = client;
  return client;
}
