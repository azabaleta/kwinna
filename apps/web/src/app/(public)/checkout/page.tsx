"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, CheckCircle2, Loader2, MapPin, Package, ShoppingCart, Tag, Trash2, Truck, CreditCard, Landmark, X } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { PromoCodeValidateResponse, SaleOrderInput } from "@kwinna/contracts";
import { normalizeCity } from "@kwinna/contracts";
import { validatePromoCode } from "@/services/promo-codes";
import { useShippingZones } from "@/hooks/use-shipping-zones";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  CHECKOUT_DRAFT_KEY,
  STORE_ADDRESS,
  type CheckoutDraft,
  type CheckoutFormValues,
} from "@/schemas/checkout";
import { trackEvent } from "@/services/analytics";
import { cn } from "@/lib/utils";
import {
  fetchProvincias,
  fetchMunicipios,
  type Provincia,
  type Municipio,
} from "@/services/georef";

// ─── MercadoPago domain allowlist ────────────────────────────────────────────
// Solo redirigimos a dominios oficiales de MercadoPago/MercadoLibre.
// Previene open-redirect a sitios de phishing en caso de respuesta manipulada.

const MP_ALLOWED_DOMAINS = [
  "mercadopago.com",
  "mercadopago.com.ar",
  "mercadolibre.com",
  "mercadolibre.com.ar",
];

function isMercadoPagoUrl(url: string): boolean {
  try {
    const { hostname, protocol } = new URL(url);
    if (protocol !== "https:") return false;
    return MP_ALLOWED_DOMAINS.some(
      (d) => hostname === d || hostname.endsWith(`.${d}`)
    );
  } catch {
    return false;
  }
}

// ─── Shipping zones ───────────────────────────────────────────────────────────
// Preview del costo contra el mapa ciudad normalizada → costo que viene de la API.
// El backend recalcula el costo real al confirmar la venta.

interface ShippingInfo {
  cost:    number;
  label:   string;
  isKnown: boolean;
}

