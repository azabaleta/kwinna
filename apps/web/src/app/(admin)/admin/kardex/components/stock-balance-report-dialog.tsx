"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FileBarChart2, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useStockBalance } from "@/hooks/use-stock-balances";
import { useProducts } from "@/hooks/use-products";

export function StockBalanceReportDialog({ 
  balanceId, 
  onClose 
}: { 
  balanceId: string | null; 
  onClose: () => void;
}) {
  const { balance, isLoading } = useStockBalance(balanceId);
  const { products } = useProducts();

  if (!balanceId) return null;

  return (
    <Dialog open={!!balanceId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        {isLoading || !balance ? (
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <DialogHeader className="p-6 pb-4 border-b">
              <DialogTitle className="flex items-center gap-2">
                <FileBarChart2 className="h-5 w-5" />
                Reporte de Balance #{balance.id.split('-')[0]}
              </DialogTitle>
              <DialogDescription>
                Completado el {format(new Date(balance.completedAt || balance.createdAt), "dd MMM yyyy, HH:mm", { locale: es })}
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto bg-muted/10">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-6">
                <div className="bg-background rounded-lg border p-4 shadow-sm flex flex-col justify-between">
                  <div className="text-sm font-medium text-muted-foreground">Precisión</div>
                  <div className="text-3xl font-bold mt-2">
                    {balance.accuracyPercentage !== null ? `${balance.accuracyPercentage}%` : "N/A"}
                  </div>
                  <div className="mt-2">
                    {(balance.accuracyPercentage || 0) >= 95 ? (
                      <Badge className="bg-green-500 hover:bg-green-600"><CheckCircle2 className="mr-1 h-3 w-3" /> Excelente</Badge>
                    ) : (
                      <Badge variant="destructive"><AlertTriangle className="mr-1 h-3 w-3" /> Requiere revisión</Badge>
                    )}
                  </div>
                </div>

                <div className="bg-background rounded-lg border p-4 shadow-sm flex flex-col justify-between">
                  <div className="text-sm font-medium text-muted-foreground">Discrepancias Totales</div>
                  <div className="text-3xl font-bold mt-2 text-orange-600">
                    {balance.totalDiscrepancies ?? 0}
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">referencias diferentes al sistema</div>
                </div>

                <div className="bg-background rounded-lg border p-4 shadow-sm flex flex-col justify-between">
                  <div className="text-sm font-medium text-muted-foreground">Pérdida Monetaria</div>
                  <div className="text-3xl font-bold mt-2 text-destructive">
                    ${(balance.totalLosses || 0).toLocaleString("es-AR")}
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">calculado al precio de lista</div>
                </div>
              </div>

              <div className="px-6 pb-6">
                <h3 className="font-semibold mb-3">Detalle de Discrepancias</h3>
                <div className="rounded-md border bg-background">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Producto</TableHead>
                        <TableHead>Talle</TableHead>
                        <TableHead className="text-center">Sistema</TableHead>
                        <TableHead className="text-center">Contado</TableHead>
                        <TableHead className="text-right">Diferencia</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {balance.items?.filter(i => i.countedQuantity !== i.expectedQuantity).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground h-24">
                            No se encontraron discrepancias.
                          </TableCell>
                        </TableRow>
                      ) : (
                        balance.items
                          ?.filter(i => i.countedQuantity !== i.expectedQuantity)
                          .map(item => {
                            const p = products.find(x => x.id === item.productId);
                            const diff = item.countedQuantity - (item.expectedQuantity || 0);
                            return (
                              <TableRow key={item.id}>
                                <TableCell>
                                  <div className="font-medium">{p?.name || 'Producto Desconocido'}</div>
                                  <div className="text-xs text-muted-foreground font-mono">{p?.sku}</div>
                                </TableCell>
                                <TableCell>
                                  {item.size ? <Badge variant="secondary">{item.size}</Badge> : <span className="text-muted-foreground">—</span>}
                                </TableCell>
                                <TableCell className="text-center text-muted-foreground">
                                  {item.expectedQuantity ?? 0}
                                </TableCell>
                                <TableCell className="text-center font-bold">
                                  {item.countedQuantity}
                                </TableCell>
                                <TableCell className="text-right font-mono font-bold">
                                  {diff > 0 ? (
                                    <span className="text-green-600">+{diff}</span>
                                  ) : (
                                    <span className="text-destructive">{diff}</span>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
