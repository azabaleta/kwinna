import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

// Server Component — no dynamic data needed; el carrito ya fue vaciado en /checkout.

export default function CheckoutSuccessPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="flex flex-col items-center gap-8 text-center">

        {/* Icon */}
        <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
          <div className="absolute inset-0 animate-ping rounded-full bg-primary/10" />
          <CheckCircle2 className="relative h-9 w-9 text-primary" />
        </div>

        {/* Copy */}
        <div className="space-y-2">
          <p className="text-[11px] font-semibold tracking-[0.25em] text-primary uppercase">
            Pedido confirmado
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            ¡Gracias por tu compra!
          </h1>
          <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
            Tu pedido fue procesado correctamente. Pronto recibirás más información.
          </p>
        </div>

        {/* CTA */}
        <Button
          asChild
          size="lg"
          className="rounded-full px-10 text-xs font-semibold tracking-widest uppercase"
        >
          <Link href="/shop">Seguir comprando</Link>
        </Button>

      </div>
    </main>
  );
}
