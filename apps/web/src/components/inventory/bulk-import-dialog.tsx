"use client";

import { useCallback, useRef, useState } from "react";
import Papa from "papaparse";
import {
  CheckCircle2,
  FileSpreadsheet,
  Images,
  Loader2,
  Upload,
  X,
} from "lucide-react";
import type { ProductBulkInput } from "@kwinna/contracts";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { useBulkCreateProducts } from "@/hooks/use-products";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface StockEntry {
  size?:    string;
  quantity: number;
}

interface ParsedProduct {
  sku:          string;
  name:         string;
  description?: string;
  price:        number;
  tags:         string[];
  images:       string[];   // populated after Cloudinary upload
  stock:        StockEntry[];
  photos:       File[];     // matched local files
}

type Phase = "setup" | "uploading" | "importing" | "done" | "error";

// ─── CSV helpers ──────────────────────────────────────────────────────────────
// transformHeader normalises to uppercase so operators can use any case.

function parseCsv(file: File): Promise<ParsedProduct[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header:         true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toUpperCase(),
      complete({ data, errors }) {
        if (errors.length > 0 && data.length === 0) {
          reject(new Error(errors[0]?.message ?? "Error al parsear CSV"));
          return;
        }
        try {
          resolve(groupCsvRows(data));
        } catch (e) {
          reject(e);
        }
      },
      error: (err) => reject(new Error(err.message)),
    });
  });
}

/**
 * Argentine numbers can use `.` as thousands separator.
 * Strip everything except digits and the last comma/dot used as decimal.
 */
function parsePrice(raw: string): number {
  const clean = raw.replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  const n = parseFloat(clean);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Groups multiple CSV rows that share the same CODIGO into a single
 * ParsedProduct, accumulating each TALLE/CANTIDAD pair into stock[].
 * First row wins for descriptive fields (name, description, price, tags).
 */
function groupCsvRows(rows: Record<string, string>[]): ParsedProduct[] {
  const map = new Map<string, ParsedProduct>();

  for (const row of rows) {
    const sku  = (row["CODIGO"] ?? "").trim();
    const size = (row["TALLE"]  ?? "").trim() || undefined;
    const qty  = parseInt(row["CANTIDAD"] ?? "0", 10);

    if (!sku || !Number.isFinite(qty) || qty <= 0) continue;

    if (map.has(sku)) {
      map.get(sku)!.stock.push({ size, quantity: qty });
    } else {
      const tags = (row["TAGS"] ?? "")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      map.set(sku, {
        sku,
        name:        (row["NOMBRE"]      ?? sku).trim(),
        description: (row["DESCRIPCION"] ?? "").trim() || undefined,
        price:       parsePrice(row["PRECIO"] ?? "0"),
        tags,
        images:      [],
        stock:       [{ size, quantity: qty }],
        photos:      [],
      });
    }
  }

  return Array.from(map.values());
}

/**
 * Matches photo files to products: a photo is linked to a product when its
 * filename (without extension) contains the product SKU (case-insensitive).
 * Returns a new products array with `.photos` populated en ORDEN NATURAL
 * por nombre de archivo (PROD-1, PROD-2, PROD-10 — no alfabético puro).
 * Esto garantiza que la primera foto por numeración sea la Principal.
 */
function matchPhotos(
  products: ParsedProduct[],
  photos: File[],
): ParsedProduct[] {
  return products.map((p) => ({
    ...p,
    photos: photos
      .filter((f) =>
        f.name
          .replace(/\.[^.]+$/, "")          // remove extension
          .toLowerCase()
          .includes(p.sku.toLowerCase())
      )
      .sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" })
      ),
  }));
}

// ─── Component ────────────────────────────────────────────────────────────────

