"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Loader2, RefreshCw, Share2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  useSocialFormStore,
  selectSocialFormData,
} from "@/store/use-social-form-store";
import { generateMarkdown } from "@/components/admin/social/generate-markdown";
import { useSocialFormDraft, useSaveDraft, useDeleteDraft } from "@/hooks/use-social-form";
import {
  SecMeta,
  SecGeneral,
  SecStories,
  SecIGPosts,
  SecTikTok,
  SecAlternativo,
  SecEscucha,
  SecContexto,
} from "@/components/admin/social/sections";

// ─── Tabs ─────────────────────────────────────────────────────────────────────

type UrgencyDot = "critico" | "urgente" | "sabado" | null;

const TABS = [
  { id: 0, label: "Semana",      icon: "📋", urgent: null       as UrgencyDot },
  { id: 1, label: "General",     icon: "🔢", urgent: "sabado"   as UrgencyDot },
  { id: 2, label: "Stories",     icon: "📲", urgent: "critico"  as UrgencyDot },
  { id: 3, label: "Posts IG",    icon: "📸", urgent: "urgente"  as UrgencyDot },
  { id: 4, label: "TikTok",      icon: "🎵", urgent: "urgente"  as UrgencyDot },
  { id: 5, label: "Alternativo", icon: "🌐", urgent: null       as UrgencyDot },
  { id: 6, label: "Comunidad",   icon: "💬", urgent: null       as UrgencyDot },
  { id: 7, label: "Contexto",    icon: "🌡️", urgent: "sabado"   as UrgencyDot },
];

