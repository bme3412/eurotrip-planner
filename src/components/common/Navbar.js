'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Disclosure } from '@headlessui/react';
import SearchBar from './SearchBar';
import ConciergeBell from './ConciergeBell';

// Heavy routes — disable default prefetch, warm on hover
const NAV_LINKS = [
  { label: 'City Guides', href: '/city-guides', heavy: true },
  { label: 'Explore', href: '/explore', heavy: true },
  { label: 'Plan Trip', href: '/plan', heavy: true },
];

function NavLink({ href, children, heavy = false }) {
  const pathname = usePathname();
  const router = require('next/navigation').useRouter();
  const isActive = pathname === href || pathname.startsWith(href + '/');

  // Warm on hover for heavy routes to maintain UX
  const handleMouseEnter = () => {
    if (heavy) {
      router.prefetch(href);
    }
  };

  return (
    <Link
      href={href}
      prefetch={!heavy}
      onMouseEnter={handleMouseEnter}
      className={`text-sm font-medium transition-colors ${
        isActive
          ? 'text-blue-600 font-semibold'
          : 'text-gray-600 hover:text-gray-900'
      }`}
    >
      {children}
    </Link>
  );
}

export default function Navbar() {
  const { user, loading, signInWithGoogle, signOut, isSupabaseConfigured } = useAuth();
  const [signingIn, setSigningIn] = useState(false);
  const [authError, setAuthError] = useState(null);

  const handleSignIn = async () => {
    setSigningIn(true);
    setAuthError(null);
    try {
      const { error } = await signInWithGoogle();
      if (error) throw error;
    } catch (err) {
      console.error('Sign in error:', err);
      setAuthError(err.message || 'Unable to start sign in.');
      setSigningIn(false);
    }
  };

  return (
    <Disclosure as="nav" className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-200/50 shadow-sm">
      {({ open }) => (
        <>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-14 items-center justify-between">
              {/* Logo */}
              <Link href="/" className="flex items-center gap-1 shrink-0">
                <span className="font-display text-xl tracking-tight font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Euro<span className="text-blue-500">Trip</span>
                </span>
              </Link>

              {/* Desktop nav links */}
              <div className="hidden md:flex items-center gap-6">
                {NAV_LINKS.map(link => (
                  <NavLink key={link.href} href={link.href} heavy={link.heavy}>
                    {link.label}
                  </NavLink>
                ))}
                {user && (
                  <NavLink href="/saved-trips">My Trips</NavLink>
                )}
              </div>

              {/* Search + auth + mobile hamburger */}
              <div className="flex items-center gap-3">
                <SearchBar />
                {user && <ConciergeBell />}
                {authError && (
                  <span className="hidden max-w-[220px] truncate text-xs text-red-600 lg:inline">
                    {authError}
                  </span>
                )}
                {/* Auth button — fixed width slot to prevent layout shift on session resolve */}
                <div className="hidden md:flex items-center justify-end min-w-[140px] h-8">
                  {loading ? (
                    <div className="h-7 w-20 rounded-full bg-gray-100 animate-pulse" aria-hidden />
                  ) : user ? (
                    <div className="flex items-center gap-3">
                      <Link
                        href="/saved-trips"
                        className="text-sm text-gray-600 hover:text-gray-900 font-medium"
                      >
                        {user.user_metadata?.full_name?.split(' ')[0] || 'Account'}
                      </Link>
                      <button
                        onClick={() => signOut()}
                        className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                      >
                        Sign Out
                      </button>
                    </div>
                  ) : isSupabaseConfigured ? (
                    <button
                      onClick={handleSignIn}
                      disabled={signingIn}
                      className="px-4 py-1.5 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full hover:from-blue-700 hover:to-indigo-700 transition-all shadow-sm disabled:opacity-50"
                    >
                      {signingIn ? 'Signing in...' : 'Sign In'}
                    </button>
                  ) : null}
                </div>

                {/* Mobile menu button */}
                <Disclosure.Button className="md:hidden inline-flex items-center justify-center rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <span className="sr-only">Open main menu</span>
                  {open ? (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                    </svg>
                  )}
                </Disclosure.Button>
              </div>
            </div>
          </div>

          {/* Mobile menu */}
          <Disclosure.Panel className="md:hidden border-t border-gray-100 bg-white">
            <div className="px-4 py-3 space-y-1">
              {NAV_LINKS.map(link => (
                <Disclosure.Button
                  key={link.href}
                  as={Link}
                  href={link.href}
                  className="block rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-blue-600"
                >
                  {link.label}
                </Disclosure.Button>
              ))}
              {user && (
                <Disclosure.Button
                  as={Link}
                  href="/saved-trips"
                  className="block rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-blue-600"
                >
                  My Trips
                </Disclosure.Button>
              )}
            </div>
            {/* Mobile auth */}
            <div className="border-t border-gray-100 px-4 py-3">
              {user ? (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 font-medium">
                    {user.user_metadata?.full_name || user.email}
                  </span>
                  <button
                    onClick={() => signOut()}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Sign Out
                  </button>
                </div>
              ) : isSupabaseConfigured ? (
                <button
                  onClick={handleSignIn}
                  disabled={signingIn || loading}
                  className="w-full px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full"
                >
                  {signingIn ? 'Signing in...' : 'Sign In with Google'}
                </button>
              ) : null}
            </div>
          </Disclosure.Panel>
        </>
      )}
    </Disclosure>
  );
}
