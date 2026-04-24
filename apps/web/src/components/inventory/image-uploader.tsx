"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, RotateCcw, Trash2, UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils";
import { uploadToCloudinary } from "@/lib/cloudinary";

// ─── Types ────────────────────────────────────────────────────────────────────

type UploadStatus = "uploading" | "done" | "error";

interface UploadEntry {
  id:       string;
  seq:      number;        // orden de encolado — determina la posición final
  file:     File;
  preview:  string;        // object URL para preview local (liberado al remover)
  status:   UploadStatus;
  progress: number;        // 0–100
  url?:     string;        // Cloudinary secure_url cuando done
  error?:   string;
}

export interface ImageUploaderProps {
  /** Already-committed Cloudinary URLs (controlled from RHF). */
  value: string[];
  /** Called whenever the committed URL list changes. */
  onChange: (urls: string[]) => void;
  /** Notifies parent while any file is in-flight. */
  onUploadingChange?: (uploading: boolean) => void;
  maxFiles?: number;
}

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_FILE_SIZE  = 10 * 1024 * 1024; // 10 MB

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid() {
  return Math.random().toString(36).slice(2);
}

function validateFile(file: File): string | null {
  if (!ACCEPTED_TYPES.includes(file.type)) return "Formato no soportado (JPG, PNG, WebP)";
  if (file.size > MAX_FILE_SIZE)           return "El archivo supera los 10 MB";
  return null;
}

