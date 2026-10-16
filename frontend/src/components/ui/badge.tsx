import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils/cn";

export function Badge({ className, children, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border-subtle px-2.5 py-0.5 text-xs font-medium",
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
