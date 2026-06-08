'use client';

import { useCallback } from 'react';
import { HeartIcon as HeartSolid } from '@heroicons/react/24/solid';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Shared "saved — sign in to keep it" toast used by the soft-gate save flow.
 * Saving always succeeds locally; this nudges the guest to sign in so the item
 * syncs to their account (migration runs automatically on return).
 *
 * @param {object} props
 * @param {string} props.message       Toast copy.
 * @param {() => void} [props.onClose]  Dismiss handler.
 * @param {() => void} [props.onSignIn] Extra work to run before redirecting (e.g. setPending).
 */
export default function SignInNudge({ message, onClose, onSignIn }) {
  const { signInWithGoogle } = useAuth();

  const handleSignIn = useCallback(async () => {
    try {
      if (onSignIn) onSignIn();
      await signInWithGoogle();
    } catch (err) {
      console.error('[SignInNudge] sign-in failed', err);
    } finally {
      if (onClose) onClose();
    }
  }, [onSignIn, onClose, signInWithGoogle]);

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-fade-in rounded-xl bg-gray-900 px-6 py-3 text-white shadow-lg">
      <div className="flex items-center gap-3">
        <HeartSolid className="h-5 w-5 text-rose-400" aria-hidden="true" />
        <span className="text-sm">{message}</span>
        <button
          type="button"
          onClick={handleSignIn}
          className="ml-2 rounded-full bg-rose-500 px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-rose-600"
        >
          Sign in
        </button>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="ml-1 text-xs text-gray-400 hover:text-gray-200"
            aria-label="Dismiss"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
