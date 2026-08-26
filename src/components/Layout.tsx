import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const NAV_ITEMS = [
  { to: "/costs", label: "Costs", icon: "▤" },
  { to: "/budget", label: "Budget", icon: "◑" },
  { to: "/savings", label: "Savings", icon: "◈" },
  { to: "/reports", label: "Reports", icon: "◭" },
  { to: "/categories", label: "Categories", icon: "⬡" },
  { to: "/profile", label: "Profile", icon: "◯" },
];

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
    isActive ? "bg-accent-soft text-ink" : "text-ink-muted hover:bg-raised hover:text-ink"
  }`;

export function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-canvas">
      {/* Fixed side rail on desktop; collapses to a top strip on narrow screens. */}
      <aside className="fixed inset-x-0 top-0 z-20 border-b border-line bg-surface md:inset-y-0 md:right-auto md:w-60 md:border-r md:border-b-0">
        <div className="flex items-center justify-between gap-4 px-4 py-3 md:h-full md:flex-col md:items-stretch md:justify-start md:px-3 md:py-5">
          <div className="flex shrink-0 items-center gap-2 md:px-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-accent text-sm font-bold text-white">
              ₭
            </span>
            <span className="text-sm font-semibold tracking-tight text-ink">Ledger</span>
          </div>

          <nav className="flex gap-1 overflow-x-auto md:mt-8 md:flex-col md:overflow-visible">
            {NAV_ITEMS.map((item) => (
              <NavLink key={item.to} to={item.to} className={navLinkClass}>
                <span aria-hidden className="text-xs opacity-60">
                  {item.icon}
                </span>
                <span className="whitespace-nowrap">{item.label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="shrink-0 md:mt-auto md:border-t md:border-line md:px-2 md:pt-4">
            <p className="hidden truncate text-xs text-ink-dim md:block">{user?.name}</p>
            <button
              type="button"
              onClick={logout}
              className="whitespace-nowrap text-xs text-ink-muted transition-colors hover:text-down md:mt-2"
            >
              Log out
            </button>
          </div>
        </div>
      </aside>

      <main className="px-4 pt-20 pb-12 md:ml-60 md:px-8 md:pt-8">
        <div className="mx-auto max-w-5xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
