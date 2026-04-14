"use client";

import { LayoutDashboard, Package2, ShoppingBag, TrendingDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useProducts } from "@/hooks/use-products";
import { useStock } from "@/hooks/use-stock";

// ─── Stat Card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  title: string;
  value: string | number;
  description: string;
  icon: React.ElementType;
  isLoading?: boolean;
  variant?: "default" | "warning";
}

function StatCard({ title, value, description, icon: Icon, isLoading, variant = "default" }: StatCardProps) {
  const iconBg   = variant === "warning" ? "bg-destructive/10" : "bg-primary/10";
  const iconColor = variant === "warning" ? "text-destructive"  : "text-primary";

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${iconBg}`}>
          <Icon className={`h-4 w-4 ${iconColor}`} />
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-8 w-16 animate-pulse rounded bg-muted" />
        ) : (
          <p className="text-2xl font-bold text-foreground tabular-nums">{value}</p>
        )}
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { products, isLoading: loadingProducts } = useProducts();
  const { stock,    isLoading: loadingStock    } = useStock();

  const isLoading = loadingProducts || loadingStock;

  const criticalCount = stock.filter((s) => s.quantity < 5).length;

  return (
    <main className="px-4 py-8 md:px-8">
      <div className="mx-auto max-w-5xl space-y-6">

        {/* ── Header ── */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <LayoutDashboard className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground">Resumen general del sistema</p>
          </div>
        </div>

        {/* ── Cards ── */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            title="Total Productos"
            value={products.length}
            description="Productos registrados en el sistema"
            icon={Package2}
            isLoading={isLoading}
          />
          <StatCard
            title="Stock Crítico"
            value={criticalCount}
            description="Productos con menos de 5 unidades"
            icon={TrendingDown}
            isLoading={isLoading}
            variant={criticalCount > 0 ? "warning" : "default"}
          />
          <StatCard
            title="Ventas Hoy"
            value="—"
            description="Disponible cuando exista GET /sales"
            icon={ShoppingBag}
          />
        </div>

      </div>
    </main>
  );
}
