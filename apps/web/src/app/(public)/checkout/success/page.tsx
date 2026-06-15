"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Clock, Copy, ExternalLink, Loader2, Landmark } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { isPaidSale } from "@kwinna/contracts";
import { Button } from "@/components/ui/button";
import { useSaleById } from "@/hooks/use-sale";
import { waLink } from "@/lib/constants";

const BANK_DETAILS = {
  bank: "Brubank",
  owner: "Zabaleta Andrés Bernabé",
  cuit: "20-40294631-9",
  alias: "kwinna26",
  cbu: "1430001713047444170018",
};

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  // El flujo de transferencia redirige con `?id=<saleId>`. MercadoPago, en cambio,
  // vuelve por sus `back_urls` con `?external_reference=<saleId>` (+ status, payment_id…).
  // Resolvemos ambos para que la pantalla funcione con cualquiera de los dos métodos.
  const id = searchParams.get("id") ?? searchParams.get("external_reference");

  const { data, isLoading, isError } = useSaleById(id);
  const sale = data?.data;

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado al portapapeles`);
  };

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/30" />
      </main>
    );
  }

  if (isError || !sale) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="flex max-w-md flex-col items-center gap-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <span className="text-2xl font-bold text-destructive">!</span>
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-semibold tracking-wide uppercase text-foreground">Venta no encontrada</h1>
            <p className="text-sm text-muted-foreground">
              No pudimos cargar los datos de esta orden. Por favor, contactanos si realizaste una compra.
            </p>
          </div>
          <Button asChild variant="outline" className="rounded-none px-8 text-xs tracking-widest uppercase">
            <Link href="/shop">Volver a la tienda</Link>
          </Button>
        </div>
      </main>
    );
  }

  // Una orden cancelada (por timeout, por el admin, o por el job de cleanup)
  // no debe mostrar datos bancarios ni confirmación — el cliente ya no tiene
  // nada que pagar ni que recibir.
  if (sale.status === "cancelled") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="flex max-w-md flex-col items-center gap-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <span className="text-2xl font-bold text-muted-foreground">×</span>
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-semibold tracking-wide uppercase text-foreground">
              Esta orden fue cancelada
            </h1>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
              La orden <span className="font-medium text-foreground">#{sale.id.slice(0, 8).toUpperCase()}</span> ya
              no está activa. Si creés que es un error, escribinos por WhatsApp antes de volver a comprar.
            </p>
          </div>
          <div className="flex flex-col items-center gap-3">
            <Button asChild className="rounded-none px-8 tracking-wide">
              <Link href="/shop">Volver a la tienda</Link>
            </Button>
            <Button asChild variant="link" className="text-xs text-muted-foreground tracking-widest uppercase">
              <a
                href={waLink("Hola, tuve un problema con mi orden #" + sale.id.slice(0, 8).toUpperCase())}
                target="_blank"
                rel="noopener noreferrer"
              >
                Contactar por WhatsApp
              </a>
            </Button>
          </div>
        </div>
      </main>
    );
  }

  const orderCode = sale.id.slice(0, 8).toUpperCase();

  // ── Transferencia bancaria ─────────────────────────────────────────────────
  // Solo este método requiere mostrar los datos bancarios y pedir el comprobante.
  // El resto (MercadoPago) ya cobró —o está cobrando— a través de la pasarela.
  if (sale.paymentMethod === "transfer") {
    const wsLink = waLink(
      `Hola! Realicé una compra en la web y acá te dejo el comprobante de transferencia.\nMi orden es: #${orderCode}`
    );

    return (
      <main className="min-h-screen bg-background pb-20 pt-24 lg:pt-32">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">

          {/* Header */}
          <div className="flex flex-col items-center gap-6 text-center mb-12">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-light tracking-wide uppercase text-foreground">
                ¡Gracias por tu compra!
              </h1>
              <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
                Tu orden <span className="font-medium text-foreground">#{orderCode}</span> fue registrada con éxito.
                <br />Para confirmar tu compra, realizá la transferencia y envianos el comprobante.
              </p>
            </div>
          </div>

          {/* Bank Details Card */}
          <div className="overflow-hidden rounded-none border border-border/50 bg-card">
            <div className="border-b border-border/50 bg-muted/30 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Landmark className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
                  Datos Bancarios
                </h2>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground block mb-0.5">Total a transferir</span>
                <span className="text-xl font-medium tabular-nums text-foreground">${sale.total.toLocaleString("es-AR")}</span>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <span className="text-[10px] font-medium tracking-widest text-muted-foreground uppercase">Banco</span>
                  <p className="text-sm font-medium text-foreground">{BANK_DETAILS.bank}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-medium tracking-widest text-muted-foreground uppercase">Titular</span>
                  <p className="text-sm font-medium text-foreground">{BANK_DETAILS.owner}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-medium tracking-widest text-muted-foreground uppercase">CUIT/CUIL</span>
                  <p className="text-sm font-medium text-foreground">{BANK_DETAILS.cuit}</p>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-border/40">
                <div className="flex items-center justify-between gap-4 p-3 bg-muted/20 border border-border/30">
                  <div className="space-y-0.5 min-w-0">
                    <span className="text-[10px] font-medium tracking-widest text-muted-foreground uppercase">CBU</span>
                    <p className="text-sm font-medium tabular-nums text-foreground truncate">{BANK_DETAILS.cbu}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 h-8 w-8"
                    onClick={() => handleCopy(BANK_DETAILS.cbu, "CBU")}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex items-center justify-between gap-4 p-3 bg-muted/20 border border-border/30">
                  <div className="space-y-0.5 min-w-0">
                    <span className="text-[10px] font-medium tracking-widest text-muted-foreground uppercase">Alias</span>
                    <p className="text-sm font-medium tabular-nums text-foreground truncate">{BANK_DETAILS.alias}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 h-8 w-8"
                    onClick={() => handleCopy(BANK_DETAILS.alias, "Alias")}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="mt-8 flex flex-col items-center gap-4">
            <Button asChild size="lg" className="w-full sm:w-auto rounded-none px-8 tracking-wide">
              <a href={wsLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                Ya transferí, enviar comprobante
                <ExternalLink className="h-4 w-4 ml-1" />
              </a>
            </Button>
            <Button asChild variant="link" className="text-xs text-muted-foreground tracking-widest uppercase">
              <Link href="/shop">Volver a la tienda</Link>
            </Button>
          </div>

        </div>
      </main>
    );
  }

  // ── MercadoPago (y cualquier otro método ya cobrado por pasarela) ───────────
  // Diferenciamos según el estado real de la venta en nuestra BD:
  //   - pagada (completed/assembled/delivered)  → pago acreditado.
  //   - pending → el webhook de MP todavía no confirmó; mostramos "procesando".
  const paid = isPaidSale(sale.status);
  const wsLink = waLink(`Hola! Tengo una consulta sobre mi orden #${orderCode}.`);

  return (
    <main className="min-h-screen bg-background pb-20 pt-24 lg:pt-32">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="flex flex-col items-center gap-6 text-center mb-10">
          <div
            className={
              paid
                ? "flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10"
                : "flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10"
            }
          >
            {paid ? (
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            ) : (
              <Clock className="h-8 w-8 text-amber-600" />
            )}
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-light tracking-wide uppercase text-foreground">
              {paid ? "¡Pago confirmado!" : "Estamos confirmando tu pago"}
            </h1>
            <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
              Tu orden <span className="font-medium text-foreground">#{orderCode}</span>{" "}
              {paid
                ? "fue registrada y tu pago se acreditó con éxito."
                : "fue registrada. Apenas Mercado Pago confirme la acreditación te enviaremos un email."}
              <br />Te enviamos los detalles a tu correo.
            </p>
          </div>
        </div>

        {/* Order summary card */}
        <div className="overflow-hidden rounded-none border border-border/50 bg-card">
          <div className="border-b border-border/50 bg-muted/30 px-6 py-4 flex items-center justify-between">
            <h2 className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
              Resumen de la orden
            </h2>
            <div className="text-right">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground block mb-0.5">Total</span>
              <span className="text-xl font-medium tabular-nums text-foreground">${sale.total.toLocaleString("es-AR")}</span>
            </div>
          </div>
          <div className="p-6">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[11px] tracking-widest text-muted-foreground uppercase">Estado</span>
              <span
                className={
                  paid
                    ? "text-[11px] font-semibold tracking-widest uppercase text-emerald-600"
                    : "text-[11px] font-semibold tracking-widest uppercase text-amber-600"
                }
              >
                {paid ? "Pago acreditado" : "Procesando pago"}
              </span>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-8 flex flex-col items-center gap-4">
          <Button asChild size="lg" className="w-full sm:w-auto rounded-none px-8 tracking-wide">
            <Link href="/shop">Seguir comprando</Link>
          </Button>
          <Button asChild variant="link" className="text-xs text-muted-foreground tracking-widest uppercase">
            <a href={wsLink} target="_blank" rel="noopener noreferrer">
              Contactar por WhatsApp
            </a>
          </Button>
        </div>

      </div>
    </main>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/30" />
        </main>
      }
    >
      <CheckoutSuccessContent />
    </Suspense>
  );
}
