'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function AuthButton({ className = '' }) {
  const { user, loading, signInWithGoogle, signOut, isSupabaseConfigured } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);

  // Don't render if Supabase isn't configured
  if (!isSupabaseConfigured) {
    return null;
  }

  if (loading) {
    return (
      <div className={`animate-pulse bg-gray-200 rounded-lg h-10 w-24 ${className}`} />
    );
  }

  const handleSignIn = async () => {
    setIsSigningIn(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error('Sign in error:', error);
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    setShowMenu(false);
    await signOut();
  };

  if (user) {
    return (
      <div className={`relative ${className}`}>
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          {user.user_metadata?.avatar_url ? (
            <img
              src={user.user_metadata.avatar_url}
              alt=""
              className="w-8 h-8 rounded-full"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium">
              {user.email?.charAt(0).toUpperCase() || 'U'}
            </div>
          )}
          <span className="text-sm font-medium text-gray-700 hidden sm:block">
            {user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'}
          </span>
          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showMenu && (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setShowMenu(false)}
            />
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="px-4 py-2 border-b border-gray-100">
                <p className="text-sm font-medium text-gray-900">
                  {user.user_metadata?.full_name || 'User'}
                </p>
                <p className="text-xs text-gray-500 truncate">{user.email}</p>
              </div>
              <div className="py-1">
                <a
                  href="/saved-trips"
                  className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                  My Saved Trips
                </a>
              </div>
              <div className="border-t border-gray-100 pt-1">
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-3 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Sign Out
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={handleSignIn}
      disabled={isSigningIn}
      className={`
        flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm
        bg-white border border-gray-300 text-gray-700 
        hover:bg-gray-50 hover:border-gray-400
        disabled:opacity-50 disabled:cursor-not-allowed
        transition-all shadow-sm
        ${className}
      `}
    >
      {isSigningIn ? (
        <>
          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span>Signing in...</span>
        </>
      ) : (
        <>
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          <span>Sign in</span>
        </>
      )}
    </button>
  );
}