const URGENCY_DOT: Record<NonNullable<UrgencyDot>, string> = {
  critico: "bg-red-500",
  urgente: "bg-amber-400",
  sabado:  "bg-blue-400",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SocialPage() {
  const store       = useSocialFormStore();
  const lastUpdated = useSocialFormStore((s) => s.lastUpdated);

  const [tab, setTab]             = useState(0);
  const [showReset, setShowReset] = useState(false);

  // ── Server state ──────────────────────────────────────────────────────────
  const { data: draft, isLoading, isError } = useSocialFormDraft();
  const saveDraft   = useSaveDraft();
  const deleteDraft = useDeleteDraft();

  // ── Hydrate store on first load ───────────────────────────────────────────
  useEffect(() => {
    if (isLoading) return;
    if (draft?.data) {
      store.hydrateForm(draft.data);
    }
    store.setHasHydrated(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  // ── Debounced auto-save on every change ───────────────────────────────────
  // lastUpdated solo cambia cuando el usuario modifica algo (no en hydrateForm).
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!lastUpdated) return; // null = sin cambios del usuario todavía

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

    saveTimerRef.current = setTimeout(() => {
      const currentData = selectSocialFormData(useSocialFormStore.getState());
      saveDraft.mutate(currentData, {
        onError: () => toast.error("No se pudo guardar. Revisá la conexión."),
      });
    }, 1500);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  // saveDraft.mutate es estable entre renders (TanStack Query lo envuelve en useCallback).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastUpdated]);

  // ── Download ──────────────────────────────────────────────────────────────
  function handleDownload() {
    if (typeof window === "undefined") return;
    const data = selectSocialFormData(useSocialFormStore.getState());
    const md   = generateMarkdown(data);
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `DatosSemanales_semana${data.meta.semana || "XX"}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Archivo descargado");
  }

  // ── Reset ─────────────────────────────────────────────────────────────────
  function handleReset() {
    deleteDraft.mutate(undefined, {
      onSuccess: () => {
        store.resetForm();
        setShowReset(false);
        setTab(0);
        toast.success("Formulario reiniciado para la nueva semana");
      },
      onError: () => {
        toast.error("No se pudo reiniciar. Intentá de nuevo.");
      },
    });
  }

  // ── Status label ──────────────────────────────────────────────────────────
  const isSaving    = saveDraft.isPending;
  const lastSavedAt = draft?.updatedAt
    ? new Date(draft.updatedAt).toLocaleString("es-AR", {
        day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
      })
    : null;

  function statusLabel() {
    if (isLoading)  return "Cargando borrador...";
    if (isError)    return "Sin conexión con el servidor — los cambios no se guardan";
    if (isSaving)   return "Guardando...";
    if (lastSavedAt) return `Guardado el ${lastSavedAt}`;
    return "Completá a lo largo de la semana · Generá el archivo el sábado";
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-muted/20">

      {/* ── Sticky header + tabs ─────────────────────────────────────── */}
      <div className="sticky top-0 z-10 border-b border-border bg-card shadow-sm">

        <div className="flex items-center justify-between gap-4 px-4 py-3 lg:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Share2 className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h1 className="text-base font-bold text-foreground leading-none">
                Datos semanales RRSS
              </h1>
              <p className={cn("mt-0.5 text-xs", isError ? "text-destructive" : "text-muted-foreground")}>
                {statusLabel()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Save indicator */}
            {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowReset(true)}
              className="gap-1.5 text-xs text-destructive hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Reiniciar</span>
            </Button>

            <Button
              size="sm"
              onClick={handleDownload}
              className="gap-1.5 text-xs"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Descargar .md</span>
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex overflow-x-auto px-4 lg:px-6">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "relative flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors",
                tab === t.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
              )}
            >
              <span className="text-base leading-none">{t.icon}</span>
              <span>{t.label}</span>
              {t.urgent && (
                <span className={cn("h-2 w-2 rounded-full", URGENCY_DOT[t.urgent])} />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-3xl px-4 py-6 lg:px-6">
        {tab === 0 && <SecMeta data={store.meta}     set={store.setMeta} />}
        {tab === 1 && (
          <SecGeneral
            igG={store.igG}     setIg={store.setIgG}
            ttG={store.ttG}     setTt={store.setTtG}
            prevIg={store.prevIg} setPrevIg={store.setPrevIg}
            prevTt={store.prevTt} setPrevTt={store.setPrevTt}
          />
        )}
        {tab === 2 && <SecStories  stories={store.stories}   setStories={store.setStories} />}
        {tab === 3 && <SecIGPosts  posts={store.igPosts}     setPosts={store.setIgPosts} />}
        {tab === 4 && <SecTikTok   videos={store.ttVideos}   setVideos={store.setTtVideos} />}
        {tab === 5 && <SecAlternativo posts={store.altPosts} setPosts={store.setAltPosts} />}
        {tab === 6 && (
          <SecEscucha
            dms={store.dms}     setDms={store.setDms}
            igCom={store.igCom} setIgCom={store.setIgCom}
            ttCom={store.ttCom} setTtCom={store.setTtCom}
          />
        )}
        {tab === 7 && <SecContexto ctx={store.ctx} setCtx={store.setCtx} />}

        <div className="mt-6 flex flex-wrap gap-3 rounded-xl border border-border bg-card px-4 py-3 text-xs text-muted-foreground">
          <span>📲 Stories: <span className="font-semibold text-red-600">antes de 24 hs</span></span>
          <span>·</span>
          <span>📸🎵 Retención: <span className="font-semibold text-amber-600">dentro de 48 hs</span></span>
          <span>·</span>
          <span>🔢 General: <span className="font-semibold text-blue-600">el sábado</span></span>
        </div>
      </div>

      {/* ── Reset dialog ─────────────────────────────────────────────── */}
      <Dialog open={showReset} onOpenChange={setShowReset}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>¿Reiniciar formulario?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Borrará todos los datos de esta semana del servidor y del formulario. Hacelo solo después de haber descargado el archivo.
          </p>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowReset(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleReset}
              disabled={deleteDraft.isPending}
            >
              {deleteDraft.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Sí, reiniciar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
