'use client';

import { createContext, useContext, useEffect, useRef, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';

/**
 * Cross-route View Transitions for the App Router.
 *
 * The browser's `document.startViewTransition()` wants the DOM updated by the
 * time its callback promise resolves — but `router.push()` renders the next
 * route asynchronously. So we hand the resolver to a ref and resolve it from a
 * `usePathname()` effect that fires once the new route has committed. This
 * provider lives in the persistent layout, so it survives the navigation that
 * the unmounting <TransitionLink> cannot.
 *
 * Falls back to a plain `router.push()` when the API is unavailable (Firefox,
 * older Safari) or the user prefers reduced motion — callers get a no-morph
 * navigation with zero special-casing.
 */
const ViewTransitionCtx = createContext(null);

export function ViewTransitionsProvider({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const finishRef = useRef(null);

  // Route committed → let the in-flight transition snapshot the new DOM.
  useEffect(() => {
    if (finishRef.current) {
      finishRef.current();
      finishRef.current = null;
    }
  }, [pathname]);

  const transitionTo = useCallback((href) => {
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    if (typeof document === 'undefined' || !document.startViewTransition || reduce) {
      router.push(href);
      return null;
    }

    return document.startViewTransition(
      () =>
        new Promise((resolve) => {
          finishRef.current = resolve;
          router.push(href);
          // Safety: never leave the page frozen if the route never changes.
          setTimeout(() => {
            if (finishRef.current === resolve) {
              finishRef.current = null;
              resolve();
            }
          }, 800);
        }),
    );
  }, [router]);

  return (
    <ViewTransitionCtx.Provider value={transitionTo}>{children}</ViewTransitionCtx.Provider>
  );
}

/** Returns `transitionTo(href) → ViewTransition|null`, or null outside the provider. */
export function useViewTransition() {
  return useContext(ViewTransitionCtx);
}
