import { Link } from "react-router-dom";

import { buttonStyles } from "@/components/ui/button";

export function NotFoundPage() {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <p className="text-sm font-medium text-content-muted">404</p>
      <h1 className="mt-2 text-xl font-semibold text-content">Page not found</h1>
      <p className="mt-2 text-sm text-content-muted">
        The page you asked for does not exist or has moved.
      </p>
      {/* Styled Link, not a Button wrapping one: an <a> inside a <button> is invalid. */}
      <Link to="/patients" className={buttonStyles({ className: "mt-6" })}>
        Back to patients
      </Link>
    </div>
  );
}
