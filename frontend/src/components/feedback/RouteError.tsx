import { useRouteError } from "react-router-dom";

import { ErrorState } from "./ErrorState";

/** Catches route-level failures, including a lazy chunk that fails to load. */
export function RouteError() {
  const error = useRouteError();

  return (
    <div className="p-6">
      <ErrorState
        error={error}
        onRetry={() => {
          window.location.reload();
        }}
      />
    </div>
  );
}
