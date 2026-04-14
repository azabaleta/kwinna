"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Package2, Search, ShoppingCart, TrendingDown } from "lucide-react";
import type { Product, SaleOrderInput, Stock } from "@kwinna/contracts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { CreateProductDialog } from "@/components/inventory/create-product-dialog";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function totalQty(entries: Stock[]): number {
  return entries.reduce((sum, s) => sum + s.quantity, 0);
}

function matchesQuery(product: Product, q: string): boolean {
  if (!q) return true;
  const lower = q.toLowerCase();
  return (
    product.name.toLowerCase().includes(lower) ||
    product.sku.toLowerCase().includes(lower) ||
    (product.tags ?? []).some((t) => t.toLowerCase().includes(lower))
  );
}

// ─── Stock Chips ──────────────────────────────────────────────────────────────
// Shows per-size chips for products with sizes, or a single total badge otherwise.

function StockChips({ entries }: { entries: Stock[] }) {
  const sized = entries.filter((s) => s.size);
  const unsized = entries.filter((s) => !s.size);

  if (sized.length === 0) {
    // Accessory (no size)
    const qty = totalQty(unsized);
    return <StockBadge quantity={qty} />;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {sized.map((s) => (
        <span
          key={s.id}
          className={[
            "inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium tabular-nums",
            s.quantity === 0
              ? "bg-destructive/10 text-destructive line-through"
              : s.quantity <= 3
              ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
              : "bg-muted text-muted-foreground",
          ].join(" ")}
        >
          {s.size}: {s.quantity}
        </span>
      ))}
    </div>
  );
}

// ─── Stock Badge ──────────────────────────────────────────────────────────────

function StockBadge({ quantity }: { quantity: number }) {
  if (quantity === 0) {
    return (
      <Badge variant="destructive">
        <TrendingDown className="mr-1 h-3 w-3" />
        Sin stock
      </Badge>
    );
  }
  if (quantity < 5) {
    return (
      <Badge variant="destructive">
        <TrendingDown className="mr-1 h-3 w-3" />
        {quantity} — Crítico
      </Badge>
    );
  }
  if (quantity < 20) {
    return <Badge variant="warning">{quantity} — Bajo</Badge>;
  }
  return <Badge variant="success">{quantity} — OK</Badge>;
}

// ─── Skeleton Row ─────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <TableRow>
      {[1, 2, 3, 4, 5].map((i) => (
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
      const payload: SaleOrderInput = {
        items: [{ productId: product.id, quantity: 1 }],
        customerName:     "Venta en tienda",
        customerEmail:    "pos@kwinna.com",
        shippingAddress:  "Local",
        shippingCity:     "Neuquén",
        shippingProvince: "Neuquén",
      };
      await mutateAsync(payload);

      toast.success("Venta registrada", {
        description: `1 × ${product.name} — $${product.price.toLocaleString("es-AR")}`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al registrar la venta";
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
  const [query, setQuery] = useState("");

  const { products, isLoading: loadingProducts, isError: errorProducts } = useProducts();
  const { stock, isLoading: loadingStock } = useStock();

  const isLoading = loadingProducts || loadingStock;

  // Build stockByProduct: Record<productId, Stock[]>
  const stockByProduct = stock.reduce<Record<string, Stock[]>>((acc, s) => {
    if (!acc[s.productId]) acc[s.productId] = [];
    acc[s.productId].push(s);
    return acc;
  }, {});

  const filtered = products.filter((p) => matchesQuery(p, query));

  const lowStockCount = products.filter((p) => {
    const qty = totalQty(stockByProduct[p.id] ?? []);
    return qty > 0 && qty < 5;
  }).length;

  const outOfStockCount = products.filter(
    (p) => totalQty(stockByProduct[p.id] ?? []) === 0
  ).length;

  return (
    <main className="px-4 py-8 md:px-8">
      <div className="mx-auto max-w-6xl space-y-6">

        {/* ── Header ── */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Package2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Gestión de Inventario</h1>
              <p className="text-sm text-muted-foreground">
                {isLoading
                  ? "Cargando…"
                  : `${products.length} productos · ${outOfStockCount} sin stock · ${lowStockCount} críticos`}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <RestockDialog products={products} stockByProduct={stockByProduct} />
            <CreateProductDialog />
          </div>
        </div>

        {/* ── Alert strips ── */}
        {outOfStockCount > 0 && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-2 text-sm text-destructive">
            {outOfStockCount} producto{outOfStockCount > 1 ? "s" : ""} sin stock.
          </div>
        )}

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
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle>Productos</CardTitle>
                <CardDescription>
                  Stock en tiempo real · se actualiza tras cada venta o reposición
                </CardDescription>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre, SKU o tag…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 pl-4" />
                  <TableHead className="pl-2">Producto</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Precio</TableHead>
                  <TableHead>Stock por talle</TableHead>
                  <TableHead className="pr-6 text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                      {query
                        ? `Sin resultados para "${query}"`
                        : "No hay productos cargados aún."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((product) => {
                    const entries = stockByProduct[product.id] ?? [];
                    const qty = totalQty(entries);
                    const thumb = product.images?.[0];

                    return (
                      <TableRow key={product.id}>
                        {/* Thumbnail */}
                        <TableCell className="pl-4">
                          {thumb ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={thumb}
                              alt={product.name}
                              className="h-10 w-10 rounded-md object-cover"
                            />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted">
                              <Package2 className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                        </TableCell>

                        {/* Name + description */}
                        <TableCell className="pl-2">
                          <span className="font-medium text-foreground">{product.name}</span>
                          {product.description && (
                            <span className="block max-w-[220px] truncate text-xs text-muted-foreground">
                              {product.description}
                            </span>
                          )}
                          {(product.tags ?? []).length > 0 && (
                            <div className="mt-0.5 flex flex-wrap gap-1">
                              {(product.tags ?? []).slice(0, 3).map((t) => (
                                <span
                                  key={t}
                                  className="rounded-full bg-muted px-1.5 py-px text-[10px] text-muted-foreground"
                                >
                                  {t}
                                </span>
                              ))}
                            </div>
                          )}
                        </TableCell>

                        {/* SKU */}
                        <TableCell>
                          <code className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                            {product.sku}
                          </code>
                        </TableCell>

                        {/* Price */}
                        <TableCell className="font-medium tabular-nums">
                          ${product.price.toLocaleString("es-AR")}
                        </TableCell>

                        {/* Per-size chips */}
                        <TableCell>
                          <StockChips entries={entries} />
                        </TableCell>

                        {/* Sell */}
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
