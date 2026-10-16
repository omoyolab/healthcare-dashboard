import type { FieldError, ProblemDetail } from "./types";

/** One error type for the whole app, so there is one error path to handle. */
export class ApiError extends Error {
  readonly status: number;
  readonly problem: ProblemDetail | null;
  readonly requestId: string | null;

  constructor(message: string, status: number, problem: ProblemDetail | null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.problem = problem;
    this.requestId = problem?.request_id ?? null;
  }

  /** 0 means the request never got a response: offline, DNS, CORS, timeout. */
  get isNetworkError(): boolean {
    return this.status === 0;
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }

  get isValidationError(): boolean {
    return this.status === 422;
  }

  get isConflict(): boolean {
    return this.status === 409;
  }

  /** Retrying a 4xx just fails again; a 5xx or network error may succeed. */
  get isRetryable(): boolean {
    return this.isNetworkError || this.status >= 500;
  }

  /** Field errors keyed for dropping straight onto form inputs. */
  get fieldErrors(): Record<string, string> {
    const entries = (this.problem?.errors ?? []).map(
      (error: FieldError) => [error.field, error.message] as const,
    );
    return Object.fromEntries(entries);
  }
}