// Orden natural por nombre de archivo: PROD-1, PROD-2, PROD-10 (no alfabético puro)
function naturalFilenameCompare(a: File, b: File): number {
  return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" });
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ImageUploader({
  value,
  onChange,
  onUploadingChange,
  maxFiles = 8,
}: ImageUploaderProps) {
  const [uploads, setUploads]   = useState<UploadEntry[]>([]);
  const [dragging, setDragging] = useState(false);
  const inputRef                = useRef<HTMLInputElement>(null);

  // Counter monotónico para el orden de encolado.
  const seqRef = useRef(0);

  // Ref al valor del parent — siempre fresco. Evita closure stale al llamar onChange
  // desde callbacks async (la causa de "solo sube una foto" al seleccionar varias).
  const valueRef = useRef(value);
  valueRef.current = value;

  // URLs ya sincronizadas al parent — evita duplicados cuando el efecto re-corre.
  const syncedUrlsRef = useRef<Set<string>>(new Set());

  // ── Sincronizar uploading state al padre ────────────────────────────────────
  useEffect(() => {
    onUploadingChange?.(uploads.some((e) => e.status === "uploading"));
  }, [uploads, onUploadingChange]);

  // ── Sincronizar URLs "done" al parent en ORDEN DE ENCOLADO ──────────────────
  // Un único punto de sync evita los race conditions de múltiples onChange paralelos.
  // React batchea los setUploads de las uploads concurrentes, el efecto corre una
  // vez por commit y flushea todas las URLs nuevas ordenadas por seq.
  useEffect(() => {
    const pending = uploads
      .filter((e) => e.status === "done" && e.url && !syncedUrlsRef.current.has(e.url))
      .sort((a, b) => a.seq - b.seq);

    if (pending.length === 0) return;

    const newUrls = pending.map((e) => e.url!);
    newUrls.forEach((url) => syncedUrlsRef.current.add(url));

    const nextValue = [...valueRef.current, ...newUrls];
    valueRef.current = nextValue;
    onChange(nextValue);
  }, [uploads, onChange]);

  // ── Internal helpers ────────────────────────────────────────────────────────

  function updateEntry(id: string, patch: Partial<UploadEntry>) {
    setUploads((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...patch } : e))
    );
  }

  function removeEntry(id: string) {
    setUploads((prev) => {
      const entry = prev.find((e) => e.id === id);
      if (entry) URL.revokeObjectURL(entry.preview); // liberar memoria
      return prev.filter((e) => e.id !== id);
    });
  }

  async function startUpload(entry: UploadEntry) {
    try {
      const result = await uploadToCloudinary(entry.file, (pct) => {
        updateEntry(entry.id, { progress: pct });
      });
      // Solo actualizamos el entry — el useEffect se encarga de sincronizar al parent
      updateEntry(entry.id, { status: "done", progress: 100, url: result.secure_url });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      updateEntry(entry.id, { status: "error", error: msg });
    }
  }

  async function retryUpload(id: string) {
    const entry = uploads.find((e) => e.id === id);
    if (!entry) return;
    updateEntry(id, { status: "uploading", progress: 0, error: undefined });
    await startUpload(entry);
  }

  function enqueue(files: FileList | File[]) {
    const remaining = maxFiles
      - valueRef.current.length
      - uploads.filter((e) => e.status !== "error").length;

    // Sort por nombre de archivo (orden natural). El orden del FileList depende
    // del navegador/OS — normalizamos acá para que `-1-` vaya antes que `-2-`.
    const sorted = Array.from(files).sort(naturalFilenameCompare);
    const toProcess = sorted.slice(0, Math.max(0, remaining));

    const newEntries: UploadEntry[] = toProcess.map((file) => {
      const validationError = validateFile(file);
      return {
        id:       uid(),
        seq:      seqRef.current++,
        file,
        preview:  URL.createObjectURL(file),
        status:   validationError ? "error" : "uploading",
        progress: 0,
        error:    validationError ?? undefined,
      };
    });

    setUploads((prev) => [...prev, ...newEntries]);

    // Arrancar uploads solo para los que pasaron validación
    for (const entry of newEntries) {
      if (!entry.error) startUpload(entry);
    }
  }

  // ── Committed URL removal ────────────────────────────────────────────────────

  function removeCommitted(url: string) {
    syncedUrlsRef.current.delete(url); // permite re-subir el mismo archivo si hace falta
    const nextValue = valueRef.current.filter((u) => u !== url);
    valueRef.current = nextValue;
    onChange(nextValue);
  }

  // ── Cleanup: liberar object URLs al desmontar el componente ─────────────────
  useEffect(() => {
    return () => {
      uploads.forEach((e) => URL.revokeObjectURL(e.preview));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // solo al unmount final

  // ── Drag handlers ────────────────────────────────────────────────────────────

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length) enqueue(e.dataTransfer.files);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) enqueue(e.target.files);
    // reset para que el mismo archivo pueda re-seleccionarse
    e.target.value = "";
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Render ───────────────────────────────────────────────────────────────────

  const totalCommitted = value.length;
  const activeUploads  = uploads.filter((e) => e.status !== "done");
  const hasAny         = totalCommitted > 0 || activeUploads.length > 0;
  const canAddMore     = totalCommitted + uploads.filter((e) => e.status === "uploading").length < maxFiles;

  return (
    <div className="space-y-3">
      {/* ── Thumbnail grid ── */}
      {hasAny && (
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
          {/* Committed URLs */}
          {value.map((url, idx) => (
            <CommittedThumb
              key={url}
              url={url}
              label={idx === 0 ? "Principal" : idx === 1 ? "Hover" : undefined}
              onRemove={() => removeCommitted(url)}
            />
          ))}

          {/* In-flight / errored uploads (ordenados por seq para preview consistente) */}
          {activeUploads
            .slice()
            .sort((a, b) => a.seq - b.seq)
            .map((entry) => (
              <UploadThumb
                key={entry.id}
                entry={entry}
                onRemove={() => removeEntry(entry.id)}
                onRetry={() => retryUpload(entry.id)}
              />
            ))}

          {/* "Add more" tile */}
          {canAddMore && (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex aspect-square items-center justify-center rounded-xl border-2 border-dashed border-border/60 bg-muted/30 text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
              aria-label="Agregar más imágenes"
            >
              <ImagePlus className="h-5 w-5" />
            </button>
          )}
        </div>
      )}

      {/* ── Drop zone (shown when empty) ── */}
      {!hasAny && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors duration-150",
            dragging
              ? "border-primary bg-primary/5 text-primary"
              : "border-border/60 bg-muted/20 text-muted-foreground hover:border-primary/40 hover:bg-primary/5 hover:text-primary/80"
          )}
        >
          <UploadCloud className="h-8 w-8 opacity-60" />
          <div className="space-y-0.5">
            <p className="text-sm font-medium">
              {dragging ? "Soltá para subir" : "Arrastrá o hacé clic para subir fotos"}
            </p>
            <p className="text-xs opacity-60">JPG, PNG, WebP · máx. 10 MB por imagen</p>
          </div>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
        multiple
        className="sr-only"
        onChange={handleInputChange}
        tabIndex={-1}
        aria-hidden
      />
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function CommittedThumb({
  url,
  label,
  onRemove,
}: {
  url:      string;
  label?:   string;
  onRemove: () => void;
}) {
  return (
    <div className="group relative aspect-square overflow-hidden rounded-xl border border-border/40 bg-muted">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="" className="h-full w-full object-cover" loading="lazy" />

      {label && (
        <span className={cn(
          "absolute bottom-1 left-1 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide leading-none",
          label === "Principal"
            ? "bg-primary text-primary-foreground"
            : "bg-black/60 text-white",
        )}>
          {label}
        </span>
      )}

      <button
        type="button"
        onClick={onRemove}
        className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
        aria-label="Eliminar imagen"
      >
        <Trash2 className="h-3 w-3" />
      </button>
    </div>
  );
}

function UploadThumb({
  entry,
  onRemove,
  onRetry,
}: {
  entry: UploadEntry;
  onRemove: () => void;
  onRetry: () => void;
}) {
  const isUploading = entry.status === "uploading";
  const isError     = entry.status === "error";

  return (
    <div
      className={cn(
        "relative aspect-square overflow-hidden rounded-xl border bg-muted",
        isError ? "border-destructive/60" : "border-border/40"
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={entry.preview}
        alt=""
        className={cn(
          "h-full w-full object-cover transition-opacity",
          isUploading ? "opacity-50" : isError ? "opacity-30" : ""
        )}
      />

      {isUploading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/20">
          <Loader2 className="h-4 w-4 animate-spin text-white" />
          <span className="text-[10px] font-semibold tabular-nums text-white">
            {entry.progress}%
          </span>
          <div className="absolute bottom-0 left-0 h-1 w-full bg-black/30">
            <div
              className="h-full bg-primary transition-all duration-150"
              style={{ width: `${entry.progress}%` }}
            />
          </div>
        </div>
      )}

      {isError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-destructive/10 p-1">
          <p className="line-clamp-2 text-center text-[9px] font-medium leading-tight text-destructive">
            {entry.error ?? "Error"}
          </p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-0.5 flex items-center gap-0.5 rounded bg-destructive px-1.5 py-0.5 text-[9px] font-semibold text-white"
          >
            <RotateCcw className="h-2.5 w-2.5" />
            Reintentar
          </button>
        </div>
      )}

      {!isUploading && (
        <button
          type="button"
          onClick={onRemove}
          className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity hover:opacity-100 focus:opacity-100 group-hover:opacity-100"
          aria-label="Eliminar"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
