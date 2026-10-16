/** Parsed once, so a missing variable fails loudly instead of leaking "undefined" into URLs. */

const rawBaseUrl = import.meta.env.VITE_API_BASE_URL as string | undefined;

export const env = {
  // Default to a relative path: the dev server and nginx both proxy /api, so
  // the app works same-origin unless pointed elsewhere explicitly.
  apiBaseUrl: (rawBaseUrl ?? "").replace(/\/$/, ""),
  isDev: import.meta.env.DEV,
} as const;
