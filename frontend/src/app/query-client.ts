import { QueryClient } from "@tanstack/react-query";

import { ApiError } from "@/lib/api/errors";

/**
 * Cache policy decided once, not at fifty useQuery call sites.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          // Retrying a 404 or a 422 just produces the same failure again.
          if (error instanceof ApiError && !error.isRetryable) return false;
          return failureCount < 2;
        },
      },
      mutations: {
        retry: false,
      },
    },
  });
}
