import type { ReactNode } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { Sidebar } from "@/components/admin/sidebar";

/** Layout del área admin. Doble capa de protección: middleware + AuthGuard client. */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar />
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </AuthGuard>
  );
}
