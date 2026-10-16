import { create } from "zustand";

/**
 * Client-only UI state. Server data belongs to the Query cache and must never
 * be copied in here (ADR 0002).
 */
type Theme = "light" | "dark";

interface UiState {
  theme: Theme;
  sidebarOpen: boolean;
  toggleTheme: () => void;
  setSidebarOpen: (open: boolean) => void;
}

function readInitialTheme(): Theme {
  try {
    const stored = localStorage.getItem("theme");
    if (stored === "light" || stored === "dark") return stored;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  } catch {
    // Private windows and blocked storage both throw; the UI still has to work.
    return "light";
  }
}

function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem("theme", theme);
  } catch {
    // Persistence is a convenience, not a requirement.
  }
}

export const useUiStore = create<UiState>((set, get) => ({
  theme: readInitialTheme(),
  sidebarOpen: false,
  toggleTheme: () => {
    const next: Theme = get().theme === "dark" ? "light" : "dark";
    applyTheme(next);
    set({ theme: next });
  },
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}));
