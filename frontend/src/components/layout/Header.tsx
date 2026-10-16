import { NavLink } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { useUiStore } from "@/store/ui.store";

const NAV = [
  { to: "/", label: "Dashboard" },
  { to: "/patients", label: "Patients" },
];

export function Header() {
  const theme = useUiStore((state) => state.theme);
  const toggleTheme = useUiStore((state) => state.toggleTheme);
  const setSidebarOpen = useUiStore((state) => state.setSidebarOpen);
  const sidebarOpen = useUiStore((state) => state.sidebarOpen);

  return (
    <header className="sticky top-0 z-20 border-b border-border-subtle bg-surface-raised">
      <div className="flex h-14 items-center gap-3 px-4">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          aria-label="Toggle navigation"
          aria-expanded={sidebarOpen}
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          <span aria-hidden>☰</span>
        </Button>

        <span className="font-semibold text-content">Northgate Practice</span>

        <nav aria-label="Main" className="ml-6 hidden gap-1 md:flex">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                cn(
                  "rounded-md px-3 py-1.5 text-sm",
                  isActive
                    ? "bg-surface-sunken font-medium text-content"
                    : "text-content-muted hover:text-content",
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <Button
          variant="ghost"
          size="icon"
          className="ml-auto"
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
          onClick={toggleTheme}
        >
          <span aria-hidden>{theme === "dark" ? "☀" : "☾"}</span>
        </Button>
      </div>
    </header>
  );
}
