"use client";

import { toast } from "sonner";
import { Package2, ShoppingCart, TrendingDown } from "lucide-react";
import type { Product } from "@kwinna/contracts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCreateSale } from "@/hooks/use-sale";
import { useProducts } from "@/hooks/use-products";
import { useStock } from "@/hooks/use-stock";
import { RestockDialog } from "@/components/inventory/restock-dialog";

// ─── Stock Badge ──────────────────────────────────────────────────────────────

function StockBadge({ quantity }: { quantity: number }) {
  if (quantity < 5) {
    return (
      <Badge variant="destructive">
        <TrendingDown className="mr-1 h-3 w-3" />
        {quantity} — Crítico
      </Badge>
    );
  }
  if (quantity < 20) {
    return (
      <Badge variant="warning">
        {quantity} — Bajo
      </Badge>
    );
  }
  return (
    <Badge variant="success">
      {quantity} — OK
    </Badge>
  );
}

// ─── Skeleton Row ─────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <TableRow>
      {[1, 2, 3, 4].map((i) => (
        <TableCell key={i}>
          <div className="h-4 animate-pulse rounded bg-muted" />
        </TableCell>
      ))}
    </TableRow>
  );
}

// ─── Sell Button ──────────────────────────────────────────────────────────────

function SellButton({ product, stockQty }: { product: Product; stockQty: number }) {
  const { mutateAsync, isPending } = useCreateSale();

  async function handleSell() {
    try {
      await mutateAsync({
        items: [
          {
            productId: product.id,
            quantity: 1,
            unitPrice: product.price,
            subtotal: product.price,
          },
        ],
      });

      toast.success(`Venta registrada`, {
        description: `1 × ${product.name} — $${product.price.toLocaleString("es-AR")}`,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Error al registrar la venta";

      toast.error("Venta fallida", { description: message });
    }
  }

  return (
    <Button
      size="sm"
      variant={stockQty === 0 ? "outline" : "default"}
      disabled={stockQty === 0 || isPending}
      onClick={handleSell}
      className="gap-1.5"
    >
      <ShoppingCart className="h-3.5 w-3.5" />
      {stockQty === 0 ? "Sin stock" : "Vender 1"}
    </Button>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function InventoryPage() {
  const { products, isLoading: loadingProducts, isError: errorProducts } = useProducts();
  const { stock, isLoading: loadingStock } = useStock();

  const isLoading = loadingProducts || loadingStock;

  function getQty(productId: string): number {
    return stock.find((s) => s.productId === productId)?.quantity ?? 0;
  }

  // Índice productId → qty para pasarle al dialog sin re-calcular
  const stockIndex = Object.fromEntries(
    stock.map((s) => [s.productId, s.quantity])
  );

  return (
    <main className="min-h-screen bg-background px-4 py-8 md:px-8">
      <div className="mx-auto max-w-5xl space-y-6">

        {/* ── Header ── */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Package2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">
                Gestión de Inventario
              </h1>
              <p className="text-sm text-muted-foreground">
                {isLoading ? "Cargando..." : `${products.length} productos`}
              </p>
            </div>
          </div>
          <RestockDialog products={products} currentStock={stockIndex} />
        </div>

        {/* ── Error state ── */}
        {errorProducts && (
          <Card className="border-destructive/30 bg-destructive/10">
            <CardContent className="pt-6">
              <p className="text-sm text-destructive">
                No se pudo cargar el inventario. Verificá que la API esté corriendo en el puerto 3001.
              </p>
            </CardContent>
          </Card>
        )}

        {/* ── Table Card ── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Productos</CardTitle>
            <CardDescription>
              Stock en tiempo real · se actualiza tras cada venta
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Producto</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Precio</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead className="pr-6 text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                ) : (
                  products.map((product) => {
                    const qty = getQty(product.id);
                    return (
                      <TableRow key={product.id}>
                        <TableCell className="pl-6">
                          <span className="font-medium text-foreground">
                            {product.name}
                          </span>
                          {product.description && (
                            <span className="block text-xs text-muted-foreground">
                              {product.description}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <code className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                            {product.sku}
                          </code>
                        </TableCell>
                        <TableCell className="font-medium tabular-nums">
                          ${product.price.toLocaleString("es-AR")}
                        </TableCell>
                        <TableCell>
                          <StockBadge quantity={qty} />
                        </TableCell>
                        <TableCell className="pr-6 text-right">
                          <SellButton product={product} stockQty={qty} />
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

      </div>
    </main>
  );
}
