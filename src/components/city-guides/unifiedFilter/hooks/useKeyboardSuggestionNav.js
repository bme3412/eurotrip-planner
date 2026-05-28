import { useEffect, useState } from 'react';

/**
 * Keyboard-navigation state for a suggestion list.
 * - Tracks `selectedIndex` for ↑/↓ highlighting.
 * - Resets to -1 when the search term changes.
 * - Returns a keydown handler bound to the search input.
 */
export function useKeyboardSuggestionNav({
  searchTerm,
  suggestions,
  onSelect,
  onEscape,
}) {
  const [selectedIndex, setSelectedIndex] = useState(-1);

  // Reset highlight when the search term changes
  useEffect(() => {
    setSelectedIndex(-1);
  }, [searchTerm]);

  const handleKeyDown = (e) => {
    if (!suggestions.length) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev < suggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      const choice = suggestions[selectedIndex];
      if (choice) onSelect?.(choice);
    } else if (e.key === 'Escape') {
      setSelectedIndex(-1);
      onEscape?.();
    }
  };

  return { selectedIndex, handleKeyDown };
}
