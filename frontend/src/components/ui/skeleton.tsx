import { cn } from "@/lib/utils/cn";

/** Sized to the real content, so loading does not shift the layout. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded bg-surface-sunken", className)} />;
}
