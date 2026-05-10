"use client";

import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useStockBalances } from "@/hooks/use-stock-balances";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, FileBarChart2, Play } from "lucide-react";
import { NewStockBalanceDialog } from "./new-stock-balance-dialog";
import { StockBalanceReportDialog } from "./stock-balance-report-dialog";

export function StockBalanceList() {
  const { balances, isLoading } = useStockBalances();
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [reportId, setReportId] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Auditoría de Inventario</h2>
          <p className="text-sm text-muted-foreground">Historial de balances y conciliaciones.</p>
        </div>
        <Button onClick={() => setIsNewOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Balance
        </Button>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Fecha Inicio</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Precisión</TableHead>
              <TableHead className="text-right">Pérdida ($)</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : balances.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  No hay balances de stock registrados.
                </TableCell>
              </TableRow>
            ) : (
              balances.map((balance) => (
                <TableRow key={balance.id}>
                  <TableCell className="font-mono text-xs">
                    {balance.id.split('-')[0]}
                  </TableCell>
                  <TableCell>
                    {format(new Date(balance.createdAt), "dd MMM yyyy, HH:mm", { locale: es })}
                  </TableCell>
                  <TableCell>
                    {balance.status === "completed" ? (
                      <Badge className="bg-green-500">Completado</Badge>
                    ) : balance.status === "in_progress" ? (
                      <Badge variant="outline" className="border-yellow-500 text-yellow-600 bg-yellow-500/10">En progreso</Badge>
                    ) : (
                      <Badge variant="secondary">Cancelado</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {balance.status === "completed" && balance.accuracyPercentage !== null ? (
                      <span className={balance.accuracyPercentage >= 95 ? "text-green-600" : "text-destructive"}>
                        {balance.accuracyPercentage}%
                      </span>
                    ) : "—"}
                  </TableCell>
                  <TableCell className="text-right font-medium text-destructive">
                    {balance.status === "completed" && balance.totalLosses !== null ? (
                      `$${balance.totalLosses.toLocaleString("es-AR")}`
                    ) : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    {balance.status === "completed" ? (
                      <Button variant="ghost" size="sm" onClick={() => setReportId(balance.id)}>
                        <FileBarChart2 className="mr-2 h-4 w-4" />
                        Reporte
                      </Button>
                    ) : balance.status === "in_progress" ? (
                      <Button variant="outline" size="sm" onClick={() => setIsNewOpen(true)}>
                        <Play className="mr-2 h-4 w-4" />
                        Continuar
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <NewStockBalanceDialog open={isNewOpen} onOpenChange={setIsNewOpen} />
      <StockBalanceReportDialog balanceId={reportId} onClose={() => setReportId(null)} />
    </div>
  );
}
