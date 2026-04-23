import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Manrope } from "next/font/google";
import { MockProvider } from "@/providers/mock-provider";
import { QueryProvider } from "@/providers/query-provider";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://kwinna.com.ar";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),

  title: {
    default: "Kwinna — Moda Femenina y Piezas Únicas. Colección 2025",
    template: "%s | Kwinna",
  },
  description:
    "Descubrí la colección 2025 de Kwinna: vestidos, tops, pantalones y accesorios únicos para la mujer moderna. Envíos a Neuquén, Plottier, Cipolletti y Centenario.",

  openGraph: {
    type:        "website",
    locale:      "es_AR",
    url:         APP_URL,
    siteName:    "Kwinna",
    title:       "Kwinna — Moda Femenina y Piezas Únicas. Colección 2025",
    description: "Vestidos, tops y accesorios de diseño. Envíos a toda la región de Neuquén.",
    images: [
      {
        url:    "/og-default.jpg",
        width:  1200,
        height: 630,
        alt:    "Kwinna — Moda Femenina Colección 2025",
      },
    ],
  },

  twitter: {
    card:        "summary_large_image",
    title:       "Kwinna — Moda Femenina y Piezas Únicas. Colección 2025",
    description: "Vestidos, tops y accesorios de diseño. Envíos a toda la región de Neuquén.",
    images:      ["/og-default.jpg"],
  },

  robots: {
    index:  true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`dark ${manrope.variable}`}>
      <body className="font-sans antialiased">
        <MockProvider>
          <QueryProvider>{children}</QueryProvider>
        </MockProvider>
        <Toaster />
      </body>
    </html>
  );
}
