"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { AlertTriangle, ArrowLeft, Loader2, ShoppingBag, Truck } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import type { SaleOrderInput } from "@kwinna/contracts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCheckout } from "@/hooks/use-sale";
import {
  selectCartItems,
  selectCartTotal,
  selectItemCount,
  useCartStore,
} from "@/store/use-cart-store";
import { useAuthStore } from "@/store/use-auth-store";
import {
  CheckoutFormSchema,
  type CheckoutFormValues,
} from "@/schemas/checkout";

// ─── Shipping zones ───────────────────────────────────────────────────────────
// V1: diccionario frontal sin APIs externas.
// Ciudades locales → envío fijo. Resto del país → $0 + aviso al vendedor.

const LOCAL_SHIPPING_COST = 3500;

/**
 * Normaliza un string para comparación insensible a case y tildes.
 * "Neuquén" → "neuquen", "CIPOLLETTI" → "cipolletti"
 */
function normalize(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

const LOCAL_CITIES = new Set([
  "neuquen",
  "plottier",
  "cipolletti",
  "centenario",
]);

interface ShippingInfo {
  /** Costo en pesos a sumar al total. */
  cost: number;
  /** true → zona local conocida. */
  isLocal: boolean;
  /**
   * true → el usuario ingresó una ciudad fuera del mapa local.
   * Se usa para mostrar el aviso "a tratar con el vendedor".
   */
  isOutOfZone: boolean;
}

function computeShipping(city: string): ShippingInfo {
  const raw = city.trim();
  if (!raw) return { cost: 0, isLocal: false, isOutOfZone: false };

  const key = normalize(raw);
  if (LOCAL_CITIES.has(key)) {
    return { cost: LOCAL_SHIPPING_COST, isLocal: true, isOutOfZone: false };
  }
  return { cost: 0, isLocal: false, isOutOfZone: true };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CheckoutPage() {
  const items     = useCartStore(selectCartItems);
  const cartTotal = useCartStore(selectCartTotal);   // total de productos sin envío
  const count     = useCartStore(selectItemCount);
  const clearCart = useCartStore((s) => s.clearCart);

  const user = useAuthStore((s) => s.user);

  const { mutateAsync, isPending } = useCheckout();

  // ── Form state ────────────────────────────────────────────────────────────
  const [name,             setName]             = useState(user?.name  ?? "");
  const [email,            setEmail]            = useState(user?.email ?? "");
  const [phone,            setPhone]            = useState("");
  const [shippingAddress,  setShippingAddress]  = useState("");
  const [shippingCity,     setShippingCity]     = useState("");
  const [shippingProvince, setShippingProvince] = useState("");

  const [errors, setErrors] = useState<Partial<Record<keyof CheckoutFormValues, string>>>({});

  // ── Shipping derivado del campo ciudad (reactivo, sin estado extra) ────────
  const shipping = computeShipping(shippingCity);
  const grandTotal = cartTotal + shipping.cost;

  function clearError(field: keyof CheckoutFormValues) {
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const formData: CheckoutFormValues = {
      name,
      email,
      phone: phone || undefined,
      shippingAddress,
      shippingCity,
      shippingProvince,
    };

    const result = CheckoutFormSchema.safeParse(formData);

    if (!result.success) {
      const fieldErrors: Partial<Record<keyof CheckoutFormValues, string>> = {};
      result.error.issues.forEach((issue) => {
        const key = issue.path[0] as keyof CheckoutFormValues;
        if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setErrors({});

    // El backend calcula precios, subtotales, total y shippingCost desde PostgreSQL.
    // El cliente solo envía identidad de productos y datos de contacto/envío.
    const salePayload: SaleOrderInput = {
      items: items.map(({ product, quantity, size }) => ({
        productId: product.id,
        quantity,
        size,
      })),
      customerName:     result.data.name,
      customerEmail:    result.data.email,
      customerPhone:    result.data.phone,
      shippingAddress:  result.data.shippingAddress,
      shippingCity:     result.data.shippingCity,
      shippingProvince: result.data.shippingProvince,
      userId:           user?.id,
    };

    try {
      const { data } = await mutateAsync(salePayload);
      clearCart();
      // Redirigir a MP Checkout Pro (o al success local en modo mock)
      window.location.assign(data.initPoint);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al procesar la compra";
      toast.error("Error en la compra", { description: message });
    }
  }

  // ── Empty cart guard ──────────────────────────────────────────────────────
  if (items.length === 0) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="flex flex-col items-center gap-6 text-center">
          <ShoppingBag className="h-10 w-10 text-muted-foreground/20" />
          <div className="space-y-1.5">
            <p className="font-semibold text-foreground">Tu carrito está vacío</p>
            <p className="text-sm text-muted-foreground">
              Agrega piezas desde la tienda para continuar.
            </p>
          </div>
          <Button asChild variant="outline" className="rounded-full px-6 text-xs tracking-widest uppercase">
            <Link href="/shop">Ir a la tienda</Link>
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-4 py-10 md:px-8">
      <div className="mx-auto max-w-5xl">

        {/* ── Back nav ─────────────────────────────────────────────── */}
        <Link
          href="/shop"
          className="mb-8 flex w-fit items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Volver a la tienda
        </Link>

        <h1 className="mb-10 text-2xl font-bold tracking-tight text-foreground">
          Confirmar pedido
        </h1>

        <div className="grid gap-10 lg:grid-cols-[1fr_380px]">

          {/* ── Order summary ─────────────────────────────────────── */}
          <section aria-label="Resumen del pedido" className="order-2 lg:order-1">
            <h2 className="mb-4 text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
              Tu selección · {count} {count === 1 ? "pieza" : "piezas"}
            </h2>

            <div className="space-y-2">
              {items.map(({ product, quantity, size }) => (
                <div
                  key={`${product.id}::${size ?? ""}`}
                  className="flex items-center gap-4 rounded-xl border border-border/50 bg-card p-4"
                >
                  <div className="h-14 w-10 shrink-0 rounded-lg bg-primary/10" />

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {product.name}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {size && (
                        <span className="mr-1.5 rounded bg-primary/10 px-1 py-px font-medium text-primary">
                          {size}
                        </span>
                      )}
                      {quantity} {quantity === 1 ? "unidad" : "unidades"} × ${product.price.toLocaleString("es-AR")}
                    </p>
                  </div>

                  <p className="shrink-0 text-sm font-bold tabular-nums text-foreground">
                    ${(product.price * quantity).toLocaleString("es-AR")}
                  </p>
                </div>
              ))}

              {/* ── Shipping line item (aparece en cuanto la ciudad es válida) ── */}
              {shipping.isLocal && (
                <div className="flex items-center gap-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                  <div className="flex h-14 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
                    <Truck className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-emerald-700">
                      Envío local
                    </p>
                    <p className="mt-0.5 text-[11px] text-emerald-600/80">
                      {shippingCity.trim()} · entrega a domicilio
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-bold tabular-nums text-emerald-700">
                    ${LOCAL_SHIPPING_COST.toLocaleString("es-AR")}
                  </p>
                </div>
              )}

              {/* ── Out-of-zone warning ──────────────────────────────────────── */}
              {shipping.isOutOfZone && (
                <div className="flex gap-3 rounded-xl border border-amber-400/30 bg-amber-400/8 p-4">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                  <div className="space-y-0.5">
                    <p className="text-xs font-semibold text-amber-700">
                      Envío a coordinar · $0
                    </p>
                    <p className="text-[11px] leading-relaxed text-amber-600/90">
                      A tratar con el vendedor. Los costos de envío dependerán de la empresa de mensajería elegida.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* ── Subtotal + envío + gran total ─────────────────────────────── */}
            <div className="mt-5 space-y-2 border-t border-border/50 pt-5">
              {/* Mostrar subtotal de productos solo cuando hay costo de envío */}
              {shipping.isLocal && (
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span className="text-[11px] tracking-wide uppercase">Productos</span>
                  <span className="tabular-nums">${cartTotal.toLocaleString("es-AR")}</span>
                </div>
              )}
              {shipping.isLocal && (
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span className="text-[11px] tracking-wide uppercase">Envío local</span>
                  <span className="tabular-nums text-emerald-600">
                    +${LOCAL_SHIPPING_COST.toLocaleString("es-AR")}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-[11px] tracking-widest text-muted-foreground uppercase">
                  Total a pagar
                </span>
                <span className="text-3xl font-bold tabular-nums text-foreground">
                  ${grandTotal.toLocaleString("es-AR")}
                </span>
              </div>
            </div>
          </section>

          {/* ── Customer form ─────────────────────────────────────── */}
          <section aria-label="Datos de contacto y envío" className="order-1 lg:order-2">
            <form onSubmit={handleSubmit} noValidate className="space-y-8">

              {/* ── Contacto ─────────────────────────────────────── */}
              <fieldset className="space-y-5">
                <legend className="mb-4 text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
                  Datos de contacto
                </legend>

                {/* Name */}
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-xs">
                    Nombre completo <span className="text-destructive" aria-hidden>*</span>
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Ana García"
                    autoComplete="name"
                    value={name}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => {
                      setName(e.target.value);
                      clearError("name");
                    }}
                    aria-invalid={!!errors.name}
                    aria-describedby={errors.name ? "name-error" : undefined}
                  />
                  {errors.name && (
                    <p id="name-error" className="text-[11px] text-destructive">{errors.name}</p>
                  )}
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs">
                    Email <span className="text-destructive" aria-hidden>*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="ana@ejemplo.com"
                    autoComplete="email"
                    value={email}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => {
                      setEmail(e.target.value);
                      clearError("email");
                    }}
                    aria-invalid={!!errors.email}
                    aria-describedby={errors.email ? "email-error" : undefined}
                  />
                  {errors.email && (
                    <p id="email-error" className="text-[11px] text-destructive">{errors.email}</p>
                  )}
                </div>

                {/* Phone */}
                <div className="space-y-1.5">
                  <Label htmlFor="phone" className="text-xs">
                    Teléfono{" "}
                    <span className="text-[11px] font-normal text-muted-foreground">(opcional)</span>
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+54 11 1234-5678"
                    autoComplete="tel"
                    value={phone}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setPhone(e.target.value)}
                  />
                </div>
              </fieldset>

              {/* ── Envío ────────────────────────────────────────── */}
              <fieldset className="space-y-5">
                <legend className="mb-4 text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
                  Dirección de envío
                </legend>

                {/* Address */}
                <div className="space-y-1.5">
                  <Label htmlFor="shippingAddress" className="text-xs">
                    Dirección <span className="text-destructive" aria-hidden>*</span>
                  </Label>
                  <Input
                    id="shippingAddress"
                    type="text"
                    placeholder="Av. Corrientes 1234, Piso 3"
                    autoComplete="street-address"
                    value={shippingAddress}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => {
                      setShippingAddress(e.target.value);
                      clearError("shippingAddress");
                    }}
                    aria-invalid={!!errors.shippingAddress}
                    aria-describedby={errors.shippingAddress ? "address-error" : undefined}
                  />
                  {errors.shippingAddress && (
                    <p id="address-error" className="text-[11px] text-destructive">{errors.shippingAddress}</p>
                  )}
                </div>

                {/* City + Province */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="shippingCity" className="text-xs">
                      Ciudad <span className="text-destructive" aria-hidden>*</span>
                    </Label>
                    <Input
                      id="shippingCity"
                      type="text"
                      placeholder="Neuquén"
                      autoComplete="address-level2"
                      value={shippingCity}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => {
                        setShippingCity(e.target.value);
                        clearError("shippingCity");
                      }}
                      aria-invalid={!!errors.shippingCity}
                      aria-describedby={errors.shippingCity ? "city-error" : undefined}
                    />
                    {errors.shippingCity && (
                      <p id="city-error" className="text-[11px] text-destructive">{errors.shippingCity}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="shippingProvince" className="text-xs">
                      Provincia <span className="text-destructive" aria-hidden>*</span>
                    </Label>
                    <Input
                      id="shippingProvince"
                      type="text"
                      placeholder="Neuquén"
                      autoComplete="address-level1"
                      value={shippingProvince}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => {
                        setShippingProvince(e.target.value);
                        clearError("shippingProvince");
                      }}
                      aria-invalid={!!errors.shippingProvince}
                      aria-describedby={errors.shippingProvince ? "province-error" : undefined}
                    />
                    {errors.shippingProvince && (
                      <p id="province-error" className="text-[11px] text-destructive">{errors.shippingProvince}</p>
                    )}
                  </div>
                </div>
              </fieldset>

              {/* Submit */}
              <Button
                type="submit"
                size="lg"
                className="w-full rounded-full text-xs font-semibold tracking-widest uppercase"
                disabled={isPending}
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Procesando…
                  </>
                ) : (
                  "Confirmar Compra"
                )}
              </Button>

              <p className="text-center text-[11px] leading-relaxed text-muted-foreground/60">
                Al confirmar aceptás nuestros términos y política de privacidad.
              </p>

            </form>
          </section>

        </div>
      </div>
    </main>
  );
}
