"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { Sale } from "@kwinna/contracts";
import { isPaidSale } from "@kwinna/contracts";
import { BadgeDollarSign, ShoppingBag, TrendingUp, BarChart3, X } from "lucide-react";

export type ChartMetric = "revenue" | "orders" | "units" | "aov";

interface MetricsChartDialogProps {
  isOpen: boolean;
  onClose: () => void;
  metric: ChartMetric;
  sales: Sale[];
  from: Date;
  to: Date;
}

const METRIC_CONFIG = {
  revenue: { label: "Ingresos", icon: BadgeDollarSign, format: (v: number) => `$${v.toLocaleString("es-AR", { maximumFractionDigits: 0 })}` },
  orders:  { label: "Órdenes", icon: ShoppingBag, format: (v: number) => v.toLocaleString("es-AR") },
  units:   { label: "Unidades", icon: TrendingUp, format: (v: number) => v.toLocaleString("es-AR") },
  aov:     { label: "Ticket Promedio", icon: BarChart3, format: (v: number) => `$${v.toLocaleString("es-AR", { maximumFractionDigits: 0 })}` },
};

type FilterTab = "both" | "web" | "pos";

interface ChartDataPoint {
  label: string;
  web: number;
  pos: number;
  total: number;
  dateKey: string; // Used for unique keys
}

