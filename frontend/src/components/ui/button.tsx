import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils/cn";

export const buttonStyles = cva(
  "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-accent text-accent-contrast hover:opacity-90",
        secondary:
          "border border-border-subtle bg-surface-raised text-content hover:bg-surface-sunken",
        ghost: "text-content-muted hover:bg-surface-sunken hover:text-content",
        danger: "bg-danger text-accent-contrast hover:opacity-90",
      },
      size: {
        sm: "h-8 px-3 text-sm",
        md: "h-10 px-4 text-sm",
        icon: "size-9",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonStyles>;

export function Button({ className, variant, size, type = "button", ...props }: ButtonProps) {
  // type defaults to "button": an unlabelled button inside a form submits it.
  return (
    <button type={type} className={cn(buttonStyles({ variant, size }), className)} {...props} />
  );
}
