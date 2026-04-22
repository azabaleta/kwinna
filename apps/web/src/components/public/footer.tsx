import React from "react";
import Link from "next/link";
import { Mail, MapPin } from "lucide-react";

function InstagramIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

export function PublicFooter() {
  return (
    <footer className="border-t border-border/40 bg-background py-16 px-4 md:px-8">
      <div className="mx-auto max-w-5xl grid grid-cols-1 gap-12 md:grid-cols-3">
        {/* Brand / Concept */}
        <div className="flex flex-col items-center text-center md:items-start md:text-left">
          <h2 className="text-lg font-normal tracking-[0.2em] text-foreground mb-4">
            Kwinna
          </h2>
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground/80 max-w-[250px] leading-relaxed">
            Indumentaria sin etiquetas para mujeres reales. Diseñado y confeccionado con pasión.
          </p>
        </div>

        {/* Physical Store */}
        <div className="flex flex-col items-center text-center md:items-start md:text-left">
          <h3 className="text-[10px] font-semibold tracking-[0.15em] uppercase text-foreground mb-4 flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5" />
            Visitanos
          </h3>
          <address className="not-italic text-[11px] uppercase tracking-widest text-muted-foreground/80 leading-relaxed">
            Luis Beltran 830 <br />
            Río Negro, Argentina <br />
            Atencion de Lunes a Sábado
          </address>
        </div>

        {/* Contact & Socials */}
        <div className="flex flex-col items-center text-center md:items-start md:text-left">
          <h3 className="text-[10px] font-semibold tracking-[0.15em] uppercase text-foreground mb-4 flex items-center gap-2">
            <Mail className="h-3.5 w-3.5" />
            Contacto
          </h3>
          <div className="flex flex-col gap-3 text-[11px] uppercase tracking-widest text-muted-foreground/80">
            <a href="mailto:contacto@somoskwinna.com" className="hover:text-foreground transition-colors">
              contacto@somoskwinna.com
            </a>
            <a 
              href="https://instagram.com/kwinnanqn" 
              target="_blank" 
              rel="noreferrer"
              className="flex items-center gap-2 hover:text-foreground transition-colors justify-center md:justify-start"
            >
              <InstagramIcon className="h-3.5 w-3.5" />
              @kwinnanqn
            </a>
          </div>
        </div>
      </div>
      
      <div className="mx-auto max-w-5xl mt-16 pt-8 border-t border-border/20 text-center">
        <p className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground/60">
          © {new Date().getFullYear()} Kwinna. Todos los derechos reservados.
        </p>
      </div>
    </footer>
  );
}
