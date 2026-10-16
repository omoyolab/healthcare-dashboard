import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api/errors";

interface ErrorStateProps {
  error: unknown;
  onRetry?: () => void;
}

/** Driven by the error itself: a 404 is not a network blip and should not offer a retry. */
export function ErrorState({ error, onRetry }: ErrorStateProps) {
  const apiError = error instanceof ApiError ? error : null;
  const title = apiError?.isNotFound
    ? "Not found"
    : apiError?.isNetworkError
      ? "Cannot reach the server"
      : "Something went wrong";
  const message = apiError?.message ?? "An unexpected error occurred.";
  const canRetry = onRetry && (apiError?.isRetryable ?? true);

  return (
    <div role="alert" className="rounded-lg border border-border-subtle bg-surface-raised p-6">
      <h2 className="text-base font-semibold text-content">{title}</h2>
      <p className="mt-1 text-sm text-content-muted">{message}</p>
      {apiError?.requestId && (
        <p className="mt-2 text-xs text-content-muted">
          Reference: <code>{apiError.requestId}</code>
        </p>
      )}
      {canRetry && (
        <Button variant="secondary" size="sm" className="mt-4" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}
