import { useCallback, useEffect, useRef } from "react";

/**
 * Debounces the action rather than the value, so the URL write happens on the
 * event path instead of in an effect reacting to state.
 */
export function useDebouncedCallback<Args extends unknown[]>(
  callback: (...args: Args) => void,
  delayMs = 300,
): (...args: Args) => void {
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const latest = useRef(callback);

  useEffect(() => {
    latest.current = callback;
  });

  useEffect(() => () => clearTimeout(timer.current), []);

  return useCallback(
    (...args: Args) => {
      clearTimeout(timer.current);
      timer.current = setTimeout(() => latest.current(...args), delayMs);
    },
    [delayMs],
  );
}
