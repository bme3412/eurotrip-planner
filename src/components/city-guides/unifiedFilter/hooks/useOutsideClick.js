import { useEffect } from 'react';

/**
 * Run `onOutside` on a mousedown outside any of the supplied refs.
 * Pass an array of refs to share one listener across multiple dropdowns.
 */
export function useOutsideClick(refs, onOutside) {
  useEffect(() => {
    const handleClickOutside = (event) => {
      const refsArr = Array.isArray(refs) ? refs : [refs];
      const isInside = refsArr.some(
        (ref) => ref?.current && ref.current.contains(event.target)
      );
      if (!isInside) onOutside(event);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
