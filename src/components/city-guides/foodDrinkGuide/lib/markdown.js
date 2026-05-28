import React from 'react';

/**
 * Convert a string's `**bold**` segments into <strong> JSX.
 * Returns an array of strings + React elements.
 */
export function renderInlineBold(content) {
  const parts = content.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="text-gray-900">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}
