"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { motion, type Variants } from "framer-motion";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";

// ─── Campaña de lanzamiento ───────────────────────────────────────────────────
// Transferencia: 20% base + 10% código = 30% total · Tarjeta (MP): 10% con código.

const PROMO_CODE = "SOYKWINNA";

// ─── Variants (físicas exactas según prompts/51) ──────────────────────────────

// 1. Imagen de fondo con sutil efecto Ken Burns (Parallax-like Reveal)
const imageVariants: Variants = {
  hidden: { scale: 1.05, opacity: 0 },
  show: {
    scale: 1,
    opacity: 1,
    transition: { duration: 1.5, ease: [0.16, 1, 0.3, 1] },
  },
};

// 2. Contenedor de Textos (Stagger rápido y elegante)
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

// 3. Físicas de resorte para los textos (Butter-smooth spring)
const itemVariants: Variants = {
  hidden: { opacity: 0, y: 30, filter: "blur(8px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { type: "spring", damping: 25, stiffness: 100, mass: 0.5 },
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

export function LaunchHero() {
  const [copied, setCopied] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function handleCopyCode() {
    try {
      await navigator.clipboard.writeText(PROMO_CODE);
      setCopied(true);
      toast.success("Código copiado", {
        description: `Pegá ${PROMO_CODE} al finalizar tu compra`,
      });
      if (resetTimer.current) clearTimeout(resetTimer.current);
      resetTimer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("No se pudo copiar el código", {
        description: `Escribí ${PROMO_CODE} manualmente en el checkout`,
      });
    }
  }

  return (
    <section
      aria-label="Promoción de lanzamiento"
      className="mx-auto w-full max-w-7xl px-4 pt-4 md:px-6"
    >
      <div className="relative w-full overflow-hidden rounded-[1rem] min-h-[60vh] md:min-h-[70vh] flex items-center shadow-sm">

        {/* Imagen de fondo — Ken Burns sutil */}
        <motion.div
          variants={imageVariants}
          initial="hidden"
          animate="show"
          className="absolute inset-0"
        >
          <Image
            priority
            src="/images/hero-desktop.png"
            alt=""
            fill
            className="hidden md:block object-cover object-center"
          />
          <Image
            priority
            src="/images/hero-mobile.jpeg"
            alt=""
            fill
            className="block md:hidden object-cover object-top"
          />
        </motion.div>

        {/* Gradiente overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/50 to-transparent z-10" />

        {/* Contenido */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="relative z-20 container mx-auto px-4 md:px-8 max-w-3xl ml-0 md:ml-12 py-16 space-y-5"
        >
          <motion.p
            variants={itemVariants}
            className="text-xs font-medium tracking-[0.25em] uppercase text-foreground/80"
          >
            Celebramos nuestro lanzamiento
          </motion.p>

          <motion.h1
            variants={itemVariants}
            className="text-4xl md:text-6xl font-bold uppercase leading-tight tracking-tight text-foreground"
          >
            Hasta{" "}
            {/* Highlight Tertiary del design system: garantiza contraste del
                text-primary (#70005E) sobre el overlay oscuro del hero */}
            <span className="text-primary bg-tertiary px-2 md:px-3 rounded-[0.5rem] whitespace-nowrap">
              30% OFF
            </span>{" "}
            en toda la tienda
          </motion.h1>

          <motion.p
            variants={itemVariants}
            className="max-w-md text-sm md:text-base font-light leading-relaxed text-foreground/90"
          >
            Solo por 7 días. Aplicá el código promocional al finalizar tu compra.
          </motion.p>

          <motion.button
            variants={itemVariants}
            whileHover={{ scale: 1.02, filter: "brightness(1.1)" }}
            whileTap={{ scale: 0.98 }}
            onClick={handleCopyCode}
            aria-label={`Copiar código ${PROMO_CODE}`}
            className="flex items-center gap-2.5 rounded-[1rem] bg-primary px-4 py-2 font-medium text-primary-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="font-mono text-sm tracking-[0.2em]">{PROMO_CODE}</span>
            {copied ? (
              <Check className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Copy className="h-4 w-4" aria-hidden="true" />
            )}
          </motion.button>

          <motion.p
            variants={itemVariants}
            className="max-w-sm text-[11px] leading-relaxed text-muted-foreground"
          >
            *Aplica 10% extra con el código: 30% total pagando por transferencia
            (20% base + 10%) o 10% total con tarjeta vía Mercado Pago.
          </motion.p>
        </motion.div>
      </div>
    </section>
  );
}
