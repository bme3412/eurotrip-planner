'use client';

import Link from 'next/link';
import { useViewTransition } from './ViewTransitions';

/**
 * A <Link> that animates the route change with the browser View Transitions API.
 *
 * Optionally morphs a "shared element": pass `vtName` plus a `sourceRef` (the
 * element to grow into the destination's same-named element). We tag the source
 * only for the duration of the transition, so sibling cards keep unique names,
 * and clear it on `finished` to avoid duplicate-name clashes on return.
 *
 * Modifier-clicks / middle-clicks fall through to the native <Link> so new-tab
 * behavior is preserved; without the provider it's just a plain <Link>.
 */
export default function TransitionLink({
  href,
  vtName,
  sourceRef,
  onNavigate,
  children,
  ...props
}) {
  const transitionTo = useViewTransition();

  const handleClick = (e) => {
    if (!transitionTo) return; // no provider → default Link navigation
    if (e.defaultPrevented) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;

    e.preventDefault();
    onNavigate?.(e);

    const src = vtName ? sourceRef?.current : null;
    if (src) src.style.viewTransitionName = vtName;

    const vt = transitionTo(href);
    if (src) {
      const clear = () => { src.style.viewTransitionName = ''; };
      vt?.finished.then(clear, clear) ?? clear();
    }
  };

  return (
    <Link href={href} onClick={handleClick} {...props}>
      {children}
    </Link>
  );
}
