"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { LAUNCH_PROMO_CODE } from "@/lib/constants";

// ─── Promo Strip (Announcement Bar) ───────────────────────────────────────────
// Barra fina entre el navbar y el contenido. En mobile el mensaje largo de
// desktop no entra sin engrosar la franja, así que alterna dos frases cortas
// con un fade automático cada 3 s. Toda la barra copia el código al click.

const MOBILE_MESSAGES = [
  "HASTA 30% OFF EN TU COMPRA",
  `CÓDIGO: ${LAUNCH_PROMO_CODE} (Tocá para copiar)`,
] as const;

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
      className="flex h-10 w-full cursor-pointer items-center justify-center bg-primary px-4 text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
    >
      {/* Desktop: mensaje completo en una línea */}
      <span className="hidden md:block text-sm font-medium tracking-wide">
        CELEBRAMOS NUESTRO LANZAMIENTO: HASTA 30% OFF EN TODA LA TIENDA | CÓDIGO: {LAUNCH_PROMO_CODE}
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
