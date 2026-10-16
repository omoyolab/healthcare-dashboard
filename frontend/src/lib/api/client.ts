import { env } from "@/lib/config/env";

import { ApiError } from "./errors";
import type { ProblemDetail } from "./types";

const DEFAULT_TIMEOUT_MS = 10_000;

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  searchParams?: URLSearchParams;
  signal?: AbortSignal;
}

function buildUrl(path: string, searchParams?: URLSearchParams): string {
  const query = searchParams?.toString();
  return `${env.apiBaseUrl}/api/v1${path}${query ? `?${query}` : ""}`;
}

async function toApiError(response: Response): Promise<ApiError> {
  let problem: ProblemDetail | null = null;
  try {
    problem = (await response.json()) as ProblemDetail;
  } catch {
    // Not every failure has a JSON body (a proxy 502, for instance).
  }
  return new ApiError(
    problem?.detail ?? problem?.title ?? response.statusText ?? "Request failed",
    response.status,
    problem,
  );
}

/**
 * The single network seam. Timeouts, error normalisation and any future auth
 * header are one change here rather than at every call site.
 */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, searchParams, signal } = options;

  // Caller aborts (unmount, new query) and the timeout both have to cancel it.
  const timeout = AbortSignal.timeout(DEFAULT_TIMEOUT_MS);
  const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;

  let response: Response;
  try {
    response = await fetch(buildUrl(path, searchParams), {
      method,
      signal: combined,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (cause) {
    if (signal?.aborted) throw cause;
    const reason = timeout.aborted ? "The request timed out." : "Could not reach the server.";
    throw new ApiError(reason, 0, null);
  }

  if (!response.ok) throw await toApiError(response);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