function computeShipping(city: string, zonesMap: Record<string, number>): ShippingInfo {
  const raw = city.trim();
  if (!raw) return { cost: 0, label: "", isKnown: false };

  const key  = normalizeCity(raw);
  const cost = zonesMap[key];

  return cost !== undefined
    ? { cost, label: raw, isKnown: true }
    : { cost: 0, label: raw, isKnown: false };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CheckoutPage() {
  const items      = useCartStore(selectCartItems);
  const cartTotal  = useCartStore(selectCartTotal);
  const count      = useCartStore(selectItemCount);
  const clearCart  = useCartStore((s) => s.clearCart);
  const removeItem = useCartStore((s) => s.removeItem);

  const user = useAuthStore((s) => s.user);

  const { mutateAsync, isPending } = useCheckout();

  // Zonas de envío desde la API (reemplaza el mapa hardcodeado)
  const { data: shippingZones = [] } = useShippingZones();
  const zonesMap = Object.fromEntries(shippingZones.map((z) => [z.city, z.cost]));

  // checkout_start: el usuario llegó al checkout con ítems en el carrito
  useEffect(() => { trackEvent("checkout_start"); }, []);

  // ── React Hook Form ───────────────────────────────────────────────────────
  // Inicializamos con valores vacíos para que SSR y cliente rindan IDÉNTICO HTML.
  // El draft de localStorage se carga DESPUÉS del mount via useEffect — evita
  // hydration mismatch de Next.js.
  const form = useForm<CheckoutFormValues>({
    resolver: zodResolver(CheckoutFormSchema),
    defaultValues: {
      name:             user?.name  ?? "",
      email:            user?.email ?? "",
      phone:            "",
      dni:              "",
      shippingMethod:   "delivery",
      paymentMethod:    "mercadopago",
      shippingAddress:  "",
      shippingCity:     "",
      shippingProvince: "",
      shippingZipCode:  "",
    },
  });

  // ── Cargar draft de localStorage después del mount (evita hydration mismatch) ─
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(CHECKOUT_DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw) as Partial<CheckoutDraft>;
      form.reset({
        // Datos del usuario autenticado tienen prioridad sobre el draft
        name:             user?.name  ?? draft.name            ?? "",
        email:            user?.email ?? draft.email           ?? "",
        phone:            draft.phone            ?? "",
        dni:              draft.dni              ?? "",
        shippingMethod:   "delivery",
        paymentMethod:    "mercadopago",
        shippingAddress:  draft.shippingAddress  ?? "",
        shippingCity:     draft.shippingCity     ?? "",
        shippingProvince: draft.shippingProvince ?? "",
        shippingZipCode:  draft.shippingZipCode  ?? "",
      });
    } catch { /* JSON malformado o localStorage bloqueado — ignorar */ }
    // Intencional: solo correr al mount. form y user no cambian en esta vida del componente.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Persistencia — subscribe al form (no re-renderiza todo en cada tecla) ────
  useEffect(() => {
    const subscription = form.watch((values) => {
      if (values.shippingMethod === "pickup") return;
      const toPersist: CheckoutDraft = {
        name:             values.name             ?? "",
        email:            values.email            ?? "",
        phone:            values.phone            ?? "",
        dni:              values.dni              ?? "",
        shippingAddress:  values.shippingAddress  ?? "",
        shippingCity:     values.shippingCity     ?? "",
        shippingProvince: values.shippingProvince ?? "",
        shippingZipCode:  values.shippingZipCode  ?? "",
      };
      try {
        window.localStorage.setItem(CHECKOUT_DRAFT_KEY, JSON.stringify(toPersist));
      } catch { /* cuota excedida — ignorar */ }
    });
    return () => subscription.unsubscribe();
  }, [form]);

  // ── Georef — provincias y municipios ─────────────────────────────────────

  const [provincias,       setProvincias]       = useState<Provincia[]>([]);
  const [municipios,       setMunicipios]       = useState<Municipio[]>([]);
  const [loadingProvincias, setLoadingProvincias] = useState(true);
  const [loadingMunicipios, setLoadingMunicipios] = useState(false);
  const [selectedProvinciaId, setSelectedProvinciaId] = useState<string>("");

  useEffect(() => {
    fetchProvincias()
      .then(setProvincias)
      .catch(() => toast.error("No se pudieron cargar las provincias"))
      .finally(() => setLoadingProvincias(false));
  }, []);

  useEffect(() => {
    if (!selectedProvinciaId) {
      setMunicipios([]);
      return;
    }
    setLoadingMunicipios(true);
    fetchMunicipios(selectedProvinciaId)
      .then(setMunicipios)
      .catch(() => toast.error("No se pudieron cargar los municipios"))
      .finally(() => setLoadingMunicipios(false));
  }, [selectedProvinciaId]);

  // ── Shipping reactivo (observa el campo ciudad sin estado extra) ──────────

  const shippingCity   = form.watch("shippingCity");
  const shippingMethod = form.watch("shippingMethod");
  const paymentMethod  = form.watch("paymentMethod");

  const isPickup = shippingMethod === "pickup";
  const shipping = isPickup ? { cost: 0, label: "", isKnown: false } : computeShipping(shippingCity ?? "", zonesMap);

  // ── Código promocional ────────────────────────────────────────────────────
  const [promoInput,       setPromoInput]       = useState("");
  const [promoValidating,  setPromoValidating]  = useState(false);
  const [appliedPromo,     setAppliedPromo]     = useState<{ code: string; result: PromoCodeValidateResponse } | null>(null);
  const promoInputRef = useRef<HTMLInputElement>(null);

  // Re-validar cuando cambia el método de pago para recalcular el descuento aplicable
  useEffect(() => {
    if (!appliedPromo) return;
    const pm = paymentMethod as "mercadopago" | "transfer";
    validatePromoCode(appliedPromo.code, pm)
      .then((result) => setAppliedPromo(result.valid ? { code: appliedPromo.code, result } : null))
      .catch(() => setAppliedPromo(null));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentMethod]);

  async function applyPromoCode() {
    if (appliedPromo) return; // solo un código por compra
    const code = promoInput.trim().toUpperCase();
    if (!code) return;
    setPromoValidating(true);
    try {
      const pm = paymentMethod as "mercadopago" | "transfer";
      const result = await validatePromoCode(code, pm);
      if (result.valid) {
        setAppliedPromo({ code, result });
        setPromoInput("");
        const toastDesc =
          result.discountType === "percentage" && result.discountValue && pm === "transfer"
            ? `¡${20 + result.discountValue}% de descuento total! (transferencia 20% + código ${result.discountValue}%)`
            : result.discountLabel;
        toast.success("¡Código aplicado!", { description: toastDesc });
      } else {
        toast.error("Código inválido", { description: result.errorMessage });
      }
    } catch {
      toast.error("No se pudo validar el código");
    } finally {
      setPromoValidating(false);
    }
  }

  function removePromo() {
    setAppliedPromo(null);
    setPromoInput("");
    promoInputRef.current?.focus();
  }

  // ── Totales ───────────────────────────────────────────────────────────────
  const transferDiscount = paymentMethod === "transfer" ? cartTotal * 0.20 : 0;
  const promoDiscount = (() => {
    if (!appliedPromo?.result.valid) return 0;
    const { discountType, discountValue } = appliedPromo.result;
    if (!discountType || discountValue === undefined) return 0;
    if (discountType === "percentage") {
      // Suma aditiva: aplica sobre precio lista (no sobre base post-transferencia)
      return cartTotal * (discountValue / 100);
    }
    // Monto fijo: aplica sobre el remanente post-transferencia
    const base = cartTotal - transferDiscount;
    return Math.min(discountValue, base);
  })();
  const grandTotal     = cartTotal - transferDiscount - promoDiscount + shipping.cost;
  const totalSavings   = transferDiscount + promoDiscount;

  // Cuando transfer + código porcentual: mostrar descuento combinado
  const combinedPct =
    paymentMethod === "transfer" && transferDiscount > 0 &&
    promoDiscount > 0 && appliedPromo?.result.discountType === "percentage"
      ? 20 + (appliedPromo.result.discountValue ?? 0)
      : null;

  // Label contextual del código aplicado
  const appliedPromoLabel = (() => {
    if (!appliedPromo) return "";
    const { discountType, discountValue, discountLabel } = appliedPromo.result;
    if (discountType === "percentage" && discountValue && paymentMethod === "transfer") {
      return `+${discountValue}% sobre transferencia → ${20 + discountValue}% de descuento total`;
    }
    return discountLabel ?? "";
  })();
  
  // MP Cuotas: el máximo disponible entre los productos del carrito.
  // Si algún producto califica para 3 cuotas, todo el carrito puede pagarse en 3.
  const maxInstallments = items.reduce((max, { product }) => {
    const q = product.price >= 20000 ? 3 : product.price >= 10000 ? 2 : 1;
    return Math.max(max, q);
  }, 1);

  // ── Submit ────────────────────────────────────────────────────────────────

  async function onSubmit(values: CheckoutFormValues) {
    // Si es pickup: usar dirección del local (el backend también lo verifica)
    const address = values.shippingMethod === "pickup" ? STORE_ADDRESS : {
      shippingAddress:  values.shippingAddress  ?? "",
      shippingCity:     values.shippingCity      ?? "",
      shippingProvince: values.shippingProvince  ?? "",
      shippingZipCode:  values.shippingZipCode   ?? "",
    };

    const salePayload: SaleOrderInput = {
      items: items.map(({ product, quantity, size }) => ({
        productId: product.id,
        quantity,
        size,
      })),
      customerName:     values.name,
      customerEmail:    values.email,
      customerPhone:    values.phone,
      customerDni:      values.dni,
      shippingMethod:   values.shippingMethod,
      paymentMethod:    values.paymentMethod,
      ...address,
      userId:           user?.id,
      promoCode:        appliedPromo?.code,
    };

    try {
      const { data } = await mutateAsync(salePayload);

      clearCart();
      
      // Si es transferencia, no hay initPoint de MP
      if (values.paymentMethod === "transfer") {
        window.location.assign(`/checkout/success?id=${data.sale.id}`);
        return;
      }

      if (!data.initPoint || !isMercadoPagoUrl(data.initPoint)) {
        toast.error("Error en la compra", { description: "URL de pago inválida. Contactá soporte." });
        return;
      }

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
          <ShoppingCart className="h-10 w-10 text-muted-foreground/20" />
          <div className="space-y-1.5">
            <p className="font-semibold text-foreground">Tu carrito está vacío</p>
            <p className="text-sm text-muted-foreground">
              Agrega piezas desde la tienda para continuar.
            </p>
          </div>
          <Button asChild variant="outline" className="rounded-none px-6 text-xs tracking-widest uppercase">
            <Link href="/shop">Ir a la tienda</Link>
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-4 py-10 pb-[calc(9rem+env(safe-area-inset-bottom))] md:px-8 lg:pb-10">
      <div className="mx-auto max-w-5xl">

        {/* ── Back nav ─────────────────────────────────────────────── */}
        <Link
          href="/shop"
          className="mb-8 flex w-fit items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Volver a la tienda
        </Link>

        <h1 className="mb-10 text-xl font-normal uppercase tracking-widest text-foreground">
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
                  className="flex items-center gap-4 border-b border-border/40 py-4 last:border-0"
                >
                  <div className="relative h-16 w-12 shrink-0 overflow-hidden bg-primary/10">
                    {product.images?.[0] ? (
                      <Image
                        src={product.images[0]}
                        alt={product.name}
                        fill
                        sizes="48px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Package className="h-4 w-4 text-primary/40" />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-normal uppercase tracking-wide text-foreground">
                      {product.name}
                    </p>
                    <p className="mt-1 text-[10px] tracking-widest uppercase text-muted-foreground">
                      {size && (
                        <span className="mr-1.5 font-medium text-foreground">
                          TALLE {size}
                        </span>
                      )}
                      {quantity} {quantity === 1 ? "UN" : "UNS"} × ${product.price.toLocaleString("es-AR")}
                    </p>
                  </div>

                  <p className="shrink-0 text-sm font-normal tabular-nums text-foreground">
                    ${(product.price * quantity).toLocaleString("es-AR")}
                  </p>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeItem(product.id, size)}
                    className="h-8 w-8 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    aria-label={`Quitar ${product.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              {/* Envío (aparece cuando la ciudad tiene costo asignado) */}
              {!isPickup && (
                <div className="border-b border-border/40 py-4 last:border-0">
                  <div className="flex items-center gap-4">
                    <div className="flex h-16 w-12 shrink-0 items-center justify-center rounded-none bg-muted/50">
                      <Truck className="h-4 w-4 text-foreground/50" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-normal uppercase tracking-wide text-foreground">
                        {shipping.isKnown ? "Envío a domicilio" : "Envío al resto del país"}
                      </p>
                      <p className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">
                        {shipping.isKnown ? shipping.label : "Método a coordinar con vendedor"}
                      </p>
                    </div>
                    {shipping.isKnown && (
                      <p className="shrink-0 text-sm font-normal tabular-nums text-foreground">
                        ${shipping.cost.toLocaleString("es-AR")}
                      </p>
                    )}
                  </div>
                  <p className="mt-2 pl-16 text-[10px] leading-relaxed text-muted-foreground/80 italic">
                    {shipping.isKnown 
                      ? "Logística propia: entrega directa de la tienda."
                      : "Costo sujeto a empresa de transporte."}
                  </p>
                </div>
              )}
            </div>

            {/* ── Totales ───────────────────────────────────────────────────── */}
            <div className="mt-5 space-y-2 border-t border-border/50 pt-5">
              {/* Subtotal siempre visible: el desglose no mezcla descuentos */}
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span className="text-[11px] tracking-wide uppercase">Subtotal</span>
                <span className="tabular-nums">${cartTotal.toLocaleString("es-AR")}</span>
              </div>
              {!isPickup && (
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span className="text-[11px] tracking-wide uppercase">Envío</span>
                  <span className={shipping.isKnown ? "tabular-nums text-emerald-600" : "text-[10px] italic"}>
                    {shipping.isKnown ? `+$${shipping.cost.toLocaleString("es-AR")}` : "A coordinar"}
                  </span>
                </div>
              )}
              {/* Descuentos */}
              {combinedPct !== null ? (
                /* Transfer + código porcentual → línea unificada */
                <div className="rounded-none border border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20 px-3 py-2.5">
                  <div className="flex items-center justify-between text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                    <span className="text-[11px] tracking-wide uppercase">{combinedPct}% de descuento</span>
                    <span className="tabular-nums">-${totalSavings.toLocaleString("es-AR")}</span>
                  </div>
                  <p className="mt-0.5 text-[10px] text-emerald-600/70">
                    Transferencia 20% + código {appliedPromo!.code} {appliedPromo!.result.discountValue}%
                  </p>
                </div>
              ) : (
                <>
                  {paymentMethod === "transfer" && transferDiscount > 0 && (
                    <div className="flex items-center justify-between text-sm text-emerald-600 font-medium">
                      <span className="text-[11px] tracking-wide uppercase">Descuento transferencia (20%)</span>
                      <span className="tabular-nums">-${transferDiscount.toLocaleString("es-AR")}</span>
                    </div>
                  )}
                  {promoDiscount > 0 && appliedPromo && (
                    <div className="flex items-center justify-between text-sm text-emerald-600 font-medium">
                      <span className="text-[11px] tracking-wide uppercase flex items-center gap-1">
                        <Tag className="h-3 w-3" />
                        {appliedPromo.code}
                        {appliedPromo.result.discountType === "percentage" &&
                          ` (${appliedPromo.result.discountValue}%)`}
                      </span>
                      <span className="tabular-nums">-${promoDiscount.toLocaleString("es-AR")}</span>
                    </div>
                  )}
                </>
              )}
              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] tracking-widest text-muted-foreground uppercase">
                  Total a pagar
                </span>
                <span className="text-2xl font-normal tabular-nums text-foreground">
                  ${grandTotal.toLocaleString("es-AR")}
                </span>
              </div>
            </div>
          </section>

          {/* ── Customer form ─────────────────────────────────────── */}
          <section aria-label="Datos de contacto y envío" className="order-1 lg:order-2">
            <Form {...form}>
              <form
                id="checkout-form"
                onSubmit={form.handleSubmit(onSubmit)}
                noValidate
                className="space-y-8"
              >

                {/* ── Método de entrega ─────────────────────────────── */}
                <fieldset className="space-y-3">
                  <legend className="mb-3 text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
                    Método de entrega
                  </legend>
                  <div className="grid grid-cols-2 gap-3">
                    {(["delivery", "pickup"] as const).map((method) => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => form.setValue("shippingMethod", method, { shouldValidate: true })}
                        className={cn(
                          "flex flex-col items-center gap-2 rounded-none border px-4 py-4 text-xs font-medium transition-colors",
                          shippingMethod === method
                            ? "border-foreground bg-foreground text-background"
                            : "border-border text-muted-foreground hover:border-foreground/50 hover:text-foreground",
                        )}
                      >
                        {method === "delivery"
                          ? <Truck className="h-4 w-4" />
                          : <Package className="h-4 w-4" />}
                        <span className="tracking-wider uppercase">
                          {method === "delivery" ? "Envío a domicilio" : "Retiro en local"}
                        </span>
                        {method === "pickup" && (
                          <span className={cn(
                            "text-[10px]",
                            shippingMethod === "pickup" ? "text-background/70" : "text-emerald-600",
                          )}>
                            Gratis
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                  {isPickup && (
                    <div className="flex items-center gap-2 rounded-none border border-border/50 bg-muted/30 px-4 py-3">
                      <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">
                        Coordinamos el día y horario de retiro por Instagram o WhatsApp.
                      </p>
                    </div>
                  )}
                </fieldset>

                {/* ── Método de pago ───────────────────────────────── */}
                <fieldset className="space-y-3">
                  <legend className="mb-3 text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
                    Método de pago
                  </legend>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => form.setValue("paymentMethod", "mercadopago", { shouldValidate: true })}
                      className={cn(
                        "flex flex-col items-center gap-2 rounded-none border px-4 py-4 text-xs font-medium transition-colors",
                        paymentMethod === "mercadopago"
                          ? "border-foreground bg-foreground text-background"
                          : "border-border text-muted-foreground hover:border-foreground/50 hover:text-foreground",
                      )}
                    >
                      <CreditCard className="h-4 w-4" />
                      <span className="tracking-wider uppercase text-center">Mercado Pago</span>
                      <span className={cn(
                        "text-[10px]",
                        paymentMethod === "mercadopago" ? "text-background/70" : "text-blue-600 font-medium",
                      )}>
                        {maxInstallments > 1 ? `Hasta ${maxInstallments} cuotas s/interés` : "Tarjetas / Dinero"}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => form.setValue("paymentMethod", "transfer", { shouldValidate: true })}
                      className={cn(
                        "flex flex-col items-center gap-2 rounded-none border px-4 py-4 text-xs font-medium transition-colors",
                        paymentMethod === "transfer"
                          ? "border-foreground bg-foreground text-background"
                          : "border-border text-muted-foreground hover:border-foreground/50 hover:text-foreground",
                      )}
                    >
                      <Landmark className="h-4 w-4" />
                      <span className="tracking-wider uppercase text-center">Transferencia</span>
                      <span className={cn(
                        "text-[10px]",
                        paymentMethod === "transfer" ? "text-background/70" : "text-emerald-600",
                      )}>
                        20% OFF
                      </span>
                    </button>
                  </div>
                </fieldset>

                {/* ── Código promocional ───────────────────────────── */}
                <fieldset className="space-y-3">
                  <legend className="mb-3 text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
                    Código promocional
                  </legend>
                  {appliedPromo ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between rounded-none border border-emerald-500/40 bg-emerald-50/50 dark:bg-emerald-950/20 px-4 py-3">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                          <div>
                            <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 tracking-wider">
                              {appliedPromo.code}
                            </p>
                            <p className="text-[10px] text-emerald-600/80">
                              {appliedPromoLabel}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={removePromo}
                          className="ml-4 rounded-none p-1 text-muted-foreground hover:text-foreground transition-colors"
                          aria-label="Quitar código"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        Solo se aplica un código por compra. Quitá este para usar otro.
                      </p>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Input
                        ref={promoInputRef}
                        type="text"
                        placeholder="KWINNA20"
                        value={promoInput}
                        onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), applyPromoCode())}
                        className="rounded-none uppercase tracking-widest placeholder:normal-case placeholder:tracking-normal text-sm"
                        maxLength={50}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={applyPromoCode}
                        disabled={!promoInput.trim() || promoValidating}
                        className="rounded-none shrink-0 text-xs tracking-wider uppercase"
                      >
                        {promoValidating ? <Loader2 className="h-3 w-3 animate-spin" /> : "Aplicar"}
                      </Button>
                    </div>
                  )}
                </fieldset>

                {/* ── Contacto ─────────────────────────────────────── */}
                <fieldset className="space-y-5">
                  <legend className="mb-4 text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
                    Datos de contacto
                  </legend>

                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">
                          Nombre completo{" "}
                          <span className="text-destructive" aria-hidden>*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            placeholder="Ana García"
                            autoComplete="name"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="text-[11px]" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">
                          Email{" "}
                          <span className="text-destructive" aria-hidden>*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="ana@ejemplo.com"
                            autoComplete="email"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="text-[11px]" />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">
                            Teléfono{" "}
                            <span className="text-destructive" aria-hidden>*</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="tel"
                              placeholder="+54 299 4XX-XXXX"
                              autoComplete="tel"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage className="text-[11px]" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="dni"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">
                            DNI / CUIL{" "}
                            <span className="text-destructive" aria-hidden>*</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="text"
                              placeholder="12.345.678"
                              autoComplete="off"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage className="text-[11px]" />
                        </FormItem>
                      )}
                    />
                  </div>
                </fieldset>

                {/* ── Envío (solo en delivery) ──────────────────────── */}
                {!isPickup && (
                <fieldset className="space-y-5">
                  <legend className="mb-4 text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
                    Dirección de envío
                  </legend>

                  <FormField
                    control={form.control}
                    name="shippingAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">
                          Dirección{" "}
                          <span className="text-destructive" aria-hidden>*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            placeholder="Av. Corrientes 1234, Piso 3"
                            autoComplete="street-address"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="text-[11px]" />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {/* Provincia */}
                    <FormField
                      control={form.control}
                      name="shippingProvince"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">
                            Provincia{" "}
                            <span className="text-destructive" aria-hidden>*</span>
                          </FormLabel>
                          <Select
                            value={field.value}
                            disabled={loadingProvincias}
                            onValueChange={(nombre) => {
                              field.onChange(nombre);
                              // Guardar el ID para cargar municipios; resetear ciudad
                              const prov = provincias.find((p) => p.nombre === nombre);
                              setSelectedProvinciaId(prov?.id ?? "");
                              form.setValue("shippingCity", "", { shouldValidate: false });
                            }}
                          >
                            <FormControl>
                              <SelectTrigger className="text-sm">
                                <SelectValue
                                  placeholder={
                                    loadingProvincias ? "Cargando…" : "Seleccioná una provincia"
                                  }
                                />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="max-h-64">
                              {provincias.map((p) => (
                                <SelectItem key={p.id} value={p.nombre}>
                                  {p.nombre}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage className="text-[11px]" />
                        </FormItem>
                      )}
                    />

                    {/* Municipio / Ciudad */}
                    <FormField
                      control={form.control}
                      name="shippingCity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">
                            Ciudad{" "}
                            <span className="text-destructive" aria-hidden>*</span>
                          </FormLabel>
                          <Select
                            value={field.value}
                            disabled={!selectedProvinciaId || loadingMunicipios}
                            onValueChange={field.onChange}
                          >
                            <FormControl>
                              <SelectTrigger className="text-sm">
                                <SelectValue
                                  placeholder={
                                    !selectedProvinciaId
                                      ? "Primero elegí una provincia"
                                      : loadingMunicipios
                                      ? "Cargando…"
                                      : "Seleccioná una ciudad"
                                  }
                                />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="max-h-64">
                              {municipios.map((m) => (
                                <SelectItem key={m.id} value={m.nombre}>
                                  {m.nombre}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage className="text-[11px]" />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="shippingZipCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">
                          Código postal{" "}
                          <span className="text-destructive" aria-hidden>*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            placeholder="8300"
                            autoComplete="postal-code"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="text-[11px]" />
                      </FormItem>
                    )}
                  />
                </fieldset>
                )}

                {/* ── Submit — solo visible en desktop ─────────────── */}
                <Button
                  type="submit"
                  size="lg"
                  className="hidden lg:flex w-full rounded-none text-xs font-semibold tracking-widest uppercase border border-transparent hover:bg-transparent hover:border-foreground hover:text-foreground transition-all"
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

                <p className="hidden lg:block text-center text-[11px] leading-relaxed text-muted-foreground/60">
                  Al confirmar aceptás nuestros{" "}
                  <a href="/terms" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground transition-colors">
                    términos y política de privacidad
                  </a>.
                </p>

              </form>
            </Form>
          </section>

        </div>
      </div>

      {/* ── Barra sticky mobile (oculta en desktop) ──────────────────────────── */}
      {/* pb con env(safe-area-inset-bottom) respeta el home indicator en iOS */}
      <div
        className="fixed bottom-0 left-0 right-0 z-20 border-t border-border bg-background px-4 pt-4 lg:hidden"
        style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto max-w-5xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                {isPickup ? "Retiro en local · Gratis" : shipping.isKnown ? `Envío a ${shipping.label}` : "Total a pagar"}
              </p>
              <p className="text-xl font-normal tabular-nums text-foreground">
                ${grandTotal.toLocaleString("es-AR")}
              </p>
            </div>
          </div>
          <Button
            type="button"
            onClick={form.handleSubmit(onSubmit)}
            size="lg"
            className="w-full rounded-none text-xs font-semibold tracking-widest uppercase border border-transparent hover:bg-transparent hover:border-foreground hover:text-foreground transition-all"
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
          <p className="text-center text-[10px] text-muted-foreground/50">
            Al confirmar aceptás nuestros{" "}
            <a href="/terms" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground transition-colors">
              términos y política de privacidad
            </a>.
          </p>
        </div>
      </div>

    </main>
  );
}
