import { QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

import { ErrorBoundary } from "@/components/feedback/ErrorBoundary";

import { createQueryClient } from "./query-client";

/** Exported so tests can render the same provider tree the app uses. */
export function Providers({ children }: { children: ReactNode }) {
  // One client per mount, kept in state: creating it inline would reset the
  // cache on every render.
  const [queryClient] = useState(createQueryClient);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </ErrorBoundary>
  );
}
