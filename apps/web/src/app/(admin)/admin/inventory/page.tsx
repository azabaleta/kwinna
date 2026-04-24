"use client";

import { Fragment, useState } from "react";
import { toast } from "sonner";
import { ChevronDown, ChevronRight, Package2, Search, ShoppingCart, SlidersHorizontal, TrendingDown, X } from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { BulkImportDialog } from "@/components/inventory/bulk-import-dialog";
import { DeleteProductDialog } from "@/components/inventory/delete-product-dialog";
import { EditProductDialog } from "@/components/inventory/edit-product-dialog";
import { PRODUCT_TAGS } from "@/schemas/product";
import { SEASON_LABELS, type ProductSeason } from "@kwinna/contracts";
import { cn } from "@/lib/utils";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function totalQty(entries: Stock[]): number {
  return entries.reduce((sum, s) => sum + s.quantity, 0);
}

// ── Fuzzy matching ────────────────────────────────────────────────────────────
// Normaliza acentos y mayúsculas, luego calcula edit distance (Levenshtein)
// con una tolerancia de 1 error cada 4 caracteres.

function normalize(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function editDistance(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[] = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    let prev = i;
    for (let j = 1; j <= n; j++) {
      const val = a[i - 1] === b[j - 1]
        ? dp[j - 1]
        : 1 + Math.min(dp[j - 1]!, dp[j]!, prev);
      dp[j - 1] = prev;
      prev = val;
    }
    dp[n] = prev;
  }
  return dp[n]!;
}

// Devuelve true si `query` matchea `text` con tolerancia a typos.
// Para tokens cortos (≤2 chars) se exige match exacto.
function fuzzyMatch(text: string, query: string): boolean {
  if (!query) return true;
  const t = normalize(text);
  const q = normalize(query);
  if (t.includes(q)) return true;
  if (q.length <= 2) return false;

  // Divide la query en tokens y exige que cada uno matchee alguna palabra del texto
  const qTokens = q.split(/\s+/).filter(Boolean);
  const tWords  = t.split(/[\s\-_/]+/).filter(Boolean);

  return qTokens.every((token) => {
    if (t.includes(token)) return true;
    const maxDist = Math.max(1, Math.floor(token.length / 4));
    return tWords.some((word) => editDistance(word, token) <= maxDist);
  });
}

