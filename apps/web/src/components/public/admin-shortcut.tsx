"use client";

import Link from "next/link";
import { LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/use-auth-store";

/** Visible únicamente para roles admin y operator. */
export function AdminShortcut() {
  const user = useAuthStore((s) => s.user);

  if (!user || (user.role !== "admin" && user.role !== "operator")) return null;

  return (
    <Button variant="ghost" size="sm" asChild className="gap-2">
      <Link href="/admin/inventory">
        <LayoutDashboard className="h-4 w-4" />
        <span className="hidden text-[11px] font-semibold tracking-widest uppercase sm:inline">
          Panel
        </span>
      </Link>
    </Button>
  );
}
