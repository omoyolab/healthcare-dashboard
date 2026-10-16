import { LayoutDashboard, Menu, Moon, Sun, Users, type LucideIcon } from "lucide-react";
import { NavLink } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { useUiStore } from "@/store/ui.store";

const AREAS: { to: string; label: string; icon: LucideIcon }[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/patients", label: "Patients", icon: Users },
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
          <Menu aria-hidden className="size-5" />
        </Button>

        <span className="font-semibold text-content">Northgate Practice</span>

        <nav aria-label="Main" className="ml-6 hidden h-14 items-stretch gap-1 md:flex">
          {AREAS.map((area) => {
            const Icon = area.icon;
            return (
              <NavLink
                key={area.to}
                to={area.to}
                end={area.to === "/"}
                className={({ isActive }) =>
                  cn(
                    // The underline marks the area; the sidebar marks the page.
                    "flex items-center gap-2 border-b-2 px-3 text-sm transition-colors",
                    isActive
                      ? "border-accent font-medium text-accent"
                      : "border-transparent text-content-muted hover:text-content",
                  )
                }
              >
                <Icon aria-hidden className="size-4" />
                {area.label}
              </NavLink>
            );
          })}
        </nav>

        <Button
          variant="ghost"
          size="icon"
          className="ml-auto"
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
          onClick={toggleTheme}
        >
          {theme === "dark" ? (
            <Sun aria-hidden className="size-5" />
          ) : (
            <Moon aria-hidden className="size-5" />
          )}
        </Button>
      </div>
    </header>
  );
}
