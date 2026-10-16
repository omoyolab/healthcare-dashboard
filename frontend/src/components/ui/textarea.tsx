import type { TextareaHTMLAttributes } from "react";

import { cn } from "@/lib/utils/cn";

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "w-full rounded-md border border-border-subtle bg-surface px-3 py-2 text-sm text-content",
        "placeholder:text-content-muted aria-[invalid=true]:border-danger",
        className,
      )}
      {...props}
    />
  );
}
