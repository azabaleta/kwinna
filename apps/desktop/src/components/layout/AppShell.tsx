import { useState } from "react";
import { NavLink } from "react-router-dom";
import { Search, ShoppingCart, RotateCcw, Package, LogOut, Menu, X } from "lucide-react";
import { useAuthStore } from "../../store/use-auth-store";
import { isAndroid } from "../../lib/platform";

const NAV = [
  { to: "/search",  label: "Buscar",   icon: Search       },
  { to: "/sell",    label: "Vender",   icon: ShoppingCart },
  { to: "/return",  label: "Devolver", icon: RotateCcw    },
  { to: "/orders",  label: "Pedidos",  icon: Package      },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuthStore();

  return isAndroid
    ? <MobileLayout user={user} logout={logout}>{children}</MobileLayout>
    : <DesktopLayout user={user} logout={logout}>{children}</DesktopLayout>;
}

// ─── Desktop: sidebar fijo ─────────────────────────────────────────────────────

function DesktopLayout({
  user,
  logout,
  children,
}: {
  user:     { name: string } | null;
  logout:   () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="w-52 flex-shrink-0 bg-zinc-900 border-r border-zinc-800 flex flex-col">
        <div className="px-5 py-5 border-b border-zinc-800">
          <span className="text-lg font-bold tracking-wide text-white">kwinna</span>
          <span className="ml-2 text-xs text-zinc-500 uppercase tracking-widest">POS</span>
        </div>

        <nav className="flex-1 py-4 px-3 flex flex-col gap-1">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-white text-zinc-900"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                }`
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="px-4 py-4 border-t border-zinc-800">
          <p className="text-xs text-zinc-400 truncate mb-1">{user?.name}</p>
          <button
            onClick={logout}
            className="flex items-center gap-2 text-xs text-zinc-500 hover:text-red-400 transition-colors"
          >
            <LogOut size={13} /> Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto bg-zinc-950">
        {children}
      </main>
    </div>
  );
}

// ─── Mobile: top bar + drawer hamburger ───────────────────────────────────────

function MobileLayout({
  user,
  logout,
  children,
}: {
  user:     { name: string } | null;
  logout:   () => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Top bar */}
      <header className="flex-shrink-0 flex items-center gap-3 px-4 py-3
                         bg-zinc-900 border-b border-zinc-800">
        <button
          onClick={() => setOpen(true)}
          className="text-zinc-400 hover:text-white transition-colors p-1"
        >
          <Menu size={22} />
        </button>
        <span className="text-base font-bold text-white">kwinna</span>
        <span className="text-xs text-zinc-500 uppercase tracking-widest">POS</span>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-auto bg-zinc-950">
        {children}
      </main>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/60 z-40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-zinc-900 border-r border-zinc-800
                    flex flex-col z-50 transform transition-transform duration-200 ease-in-out
                    ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-zinc-800">
          <div>
            <span className="text-lg font-bold tracking-wide text-white">kwinna</span>
            <span className="ml-2 text-xs text-zinc-500 uppercase tracking-widest">POS</span>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="text-zinc-500 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-3 flex flex-col gap-1">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-white text-zinc-900"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="px-4 py-4 border-t border-zinc-800">
          <p className="text-xs text-zinc-400 truncate mb-2">{user?.name}</p>
          <button
            onClick={() => { logout(); setOpen(false); }}
            className="flex items-center gap-2 text-xs text-zinc-500 hover:text-red-400 transition-colors"
          >
            <LogOut size={13} /> Cerrar sesión
          </button>
        </div>
      </aside>
    </div>
  );
}
