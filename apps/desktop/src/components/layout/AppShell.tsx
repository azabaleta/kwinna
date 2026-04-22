import { NavLink } from "react-router-dom";
import { Search, ShoppingCart, RotateCcw, Package, LogOut } from "lucide-react";
import { useAuthStore } from "../../store/use-auth-store";

const NAV = [
  { to: "/search",  label: "Buscar",   icon: Search       },
  { to: "/sell",    label: "Vender",   icon: ShoppingCart },
  { to: "/return",  label: "Devolver", icon: RotateCcw    },
  { to: "/orders",  label: "Pedidos",  icon: Package      },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuthStore();

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-52 flex-shrink-0 bg-zinc-900 border-r border-zinc-800 flex flex-col">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-zinc-800">
          <span className="text-lg font-bold tracking-wide text-white">kwinna</span>
          <span className="ml-2 text-xs text-zinc-500 uppercase tracking-widest">POS</span>
        </div>

        {/* Nav */}
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

        {/* User */}
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

      {/* Main content */}
      <main className="flex-1 overflow-auto bg-zinc-950">
        {children}
      </main>
    </div>
  );
}
