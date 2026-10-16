import type { SelectHTMLAttributes } from "react";

import { cn } from "@/lib/utils/cn";

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-10 w-full rounded-md border border-border-subtle bg-surface px-3 text-sm text-content",
        "aria-[invalid=true]:border-danger",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}
