import { useEffect, useRef, type ReactNode } from "react";

import { Button } from "./button";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  isPending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Native <dialog>: focus trapping, Escape and the backdrop come from the
 * platform, so there is no modal library and no focus bugs to hand-roll.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  isPending,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onCancel={onCancel}
      onClose={onCancel}
      aria-labelledby="confirm-title"
      className="m-auto w-[min(28rem,90vw)] rounded-lg border border-border-subtle bg-surface-raised p-6 text-content backdrop:bg-black/40"
    >
      <h2 id="confirm-title" className="text-base font-semibold">
        {title}
      </h2>
      <div className="mt-2 text-sm text-content-muted">{description}</div>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="secondary" size="sm" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
        <Button variant="danger" size="sm" onClick={onConfirm} disabled={isPending}>
          {isPending ? "Working…" : confirmLabel}
        </Button>
      </div>
    </dialog>
  );
}
