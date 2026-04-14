import Link from "next/link";
import { CartButton } from "@/components/public/cart-button";
import { AuthButton } from "@/components/public/auth-button";

// ─── Isotipo inline (no SVGR configured in next.config) ───────────────────────

function IsotipoIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 976.91 524.76"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        fill="currentColor"
        d="M280.26.28c-103.19-5.26-103.52,64.28-100.34,144.94,0,0,0,159.8,0,159.8,0,34.84-28.34,63.18-63.18,63.18-36.08,1.89-67.01-26.9-66.89-63.18,0,0,0-163.52,0-163.52H1.54c4.57,95.06-34.55,271.9,111.49,275,62.84,2.01,115.32-48.53,115.2-111.49.94-46.4-.68-182.32,0-226.69-.39-28.27,30.18-32.02,52.03-29.73,16.39,0,29.73,13.33,29.73,29.73,0,0,0,66.89,0,66.89v234.13c-3.44,80.06-2.32,150.68,100.34,144.94,80.66-4.35,81.12-74.96,78.04-137.5,0,0,0-7.43,0-7.43v-144.94c1.16-83.55,128.9-83.61,130.07,0,0,0,0,144.93,0,144.93,0,0,0,7.43,0,7.43-3.19,62.29-2.43,133.4,78.05,137.5,78.95,5.85,106.97-42.04,100.33-115.21-.27-17.31.2-153.84,0-174.67,0-34.84,28.34-63.18,63.18-63.18,36.07-1.89,67.02,26.9,66.89,63.18,0,0,0,174.67,0,174.67h48.31c-5.86-95.66,37.94-283.44-111.49-286.15-62.84-2-115.32,48.53-115.2,111.49-.59,46.99.42,166.6,0,211.83.39,28.27-30.18,32.02-52.03,29.73-16.39,0-29.73-13.33-29.73-29.73.24-43.6-.17-166.45,0-211.83.12-62.95-52.37-113.49-115.21-111.49-140.61,4.61-108.86,161.91-111.49,256.43-.38,3.51.27,61.97,0,66.89.39,28.27-30.19,32.02-52.04,29.73-16.39,0-29.72-13.34-29.72-29.73,0,0,0-66.89,0-66.89v-234.13c2.23-63.34,6.48-140.61-78.04-144.94"
      />
    </svg>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PublicNavbar() {
  return (
    <header className="fixed top-0 z-30 w-full border-b border-border/50 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 md:px-8">

        {/* ── Brand ── */}
        <Link href="/shop" className="flex items-center gap-2.5 transition-opacity hover:opacity-80">
          <IsotipoIcon className="h-4 w-4 text-primary" />
          <span className="text-xs font-bold tracking-[0.2em] text-foreground uppercase">
            Kwinna
          </span>
        </Link>

        {/* ── Nav ── */}
        <nav className="hidden items-center gap-1 sm:flex">
          <Link
            href="/shop"
            className="rounded-full px-4 py-1.5 text-[11px] font-semibold tracking-widest text-muted-foreground transition-colors uppercase hover:bg-muted hover:text-foreground"
          >
            Tienda
          </Link>
        </nav>

        {/* ── Right actions ── */}
        <div className="flex items-center gap-0.5">
          <CartButton />
          <AuthButton />
        </div>

      </div>
    </header>
  );
}
