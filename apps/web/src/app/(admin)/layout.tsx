import type { ReactNode } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { Sidebar } from "@/components/admin/sidebar";

/** Layout del área admin. Doble capa de protección: middleware + AuthGuard client. */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar />
        {/* pt-14 en mobile deja espacio para la top bar con el hamburger. */}
        <div className="flex-1 overflow-y-auto pt-14 lg:pt-0">
          {children}
        </div>
      </div>
    </AuthGuard>
  );
}
