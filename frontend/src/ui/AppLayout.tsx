import { BarChart3, Bot, ListChecks } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";

export function AppLayout() {
  const logoUrl = `${import.meta.env.BASE_URL}brand/neural-co-logo.svg`;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-line bg-white/90 shadow-[0_8px_30px_rgba(16,24,40,0.08)] backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-5 py-3">
          <div className="flex items-center gap-3">
            <img className="h-9 w-auto" src={logoUrl} alt="Neural Co" />
            <div>
              <h1 className="text-base font-extrabold tracking-wide text-ink">Fraud Rules</h1>
              <p className="text-xs font-medium text-muted">AI risk operations</p>
            </div>
          </div>
          <nav className="flex items-center gap-2">
            <NavLink
              to="/overview"
              className={({ isActive }) =>
                `btn ${isActive ? "btn-primary" : "btn-secondary"}`
              }
            >
              <BarChart3 size={16} aria-hidden="true" />
              Overview
            </NavLink>
            <NavLink
              to="/rules"
              className={({ isActive }) =>
                `btn ${isActive ? "btn-primary" : "btn-secondary"}`
              }
            >
              <ListChecks size={16} aria-hidden="true" />
              Rules
            </NavLink>
            <NavLink
              to="/assistant"
              className={({ isActive }) =>
                `btn ${isActive ? "btn-primary" : "btn-secondary"}`
              }
            >
              <Bot size={16} aria-hidden="true" />
              Assistant
            </NavLink>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-5 py-6">
        <Outlet />
      </main>
    </div>
  );
}
