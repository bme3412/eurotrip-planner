import React from 'react';

/**
 * Loading overlay component
 * Displays a semi-transparent overlay with a spinner and optional text.
 * @param {Object} props - Component props
 * @param {boolean} props.isLoading - Whether the overlay is visible
 * @param {string} [props.text="Loading..."] - Text to display below the spinner
 * @returns {JSX.Element | null} - Loading overlay component or null
 */
const LoadingOverlay = ({ isLoading, text = "Loading..." }) => {
  if (!isLoading) {
    return null;
  }

  return (
    <div className="absolute inset-0 bg-gray-900 bg-opacity-50 flex flex-col items-center justify-center z-50 animate-fade-in">
      {/* Spinner */}
      <div className="w-12 h-12 border-4 border-t-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
      {/* Text */}
      {text && (
        <p className="text-white text-lg font-semibold animate-pulse">
          {text}
        </p>
      )}
    </div>
  );
};

export default LoadingOverlay; 