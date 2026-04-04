'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

export default function AuthButton({ className = '' }) {
  const { user, loading, signInWithGoogle, signOut, isSupabaseConfigured } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const menuRef = useRef(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignIn = async () => {
    setIsSigningIn(true);
    setShowMenu(false);
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error('Sign in error:', error);
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    setShowMenu(false);
    await signOut();
  };

  // User avatar or member icon
  const renderTrigger = () => {
    // Show user avatar if logged in
    if (user?.user_metadata?.avatar_url) {
      return (
        <img
          src={user.user_metadata.avatar_url}
          alt=""
          className="w-10 h-10 rounded-full border-2 border-gray-200 hover:border-gray-300 transition-colors"
        />
      );
    }
    
    // Show initial if user is logged in but no avatar
    if (user) {
      return (
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center text-white font-semibold text-sm shadow-sm">
          {user.email?.charAt(0).toUpperCase() || 'U'}
        </div>
      );
    }

    // Not logged in or still loading - show member icon
    return (
      <div className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      </div>
    );
  };

  return (
    <div className={`relative ${className}`} ref={menuRef}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2"
        aria-label="User menu"
      >
        {renderTrigger()}
      </button>

      {showMenu && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* User info section (if logged in) */}
          {user && (
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-900">
                {user.user_metadata?.full_name || 'User'}
              </p>
              <p className="text-xs text-gray-500 truncate">{user.email}</p>
            </div>
          )}

          {/* Login/Sign up (if not logged in and supabase is configured) */}
          {!user && isSupabaseConfigured && (
            <button
              onClick={handleSignIn}
              disabled={isSigningIn || loading}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {isSigningIn ? 'Signing in...' : loading ? 'Loading...' : 'Log in or sign up'}
                </p>
                <p className="text-xs text-gray-500">Sign in with Google</p>
              </div>
              {isSigningIn && (
                <svg className="animate-spin h-4 w-4 ml-auto text-gray-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              )}
            </button>
          )}

          {/* Show message if Supabase not configured */}
          {!user && !isSupabaseConfigured && !loading && (
            <div className="px-4 py-3 text-sm text-gray-500">
              Sign in not available
            </div>
          )}

          <div className={user || (!user && isSupabaseConfigured) ? 'border-t border-gray-100' : ''}>
            {/* Wishlists */}
            <Link
              href="/saved-trips"
              onClick={() => setShowMenu(false)}
              className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center">
                <svg className="w-4 h-4 text-rose-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Wishlists</p>
                <p className="text-xs text-gray-500">Your saved cities & experiences</p>
              </div>
            </Link>

            {/* Help */}
            <button
              onClick={() => {
                setShowMenu(false);
                window.open('mailto:support@example.com', '_blank');
              }}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
                <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Help</p>
                <p className="text-xs text-gray-500">Get support</p>
              </div>
            </button>
          </div>

          {/* Sign out (if logged in) */}
          {user && (
            <div className="border-t border-gray-100 mt-1 pt-1">
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
              >
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </div>
                <p className="text-sm text-gray-700">Log out</p>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
