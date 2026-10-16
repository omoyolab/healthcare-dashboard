import { NavLink } from "react-router-dom";

import { cn } from "@/lib/utils/cn";
import { useUiStore } from "@/store/ui.store";

const SECTIONS = [
  { to: "/", label: "Overview", end: true },
  { to: "/patients", label: "All patients", end: false },
  { to: "/patients/new", label: "Add patient", end: false },
];

export function Sidebar() {
  const sidebarOpen = useUiStore((state) => state.sidebarOpen);
  const setSidebarOpen = useUiStore((state) => state.setSidebarOpen);

  return (
    <nav
      aria-label="Sections"
      className={cn(
        "border-border-subtle bg-surface-raised md:block md:w-56 md:border-r",
        // Below md it is a drawer: hidden until the header button opens it.
        sidebarOpen ? "block border-b" : "hidden",
      )}
    >
      <ul className="flex flex-col gap-1 p-3 md:sticky md:top-14">
        {SECTIONS.map((section) => (
          <li key={section.to}>
            <NavLink
              to={section.to}
              end={section.end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                cn(
                  "block rounded-md px-3 py-2 text-sm",
                  isActive
                    ? "bg-surface-sunken font-medium text-content"
                    : "text-content-muted hover:bg-surface-sunken hover:text-content",
                )
              }
            >
              {section.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
