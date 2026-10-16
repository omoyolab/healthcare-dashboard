import { LayoutDashboard, UserPlus, Users, type LucideIcon } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

import { cn } from "@/lib/utils/cn";
import { useUiStore } from "@/store/ui.store";

interface Section {
  title: string;
  links: { to: string; label: string; icon: LucideIcon }[];
}

/**
 * The header navigates between areas, so the sidebar shows what is inside the
 * current area. Without that split the two navigations list the same pages
 * under different names.
 */
export function sectionFor(pathname: string): Section {
  if (pathname.startsWith("/patients")) {
    return {
      title: "Patients",
      links: [
        { to: "/patients", label: "All patients", icon: Users },
        { to: "/patients/new", label: "Add patient", icon: UserPlus },
      ],
    };
  }
  return { title: "Dashboard", links: [{ to: "/", label: "Overview", icon: LayoutDashboard }] };
}

export function isLinkActive(pathname: string, to: string): boolean {
  if (to === "/") return pathname === "/";
  if (to === "/patients") {
    // The list and a patient's detail page, but not the create form.
    return pathname.startsWith("/patients") && !pathname.startsWith("/patients/new");
  }
  return pathname === to || pathname.startsWith(`${to}/`);
}

export function Sidebar() {
  const { pathname } = useLocation();
  const sidebarOpen = useUiStore((state) => state.sidebarOpen);
  const setSidebarOpen = useUiStore((state) => state.setSidebarOpen);
  const section = sectionFor(pathname);

  return (
    <nav
      aria-label={section.title}
      className={cn(
        "border-border-subtle bg-surface-raised md:block md:w-56 md:border-r",
        // Below md it is a drawer: hidden until the header button opens it.
        sidebarOpen ? "block border-b" : "hidden",
      )}
    >
      <div className="p-3 md:sticky md:top-14">
        <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-content-muted">
          {section.title}
        </p>
        <ul className="flex flex-col gap-1">
          {section.links.map((link) => {
            const active = isLinkActive(pathname, link.to);
            const Icon = link.icon;
            return (
              <li key={link.to}>
                <Link
                  to={link.to}
                  aria-current={active ? "page" : undefined}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md border-l-2 px-3 py-2 text-sm transition-colors",
                    active
                      ? "border-accent bg-accent-soft font-medium text-accent"
                      : "border-transparent text-content-muted hover:bg-surface-sunken hover:text-content",
                  )}
                >
                  <Icon aria-hidden className="size-4 shrink-0" />
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
