import type { HTMLAttributes, TableHTMLAttributes, ThHTMLAttributes } from "react";

import { cn } from "@/lib/utils/cn";

/** Real table semantics, so screen readers announce rows and headers. */
export function Table({ className, ...props }: TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border-subtle bg-surface-raised">
      <table className={cn("w-full border-collapse text-sm", className)} {...props} />
    </div>
  );
}

export function Th({ className, children, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      scope="col"
      className={cn(
        "border-b border-border-subtle px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-content-muted",
        className,
      )}
      {...props}
    >
      {children}
    </th>
  );
}

export function Td({ className, ...props }: HTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={cn("border-b border-border-subtle px-4 py-3 text-content", className)}
      {...props}
    />
  );
}
