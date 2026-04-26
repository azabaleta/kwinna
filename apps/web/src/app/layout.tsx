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
    default: "Kwinna shop | Colección 2026",
    template: "%s | Kwinna",
  },
  description:
    "Juntas llegamos mas lejos, cada cuerpo es único. Descubrí tu outfit perfecto!",

  openGraph: {
    type:        "website",
    locale:      "es_AR",
    url:         APP_URL,
    siteName:    "Kwinna shop",
    title:       "Kwinna shop | Colección 2026",
    description: "Juntas llegamos mas lejos, cada cuerpo es único. Descubrí tu outfit perfecto!",
    images: [
      {
        url:    "/og-default.jpg",
        width:  1200,
        height: 630,
        alt:    "Kwinna shop | Colección 2026",
      },
    ],
  },

  twitter: {
    card:        "summary_large_image",
    title:       "Kwinna shop | Colección 2026",
    description: "Juntas llegamos mas lejos, cada cuerpo es único. Descubrí tu outfit perfecto!",
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
