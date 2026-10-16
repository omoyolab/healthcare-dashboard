import { Skeleton } from "@/components/ui/skeleton";

/**
 * Shown while a lazy route resolves. Without a fallback, React Router renders
 * nothing during initial hydration - which looks exactly like a broken app.
 */
export function PageFallback() {
  return (
    <div className="space-y-4 p-6" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-7 w-40" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}
