"use client";

import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { usePromoStrip } from "@/hooks/use-promo-strip";

// ─── Promo Strip (Announcement Bar) ───────────────────────────────────────────
// Barra fina entre el navbar y el contenido. Puramente publicitaria: su
// contenido y visibilidad se administran desde /admin/promotions. El código que
// promociona sale de la tabla de promo codes (única fuente). Al hacer click, si
// la copia está habilitada, copia al portapapeles un texto configurable.

// Promesas clave en Tertiary (beige) + bold; glow al hover de toda la barra.
function Highlight({ children }: { children: ReactNode }) {
  return (
    <span className="font-bold text-tertiary transition-all duration-300 group-hover:drop-shadow-[0_0_8px_rgba(229,218,206,0.6)]">
      {children}
    </span>
  );
}

const ROTATE_MS = 3000;

export function PromoStrip() {
  const { data: strip } = usePromoStrip();
  const [msgIndex, setMsgIndex] = useState(0);

  const enabled     = strip?.enabled ?? false;
  const message     = strip?.message ?? "";
  const code        = strip?.code ?? "";
  const copyText    = strip?.copyText ?? "";
  const canCopy     = (strip?.copyEnabled ?? false) && copyText.length > 0;

  // Mobile: alterna mensaje / código. Si no hay código, solo el mensaje.
  const mobileMessages: readonly ReactNode[] = code
    ? [
        <>{message}</>,
        <>CÓDIGO: <Highlight>{code}</Highlight>{canCopy ? " (Tocá para copiar)" : ""}</>,
      ]
    : [<>{message}</>];
  const msgCount = mobileMessages.length;

  useEffect(() => {
    if (!enabled || msgCount < 2) return;
    const id = setInterval(() => setMsgIndex((i) => (i + 1) % msgCount), ROTATE_MS);
    return () => clearInterval(id);
  }, [enabled, msgCount]);

  if (!enabled || (!message && !code)) return null;

  async function handleClick() {
    if (!canCopy) return;
    try {
      await navigator.clipboard.writeText(copyText);
      toast.success(`Código ${copyText} copiado al portapapeles`);
    } catch {
      toast.error("No se pudo copiar el código", {
        description: `Escribí ${copyText} al finalizar tu compra`,
      });
    }
  }

  const interactive = canCopy;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={!interactive}
      aria-label={interactive ? `Copiar código ${copyText}` : message}
      className={`group relative flex h-10 w-full items-center justify-center overflow-hidden bg-primary px-4 text-primary-foreground/90 shadow-[inset_0_1px_3px_rgba(0,0,0,0.3),0_1px_2px_rgba(0,0,0,0.25)] transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset ${
        interactive ? "cursor-pointer hover:bg-primary/90 active:scale-[0.98]" : "cursor-default"
      }`}
    >
      {/* Shimmer: luz sesgada que recorre la barra cíclicamente */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 w-1/2 animate-shimmer bg-gradient-to-r from-transparent via-white/20 to-transparent"
      />

      {/* Desktop: mensaje completo en una línea */}
      <span className="hidden md:flex items-center text-sm font-medium tracking-wide">
        {message}
        {code && (
          <>
            <span className="mx-3 opacity-40">/</span>
            <span>
              CÓDIGO: <Highlight>{code}</Highlight>
            </span>
          </>
        )}
      </span>

      {/* Mobile: carrusel automático fade-in/out para mantener la franja fina */}
      <span className="md:hidden">
        <AnimatePresence mode="wait">
          <motion.span
            key={msgIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="block text-[11px] font-medium tracking-wide whitespace-nowrap"
          >
            {mobileMessages[msgIndex] ?? mobileMessages[0]}
          </motion.span>
        </AnimatePresence>
      </span>
    </button>
  );
}
