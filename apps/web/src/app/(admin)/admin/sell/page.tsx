"use client";

import { useState, useRef } from "react";
import { toast } from "sonner";
import {
  ShoppingCart, Plus, Minus, Trash2, Search, UserSearch,
  CheckCircle, Tag, ChevronUp, X, Receipt,
} from "lucide-react";
import type { CreditNote, PriceTier, Product, Sale, Stock } from "@kwinna/contracts";
import { applyPriceTier } from "@kwinna/contracts";
import { Button }    from "@/components/ui/button";
import { Input }     from "@/components/ui/input";
import { Label }     from "@/components/ui/label";
import { useProducts } from "@/hooks/use-products";
import { useStock }    from "@/hooks/use-stock";
import { useCreateSale } from "@/hooks/use-sale";
import { useAuthStore, selectUser } from "@/store/use-auth-store";
import { searchCustomers, createPosCustomer, fetchCreditNoteByCode } from "@/services/pos";
import type { CustomerSearchResult } from "@kwinna/contracts";
import type { SaleOrderInput } from "@/services/sale";

// ─── Constants ────────────────────────────────────────────────────────────────

const PAYMENT_OPTIONS = [
  { value: "efectivo",        label: "Efectivo"        },
  { value: "transferencia",   label: "Transferencia"   },
  { value: "debito",          label: "Débito"          },
  { value: "credito",         label: "Crédito"         },
  { value: "orden_de_compra", label: "Orden de compra" },
  { value: "por_devolucion",  label: "Por devolución"  },
] as const;

const TIER_CONFIG = {
  lista:     { label: "Lista",     color: "bg-primary text-primary-foreground",    inactive: "bg-muted text-muted-foreground hover:bg-muted/80" },
  efectivo:  { label: "Efectivo",  color: "bg-emerald-600 text-white",             inactive: "bg-muted text-emerald-600 hover:bg-muted/80" },
  mayorista: { label: "Mayorista", color: "bg-amber-500 text-white",               inactive: "bg-muted text-amber-600 hover:bg-muted/80" },
} as const;

// ─── Types ────────────────────────────────────────────────────────────────────

type CartItem = {
  productId: string;
  name:      string;
  size?:     string;
  quantity:  number;
  basePrice: number;
};

type NewCustomerForm = {
  name:     string;
  dni:      string;
  phone:    string;
  email:    string;
  address:  string;
  city:     string;
  province: string;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency", currency: "ARS",
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(n);
}

function txCode(id: string): string {
  return id.replace(/-/g, "").slice(0, 10).toUpperCase();
}

function stockForProduct(stock: Stock[], productId: string): Stock[] {
  return stock.filter((s) => s.productId === productId && s.quantity > 0);
}

// ─── Subcomponents ────────────────────────────────────────────────────────────

