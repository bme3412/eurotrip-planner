'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase/client';

const AUTH_NEXT_PATH_KEY = 'eurotrip.auth.nextPath';

function getSafeNextPath(searchParams) {
  const fromUrl = searchParams.get('next');
  if (fromUrl?.startsWith('/')) return fromUrl;

  try {
    const stored = window.localStorage.getItem(AUTH_NEXT_PATH_KEY);
    window.localStorage.removeItem(AUTH_NEXT_PATH_KEY);
    if (stored?.startsWith('/')) return stored;
  } catch {
    // Ignore storage issues and fall back below.
  }

  return '/saved-trips';
}

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function completeSignIn() {
      const supabase = getSupabaseClient();
      const next = getSafeNextPath(searchParams);
      const code = searchParams.get('code');
      const errorDescription = searchParams.get('error_description') || searchParams.get('error');

      if (!supabase) {
        setError('Supabase is not configured for browser sign in.');
        return;
      }

      if (errorDescription) {
        setError(errorDescription);
        return;
      }

      try {
        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
        } else {
          const { data, error: sessionError } = await supabase.auth.getSession();
          if (sessionError) throw sessionError;
          if (!data.session) throw new Error('No sign-in code or active session was found.');
        }

        if (!cancelled) {
          router.replace(next);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('[auth] Callback failed:', err);
          setError(err.message || 'Unable to complete sign in.');
        }
      }
    }

    completeSignIn();

    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-16">
        <div className="mx-auto max-w-md rounded-2xl border border-red-200 bg-white p-6 text-center shadow-sm">
          <h1 className="text-xl font-semibold text-gray-950">Sign in did not finish</h1>
          <p className="mt-2 text-sm text-gray-600">{error}</p>
          <Link
            href="/"
            className="mt-5 inline-flex rounded-full bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-800"
          >
            Return home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-16">
      <div className="mx-auto max-w-md rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900" />
        <h1 className="mt-4 text-xl font-semibold text-gray-950">Finishing sign in...</h1>
        <p className="mt-2 text-sm text-gray-600">We&apos;ll send you back to your trips in a moment.</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={null}>
      <AuthCallbackContent />
    </Suspense>
  );
}