export function MetricsChartDialog({ isOpen, onClose, metric, sales, from, to }: MetricsChartDialogProps) {
  const [filter, setFilter] = useState<FilterTab>("both");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const { dataPoints, maxValue } = useMemo(() => {
    // 1. Determine if grouping by day or month based on duration
    const durationDays = (to.getTime() - from.getTime()) / 86400000;
    const groupByMonth = durationDays > 60; // For semester

    const points: ChartDataPoint[] = [];
    
    // 2. Generate slots
    if (groupByMonth) {
      const current = new Date(from);
      while (current < to) {
        points.push({
          label: current.toLocaleDateString("es-AR", { month: "short", year: "2-digit" }),
          dateKey: `${current.getFullYear()}-${current.getMonth()}`,
          web: 0, pos: 0, total: 0
        });
        current.setMonth(current.getMonth() + 1);
      }
    } else {
      const current = new Date(from);
      while (current < to) {
        points.push({
          label: current.toLocaleDateString("es-AR", { day: "numeric", month: "short" }),
          dateKey: current.toDateString(),
          web: 0, pos: 0, total: 0
        });
        current.setDate(current.getDate() + 1);
      }
    }

    // 3. Aggregate sales
    const validSales = sales.filter(s => isPaidSale(s.status) && !s.isDismissed);
    
    validSales.forEach(sale => {
      const d = new Date(sale.createdAt);
      if (d < from || d >= to) return;

      const dateKey = groupByMonth 
        ? `${d.getFullYear()}-${d.getMonth()}`
        : d.toDateString();

      const point = points.find(p => p.dateKey === dateKey);
      if (!point) return;

      let val = 0;
      if (metric === "revenue") val = sale.total;
      if (metric === "orders") val = 1;
      if (metric === "units") val = sale.items.reduce((acc, i) => acc + i.quantity, 0);
      if (metric === "aov") val = sale.total; // We sum revenue first, then divide by orders later

      if (sale.channel === "web") point.web += val;
      if (sale.channel === "pos") point.pos += val;
    });

    // 4. Final processing (calculate totals and AOV)
    let max = 0;
    points.forEach(p => {
      if (metric === "aov") {
        // Find orders for this point to calculate average
        const periodSales = validSales.filter(s => {
          const d = new Date(s.createdAt);
          return groupByMonth 
            ? `${d.getFullYear()}-${d.getMonth()}` === p.dateKey
            : d.toDateString() === p.dateKey;
        });
        const webOrders = periodSales.filter(s => s.channel === "web").length;
        const posOrders = periodSales.filter(s => s.channel === "pos").length;
        
        p.web = webOrders > 0 ? p.web / webOrders : 0;
        p.pos = posOrders > 0 ? p.pos / posOrders : 0;
      }
      p.total = p.web + p.pos;
      
      const compareVal = filter === "both" ? p.total : filter === "web" ? p.web : p.pos;
      if (compareVal > max) max = compareVal;
    });

    // Fallback if max is 0 to avoid division by zero
    if (max === 0) max = 1;

    return { dataPoints: points, maxValue: max };
  }, [sales, from, to, metric, filter]);

  const config = METRIC_CONFIG[metric];
  const Icon = config.icon;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden gap-0 bg-background border-border">
        
        {/* HEADER */}
        <DialogHeader className="p-6 pb-4 border-b border-border/50">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2.5 text-lg font-bold">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="h-4.5 w-4.5" />
              </div>
              Detalle de {config.label}
            </DialogTitle>
            
            {/* TABS */}
            <div className="flex p-0.5 bg-muted rounded-md mr-6">
              {(["both", "web", "pos"] as FilterTab[]).map(t => (
                <button
                  key={t}
                  onClick={() => setFilter(t)}
                  className={cn(
                    "relative px-4 py-1.5 text-xs font-semibold rounded-sm transition-colors",
                    filter === t ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {filter === t && (
                    <motion.div
                      layoutId="chartTab"
                      className="absolute inset-0 bg-background rounded-sm shadow-sm"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  <span className="relative z-10">
                    {t === "both" ? "Combinado" : t === "web" ? "Online" : "Local"}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </DialogHeader>

        {/* CHART AREA */}
        <div className="p-6 pt-8 bg-gradient-to-b from-background to-muted/20 relative">
          
          {/* Y-Axis lines */}
          <div className="absolute inset-0 p-6 pt-8 pointer-events-none flex flex-col justify-between">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="border-b border-border/40 w-full h-0 relative">
                <span className="absolute -top-2 -left-2 -translate-x-full text-[10px] text-muted-foreground font-mono">
                  {config.format(maxValue * (4 - i) / 4)}
                </span>
              </div>
            ))}
          </div>

          {/* BARS */}
          <div className="relative h-[240px] flex items-end justify-between gap-1.5 z-10 pl-12 pr-2">
            <AnimatePresence mode="popLayout">
              {dataPoints.map((point, i) => {
                const totalH = (point.total / maxValue) * 100;
                const webH   = (point.web / maxValue) * 100;
                const posH   = (point.pos / maxValue) * 100;

                const isHovered = hoveredIndex === i;
                const dimOthers = hoveredIndex !== null && !isHovered;

                return (
                  <div 
                    key={point.dateKey}
                    className="flex-1 flex flex-col justify-end items-center h-full group relative cursor-crosshair"
                    onMouseEnter={() => setHoveredIndex(i)}
                    onMouseLeave={() => setHoveredIndex(null)}
                  >
                    
                    {/* Tooltip */}
                    <AnimatePresence>
                      {isHovered && (
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          transition={{ duration: 0.15 }}
                          className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 bg-popover border border-border shadow-xl rounded-lg p-2.5 min-w-[140px] pointer-events-none z-50"
                        >
                          <p className="text-[11px] font-medium text-muted-foreground mb-1.5 text-center capitalize">
                            {point.label}
                          </p>
                          <div className="space-y-1">
                            {(filter === "both" || filter === "web") && (
                              <div className="flex items-center justify-between gap-3 text-xs">
                                <span className="flex items-center gap-1.5">
                                  <div className="w-2 h-2 rounded-full bg-primary" /> Online
                                </span>
                                <span className="font-semibold tabular-nums">{config.format(point.web)}</span>
                              </div>
                            )}
                            {(filter === "both" || filter === "pos") && (
                              <div className="flex items-center justify-between gap-3 text-xs">
                                <span className="flex items-center gap-1.5">
                                  <div className="w-2 h-2 rounded-full bg-amber-500" /> Local
                                </span>
                                <span className="font-semibold tabular-nums">{config.format(point.pos)}</span>
                              </div>
                            )}
                            {filter === "both" && (
                              <div className="flex items-center justify-between gap-3 text-xs pt-1 mt-1 border-t border-border">
                                <span className="font-medium text-muted-foreground">Total</span>
                                <span className="font-bold tabular-nums text-foreground">{config.format(point.total)}</span>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Bar visual */}
                    <div className={cn("w-full h-full max-w-[40px] flex flex-col justify-end transition-opacity duration-200", dimOthers && "opacity-30")}>
                      {(filter === "both" || filter === "pos") && (
                        <motion.div 
                          initial={{ height: 0 }}
                          animate={{ height: `${filter === "pos" ? posH : posH || 0}%` }}
                          transition={{ type: "spring", bounce: 0, duration: 0.6 }}
                          className={cn("bg-amber-500/90 w-full rounded-t-sm", filter === "both" && point.web === 0 ? "rounded-b-sm" : "")}
                        />
                      )}
                      {(filter === "both" || filter === "web") && (
                        <motion.div 
                          initial={{ height: 0 }}
                          animate={{ height: `${filter === "web" ? webH : webH || 0}%` }}
                          transition={{ type: "spring", bounce: 0, duration: 0.6 }}
                          className={cn("bg-primary w-full rounded-b-sm", filter === "both" && point.pos === 0 ? "rounded-t-sm" : "", filter === "web" ? "rounded-t-sm" : "")}
                        />
                      )}
                    </div>
                    
                    {/* X-Axis label */}
                    <span className={cn(
                      "absolute top-full mt-2 text-[9px] uppercase tracking-wider font-semibold whitespace-nowrap transition-colors",
                      isHovered ? "text-foreground" : "text-muted-foreground/60"
                    )}>
                      {point.label.split(" ")[0]}
                    </span>
                  </div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
