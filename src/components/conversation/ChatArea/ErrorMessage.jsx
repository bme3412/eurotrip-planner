'use client';

import { motion } from 'framer-motion';
import { AlertCircle, RefreshCw, Wifi, Server } from 'lucide-react';

/**
 * Get error icon based on error type
 */
function getErrorIcon(errorMessage) {
  if (errorMessage?.includes('network') || errorMessage?.includes('fetch')) {
    return Wifi;
  }
  if (errorMessage?.includes('API') || errorMessage?.includes('500')) {
    return Server;
  }
  return AlertCircle;
}

/**
 * Get user-friendly error message
 */
function getUserFriendlyMessage(errorMessage) {
  if (errorMessage?.includes('network') || errorMessage?.includes('fetch')) {
    return "Couldn't connect to the server. Check your internet connection.";
  }
  if (errorMessage?.includes('API') || errorMessage?.includes('500')) {
    return 'Our servers are having trouble. Please try again in a moment.';
  }
  if (errorMessage?.includes('401') || errorMessage?.includes('403')) {
    return 'There was an authentication issue. Please refresh the page.';
  }
  if (errorMessage?.includes('429')) {
    return "We're getting too many requests. Please wait a moment and try again.";
  }
  return 'Something went wrong. Please try again.';
}

/**
 * ErrorMessage - Displays error state with retry option
 */
export default function ErrorMessage({
  error,
  onRetry,
  onDismiss,
}) {
  const ErrorIcon = getErrorIcon(error);
  const friendlyMessage = getUserFriendlyMessage(error);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="mx-4 mb-4"
    >
      <div className="bg-red-50 border border-red-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          {/* Error icon */}
          <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
            <ErrorIcon className="w-5 h-5 text-red-500" />
          </div>

          {/* Error content */}
          <div className="flex-1 min-w-0">
            <p className="text-red-800 font-medium">Connection Error</p>
            <p className="text-sm text-red-600 mt-0.5">{friendlyMessage}</p>

            {/* Technical details (collapsed) */}
            {error && error !== friendlyMessage && (
              <details className="mt-2">
                <summary className="text-xs text-red-500 cursor-pointer hover:text-red-600">
                  Technical details
                </summary>
                <pre className="mt-1 text-xs text-red-500 bg-red-100 p-2 rounded overflow-x-auto">
                  {error}
                </pre>
              </details>
            )}

            {/* Action buttons */}
            <div className="flex gap-2 mt-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onRetry}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-600 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </motion.button>

              {onDismiss && (
                <button
                  onClick={onDismiss}
                  className="px-4 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-100 rounded-lg transition-colors"
                >
                  Dismiss
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/**
 * InlineError - Smaller inline error for specific interactions
 */
export function InlineError({ message, onRetry }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg"
    >
      <AlertCircle className="w-4 h-4 flex-shrink-0" />
      <span className="flex-1">{message}</span>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-1 text-red-700 hover:text-red-800 font-medium"
        >
          <RefreshCw className="w-3 h-3" />
          Retry
        </button>
      )}
    </motion.div>
  );
}
