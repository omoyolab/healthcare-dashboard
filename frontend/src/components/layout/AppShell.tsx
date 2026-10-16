import { Outlet } from "react-router-dom";

import { Header } from "./Header";
import { Sidebar } from "./Sidebar";

export function AppShell() {
  return (
    <div className="min-h-dvh">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-30 focus:rounded focus:bg-surface-raised focus:px-3 focus:py-2"
      >
        Skip to content
      </a>
      <Header />
      <div className="md:flex">
        <Sidebar />
        <main id="main" className="min-w-0 flex-1 px-4 py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
