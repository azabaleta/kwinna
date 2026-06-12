"use client";

import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { LAUNCH_PROMO_CODE } from "@/lib/constants";

// ─── Promo Strip (Announcement Bar) ───────────────────────────────────────────
// Barra fina entre el navbar y el contenido. En mobile el mensaje largo de
// desktop no entra sin engrosar la franja, así que alterna dos frases cortas
// con un fade automático cada 3 s. Toda la barra copia el código al click.

// Promesas clave en Tertiary (beige) + bold; glow al hover de toda la barra.
function Highlight({ children }: { children: ReactNode }) {
  return (
    <span className="font-bold text-tertiary transition-all duration-300 group-hover:drop-shadow-[0_0_8px_rgba(229,218,206,0.6)]">
      {children}
    </span>
  );
}

const MOBILE_MESSAGES: readonly ReactNode[] = [
  <><Highlight>HASTA 30% OFF</Highlight> EN TU COMPRA</>,
  <>CÓDIGO: <Highlight>{LAUNCH_PROMO_CODE}</Highlight> (Tocá para copiar)</>,
];

const ROTATE_MS = 3000;

export function PromoStrip() {
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(
      () => setMsgIndex((i) => (i + 1) % MOBILE_MESSAGES.length),
      ROTATE_MS,
    );
    return () => clearInterval(id);
  }, []);

  async function handleCopyCode() {
    try {
      await navigator.clipboard.writeText(LAUNCH_PROMO_CODE);
      toast.success(`Código ${LAUNCH_PROMO_CODE} copiado al portapapeles`);
    } catch {
      toast.error("No se pudo copiar el código", {
        description: `Escribí ${LAUNCH_PROMO_CODE} al finalizar tu compra`,
      });
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopyCode}
      aria-label={`Copiar código ${LAUNCH_PROMO_CODE}`}
      className="group relative flex h-10 w-full cursor-pointer items-center justify-center overflow-hidden bg-primary px-4 text-primary-foreground/90 shadow-[inset_0_1px_3px_rgba(0,0,0,0.3),0_1px_2px_rgba(0,0,0,0.25)] transition-all duration-300 hover:bg-primary/90 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
    >
      {/* Shimmer: luz sesgada que recorre la barra cíclicamente */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 w-1/2 animate-shimmer bg-gradient-to-r from-transparent via-white/20 to-transparent"
      />

      {/* Desktop: mensaje completo en una línea */}
      <span className="hidden md:flex items-center text-sm font-medium tracking-wide">
        CELEBRAMOS NUESTRO LANZAMIENTO
        <span className="mx-3 opacity-40">/</span>
        <span>
          <Highlight>HASTA 30% OFF</Highlight> EN TODA LA TIENDA
        </span>
        <span className="mx-3 opacity-40">/</span>
        <span>
          CÓDIGO: <Highlight>{LAUNCH_PROMO_CODE}</Highlight>
        </span>
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
            {MOBILE_MESSAGES[msgIndex]}
          </motion.span>
        </AnimatePresence>
      </span>
    </button>
  );
}
