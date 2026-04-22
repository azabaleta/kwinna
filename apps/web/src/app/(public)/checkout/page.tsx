"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, ShoppingBag, Trash2, Truck } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { SaleOrderInput } from "@kwinna/contracts";
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
  type CheckoutFormValues,
} from "@/schemas/checkout";
import { trackEvent } from "@/services/analytics";
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
// Mapa ciudad normalizada → costo de envío en ARS.
// Solo las ciudades listadas aquí tienen envío configurado.

function normalize(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

const SHIPPING_COSTS: Record<string, number> = {
  neuquen:  3500,
  plottier: 5000,
};

interface ShippingInfo {
  cost:    number;
  label:   string;
  isKnown: boolean;
}

function computeShipping(city: string): ShippingInfo {
  const raw = city.trim();
  if (!raw) return { cost: 0, label: "", isKnown: false };

  const key  = normalize(raw);
  const cost = SHIPPING_COSTS[key];

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

  // checkout_start: el usuario llegó al checkout con ítems en el carrito
  useEffect(() => { trackEvent("checkout_start"); }, []);

  // ── React Hook Form ───────────────────────────────────────────────────────

  const form = useForm<CheckoutFormValues>({
    resolver: zodResolver(CheckoutFormSchema),
    defaultValues: {
      name:             user?.name  ?? "",
      email:            user?.email ?? "",
      phone:            "",
      shippingAddress:  "",
      shippingCity:     "",
      shippingProvince: "",
    },
  });

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

  const shippingCity = form.watch("shippingCity");
  const shipping     = computeShipping(shippingCity);
  const grandTotal   = cartTotal + shipping.cost;

  // ── Submit ────────────────────────────────────────────────────────────────

  async function onSubmit(values: CheckoutFormValues) {
    const salePayload: SaleOrderInput = {
      items: items.map(({ product, quantity, size }) => ({
        productId: product.id,
        quantity,
        size,
      })),
      customerName:     values.name,
      customerEmail:    values.email,
      customerPhone:    values.phone || undefined,
      shippingAddress:  values.shippingAddress,
      shippingCity:     values.shippingCity,
      shippingProvince: values.shippingProvince,
      userId:           user?.id,
    };

    try {
      const { data } = await mutateAsync(salePayload);

      if (!isMercadoPagoUrl(data.initPoint)) {
        toast.error("Error en la compra", { description: "URL de pago inválida. Contactá soporte." });
        return;
      }

      trackEvent("sale_complete");
      clearCart();
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
          <Button asChild variant="outline" className="rounded-none px-6 text-xs tracking-widest uppercase">
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
                  <div className="h-16 w-12 shrink-0 rounded-none bg-primary/10" />

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
              {shipping.isKnown && (
                <div className="flex items-center gap-4 border-b border-border/40 py-4 last:border-0">
                  <div className="flex h-16 w-12 shrink-0 items-center justify-center rounded-none bg-muted/50">
                    <Truck className="h-4 w-4 text-foreground/50" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-normal uppercase tracking-wide text-foreground">
                      Envío a domicilio
                    </p>
                    <p className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">
                      {shipping.label}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-normal tabular-nums text-foreground">
                    ${shipping.cost.toLocaleString("es-AR")}
                  </p>
                </div>
              )}
            </div>

            {/* ── Totales ───────────────────────────────────────────────────── */}
            <div className="mt-5 space-y-2 border-t border-border/50 pt-5">
              {shipping.isKnown && (
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span className="text-[11px] tracking-wide uppercase">Productos</span>
                  <span className="tabular-nums">${cartTotal.toLocaleString("es-AR")}</span>
                </div>
              )}
              {shipping.isKnown && (
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span className="text-[11px] tracking-wide uppercase">Envío</span>
                  <span className="tabular-nums text-emerald-600">
                    +${shipping.cost.toLocaleString("es-AR")}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between">
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
                onSubmit={form.handleSubmit(onSubmit)}
                noValidate
                className="space-y-8"
              >

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

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">
                          Teléfono{" "}
                          <span className="text-[11px] font-normal text-muted-foreground">
                            (opcional)
                          </span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="tel"
                            placeholder="+54 11 1234-5678"
                            autoComplete="tel"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="text-[11px]" />
                      </FormItem>
                    )}
                  />
                </fieldset>

                {/* ── Envío ────────────────────────────────────────── */}
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
                </fieldset>

                {/* ── Submit ───────────────────────────────────────── */}
                <Button
                  type="submit"
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

                <p className="text-center text-[11px] leading-relaxed text-muted-foreground/60">
                  Al confirmar aceptás nuestros términos y política de privacidad.
                </p>

              </form>
            </Form>
          </section>

        </div>
      </div>
    </main>
  );
}
