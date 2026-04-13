import { QueryClient } from '@tanstack/react-query';

/**
 * Offline-first QueryClient.
 *
 * staleTime: Infinity — IndexedDB data is always fresh. Never auto-refetches.
 * Cache is invalidated exclusively by mutations via invalidateQueries().
 *
 * gcTime: 30 min — keep unused query results across page navigation.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity,
      gcTime: 30 * 60 * 1000,
      retry: 1,
    },
    mutations: {
      retry: 0,
    },
  },
});
