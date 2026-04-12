import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Manrope } from "next/font/google";
import { QueryProvider } from "@/providers/query-provider";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Kwinna",
  description: "Product inventory system",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className={`dark ${manrope.variable}`}>
      <body className="font-sans antialiased">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
