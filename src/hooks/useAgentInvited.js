'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getSupabaseAuthHeaders } from '@/lib/supabase/authHeaders';

// Whether the signed-in user is invited to the real agent (Trip Home) —
// drives where "Travel agent" entry points lead (thread vs concierge
// preview). One network call per user per page load, shared across all
// callers via a module-level memo.
let cachedUserId = null;
let cachedPromise = null;

export function useAgentInvited() {
  const { session } = useAuth();
  const [invited, setInvited] = useState(false);

  useEffect(() => {
    const userId = session?.user?.id;
    if (!session?.access_token || !userId) return undefined;
    let active = true;
    if (cachedUserId !== userId || !cachedPromise) {
      cachedUserId = userId;
      cachedPromise = fetch('/api/concierge/invite-status', {
        headers: getSupabaseAuthHeaders(session),
      })
        .then((res) => (res.ok ? res.json() : { invited: false }))
        .then((data) => !!data?.invited)
        .catch(() => false);
    }
    cachedPromise.then((value) => {
      if (active) setInvited(value);
    });
    return () => {
      active = false;
    };
  }, [session]);

  return invited;
}
