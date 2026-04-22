import { Suspense } from "react";
import type { Metadata } from "next";
import { ShopClientView } from "@/components/shop/shop-client-view";
import { fetchProductsSSR } from "@/lib/server-products";

// ─── Metadata estática ────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title:       "Tienda Kwinna | Colección 2025",
  description:
    "Descubrí piezas únicas diseñadas para la mujer que define su propio estilo. Vestidos, tops, pantalones y accesorios — nueva temporada disponible.",
  openGraph: {
    type:        "website",
    siteName:    "Kwinna",
    title:       "Tienda Kwinna | Colección 2025",
    description:
      "Descubrí piezas únicas diseñadas para la mujer que define su propio estilo.",
    locale:      "es_AR",
  },
};

// ─── Skeleton fallback ────────────────────────────────────────────────────────
// Se muestra mientras el Client Component hidrata y resuelve useSearchParams.

function ShopFallback() {
  return (
    <main className="min-h-screen bg-background pb-32">
      <section className="relative overflow-hidden border-b border-border/50 bg-gradient-to-b from-primary/10 via-background to-background">
        <div className="mx-auto max-w-5xl px-4 py-16 md:px-8 md:py-24">
          <div className="h-3 w-28 animate-pulse rounded bg-primary/20" />
          <div className="mt-4 h-10 w-72 animate-pulse rounded bg-muted" />
          <div className="mt-3 h-3 w-80 animate-pulse rounded bg-muted" />
        </div>
      </section>
      <div className="mx-auto max-w-5xl px-4 py-6 md:px-8">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-[var(--radius)] bg-card">
              <div className="aspect-[3/4] animate-pulse bg-muted" />
              <div className="space-y-2 px-3 py-3">
                <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
                <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

// ─── Page (Server Component) ──────────────────────────────────────────────────
// No contiene lógica de cliente. Toda la interactividad vive en ShopClientView.
// El <Suspense> es obligatorio cuando un Client Component hijo usa useSearchParams.

export default async function ShopPage() {
  // Precarga server-side — falla silenciosamente cuando la API no está
  // disponible (ej. dev con NEXT_PUBLIC_USE_MOCKS=true).
  const initialProducts = await fetchProductsSSR();

  // ─── JSON-LD dinámico ──────────────────────────────────────────────────────
  // Se construye aquí para poder inyectar el conteo y los primeros ítems reales.
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const jsonLd = {
    "@context":    "https://schema.org",
    "@type":       "ItemList",
    name:          "Catálogo de Kwinna — Colección 2025",
    description:   "Piezas únicas de moda femenina: vestidos, tops, pantalones y accesorios.",
    url:           `${appUrl}/shop`,
    numberOfItems: initialProducts?.length,
    itemListElement: (initialProducts ?? []).slice(0, 10).map((p, i) => ({
      "@type":    "ListItem",
      position:   i + 1,
      name:       p.name,
      url:        `${appUrl}/shop/product/${p.id}`,
    })),
    offers: {
      "@type":       "AggregateOffer",
      priceCurrency: "ARS",
      availability:  "https://schema.org/InStock",
      seller: {
        "@type": "Organization",
        name:    "Kwinna",
      },
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          // JSON.stringify no escapa < ni > — sin este reemplazo un nombre de producto
          // con "</script>" cierra el tag y permite inyección de JS arbitrario.
          __html: JSON.stringify(jsonLd)
            .replace(/</g, "\\u003c")
            .replace(/>/g, "\\u003e")
            .replace(/&/g, "\\u0026"),
        }}
      />
      <Suspense fallback={<ShopFallback />}>
        <ShopClientView initialProducts={initialProducts} />
      </Suspense>
    </>
  );
}