function SizePicker({
  sizes,
  onPick,
  onClose,
}: {
  sizes: Stock[];
  onPick: (size?: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {sizes.map((s) => (
        <button
          key={s.size ?? "uni"}
          type="button"
          onClick={() => onPick(s.size ?? undefined)}
          className="rounded border border-border bg-muted px-2.5 py-1 text-xs font-medium hover:bg-primary hover:text-primary-foreground transition-colors"
        >
          {s.size ?? "Único"} <span className="text-muted-foreground">({s.quantity})</span>
        </button>
      ))}
      <button
        type="button"
        onClick={onClose}
        className="ml-1 text-muted-foreground hover:text-foreground"
        aria-label="Cerrar"
      >
        <X size={14} />
      </button>
    </div>
  );
}

function ProductRow({
  product,
  tier,
  stockRows,
  onAdd,
}: {
  product: Product;
  tier: PriceTier;
  stockRows: Stock[];
  onAdd: (productId: string, name: string, basePrice: number, size?: string) => void;
}) {
  const [picking, setPicking] = useState(false);
  const sizes = stockForProduct(stockRows, product.id);
  const hasStock = sizes.length > 0;

  function handleClick() {
    if (!hasStock) return;
    if (sizes.length === 1 && !sizes[0].size) {
      onAdd(product.id, product.name, product.price);
    } else {
      setPicking((p) => !p);
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2.5">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{product.name}</p>
          <p className="text-xs text-muted-foreground">{fmt(applyPriceTier(product.price, tier))}</p>
        </div>
        <button
          type="button"
          onClick={handleClick}
          disabled={!hasStock}
          className="flex shrink-0 items-center gap-1 rounded-md border border-border bg-muted px-2 py-1 text-xs font-medium transition-colors hover:bg-primary hover:text-primary-foreground disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {picking ? <ChevronUp size={12} /> : <Plus size={12} />}
          {!hasStock ? "Sin stock" : picking ? "Cancelar" : "Agregar"}
        </button>
      </div>
      {picking && (
        <SizePicker
          sizes={sizes}
          onPick={(size) => {
            onAdd(product.id, product.name, product.price, size);
            setPicking(false);
          }}
          onClose={() => setPicking(false)}
        />
      )}
    </div>
  );
}

// ─── Customer search panel ────────────────────────────────────────────────────

function CustomerPanel({
  selected,
  onSelect,
  onClear,
}: {
  selected: CustomerSearchResult | null;
  onSelect: (c: CustomerSearchResult) => void;
  onClear: () => void;
}) {
  const [q, setQ]           = useState("");
  const [results, setRes]   = useState<CustomerSearchResult[]>([]);
  const [loading, setLoad]  = useState(false);
  const [showNew, setNew]   = useState(false);
  const [form, setForm]     = useState<NewCustomerForm>({ name: "", dni: "", phone: "", email: "", address: "", city: "", province: "" });
  const [saving, setSaving] = useState(false);
  const timerRef            = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleSearch(v: string) {
    setQ(v);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (v.trim().length < 2) { setRes([]); return; }
    timerRef.current = setTimeout(async () => {
      setLoad(true);
      try {
        setRes(await searchCustomers(v.trim()));
      } catch {
        setRes([]);
      } finally {
        setLoad(false);
      }
    }, 350);
  }

  async function handleCreate() {
    if (!form.name || !form.dni || !form.phone) {
      toast.error("Nombre, DNI y teléfono son obligatorios");
      return;
    }
    setSaving(true);
    try {
      const customer = await createPosCustomer({
        name:     form.name,
        dni:      form.dni,
        phone:    form.phone,
        email:    form.email || undefined,
        address:  form.address || undefined,
        city:     form.city || undefined,
        province: form.province || undefined,
      });
      onSelect({
        source:   "pos",
        id:       customer.id,
        name:     customer.name,
        email:    customer.email,
        phone:    customer.phone,
        dni:      customer.dni,
        address:  customer.address,
        city:     customer.city,
        province: customer.province,
      });
      setNew(false);
      setQ("");
      setRes([]);
    } catch (err) {
      toast.error("Error al crear cliente", { description: err instanceof Error ? err.message : undefined });
    } finally {
      setSaving(false);
    }
  }

  if (selected) {
    return (
      <div className="rounded-lg border border-border bg-muted/40 px-3 py-2.5 flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{selected.name}</p>
          <p className="text-xs text-muted-foreground">
            {[selected.dni && `DNI ${selected.dni}`, selected.phone].filter(Boolean).join(" · ")}
          </p>
        </div>
        <button type="button" onClick={onClear} className="text-muted-foreground hover:text-foreground">
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <UserSearch size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre o DNI…"
          value={q}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-8 h-8 text-sm"
        />
      </div>

      {results.length > 0 && (
        <div className="rounded-lg border border-border bg-card divide-y divide-border overflow-hidden">
          {results.slice(0, 5).map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => { onSelect(r); setQ(""); setRes([]); }}
              className="w-full text-left px-3 py-2 hover:bg-muted transition-colors"
            >
              <p className="text-sm font-medium">{r.name}</p>
              <p className="text-xs text-muted-foreground">
                {[r.dni && `DNI ${r.dni}`, r.phone].filter(Boolean).join(" · ")}
              </p>
            </button>
          ))}
        </div>
      )}

      {loading && <p className="text-xs text-muted-foreground">Buscando…</p>}

      <button
        type="button"
        onClick={() => setNew((s) => !s)}
        className="text-xs text-primary hover:underline"
      >
        {showNew ? "Cancelar" : "+ Nuevo cliente POS"}
      </button>

      {showNew && (
        <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="col-span-2">
              <Label className="text-xs">Nombre *</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="h-8 text-sm mt-1" />
            </div>
            <div>
              <Label className="text-xs">DNI *</Label>
              <Input value={form.dni} onChange={(e) => setForm((f) => ({ ...f, dni: e.target.value }))} className="h-8 text-sm mt-1" />
            </div>
            <div>
              <Label className="text-xs">Teléfono *</Label>
              <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} className="h-8 text-sm mt-1" />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className="h-8 text-sm mt-1" />
            </div>
          </div>
          <Button size="sm" onClick={handleCreate} disabled={saving} className="w-full">
            {saving ? "Guardando…" : "Crear cliente"}
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Credit note panel ────────────────────────────────────────────────────────

function CreditNotePanel({
  applied,
  onApply,
  onRemove,
}: {
  applied: CreditNote | null;
  onApply: (cn: CreditNote) => void;
  onRemove: () => void;
}) {
  const [code, setCode]       = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLookup() {
    if (!code.trim()) return;
    setLoading(true);
    try {
      const cn = await fetchCreditNoteByCode(code.trim());
      if (cn.status !== "active") {
        toast.error("Nota de crédito no disponible", { description: `Estado: ${cn.status}` });
        return;
      }
      onApply(cn);
      setCode("");
    } catch {
      toast.error("Código no encontrado");
    } finally {
      setLoading(false);
    }
  }

  if (applied) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30 px-3 py-2 flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">{applied.code}</p>
          <p className="text-xs text-emerald-600 dark:text-emerald-500">Crédito: {fmt(applied.amount)}</p>
        </div>
        <button type="button" onClick={onRemove} className="text-emerald-600 hover:text-emerald-800 dark:hover:text-emerald-300">
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <Input
        placeholder="NC-XXXXXX"
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        onKeyDown={(e) => e.key === "Enter" && handleLookup()}
        className="h-8 text-sm font-mono uppercase"
      />
      <Button size="sm" variant="outline" onClick={handleLookup} disabled={loading || !code.trim()} className="shrink-0">
        {loading ? "…" : "Aplicar"}
      </Button>
    </div>
  );
}

// ─── Success screen ───────────────────────────────────────────────────────────

function SaleSuccess({
  sale,
  items,
  customer,
  paymentLabel,
  onReset,
}: {
  sale: Sale;
  items: CartItem[];
  customer: string;
  paymentLabel: string;
  onReset: () => void;
}) {
  const code = txCode(sale.id);
  return (
    <div className="flex flex-col items-center gap-6 py-12 px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
        <CheckCircle className="h-9 w-9 text-emerald-600" />
      </div>

      <div>
        <h2 className="text-xl font-semibold text-foreground">Venta registrada</h2>
        <p className="mt-1 text-sm text-muted-foreground">N° transacción: <strong className="font-mono text-foreground">{code}</strong></p>
      </div>

      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-4 text-left space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Cliente</span>
          <span className="font-medium">{customer}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Pago</span>
          <span className="font-medium">{paymentLabel}</span>
        </div>
        <div className="border-t border-border pt-2 space-y-1">
          {items.map((item, i) => (
            <div key={i} className="flex justify-between text-xs">
              <span className="text-muted-foreground">{item.quantity}× {item.name}{item.size ? ` (${item.size})` : ""}</span>
            </div>
          ))}
        </div>
        <div className="flex justify-between text-sm font-semibold border-t border-border pt-2">
          <span>TOTAL</span>
          <span>{fmt(sale.total)}</span>
        </div>
      </div>

      <Button onClick={onReset} className="gap-2">
        <ShoppingCart size={16} />
        Nueva venta
      </Button>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SellPage() {
  const user     = useAuthStore(selectUser);
  const vendorId = user?.id;

  // ── Data ──────────────────────────────────────────────────────────────────
  const [productSearch, setProductSearch] = useState("");
  const { products, isLoading: loadingProducts } = useProducts();
  const { stock,    isLoading: loadingStock    } = useStock();

  // ── Cart ──────────────────────────────────────────────────────────────────
  const [cart, setCart]   = useState<CartItem[]>([]);
  const [tier, setTier]   = useState<PriceTier>("lista");

  // ── Customer ──────────────────────────────────────────────────────────────
  const [customer, setCustomer] = useState<CustomerSearchResult | null>(null);

  // ── Payment ───────────────────────────────────────────────────────────────
  const [paymentMethod, setPaymentMethod] = useState("efectivo");

  // ── Credit note ───────────────────────────────────────────────────────────
  const [creditNote, setCreditNote] = useState<CreditNote | null>(null);

  // ── Notes ─────────────────────────────────────────────────────────────────
  const [notes, setNotes] = useState("");

  // ── Sale result ───────────────────────────────────────────────────────────
  const [doneSale, setDoneSale] = useState<Sale | null>(null);

  // ── Mutation ──────────────────────────────────────────────────────────────
  const { mutateAsync, isPending } = useCreateSale();

  // ── Derived ───────────────────────────────────────────────────────────────
  const filteredProducts = productSearch.trim().length >= 1
    ? products.filter((p) =>
        p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
        (p.sku ?? "").toLowerCase().includes(productSearch.toLowerCase())
      )
    : products;

  const cartTotal = cart.reduce((sum, item) => sum + applyPriceTier(item.basePrice, tier) * item.quantity, 0);
  const creditApplied = creditNote ? Math.min(creditNote.amount, cartTotal) : 0;
  const finalTotal = Math.max(0, cartTotal - creditApplied);

  // ── Cart actions ──────────────────────────────────────────────────────────
  function addToCart(productId: string, name: string, basePrice: number, size?: string) {
    setCart((prev) => {
      const key = productId + (size ?? "");
      const existing = prev.find((i) => i.productId + (i.size ?? "") === key);
      if (existing) {
        return prev.map((i) =>
          i.productId + (i.size ?? "") === key ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { productId, name, size, quantity: 1, basePrice }];
    });
  }

  function updateQty(key: string, delta: number) {
    setCart((prev) =>
      prev
        .map((i) => i.productId + (i.size ?? "") === key ? { ...i, quantity: i.quantity + delta } : i)
        .filter((i) => i.quantity > 0)
    );
  }

  function removeItem(key: string) {
    setCart((prev) => prev.filter((i) => i.productId + (i.size ?? "") !== key));
  }

  // ── Confirm sale ──────────────────────────────────────────────────────────
  async function handleConfirm() {
    if (cart.length === 0) {
      toast.error("El carrito está vacío");
      return;
    }

    const customerName  = customer?.name  ?? "Venta en tienda";
    const customerEmail = customer?.email ?? "pos@kwinna.com";
    const posCustomerId = customer?.source === "pos" ? customer.id : undefined;
    const userId        = customer?.source === "web" ? customer.id : undefined;

    const payload: SaleOrderInput = {
      items:         cart.map((i) => ({ productId: i.productId, quantity: i.quantity, size: i.size })),
      customerName,
      customerEmail,
      customerPhone:    customer?.phone    ?? undefined,
      customerDni:      customer?.dni      ?? undefined,
      shippingAddress:  customer?.address  ?? "Local",
      shippingCity:     customer?.city     ?? "Neuquén",
      shippingProvince: customer?.province ?? "Neuquén",
      channel:          "pos",
      paymentMethod:    paymentMethod as SaleOrderInput["paymentMethod"],
      priceTier:        tier,
      saleNotes:        notes || undefined,
      vendorId,
      posCustomerId,
      userId,
      creditNoteId: creditNote?.id,
    };

    try {
      const res = await mutateAsync(payload);
      setDoneSale(res.data);
    } catch (err) {
      toast.error("Error al registrar la venta", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  }

  // ── Reset ─────────────────────────────────────────────────────────────────
  function handleReset() {
    setCart([]);
    setCustomer(null);
    setPaymentMethod("efectivo");
    setCreditNote(null);
    setNotes("");
    setProductSearch("");
    setDoneSale(null);
  }

  // ─────────────────────────────────────────────────────────────────────────
  if (doneSale) {
    const payLabel = PAYMENT_OPTIONS.find((p) => p.value === paymentMethod)?.label ?? paymentMethod;
    return (
      <SaleSuccess
        sale={doneSale}
        items={cart}
        customer={customer?.name ?? "Venta en tienda"}
        paymentLabel={payLabel}
        onReset={handleReset}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6 lg:flex-row lg:items-start lg:gap-8">

      {/* ── Left: products + cart ───────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 lg:flex-1 min-w-0">

        {/* Product search */}
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar producto…"
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Product list */}
        <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
          {loadingProducts || loadingStock ? (
            <p className="text-sm text-muted-foreground px-1">Cargando…</p>
          ) : filteredProducts.length === 0 ? (
            <p className="text-sm text-muted-foreground px-1">Sin resultados</p>
          ) : (
            filteredProducts.slice(0, 30).map((product) => (
              <ProductRow
                key={product.id}
                product={product}
                tier={tier}
                stockRows={stock}
                onAdd={addToCart}
              />
            ))
          )}
        </div>

        {/* Cart */}
        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <ShoppingCart size={15} />
              Carrito {cart.length > 0 && <span className="text-muted-foreground font-normal">({cart.length} líneas)</span>}
            </h2>
            {cart.length > 0 && (
              <button
                type="button"
                onClick={() => setCart([])}
                className="text-xs text-muted-foreground hover:text-destructive"
              >
                Vaciar
              </button>
            )}
          </div>

          {cart.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Agregá productos para comenzar</p>
          ) : (
            <div className="divide-y divide-border">
              {cart.map((item) => {
                const key       = item.productId + (item.size ?? "");
                const unitPrice = applyPriceTier(item.basePrice, tier);
                return (
                  <div key={key} className="flex items-center gap-3 px-4 py-2.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {item.name}{item.size ? <span className="ml-1 text-xs text-muted-foreground">({item.size})</span> : null}
                      </p>
                      <p className="text-xs text-muted-foreground">{fmt(unitPrice)} c/u</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => updateQty(key, -1)}
                        className="flex h-6 w-6 items-center justify-center rounded border border-border hover:bg-muted"
                      >
                        <Minus size={11} />
                      </button>
                      <span className="w-5 text-center text-sm">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateQty(key, 1)}
                        className="flex h-6 w-6 items-center justify-center rounded border border-border hover:bg-muted"
                      >
                        <Plus size={11} />
                      </button>
                    </div>
                    <p className="w-20 text-right text-sm font-medium">{fmt(unitPrice * item.quantity)}</p>
                    <button
                      type="button"
                      onClick={() => removeItem(key)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Right: config + confirm ─────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 lg:w-80 lg:shrink-0">

        {/* Price tier */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <h3 className="text-sm font-semibold">Precio</h3>
          <div className="flex rounded-lg overflow-hidden border border-border">
            {(["lista", "efectivo", "mayorista"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTier(t)}
                className={`flex-1 py-1.5 text-xs font-medium transition-colors ${tier === t ? TIER_CONFIG[t].color : TIER_CONFIG[t].inactive} ${t !== "lista" ? "border-l border-border" : ""}`}
              >
                {TIER_CONFIG[t].label}
              </button>
            ))}
          </div>
        </div>

        {/* Total */}
        <div className="rounded-xl border border-border bg-card px-4 py-3 space-y-1.5">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Subtotal</span>
            <span>{fmt(cartTotal)}</span>
          </div>
          {creditApplied > 0 && (
            <div className="flex justify-between text-sm text-emerald-600">
              <span>Crédito NC</span>
              <span>−{fmt(creditApplied)}</span>
            </div>
          )}
          <div className="flex justify-between font-semibold text-base border-t border-border pt-1.5">
            <span>Total</span>
            <span>{fmt(finalTotal)}</span>
          </div>
        </div>

        {/* Customer */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <h3 className="text-sm font-semibold">Cliente</h3>
          <CustomerPanel
            selected={customer}
            onSelect={setCustomer}
            onClear={() => setCustomer(null)}
          />
          {!customer && (
            <p className="text-xs text-muted-foreground">Si no seleccionás cliente se registrará como «Venta en tienda»</p>
          )}
        </div>

        {/* Payment method */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <h3 className="text-sm font-semibold">Método de pago</h3>
          <div className="grid grid-cols-2 gap-1.5">
            {PAYMENT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setPaymentMethod(opt.value)}
                className={`rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors text-left ${paymentMethod === opt.value ? "border-primary bg-primary/10 text-primary" : "border-border bg-muted/40 text-muted-foreground hover:bg-muted"}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Credit note */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-1.5">
            <Tag size={13} />
            Nota de crédito
          </h3>
          <CreditNotePanel
            applied={creditNote}
            onApply={setCreditNote}
            onRemove={() => setCreditNote(null)}
          />
        </div>

        {/* Notes */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-2">
          <h3 className="text-sm font-semibold">Notas de venta</h3>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Observaciones opcionales…"
            rows={2}
            className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        {/* Confirm */}
        <Button
          size="lg"
          onClick={handleConfirm}
          disabled={isPending || cart.length === 0}
          className="w-full gap-2 text-base"
        >
          <Receipt size={18} />
          {isPending ? "Registrando…" : `Confirmar venta · ${fmt(finalTotal)}`}
        </Button>
      </div>

    </div>
  );
}
