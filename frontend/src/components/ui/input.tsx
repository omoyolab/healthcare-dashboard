import type { InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils/cn";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-md border border-border-subtle bg-surface px-3 text-sm text-content",
        "placeholder:text-content-muted aria-[invalid=true]:border-danger",
        className,
      )}
      {...props}
    />
  );
}