function matchesQuery(product: Product, q: string, tag: string, season: string): boolean {
  const textMatch   = !q || fuzzyMatch(product.name, q) || fuzzyMatch(product.sku, q);
  const tagMatch    = !tag || (product.tags ?? []).some(
    (t) => t.toLowerCase() === tag.toLowerCase()
  );
  const seasonMatch = !season || product.season === season;
  return textMatch && tagMatch && seasonMatch;
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
  const [query,        setQuery]        = useState("");
  const [activeTag,    setActiveTag]    = useState("");
  const [activeSeason, setActiveSeason] = useState<ProductSeason | "">("");
  const [expanded,     setExpanded]     = useState<Record<string, boolean>>({});

  function toggleExpanded(id: string) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  const { products, isLoading: loadingProducts, isError: errorProducts } = useProducts();
  const { stock, isLoading: loadingStock } = useStock();

  const isLoading = loadingProducts || loadingStock;

  // Build stockByProduct: Record<productId, Stock[]>
  const stockByProduct = stock.reduce<Record<string, Stock[]>>((acc, s) => {
    if (!acc[s.productId]) acc[s.productId] = [];
    acc[s.productId].push(s);
    return acc;
  }, {});

  const filtered = products.filter((p) => matchesQuery(p, query, activeTag, activeSeason));

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
          <div className="flex flex-wrap gap-2">
            <BulkImportDialog />
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
            </div>

            {/* ── Filtro de temporada ── */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground font-medium">Temporada:</span>
              {(Object.entries(SEASON_LABELS) as [ProductSeason, string][]).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setActiveSeason(activeSeason === value ? "" : value)}
                  className={cn(
                    "rounded-none border px-2.5 py-1 text-xs font-medium tracking-wide transition-colors",
                    activeSeason === value
                      ? "border-foreground bg-foreground text-background"
                      : "border-border text-muted-foreground hover:border-foreground/50 hover:text-foreground",
                  )}
                >
                  {label}
                </button>
              ))}
              {activeSeason && (
                <button
                  type="button"
                  onClick={() => setActiveSeason("")}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" /> Limpiar
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {/* Búsqueda fuzzy por nombre / SKU */}
                <div className="relative w-full sm:w-56">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Nombre o SKU…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="pl-8 pr-7"
                  />
                  {query && (
                    <button
                      onClick={() => setQuery("")}
                      className="absolute right-2 top-2.5 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Tag dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className={cn(
                        "flex shrink-0 items-center gap-1.5 rounded-md border px-3 h-9 text-xs font-medium transition-colors focus-visible:outline-none",
                        activeTag
                          ? "border-foreground bg-foreground text-background"
                          : "border-input text-muted-foreground hover:border-foreground/50 hover:text-foreground",
                      )}
                    >
                      <SlidersHorizontal className="h-3 w-3 shrink-0" />
                      <span className="max-w-[100px] truncate">
                        {activeTag || "Categoría"}
                      </span>
                      {activeTag ? (
                        <X
                          className="h-3 w-3 shrink-0"
                          onClick={(e) => { e.stopPropagation(); setActiveTag(""); }}
                        />
                      ) : (
                        <ChevronDown className="h-3 w-3 shrink-0" />
                      )}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="max-h-72 w-44 overflow-y-auto">
                    {PRODUCT_TAGS.map((tag) => (
                      <DropdownMenuItem
                        key={tag}
                        onSelect={() => setActiveTag(tag === activeTag ? "" : tag)}
                        className={cn(
                          "text-xs cursor-pointer",
                          activeTag === tag && "font-semibold bg-accent",
                        )}
                      >
                        {activeTag === tag && <span className="mr-1.5">✓</span>}
                        {tag}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Resumen de filtros activos */}
            {(query || activeTag || activeSeason) && (
              <p className="mt-1 text-xs text-muted-foreground">
                {filtered.length} resultado{filtered.length !== 1 ? "s" : ""}
                {query && <> para <span className="font-medium text-foreground">"{query}"</span></>}
                {activeTag && <> · categoría <span className="font-medium text-foreground">{activeTag}</span></>}
                {activeSeason && <> · temporada <span className="font-medium text-foreground">{SEASON_LABELS[activeSeason]}</span></>}
                {" · "}
                <button
                  className="underline underline-offset-2 hover:text-foreground"
                  onClick={() => { setQuery(""); setActiveTag(""); setActiveSeason(""); }}
                >
                  Limpiar filtros
                </button>
              </p>
            )}
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 pl-4" />
                  <TableHead className="pl-2">Producto</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Precio</TableHead>
                  <TableHead>Stock total</TableHead>
                  <TableHead className="pr-6 text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                      {query || activeTag
                        ? "Sin resultados para los filtros aplicados."
                        : "No hay productos cargados aún."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((product) => {
                    const entries     = stockByProduct[product.id] ?? [];
                    const sizedEntries = entries.filter((s) => s.size);
                    const qty         = totalQty(entries);
                    const thumb       = product.images?.[0];
                    const hasSizes    = sizedEntries.length > 0;
                    const isOpen      = !!expanded[product.id];

                    return (
                      <Fragment key={product.id}>
                        <TableRow
                          className={cn(hasSizes && "cursor-pointer hover:bg-muted/30")}
                          onClick={hasSizes ? () => toggleExpanded(product.id) : undefined}
                          role={hasSizes ? "button" : undefined}
                          aria-expanded={hasSizes ? isOpen : undefined}
                          tabIndex={hasSizes ? 0 : undefined}
                          onKeyDown={hasSizes ? (e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              toggleExpanded(product.id);
                            }
                          } : undefined}
                        >
                          {/* Thumbnail + chevron */}
                          <TableCell className="pl-4">
                            <div className="flex items-center gap-1">
                              {hasSizes ? (
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); toggleExpanded(product.id); }}
                                  aria-label={isOpen ? "Contraer talles" : "Ver talles"}
                                  aria-expanded={isOpen}
                                  className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
                                >
                                  {isOpen
                                    ? <ChevronDown className="h-4 w-4" />
                                    : <ChevronRight className="h-4 w-4" />}
                                </button>
                              ) : (
                                <span className="w-6" aria-hidden />
                              )}
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
                            </div>
                          </TableCell>

                          {/* Name + description */}
                          <TableCell className="pl-2">
                            <div className="flex items-center gap-1.5">
                              <span className="font-medium text-foreground">{product.name}</span>
                              {product.season && (
                                <span className="rounded-none border border-border px-1.5 py-px text-[10px] font-medium text-muted-foreground">
                                  {SEASON_LABELS[product.season]}
                                </span>
                              )}
                            </div>
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

                          {/* Stock total con badge de estado */}
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <StockBadge quantity={qty} />
                              {hasSizes && (
                                <span className="text-[10px] text-muted-foreground">
                                  {sizedEntries.length} talle{sizedEntries.length !== 1 ? "s" : ""}
                                </span>
                              )}
                            </div>
                          </TableCell>

                          {/* Sell + Edit + Delete */}
                          <TableCell className="pr-6 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1">
                              <SellButton product={product} stockQty={qty} />
                              <EditProductDialog product={product} />
                              <DeleteProductDialog product={product} />
                            </div>
                          </TableCell>
                        </TableRow>

                        {/* Fila expandida con detalle por talle */}
                        {hasSizes && isOpen && (
                          <TableRow className="bg-muted/20 hover:bg-muted/20">
                            <TableCell colSpan={6} className="pl-4 pr-6 py-3">
                              <div className="flex items-center gap-3 pl-[70px]">
                                <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                                  Detalle por talle
                                </span>
                                <div className="flex flex-wrap gap-1.5">
                                  <StockChips entries={entries} />
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
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
