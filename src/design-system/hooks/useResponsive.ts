import { useState, useEffect } from 'react';

import { breakpoints } from '../tokens/breakpoints';

type Breakpoint = keyof typeof breakpoints;

/**
 * Hook to determine if the current viewport matches a specific breakpoint.
 * Uses window.matchMedia under the hood.
 *
 * @param breakpoint The breakpoint key to check against (e.g., 'sm', 'md')
 * @returns boolean indicating if the viewport is at least the specified width
 */
export function useResponsive(breakpoint: Breakpoint): boolean {
  const [matches, setMatches] = useState<boolean>(false);

  useEffect(() => {
    const query = `(min-width: ${breakpoints[breakpoint]})`;
    const media = window.matchMedia(query);

    // Set initial state
    setMatches(media.matches);

    // Define listener
    const listener = (e: MediaQueryListEvent) => {
      setMatches(e.matches);
    };

    // Add listener
    media.addEventListener('change', listener);

    // Cleanup
    return () => {
      media.removeEventListener('change', listener);
    };
  }, [breakpoint]);

  return matches;
}
