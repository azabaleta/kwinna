"use client";

import { useState } from "react";
import { format, subDays } from "date-fns";
import { es } from "date-fns/locale";
import {
  ArrowDownToLine,
  ArrowRightLeft,
  ArrowUpFromLine,
  Loader2,
  Wrench,
} from "lucide-react";
import type { StockMovement } from "@kwinna/contracts";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProductCombobox } from "@/components/inventory/product-combobox";
import { StockBalanceList } from "./components/stock-balance-list";

import { useProducts } from "@/hooks/use-products";
import { useAllStockMovements } from "@/hooks/use-stock";


// ─── Utils ────────────────────────────────────────────────────────────────────

function MovementBadge({ type }: { type: StockMovement["type"] }) {
  switch (type) {
    case "in":
      return (
        <Badge variant="outline" className="border-green-500/30 bg-green-500/10 text-green-600 dark:border-green-400/30 dark:bg-green-400/10 dark:text-green-400">
          <ArrowDownToLine className="mr-1 h-3 w-3" />
          Ingreso
        </Badge>
      );
    case "out":
      return (
        <Badge variant="outline" className="border-red-500/30 bg-red-500/10 text-red-600 dark:border-red-400/30 dark:bg-red-400/10 dark:text-red-400">
          <ArrowUpFromLine className="mr-1 h-3 w-3" />
          Salida
        </Badge>
      );
    case "adjustment":
      return (
        <Badge variant="outline" className="border-orange-500/30 bg-orange-500/10 text-orange-600 dark:border-orange-400/30 dark:bg-orange-400/10 dark:text-orange-400">
          <Wrench className="mr-1 h-3 w-3" />
          Ajuste
        </Badge>
      );
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function KardexPage() {
  const [dateFrom, setDateFrom] = useState<string>(
    subDays(new Date(), 30).toISOString().split("T")[0]!
  );
  const [dateTo, setDateTo] = useState<string>(
    new Date().toISOString().split("T")[0]!
  );
  const [selectedProductId, setSelectedProductId] = useState<string>("");

  const { products, isLoading: loadingProducts } = useProducts();

  const { movements, isLoading: loadingMovements } = useAllStockMovements(
    new Date(dateFrom),
    new Date(dateTo),
    selectedProductId || undefined
  );

  const isLoading = loadingProducts || loadingMovements;

  return (
    <div className="flex w-full flex-col gap-6 p-4 md:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <ArrowRightLeft className="h-6 w-6 text-muted-foreground" />
            Kardex & Balances
          </h1>
          <p className="text-muted-foreground">
            Auditoría de inventario e historial de movimientos.
          </p>
        </div>
      </div>

      <Tabs defaultValue="movements" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="movements">Movimientos de Stock</TabsTrigger>
          <TabsTrigger value="balances">Balances (Stock Take)</TabsTrigger>
        </TabsList>

        <TabsContent value="movements" className="mt-0">

      <Card>
        <CardHeader className="flex flex-col gap-4 border-b bg-muted/20 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base font-semibold">Filtros</CardTitle>
            <CardDescription>Visualizá un rango de fechas o aislá un producto.</CardDescription>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="w-[300px]">
              <ProductCombobox
                products={products}
                value={selectedProductId}
                onValueChange={setSelectedProductId}
                error={false}
              />
              {selectedProductId && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-1 h-auto py-1 px-2 text-xs text-muted-foreground"
                  onClick={() => setSelectedProductId("")}
                >
                  Limpiar filtro de producto
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground"
              />
              <span className="text-sm text-muted-foreground">—</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px]">Fecha y Hora</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead>Talle</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Cant.</TableHead>
                <TableHead>Motivo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-48 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : movements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-48 text-center text-muted-foreground">
                    No se encontraron movimientos en este rango de fechas.
                  </TableCell>
                </TableRow>
              ) : (
                movements.map((mov) => {
                  const p = products.find((x) => x.id === mov.productId);
                  return (
                    <TableRow key={mov.id}>
                      <TableCell className="whitespace-nowrap font-medium text-muted-foreground">
                        {format(new Date(mov.createdAt), "dd MMM yyyy, HH:mm", { locale: es })}
                      </TableCell>
                      <TableCell>
                        {p ? (
                          <div className="flex flex-col">
                            <span className="font-semibold">{p.name}</span>
                            <span className="text-xs text-muted-foreground">SKU: {p.sku}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Producto eliminado</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {mov.size ? (
                          <Badge variant="secondary" className="font-mono">{mov.size}</Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <MovementBadge type={mov.type} />
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold">
                        {mov.type === "out" || mov.type === "adjustment" ? (
                          <span className="text-destructive">-{mov.quantity}</span>
                        ) : (
                          <span className="text-green-600">+{mov.quantity}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate" title={mov.reason}>
                        {mov.reason || "—"}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      </TabsContent>

      <TabsContent value="balances" className="mt-0">
        <StockBalanceList />
      </TabsContent>
    </Tabs>
    </div>
  );
}
