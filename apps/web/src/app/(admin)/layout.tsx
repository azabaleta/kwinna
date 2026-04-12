import type { ReactNode } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { DashboardHeader } from "@/components/dashboard-header";

/** Layout del área admin. Doble capa de protección: middleware + AuthGuard client. */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <DashboardHeader />
      {children}
    </AuthGuard>
  );
}