export function BulkImportDialog() {
  const [open, setOpen] = useState(false);

  const [phase,    setPhase]    = useState<Phase>("setup");
  const [products, setProducts] = useState<ParsedProduct[]>([]);
  const [photos,   setPhotos]   = useState<File[]>([]);
  const [csvName,  setCsvName]  = useState<string | null>(null);
  const [csvError, setCsvError] = useState<string | null>(null);

  // Per-photo upload progress: { [sku]: 0..100 }
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [doneCount,       setDoneCount]      = useState(0);
  const [result,          setResult]         = useState<{ created: number; skipped: number } | null>(null);
  const [importError,     setImportError]    = useState<string | null>(null);

  const [draggingCsv,    setDraggingCsv]    = useState(false);
  const [draggingPhotos, setDraggingPhotos] = useState(false);

  const csvInputRef    = useRef<HTMLInputElement>(null);
  const photoInputRef  = useRef<HTMLInputElement>(null);

  const { mutateAsync: bulkImport } = useBulkCreateProducts();

  // ── CSV loading ─────────────────────────────────────────────────────────────

  async function loadCsv(file: File) {
    setCsvError(null);
    setCsvName(file.name);
    try {
      const parsed = await parseCsv(file);
      if (parsed.length === 0) {
        setCsvError("El archivo no contiene filas válidas. Revisá columnas CODIGO, NOMBRE, PRECIO, TALLE, CANTIDAD.");
        setProducts([]);
        return;
      }
      setProducts(matchPhotos(parsed, photos));
    } catch (e) {
      setCsvError(e instanceof Error ? e.message : "Error al leer el archivo");
      setProducts([]);
    }
  }

  // ── Photo loading ────────────────────────────────────────────────────────────

  function loadPhotos(files: FileList | File[]) {
    const arr = Array.from(files).filter((f) => f.type.startsWith("image/"));
    const next = [...photos, ...arr];
    setPhotos(next);
    setProducts((prev) => matchPhotos(prev, next));
  }

  // ── Drag handlers ────────────────────────────────────────────────────────────

  const onCsvDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setDraggingCsv(false);
    const file = Array.from(e.dataTransfer.files).find(
      (f) => f.name.endsWith(".csv") || f.name.endsWith(".xlsx") || f.name.endsWith(".xls")
    );
    if (file) await loadCsv(file);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photos]);

  const onPhotosDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDraggingPhotos(false);
    loadPhotos(e.dataTransfer.files);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photos, products]);

  // ── Import ───────────────────────────────────────────────────────────────────

  async function handleImport() {
    if (products.length === 0) return;

    setPhase("uploading");
    setUploadProgress({});
    setDoneCount(0);

    // Upload photos preserving order-per-product.
    // Promise.all sobre el array de un producto preserva el orden original,
    // y paralelizamos entre productos distintos para no serializar todo.
    const urlsBySku: Record<string, string[]> = {};

    await Promise.all(
      products.map(async (product) => {
        if (product.photos.length === 0) return;

        // Dentro de cada producto: uploads paralelos, pero Promise.all mantiene
        // la correspondencia por índice — la primera foto del array queda en [0].
        const results = await Promise.all(
          product.photos.map(async (file) => {
            try {
              const result = await uploadToCloudinary(file, (pct) => {
                setUploadProgress((prev) => ({ ...prev, [product.sku]: pct }));
              });
              return result.secure_url;
            } catch {
              return null; // foto falló — se descarta, no rompe el resto
            } finally {
              setDoneCount((n) => n + 1);
            }
          })
        );

        urlsBySku[product.sku] = results.filter((u): u is string => u !== null);
      })
    );

    // Assign uploaded URLs to products
    const withUrls = products.map((p) => ({
      ...p,
      images: urlsBySku[p.sku] ?? [],
    }));

    // Build the bulk payload
    const payload: ProductBulkInput = {
      items: withUrls.map((p) => ({
        product: {
          name:        p.name,
          description: p.description,
          sku:         p.sku,
          price:       p.price,
          images:      p.images,
          tags:        p.tags,
        },
        stock: p.stock,
      })),
    };

    setPhase("importing");

    try {
      const res = await bulkImport(payload);
      setResult({ created: res.data.created, skipped: res.data.skipped });
      setPhase("done");
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Error al importar");
      setPhase("error");
    }
  }

  // ── Reset on close ───────────────────────────────────────────────────────────

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setPhase("setup");
      setProducts([]);
      setPhotos([]);
      setCsvName(null);
      setCsvError(null);
      setUploadProgress({});
      setDoneCount(0);
      setResult(null);
      setImportError(null);
    }
  }

  // ── Derived values ───────────────────────────────────────────────────────────

  const totalUploads   = products.reduce((s, p) => s + p.photos.length, 0);
  const matchedCount   = products.filter((p) => p.photos.length > 0).length;

  // Archivos únicos que matchearon al menos un SKU (un archivo puede matchear múltiples).
  const matchedFiles = new Set<File>();
  products.forEach((p) => p.photos.forEach((f) => matchedFiles.add(f)));
  const unmatchedCount = Math.max(0, photos.length - matchedFiles.size);

  const canImport      = phase === "setup" && products.length > 0;

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <FileSpreadsheet className="h-4 w-4" />
          Importar Excel
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[680px]">
        <DialogHeader>
          <DialogTitle>Importación masiva de productos</DialogTitle>
          <DialogDescription>
            Cargá tu planilla CSV y las fotos de los productos. El sistema los empareja por código.
          </DialogDescription>
        </DialogHeader>

        {/* ── Setup phase ── */}
        {(phase === "setup") && (
          <div className="space-y-5 py-2">

            {/* ── Two drop zones ── */}
            <div className="grid gap-4 sm:grid-cols-2">

              {/* Zone 1 — CSV */}
              <div className="space-y-2">
                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  1 · Planilla CSV
                </p>
                <div
                  onDragOver={(e) => { e.preventDefault(); setDraggingCsv(true); }}
                  onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDraggingCsv(false); }}
                  onDrop={onCsvDrop}
                  onClick={() => csvInputRef.current?.click()}
                  className={cn(
                    "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-7 text-center transition-colors duration-150",
                    draggingCsv
                      ? "border-primary bg-primary/5 text-primary"
                      : csvName
                      ? "border-emerald-500/50 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400"
                      : "border-border/60 bg-muted/20 text-muted-foreground hover:border-primary/40 hover:bg-primary/5"
                  )}
                >
                  <FileSpreadsheet className="h-7 w-7 opacity-70" />
                  {csvName ? (
                    <div className="space-y-0.5">
                      <p className="text-sm font-semibold">{csvName}</p>
                      <p className="text-xs opacity-70">{products.length} producto{products.length !== 1 ? "s" : ""} detectado{products.length !== 1 ? "s" : ""}</p>
                    </div>
                  ) : (
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">Arrastrá o hacé clic</p>
                      <p className="text-xs opacity-60">Columnas: CODIGO · NOMBRE · PRECIO · TALLE · CANTIDAD</p>
                    </div>
                  )}
                </div>
                {csvError && (
                  <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
                    {csvError}
                  </p>
                )}
              </div>

              {/* Zone 2 — Photos */}
              <div className="space-y-2">
                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  2 · Fotos (opcional)
                </p>
                <div
                  onDragOver={(e) => { e.preventDefault(); setDraggingPhotos(true); }}
                  onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDraggingPhotos(false); }}
                  onDrop={onPhotosDrop}
                  onClick={() => photoInputRef.current?.click()}
                  className={cn(
                    "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-7 text-center transition-colors duration-150",
                    draggingPhotos
                      ? "border-primary bg-primary/5 text-primary"
                      : photos.length > 0
                      ? "border-emerald-500/50 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400"
                      : "border-border/60 bg-muted/20 text-muted-foreground hover:border-primary/40 hover:bg-primary/5"
                  )}
                >
                  <Images className="h-7 w-7 opacity-70" />
                  {photos.length > 0 ? (
                    <div className="space-y-0.5">
                      <p className="text-sm font-semibold">{photos.length} foto{photos.length !== 1 ? "s" : ""} cargada{photos.length !== 1 ? "s" : ""}</p>
                      <p className="text-xs opacity-70">
                        {matchedCount} emparejada{matchedCount !== 1 ? "s" : ""} · {unmatchedCount} sin coincidencia
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">Arrastrá todas las fotos juntas</p>
                      <p className="text-xs opacity-60">
                        El nombre del archivo debe contener el CODIGO del producto
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── Format hint ── */}
            <FormatHint />

            {/* ── Preview table ── */}
            {products.length > 0 && (
              <PreviewTable products={products} />
            )}

            {/* ── Footer actions ── */}
            <div className="flex items-center justify-between gap-3 border-t pt-4">
              <p className="text-xs text-muted-foreground">
                {products.length > 0
                  ? `${products.length} productos · ${totalUploads} fotos emparejadas`
                  : "Cargá una planilla para continuar"}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => handleOpenChange(false)}>
                  Cancelar
                </Button>
                <Button
                  disabled={!canImport}
                  onClick={handleImport}
                  className="gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Importar {products.length > 0 ? `(${products.length})` : ""}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ── Upload progress phase ── */}
        {phase === "uploading" && (
          <ProgressScreen
            label="Subiendo fotos a Cloudinary…"
            done={doneCount}
            total={totalUploads}
            detail={`${doneCount} / ${totalUploads} fotos`}
          />
        )}

        {/* ── Importing phase ── */}
        {phase === "importing" && (
          <ProgressScreen
            label="Guardando productos en la base de datos…"
            done={1}
            total={1}
            indeterminate
          />
        )}

        {/* ── Done ── */}
        {phase === "done" && result && (
          <div className="flex flex-col items-center gap-5 py-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10">
              <CheckCircle2 className="h-7 w-7 text-emerald-500" />
            </div>
            <div className="space-y-1">
              <p className="text-lg font-bold">¡Importación completada!</p>
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{result.created}</span> producto{result.created !== 1 ? "s" : ""} creado{result.created !== 1 ? "s" : ""}{" "}
                {result.skipped > 0 && (
                  <>· <span className="font-semibold text-foreground">{result.skipped}</span> omitido{result.skipped !== 1 ? "s" : ""} (SKU ya existía)</>
                )}
              </p>
            </div>
            <Button onClick={() => handleOpenChange(false)} className="px-8">
              Cerrar
            </Button>
          </div>
        )}

        {/* ── Error ── */}
        {phase === "error" && importError && (
          <div className="flex flex-col items-center gap-5 py-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
              <X className="h-7 w-7 text-destructive" />
            </div>
            <div className="space-y-1">
              <p className="text-lg font-bold">Error al importar</p>
              <p className="max-w-sm text-sm text-muted-foreground">{importError}</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setPhase("setup")}>
                Volver
              </Button>
              <Button onClick={handleImport}>Reintentar</Button>
            </div>
          </div>
        )}

        {/* Hidden inputs */}
        <input
          ref={csvInputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          className="sr-only"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (f) await loadCsv(f);
            e.target.value = "";
          }}
        />
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={(e) => {
            if (e.target.files) loadPhotos(e.target.files);
            e.target.value = "";
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FormatHint() {
  return (
    <details className="rounded-lg border border-border/40 bg-muted/20 text-xs">
      <summary className="cursor-pointer select-none px-3 py-2 font-medium text-muted-foreground hover:text-foreground">
        Formato esperado de la planilla CSV
      </summary>
      <div className="overflow-x-auto px-3 pb-3 pt-1">
        <table className="w-full border-collapse font-mono text-[11px]">
          <thead>
            <tr className="border-b border-border/40">
              {["CODIGO","NOMBRE","DESCRIPCION","PRECIO","TALLE","CANTIDAD","TAGS"].map((h) => (
                <th key={h} className="px-2 py-1 text-left font-semibold text-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="text-muted-foreground">
            <tr><td className="px-2 py-1">VES-001</td><td className="px-2 py-1">Vestido Midi</td><td className="px-2 py-1">Lino natural</td><td className="px-2 py-1">85000</td><td className="px-2 py-1">S</td><td className="px-2 py-1">5</td><td className="px-2 py-1">verano,casual</td></tr>
            <tr><td className="px-2 py-1">VES-001</td><td className="px-2 py-1">Vestido Midi</td><td className="px-2 py-1">Lino natural</td><td className="px-2 py-1">85000</td><td className="px-2 py-1">M</td><td className="px-2 py-1">8</td><td className="px-2 py-1">verano,casual</td></tr>
            <tr><td className="px-2 py-1">VES-001</td><td className="px-2 py-1">Vestido Midi</td><td className="px-2 py-1">Lino natural</td><td className="px-2 py-1">85000</td><td className="px-2 py-1">L</td><td className="px-2 py-1">3</td><td className="px-2 py-1">verano,casual</td></tr>
          </tbody>
        </table>
        <p className="mt-2 text-muted-foreground">
          Repetí el mismo CODIGO con distintos TALLE para productos con variantes de talle.
          Las fotos deben llamarse <span className="font-semibold text-foreground">VES-001.jpg</span> (el nombre debe contener el CODIGO).
        </p>
      </div>
    </details>
  );
}

function PreviewTable({ products }: { products: ParsedProduct[] }) {
  return (
    <div className="rounded-xl border border-border/40 bg-card">
      <div className="border-b border-border/40 px-4 py-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Vista previa — {products.length} producto{products.length !== 1 ? "s" : ""}
        </p>
      </div>
      <div className="max-h-52 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-card">
            <tr className="border-b border-border/40 text-xs text-muted-foreground">
              <th className="px-4 py-2 text-left font-medium">Código</th>
              <th className="px-4 py-2 text-left font-medium">Nombre</th>
              <th className="px-4 py-2 text-right font-medium">Precio</th>
              <th className="px-4 py-2 text-center font-medium">Talles</th>
              <th className="px-4 py-2 text-center font-medium">Fotos</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.sku} className="border-b border-border/20 last:border-0 hover:bg-muted/30">
                <td className="px-4 py-2">
                  <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{p.sku}</code>
                </td>
                <td className="max-w-[180px] truncate px-4 py-2 font-medium">{p.name}</td>
                <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">
                  ${p.price.toLocaleString("es-AR")}
                </td>
                <td className="px-4 py-2 text-center">
                  <SizeChips stock={p.stock} />
                </td>
                <td className="px-4 py-2 text-center">
                  {p.photos.length > 0 ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                      ✓ {p.photos.length}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground/60">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SizeChips({ stock }: { stock: StockEntry[] }) {
  return (
    <div className="flex flex-wrap justify-center gap-0.5">
      {stock.map((s, i) => (
        <span
          key={i}
          className="rounded bg-muted px-1.5 py-0.5 text-[10px] tabular-nums text-muted-foreground"
        >
          {s.size ?? "—"}:{s.quantity}
        </span>
      ))}
    </div>
  );
}

function ProgressScreen({
  label,
  done,
  total,
  detail,
  indeterminate = false,
}: {
  label:          string;
  done:           number;
  total:          number;
  detail?:        string;
  indeterminate?: boolean;
}) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className="flex flex-col items-center gap-6 py-10">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <div className="w-full max-w-xs space-y-2 text-center">
        <p className="text-sm font-medium">{label}</p>
        {!indeterminate && (
          <>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>
            {detail && (
              <p className="text-xs tabular-nums text-muted-foreground">{detail}</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

