import { useRef, useState } from "react";
import { Search, X, Plus, Minus, ShoppingCart, AlertTriangle, CheckCircle2, Printer, RefreshCw, UserRound, UserPlus, ChevronDown, Banknote, FileText, Gift, Tag } from "lucide-react";
import type { Product, Stock, PriceTier, PaymentMethod, PaymentSplit, CustomerSearchResult } from "@kwinna/contracts";
import { applyPriceTier, paymentMethodsForTier } from "@kwinna/contracts";
import type { CartItem, CustomCartItem } from "../store/use-pos-store";
import { usePosStore } from "../store/use-pos-store";
import { useProducts } from "../hooks/use-products";
import { useStock, useInvalidateStock } from "../hooks/use-stock";
import { createPosSale } from "../services/sales";
import { createPosCustomer } from "../services/pos-customers";
import { useCustomerSearch } from "../hooks/use-customer-search";
import { useAuthStore } from "../store/use-auth-store";
import { formatPrice, formatRoundedPrice, matchProduct, normalize } from "../lib/utils";
import { ApiError } from "../lib/api";
import ReceiptTicket from "../components/ReceiptTicket";
import type { ReceiptData } from "../components/ReceiptTicket";
import CreditNote from "../components/CreditNote";
import type { CreditNoteData } from "../components/CreditNote";
import BarcodeScannerButton from "../components/BarcodeScannerButton";

const PAYMENT_METHODS = [
  { label: "Efectivo",        value: "efectivo"        },
  { label: "Transferencia",   value: "transferencia"   },
  { label: "Débito",          value: "debito"          },
  { label: "Crédito",         value: "credito"         },
  { label: "Orden de compra", value: "orden_de_compra" },
  { label: "Por devolución",  value: "por_devolucion"  },
];
const PROVINCES = [
  "Buenos Aires", "CABA", "Catamarca", "Chaco", "Chubut", "Córdoba", "Corrientes",
  "Entre Ríos", "Formosa", "Jujuy", "La Pampa", "La Rioja", "Mendoza", "Misiones",
  "Neuquén", "Río Negro", "Salta", "San Juan", "San Luis", "Santa Cruz",
  "Santa Fe", "Santiago del Estero", "Tierra del Fuego", "Tucumán",
];

// ─── SKU lookup bar ───────────────────────────────────────────────────────────

function SkuBar({
  products,
  stock,
  cart,
  onAdd,
}: {
  products: Product[];
  stock:    Stock[];
  cart:     CartItem[];
  onAdd:    (p: Product, size?: string) => void;
}) {
  const [sku,     setSku]     = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [warn,    setWarn]    = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function getStock(productId: string, size?: string): number {
    const rows = stock.filter((s) => s.productId === productId);
    if (size) return rows.find((s) => s.size === size)?.quantity ?? 0;
    return rows.reduce((sum, r) => sum + r.quantity, 0);
  }

  function getCartQty(productId: string, size?: string): number {
    return cart
      .filter((i) => i.product.id === productId && (size ? i.size === size : !i.size))
      .reduce((n, i) => n + i.quantity, 0);
  }

  function performSearch(query: string) {
    if (!query.trim()) return;

    const exact = products.find((p) => normalize(p.sku) === normalize(query));
    if (exact) {
      setWarn("");
      setResults([exact]);
      return;
    }

    const matches = products.filter((p) => matchProduct(p.name, p.sku, query));
    if (matches.length === 0) {
      setResults([]);
      setWarn(`No se encontró nada para "${query}".`);
      return;
    }

    setWarn("");
    setResults(matches);
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    performSearch(sku);
  }

  function addProduct(product: Product, size?: string) {
    const avail  = getStock(product.id, size);
    const inCart = getCartQty(product.id, size);

    if (avail <= 0) {
      setWarn(`Sin stock para talle ${size ?? "único"}.`);
      return;
    }
    if (inCart >= avail) {
      setWarn(
        size
          ? `Talle ${size}: ya tenés las ${avail} unidades disponibles en el carrito.`
          : `Ya tenés las ${avail} unidades disponibles en el carrito.`
      );
      return;
    }
    onAdd(product, size);
    setSku("");
    setResults([]);
    setWarn("");
    inputRef.current?.focus();
  }

  return (
    <div className="flex flex-col gap-2">
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            ref={inputRef}
            autoFocus
            value={sku}
            onChange={(e) => { setSku(e.target.value); setWarn(""); setResults([]); }}
            placeholder="Buscar por SKU o nombre..."
            className="w-full bg-zinc-900 text-white rounded-lg pl-9 pr-4 py-2.5 text-sm
                       border border-zinc-800 focus:border-zinc-600 outline-none transition-colors"
          />
        </div>
        <BarcodeScannerButton onScan={(code) => { setSku(code); performSearch(code); inputRef.current?.focus(); }} />
        <button
          type="submit"
          className="bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg px-4 text-sm
                     font-medium transition-colors"
        >
          Buscar
        </button>
      </form>

      {warn && (
        <div className="flex items-center gap-2 text-amber-400 text-sm bg-amber-950/30
                        border border-amber-900/30 rounded-lg px-3 py-2">
          <AlertTriangle size={14} /> {warn}
        </div>
      )}

      {results.length > 0 && (
        <div className="flex flex-col gap-3">
          {results.map((result) => (
            <div key={result.id} className="bg-zinc-900 border border-zinc-700 rounded-xl p-4">
              <div className="flex items-start gap-3">
                {result.images[0] && (
                  <img src={result.images[0]} alt="" className="w-12 h-12 rounded-lg object-cover" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-white">{result.name}</p>
                    {result.showInShop === false && (
                      <span className="text-[9px] bg-violet-600/90 text-white px-1.5 py-0.5 rounded font-medium whitespace-nowrap">
                        Exclusivo tienda
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-500">{result.sku}</p>
                  <div className="flex gap-3 text-[11px] mt-1 bg-zinc-950/50 rounded p-1.5 border border-zinc-800">
                    <span className="text-zinc-400">Lista: <span className="text-zinc-200">{formatRoundedPrice(result.price)}</span></span>
                    <span className="text-emerald-400 font-medium">Efvo: {formatPrice(applyPriceTier(result.price, "efectivo"))}</span>
                    <span className="text-amber-400 font-medium">May: {formatPrice(applyPriceTier(result.price, "mayorista"))}</span>
                  </div>
                  {/* Sizes */}
                  {(() => {
                    const sizeRows = stock
                      .filter((s) => s.productId === result.id && s.size && s.quantity > 0)
                      .map((s) => ({ size: s.size!, qty: s.quantity }));
                    const noSizeStock = getStock(result.id, "");

                    if (sizeRows.length > 0) {
                      return (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {sizeRows.map(({ size: sz, qty }) => (
                            <button
                              key={sz}
                              onClick={() => addProduct(result, sz)}
                              className={`group text-xs bg-zinc-800 hover:bg-white hover:text-zinc-900
                                          text-white rounded px-2 py-1 transition-colors font-medium
                                          flex items-center gap-1
                                          ${qty <= 3 ? "ring-1 ring-amber-600/50" : ""}`}
                            >
                              {sz}
                              <span className={`text-[9px] tabular-nums group-hover:text-zinc-500 ${
                                qty <= 3 ? "text-amber-400" : "text-zinc-500"
                              }`}>
                                ×{qty}
                              </span>
                            </button>
                          ))}
                        </div>
                      );
                    }
                    return (
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          onClick={() => addProduct(result)}
                          disabled={noSizeStock <= 0}
                          className="text-xs bg-white text-zinc-900 rounded px-3 py-1
                                     hover:bg-zinc-100 transition-colors font-medium disabled:opacity-40"
                        >
                          {noSizeStock <= 0 ? "Sin stock" : "Agregar al carrito"}
                        </button>
                        {noSizeStock > 0 && (
                          <span className={`text-[10px] tabular-nums ${
                            noSizeStock <= 3 ? "text-amber-400" : "text-zinc-500"
                          }`}>
                            ×{noSizeStock} disponibles
                          </span>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Free item panel ──────────────────────────────────────────────────────────
// Formulario inline para agregar artículos sin SKU a la venta.
// Touch-friendly: inputs grandes, Enter confirma para flujo rápido de caja.

function FreeItemPanel({
  onAdd,
  onClose,
}: {
  onAdd:   (item: { description: string; unitPrice: number }) => void;
  onClose: () => void;
}) {
  const [description, setDescription] = useState("");
  const [price,       setPrice]       = useState("");

  const parsedPrice = parseFloat(price);
  const isValid     = description.trim().length > 0 && !isNaN(parsedPrice) && parsedPrice > 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;
    onAdd({ description: description.trim(), unitPrice: parsedPrice });
    setDescription("");
    setPrice("");
    // Mantiene el panel abierto para agregar otro artículo libre consecutivo
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-2 flex flex-col gap-3 bg-violet-950/40 border border-violet-700/50
                 rounded-xl p-4"
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-violet-300 flex items-center gap-1.5">
          <Tag size={12} />
          Artículo libre
        </p>
        <button
          type="button"
          onClick={onClose}
          className="text-zinc-500 hover:text-white transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      <input
        autoFocus
        type="text"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Descripción del artículo (ej: Buzo verde talle M)"
        maxLength={200}
        className="bg-zinc-800 text-white rounded-lg px-3 py-2.5 text-sm w-full outline-none
                   border border-zinc-700 focus:border-violet-600 transition-colors
                   placeholder:text-zinc-500"
      />

      <div className="flex gap-2">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm select-none">
            $
          </span>
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="0"
            min={1}
            // "any" — un step numérico ancla la validación nativa en min={1}
            // (solo acepta 1, 101, 201…) y rechaza precios válidos como 10000.
            step="any"
            className="bg-zinc-800 text-white rounded-lg pl-7 pr-3 py-2.5 text-sm w-full
                       outline-none border border-zinc-700 focus:border-violet-600
                       transition-colors placeholder:text-zinc-500"
          />
        </div>
        <button
          type="submit"
          disabled={!isValid}
          className="bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed
                     text-white rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors
                     flex items-center gap-1.5 whitespace-nowrap"
        >
          <Plus size={14} />
          Agregar
        </button>
      </div>

      <p className="text-[10px] text-zinc-600">
        Este artículo no descuenta stock. Precio aplicado según la lista de precios activa.
      </p>
    </form>
  );
}

// ─── Custom cart row ──────────────────────────────────────────────────────────
// Fila de carrito para artículos libres — sin imagen, sin validación de stock.

function CustomCartRow({
  item,
  onRemove,
  onDelta,
}: {
  item:      CustomCartItem;
  onRemove:  () => void;
  onDelta:   (d: number) => void;
}) {
  // Precio manual — nunca afectado por la lista de precios.
  const unitPrice = item.unitPrice;

  return (
    <div className="flex items-center gap-3 py-3 border-b border-zinc-800 last:border-0">
      <div className="w-10 h-10 rounded-lg bg-violet-900/40 border border-violet-700/40
                      flex items-center justify-center flex-shrink-0">
        <Tag size={14} className="text-violet-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white leading-tight truncate">{item.description}</p>
        <p className="text-[10px] text-violet-400 font-medium tracking-wide mt-0.5">
          Artículo libre
        </p>
      </div>
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onDelta(-1)}
          className="w-6 h-6 rounded bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center"
        >
          <Minus size={11} />
        </button>
        <span className="text-sm text-white tabular-nums w-7 text-center">{item.quantity}</span>
        <button
          onClick={() => onDelta(1)}
          className="w-6 h-6 rounded bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center"
        >
          <Plus size={11} />
        </button>
      </div>
      <span className="text-sm font-medium text-white w-20 text-right">
        {formatPrice(unitPrice * item.quantity)}
      </span>
      <button onClick={onRemove} className="text-zinc-600 hover:text-red-400 transition-colors">
        <X size={15} />
      </button>
    </div>
  );
}

// ─── Cart row ─────────────────────────────────────────────────────────────────

function CartRow({
  item,
  onRemove,
  onDelta,
  priceTier,
  availableStock,
}: {
  item:           ReturnType<typeof usePosStore.getState>["cart"][number];
  onRemove:       () => void;
  onDelta:        (d: number) => void;
  priceTier:      PriceTier;
  availableStock: number;
}) {
  const unitPrice = applyPriceTier(item.product.price, priceTier);

  const atMax = item.quantity >= availableStock;

  return (
    <div className="flex items-center gap-3 py-3 border-b border-zinc-800 last:border-0">
      {item.product.images[0] && (
        <img src={item.product.images[0]} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white leading-tight truncate">{item.product.name}</p>
        <p className="text-xs text-zinc-500">{item.product.sku}{item.size ? ` · T.${item.size}` : ""}</p>
      </div>
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onDelta(-1)}
          className="w-6 h-6 rounded bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center"
        >
          <Minus size={11} />
        </button>
        <div className="flex flex-col items-center w-7">
          <span className="text-sm text-white tabular-nums leading-none">{item.quantity}</span>
          {atMax && (
            <span className="text-[8px] text-amber-400 leading-none mt-0.5 whitespace-nowrap">máx.</span>
          )}
        </div>
        <button
          onClick={() => onDelta(1)}
          disabled={atMax}
          className="w-6 h-6 rounded bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center
                     disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Plus size={11} />
        </button>
      </div>
      <span className="text-sm font-medium text-white w-20 text-right">
        {formatPrice(unitPrice * item.quantity)}
      </span>
      <button onClick={onRemove} className="text-zinc-600 hover:text-red-400 transition-colors">
        <X size={15} />
      </button>
    </div>
  );
}

// ─── Order modal ──────────────────────────────────────────────────────────────

type CustomerMode = "search" | "new";

function OrderModal({
  total,
  returnCreditAmount = 0,
  priceTier,
  onClose,
  onConfirm,
}: {
  total:               number;
  returnCreditAmount?: number;
  priceTier:           PriceTier;
  onClose:             () => void;
  onConfirm: (data: {
    customerName:     string;
    customerEmail:    string;
    customerPhone:    string;
    customerDni:      string;
    shippingAddress:  string;
    shippingCity:     string;
    shippingProvince: string;
    paymentMethod:    string;
    paymentBreakdown?: PaymentSplit[];
    saleNotes:        string;
    userId?:          string;
    posCustomerId?:   string;
    newPosCustomer?:  { name: string; dni: string; phone: string; email?: string; address?: string; city?: string; province?: string };
  }) => void;
}) {
  // ── Customer state ─────────────────────────────────────────────────────────
  const [customerMode,     setCustomerMode]     = useState<CustomerMode>("search");
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSearchResult | null>(null);
  const [showDropdown,     setShowDropdown]      = useState(false);

  // New POS customer form
  const [newName,     setNewName]     = useState("");
  const [newDni,      setNewDni]      = useState("");
  const [newPhone,    setNewPhone]    = useState("");
  const [newEmail,    setNewEmail]    = useState("");
  const [newAddress,  setNewAddress]  = useState("");
  const [newCity,     setNewCity]     = useState("");
  const [newProvince, setNewProvince] = useState("");

  const { query, setQuery, results, isSearching } = useCustomerSearch();

  // ── Sale fields ────────────────────────────────────────────────────────────
  const [address,  setAddress]  = useState("");
  const [city,     setCity]     = useState("");
  const [province, setProvince] = useState("");
  const [notes,    setNotes]    = useState("");
  const [errors,   setErrors]   = useState<string[]>([]);

  // ── Medio de pago ────────────────────────────────────────────────────────────
  // Los métodos disponibles derivan de la columna de precios (tier). El operador
  // puede sub-seleccionar 1 o 2 métodos; con 2 se reparte el monto por método.
  // Con crédito de devolución activo se mantiene el flujo simple (por_devolucion).
  const isCreditSale = returnCreditAmount > 0;
  const payable      = Math.max(0, total - Math.min(total, returnCreditAmount));
  const tierMethods  = paymentMethodsForTier(priceTier);

  // Caso normal (sin crédito): selección múltiple de métodos + montos.
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  // Caso crédito: método simple.
  const [payment, setPayment] = useState<string>(isCreditSale ? "por_devolucion" : "");
  const creditPayments: PaymentMethod[] = ["por_devolucion", ...tierMethods, "orden_de_compra"];

  const isOrdenCompra = methods.includes("orden_de_compra");
  const splitMethods  = methods.filter((m) => m !== "orden_de_compra");
  const isSplit       = splitMethods.length === 2;
  const parsedAmounts = splitMethods.map((m) => parseFloat(amounts[m] ?? "") || 0);
  const sumAmounts    = parsedAmounts.reduce((a, b) => a + b, 0);
  const resto         = payable - sumAmounts;

  const methodLabel = (v: string) => PAYMENT_METHODS.find((m) => m.value === v)?.label ?? v;

  function toggleMethod(v: PaymentMethod) {
    setErrors([]);
    if (v === "orden_de_compra") {
      setMethods((prev) => (prev.includes("orden_de_compra") ? [] : ["orden_de_compra"]));
      setAmounts({});
      return;
    }
    setMethods((prev) => {
      const base = prev.filter((m) => m !== "orden_de_compra");
      if (base.includes(v)) return base.filter((m) => m !== v);
      if (base.length >= 2) return base; // máximo 2 métodos
      return [...base, v];
    });
  }

  function selectCustomer(c: CustomerSearchResult) {
    setSelectedCustomer(c);
    setShowDropdown(false);
    setQuery("");
    // Autofill shipping if POS customer has address stored
    if (c.source === "pos") {
      if (c.address)  setAddress(c.address);
      if (c.city)     setCity(c.city);
      if (c.province) setProvince(c.province);
    }
  }

  function clearCustomer() {
    setSelectedCustomer(null);
    setCustomerMode("search");
  }

  function validate() {
    const errs: string[] = [];

    if (customerMode === "search" && !selectedCustomer) {
      errs.push("Seleccioná o registrá un cliente");
    }
    if (customerMode === "new") {
      if (!newName.trim())  errs.push("Nombre del cliente obligatorio");
      if (!newDni.trim())   errs.push("DNI del cliente obligatorio");
      if (!newPhone.trim()) errs.push("Teléfono del cliente obligatorio");
    }
    if (isCreditSale) {
      if (!payment) errs.push("Medio de pago obligatorio");
    } else {
      if (methods.length === 0) errs.push("Seleccioná el medio de pago");
      else if (isSplit && Math.abs(resto) > 1) errs.push("Los montos por método deben sumar el total");
    }
    return errs;
  }

  // Resuelve el método primario y el desglose según la selección.
  function resolvePayment(): { paymentMethod: string; paymentBreakdown?: PaymentSplit[] } {
    if (isCreditSale) {
      return { paymentMethod: payment };
    }
    if (isOrdenCompra) {
      return { paymentMethod: "orden_de_compra", paymentBreakdown: [{ method: "orden_de_compra", amount: payable }] };
    }
    if (splitMethods.length === 1) {
      const m = splitMethods[0]!;
      return { paymentMethod: m, paymentBreakdown: [{ method: m, amount: payable }] };
    }
    // 2 métodos: desglose con montos ingresados; primario = el de mayor monto.
    const breakdown: PaymentSplit[] = splitMethods.map((m, i) => ({ method: m, amount: parsedAmounts[i]! }));
    const primary = parsedAmounts[0]! >= parsedAmounts[1]! ? splitMethods[0]! : splitMethods[1]!;
    return { paymentMethod: primary, paymentBreakdown: breakdown };
  }

  function handleConfirm() {
    const errs = validate();
    if (errs.length) { setErrors(errs); return; }

    const { paymentMethod, paymentBreakdown } = resolvePayment();

    if (customerMode === "new") {
      onConfirm({
        customerName:     newName.trim(),
        customerEmail:    newEmail.trim() || `pos_${Date.now()}@kwinna.local`,
        customerPhone:    newPhone.trim(),
        customerDni:      newDni.trim(),
        shippingAddress:  address.trim(),
        shippingCity:     city.trim(),
        shippingProvince: province,
        paymentMethod,
        paymentBreakdown,
        saleNotes:        notes.trim(),
        newPosCustomer: {
          name:     newName.trim(),
          dni:      newDni.trim(),
          phone:    newPhone.trim(),
          email:    newEmail.trim() || undefined,
          address:  newAddress.trim() || undefined,
          city:     newCity.trim()    || undefined,
          province: newProvince       || undefined,
        },
      });
      return;
    }

    // selectedCustomer is guaranteed non-null here (validated above)
    const c = selectedCustomer!;
    onConfirm({
      customerName:     c.name,
      customerEmail:    c.email ?? `pos_${Date.now()}@kwinna.local`,
      customerPhone:    c.phone ?? "",
      customerDni:      c.dni   ?? "",
      shippingAddress:  address.trim(),
      shippingCity:     city.trim(),
      shippingProvince: province,
      paymentMethod,
      paymentBreakdown,
      saleNotes:        notes.trim(),
      userId:          c.source === "web" ? c.id : undefined,
      posCustomerId:   c.source === "pos" ? c.id : undefined,
    });
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-auto
                      border border-zinc-700 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <h2 className="text-base font-semibold text-white">Nueva venta · {formatPrice(total)}</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-5 flex-1">

          {/* ── Customer section ─────────────────────────────────────────── */}
          <section>
            <h3 className="text-xs text-zinc-400 uppercase tracking-wider mb-3">Cliente</h3>

            {/* Selected customer card */}
            {selectedCustomer && customerMode === "search" ? (
              <div className="flex items-center gap-3 bg-zinc-800 rounded-xl px-4 py-3 border border-zinc-700">
                <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center flex-shrink-0">
                  <UserRound size={15} className="text-zinc-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-white truncate">{selectedCustomer.name}</p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                      selectedCustomer.source === "web"
                        ? "bg-blue-600/80 text-blue-100"
                        : "bg-emerald-600/80 text-emerald-100"
                    }`}>
                      {selectedCustomer.source === "web" ? "Web" : "POS"}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 truncate">
                    {[selectedCustomer.dni && `DNI ${selectedCustomer.dni}`, selectedCustomer.phone].filter(Boolean).join(" · ")}
                  </p>
                  {selectedCustomer.isActive === false && (
                    <p className="text-xs text-red-400 mt-1.5 font-medium bg-red-950/40 inline-flex px-1.5 py-0.5 rounded border border-red-900/50 items-center gap-1">
                      <AlertTriangle size={12} /> Cliente web baneado (Revisar caso)
                    </p>
                  )}
                </div>
                <button
                  onClick={clearCustomer}
                  className="text-xs text-zinc-500 hover:text-white transition-colors flex items-center gap-1"
                >
                  <ChevronDown size={13} /> Cambiar
                </button>
              </div>
            ) : customerMode === "new" ? (
              /* New POS customer form */
              <div className="flex flex-col gap-3 bg-zinc-800/60 rounded-xl p-4 border border-zinc-700">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-emerald-400 flex items-center gap-1.5">
                    <UserPlus size={12} /> Nuevo cliente POS
                  </p>
                  <button
                    onClick={() => setCustomerMode("search")}
                    className="text-xs text-zinc-500 hover:text-white transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Nombre *"   value={newName}  onChange={setNewName} />
                  <Field label="DNI *"      value={newDni}   onChange={setNewDni} />
                  <Field label="Teléfono *" value={newPhone} onChange={setNewPhone} />
                  <Field label="Email"      value={newEmail} onChange={setNewEmail} type="email" />
                </div>
                <p className="text-[11px] text-zinc-500">
                  Dirección (opcional — para autocompletar en futuras ventas)
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <Field label="Dirección" value={newAddress} onChange={(v) => { setNewAddress(v); setAddress(v); }} />
                  </div>
                  <Field label="Ciudad" value={newCity} onChange={(v) => { setNewCity(v); setCity(v); }} />
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-zinc-400">Provincia</label>
                    <select
                      value={newProvince}
                      onChange={(e) => { setNewProvince(e.target.value); setProvince(e.target.value); }}
                      className="bg-zinc-800 text-white rounded-lg px-3 py-2 text-sm outline-none
                                 border border-transparent focus:border-zinc-600 transition-colors"
                    >
                      <option value="">Seleccionar…</option>
                      {PROVINCES.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            ) : (
              /* Search input + dropdown */
              <div className="relative">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    autoFocus
                    value={query}
                    onChange={(e) => { setQuery(e.target.value); setShowDropdown(true); }}
                    onFocus={() => setShowDropdown(true)}
                    placeholder="Buscar por nombre o DNI..."
                    className="w-full bg-zinc-800 text-white rounded-lg pl-9 pr-4 py-2.5 text-sm
                               border border-zinc-700 focus:border-zinc-500 outline-none transition-colors"
                  />
                  {isSearching && (
                    <RefreshCw size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 animate-spin" />
                  )}
                </div>

                {/* Dropdown */}
                {showDropdown && (query.length >= 2) && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-800 border border-zinc-700
                                  rounded-xl shadow-xl z-10 overflow-hidden max-h-56 overflow-y-auto">
                    {results.length === 0 && !isSearching && (
                      <p className="text-xs text-zinc-500 px-4 py-3 text-center">
                        Sin resultados para "{query}"
                      </p>
                    )}
                    {results.map((r) => (
                      <button
                        key={`${r.source}-${r.id}`}
                        onClick={() => selectCustomer(r)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-700 transition-colors text-left"
                      >
                        <UserRound size={14} className="text-zinc-500 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white truncate flex items-center gap-2">
                            {r.name}
                            {r.isActive === false && (
                              <span className="text-[10px] bg-red-950 text-red-400 px-1 py-0.5 rounded border border-red-900/50">
                                BANEADO
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-zinc-500 truncate">
                            {[r.dni && `DNI ${r.dni}`, r.phone, r.email].filter(Boolean).join(" · ")}
                          </p>
                        </div>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold flex-shrink-0 ${
                          r.source === "web"
                            ? "bg-blue-600/80 text-blue-100"
                            : "bg-emerald-600/80 text-emerald-100"
                        }`}>
                          {r.source === "web" ? "Web" : "POS"}
                        </span>
                      </button>
                    ))}
                    <button
                      onClick={() => { setCustomerMode("new"); setShowDropdown(false); setQuery(""); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-700 transition-colors
                                 text-left border-t border-zinc-700"
                    >
                      <UserPlus size={14} className="text-emerald-400 flex-shrink-0" />
                      <span className="text-sm text-emerald-400 font-medium">Registrar nuevo cliente</span>
                    </button>
                  </div>
                )}

                {/* "Registrar" shortcut when no query */}
                {!query && (
                  <button
                    onClick={() => setCustomerMode("new")}
                    className="mt-2 flex items-center gap-1.5 text-xs text-zinc-500 hover:text-emerald-400 transition-colors"
                  >
                    <UserPlus size={12} /> Registrar nuevo cliente
                  </button>
                )}
              </div>
            )}
          </section>

          {/* ── Shipping ─────────────────────────────────────────────────── */}
          <section>
            <h3 className="text-xs text-zinc-400 uppercase tracking-wider mb-1">Entrega</h3>
            <p className="text-[11px] text-zinc-600 mb-3">Opcional para ventas en mostrador</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Field label="Dirección" value={address} onChange={setAddress} />
              </div>
              <Field label="Ciudad" value={city} onChange={setCity} />
              <div className="flex flex-col gap-1">
                <label className="text-xs text-zinc-400">Provincia</label>
                <select
                  value={province}
                  onChange={(e) => setProvince(e.target.value)}
                  className="bg-zinc-800 text-white rounded-lg px-3 py-2 text-sm outline-none
                             border border-transparent focus:border-zinc-600 transition-colors"
                >
                  <option value="">Seleccionar…</option>
                  {PROVINCES.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* ── Payment ──────────────────────────────────────────────────── */}
          <section>
            <h3 className="text-xs text-zinc-400 uppercase tracking-wider mb-3">Pago</h3>

            {isCreditSale ? (
              /* Con crédito de devolución activo → selección simple */
              <div className="flex flex-col gap-1 mb-3">
                <label className="text-xs text-zinc-400">Medio de pago *</label>
                <select
                  value={payment}
                  onChange={(e) => { setPayment(e.target.value); setErrors([]); }}
                  className="bg-zinc-800 text-white rounded-lg px-3 py-2 text-sm outline-none
                             border border-transparent focus:border-zinc-600 transition-colors"
                >
                  <option value="">Seleccionar…</option>
                  {creditPayments.map((v) => (
                    <option key={v} value={v}>{methodLabel(v)}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="flex flex-col gap-3 mb-3">
                <div>
                  <label className="text-xs text-zinc-400">Medio de pago * (podés combinar dos)</label>
                  <div className="flex flex-wrap gap-2 mt-1.5">
                    {[...tierMethods, "orden_de_compra" as PaymentMethod].map((v) => {
                      const active = methods.includes(v);
                      return (
                        <button
                          key={v}
                          type="button"
                          onClick={() => toggleMethod(v)}
                          className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                            active
                              ? "bg-white text-zinc-900 border-white"
                              : "bg-zinc-800 text-zinc-300 border-zinc-700 hover:border-zinc-500"
                          }`}
                        >
                          {methodLabel(v)}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Montos por método cuando se combinan dos */}
                {isSplit && (
                  <div className="flex flex-col gap-2 bg-zinc-800/50 border border-zinc-700 rounded-xl p-3">
                    {splitMethods.map((m) => (
                      <div key={m} className="flex items-center gap-2">
                        <span className="text-xs text-zinc-400 w-28 flex-shrink-0">{methodLabel(m)}</span>
                        <div className="relative flex-1">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm select-none">$</span>
                          <input
                            type="number"
                            inputMode="numeric"
                            min={0}
                            step="any"
                            value={amounts[m] ?? ""}
                            onChange={(e) => { setAmounts((prev) => ({ ...prev, [m]: e.target.value })); setErrors([]); }}
                            placeholder="0"
                            className="bg-zinc-800 text-white rounded-lg pl-7 pr-3 py-2 text-sm w-full outline-none
                                       border border-zinc-700 focus:border-zinc-500 transition-colors"
                          />
                        </div>
                      </div>
                    ))}
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-zinc-700">
                      <span className="text-zinc-500">Total a cubrir: {formatPrice(payable)}</span>
                      <span className={Math.abs(resto) < 1 ? "text-emerald-400 font-medium" : "text-amber-400 font-medium"}>
                        {Math.abs(resto) < 1 ? "OK" : `Resto: ${formatPrice(resto)}`}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            <Field label="Observaciones" value={notes} onChange={setNotes} multiline />
          </section>

          {errors.length > 0 && (
            <ul className="text-sm text-red-400 bg-red-950/30 border border-red-900/30
                           rounded-lg px-4 py-3 list-disc list-inside">
              {errors.map((e) => <li key={e}>{e}</li>)}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-zinc-800">
          <button
            onClick={onClose}
            className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl py-2.5 text-sm
                       font-medium transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 bg-white text-zinc-900 rounded-xl py-2.5 text-sm font-semibold
                       hover:bg-zinc-100 transition-colors"
          >
            Finalizar venta
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label, value, onChange, type = "text", multiline = false,
}: {
  label:      string;
  value:      string;
  onChange:   (v: string) => void;
  type?:      string;
  multiline?: boolean;
}) {
  const cls = "bg-zinc-800 text-white rounded-lg px-3 py-2 text-sm w-full outline-none border border-transparent focus:border-zinc-600 transition-colors";
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-zinc-400">{label}</label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={2}
          className={`${cls} resize-none`}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cls}
        />
      )}
    </div>
  );
}

// ─── SellView ─────────────────────────────────────────────────────────────────

export default function SellView() {
  const [modal,          setModal]          = useState(false);
  const [submitting,     setSubmitting]     = useState(false);
  const [saleError,      setSaleError]      = useState("");
  const [cartOpen,       setCartOpen]       = useState(false);
  const [receiptData,    setReceiptData]    = useState<ReceiptData | null>(null);
  const [creditNoteData, setCreditNoteData] = useState<CreditNoteData | null>(null);
  const [showFreePanel,  setShowFreePanel]  = useState(false);
  const receiptRef    = useRef<HTMLDivElement>(null);
  const giftRef       = useRef<HTMLDivElement>(null);
  const creditNoteRef = useRef<HTMLDivElement>(null);

  const { products, isLoading: productsLoading } = useProducts();
  const { stock, isLoading: stockLoading, isRefetching } = useStock();
  const invalidateStock = useInvalidateStock();
  const loading = productsLoading || stockLoading;

  const {
    cart, addToCart, removeFromCart, updateQty, clearCart,
    priceTier, setPriceTier,
    returnCredit, setReturnCredit,
    customItems, addCustomItem, removeCustomItem, updateCustomQty,
  } = usePosStore();
  const vendorId = useAuthStore((s) => s.user?.id);
  const vendorName = useAuthStore((s) => s.user?.name);

  // Un artículo libre fija toda la venta en la columna "efectivo": los productos de
  // catálogo pierden lista/mayorista y el precio manual del libre se respeta tal cual.
  // Se deriva sin mutar el store — al quitar el libre se restaura el tier elegido.
  const hasCustomItems = customItems.length > 0;
  const effectiveTier: PriceTier = hasCustomItems ? "efectivo" : priceTier;

  const catalogSubtotal = cart.reduce(
    (sum, i) => sum + applyPriceTier(i.product.price, effectiveTier) * i.quantity,
    0
  );
  const customSubtotal = customItems.reduce(
    (sum, ci) => sum + ci.unitPrice * ci.quantity,
    0
  );
  const subtotal = catalogSubtotal + customSubtotal;

  // ── Cálculos de crédito ──────────────────────────────────────────────────
  const creditAmount  = returnCredit?.amount ?? 0;
  const creditApplied = Math.min(subtotal, creditAmount);
  const saldoAPagar   = Math.max(0, subtotal - creditAmount);
  const saldoAFavor   = Math.max(0, creditAmount - subtotal);

  function handlePrintCreditNote() {
    document.body.setAttribute("data-print-mode", "credit-note");
    window.print();
    document.body.removeAttribute("data-print-mode");
  }

  function handlePrintGiftTicket() {
    document.body.setAttribute("data-print-mode", "gift-ticket");
    window.print();
    document.body.removeAttribute("data-print-mode");
  }

  interface ConfirmData {
    customerName: string; customerEmail: string; customerPhone: string;
    customerDni: string; shippingAddress: string; shippingCity: string;
    shippingProvince: string; paymentMethod: string; paymentBreakdown?: PaymentSplit[]; saleNotes: string;
    userId?: string; posCustomerId?: string;
    newPosCustomer?: { name: string; dni: string; phone: string; email?: string; address?: string; city?: string; province?: string };
  }
  // shippingAddress / City / Province se pasan como string vacío cuando no se completan —
  // el backend y el schema de contratos los aceptan opcionales para ventas POS.

  async function handleConfirm(data: ConfirmData) {
    setSubmitting(true);
    setSaleError("");
    try {
      // Snapshot del crédito antes de que clearCart lo limpie
      const creditSnapshot = returnCredit ? { ...returnCredit } : null;

      // Si es cliente nuevo, registrarlo primero
      let posCustomerId = data.posCustomerId;
      if (data.newPosCustomer) {
        const created = await createPosCustomer(data.newPosCustomer);
        posCustomerId  = created.id;
      }

      const { sale, residualCreditNote } = await createPosSale({
        items: cart.map((i) => ({
          productId: i.product.id,
          quantity:  i.quantity,
          size:      i.size,
        })),
        customItems: customItems.length > 0
          ? customItems.map((ci) => ({
              description: ci.description,
              unitPrice:   ci.unitPrice,
              quantity:    ci.quantity,
            }))
          : undefined,
        customerName:     data.customerName,
        customerEmail:    data.customerEmail,
        customerPhone:    data.customerPhone || undefined,
        customerDni:      data.customerDni   || undefined,
        shippingAddress:  data.shippingAddress,
        shippingCity:     data.shippingCity,
        shippingProvince: data.shippingProvince,
        channel:          "pos",
        paymentMethod:    data.paymentMethod || undefined,
        paymentBreakdown: data.paymentBreakdown,
        priceTier:        effectiveTier,
        saleNotes:        data.saleNotes     || undefined,
        vendorId:         vendorId,
        userId:           data.userId,
        posCustomerId,
        creditNoteId:     creditSnapshot?.creditNoteId,
      });

      // Snapshot receipt ANTES de limpiar el carrito
      const receiptItems = [
        ...cart.map((i) => ({
          name: i.product.name, sku: i.product.sku, size: i.size, quantity: i.quantity,
          unitPrice: applyPriceTier(i.product.price, effectiveTier),
        })),
        ...customItems.map((ci) => ({
          name: ci.description, sku: "", size: undefined as string | undefined, quantity: ci.quantity,
          unitPrice: ci.unitPrice,
        })),
      ];

      setReceiptData({
        items:          receiptItems,
        total:          subtotal,
        customerName:   data.customerName,
        customerDni:    data.customerDni || undefined,
        paymentMethod:  data.paymentMethod,
        paymentBreakdown: data.paymentBreakdown,
        priceTier:      effectiveTier,
        saleNotes:      data.saleNotes || undefined,
        date:           new Date(),
        creditApplied:  creditApplied > 0 ? creditApplied : undefined,
        creditNoteCode: creditSnapshot?.creditNoteCode,
        transactionId:  sale.id,
        vendorName:     vendorName,
        hasLibreItems:  customItems.length > 0,
      });

      // Si hay saldo a favor, usar la nota de crédito residual devuelta por la API
      if (residualCreditNote) {
        const remaining = Number(residualCreditNote.amount);
        setCreditNoteData({
          customerName:   data.customerName || undefined,
          originalCredit: creditSnapshot!.amount,
          usedInSale:     subtotal,
          remaining,
          reason:         creditSnapshot?.reason,
          date:           new Date(),
          code:           residualCreditNote.code,
        });
      }

      invalidateStock();
      clearCart();       // también limpia returnCredit y customItems en el store
      setShowFreePanel(false);
      setModal(false);
    } catch (err) {
      setSaleError(
        err instanceof ApiError ? err.message : "Error al registrar la venta."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex h-full">
      {/* Left: SKU lookup */}
      <div className="flex-1 p-6 overflow-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-white">Agregar artículos</h2>
          <div className="flex items-center gap-2">
            {isRefetching && (
              <span className="flex items-center gap-1 text-[10px] text-zinc-500">
                <RefreshCw size={10} className="animate-spin" /> Actualizando stock…
              </span>
            )}
            <button
              onClick={() => setCartOpen(true)}
              className="relative flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 transition-colors rounded-lg px-3 py-1.5"
            >
              <ShoppingCart size={14} className="text-zinc-300" />
              {cart.length > 0 && (
                <span className="bg-white text-zinc-900 text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
                  {cart.length}
                </span>
              )}
            </button>
          </div>
        </div>
        {loading ? (
          <div className="flex flex-col gap-3">
            <div className="h-10 bg-zinc-800 animate-pulse rounded-lg" />
            <div className="h-4 bg-zinc-800 animate-pulse rounded w-1/3" />
          </div>
        ) : (
          <>
            <SkuBar products={products} stock={stock} cart={cart} onAdd={addToCart} />

            {/* Botón de artículo libre */}
            <button
              onClick={() => setShowFreePanel((v) => !v)}
              className={`mt-3 flex items-center gap-2 text-xs font-medium px-3 py-2.5
                          rounded-lg border transition-colors w-full ${
                showFreePanel
                  ? "bg-violet-900/40 border-violet-700/60 text-violet-300"
                  : "bg-zinc-900 border-zinc-700 text-zinc-500 hover:border-violet-700/50 hover:text-violet-400"
              }`}
            >
              <Tag size={13} />
              Artículo libre — precio a mano
            </button>

            {showFreePanel && (
              <FreeItemPanel
                onAdd={(item) => {
                  addCustomItem(item);
                  setCartOpen(true);
                }}
                onClose={() => setShowFreePanel(false)}
              />
            )}
          </>
        )}
      </div>

      {/* Right: Cart Drawer */}
      {cartOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60"
          onClick={() => setCartOpen(false)}
        />
      )}
      <div className={`fixed top-0 right-0 h-full w-80 flex flex-col bg-zinc-900 z-50 transform transition-transform duration-200 ease-in-out ${cartOpen ? "translate-x-0" : "translate-x-full"}`}>
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart size={15} className="text-zinc-400" />
            <span className="text-sm font-semibold text-white">
              Orden ({cart.length} {cart.length === 1 ? "artículo" : "artículos"})
            </span>
          </div>
          <button
            onClick={() => setCartOpen(false)}
            className="text-zinc-500 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Banner de crédito activo */}
        {returnCredit && (
          <div className="mx-3 mt-3 flex items-center gap-2 bg-emerald-950/60 border border-emerald-800/50
                          rounded-xl px-3 py-2">
            <Banknote size={14} className="text-emerald-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-emerald-300">Crédito de devolución</p>
              <p className="text-sm font-bold text-white">{formatPrice(returnCredit.amount)}</p>
            </div>
            <button
              onClick={() => setReturnCredit(null)}
              className="text-zinc-500 hover:text-red-400 transition-colors"
              title="Cancelar crédito"
            >
              <X size={13} />
            </button>
          </div>
        )}

        <div className="flex-1 overflow-auto px-5">
          {cart.length === 0 && customItems.length === 0 ? (
            <p className="text-zinc-600 text-sm text-center py-12">
              La orden está vacía.<br />Buscá artículos por SKU.
            </p>
          ) : (
            <>
              {cart.map((item) => {
                const sRows = stock.filter((s) => s.productId === item.product.id);
                const avail = item.size
                  ? (sRows.find((s) => s.size === item.size)?.quantity ?? 0)
                  : sRows.reduce((n, s) => n + s.quantity, 0);
                return (
                  <CartRow
                    key={`${item.product.id}:${item.size ?? ""}`}
                    item={item}
                    priceTier={effectiveTier}
                    availableStock={avail}
                    onRemove={() => removeFromCart(item.product.id, item.size)}
                    onDelta={(d) => updateQty(item.product.id, item.size, d)}
                  />
                );
              })}
              {customItems.map((ci) => (
                <CustomCartRow
                  key={ci.id}
                  item={ci}
                  onRemove={() => removeCustomItem(ci.id)}
                  onDelta={(d) => updateCustomQty(ci.id, d)}
                />
              ))}
            </>
          )}
        </div>

        {(cart.length > 0 || customItems.length > 0) && (
          <div className="px-5 py-4 border-t border-zinc-800 flex flex-col gap-3">
            {saleError && (
              <p className="text-red-400 text-xs bg-red-950/30 border border-red-900/30
                            rounded-lg px-3 py-2">
                {saleError}
              </p>
            )}

            <div className="flex flex-col gap-1.5 mb-1">
              <label className="text-xs text-zinc-400">Lista de Precios</label>
              {hasCustomItems ? (
                <div className="flex items-center gap-2 rounded-lg border border-emerald-800/50 bg-emerald-950/40 px-3 py-2">
                  <Tag size={12} className="text-emerald-400 flex-shrink-0" />
                  <span className="text-xs text-emerald-300">
                    Efectivo · fijada por artículo libre
                  </span>
                </div>
              ) : (
                <div className="flex rounded-lg overflow-hidden border border-zinc-700">
                  <button
                    onClick={() => setPriceTier("lista")}
                    className={`flex-1 py-1.5 text-xs font-medium transition-colors ${priceTier === "lista" ? "bg-white text-zinc-900" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"}`}
                  >Lista</button>
                  <button
                    onClick={() => setPriceTier("efectivo")}
                    className={`flex-1 py-1.5 text-xs font-medium transition-colors border-l border-zinc-700 ${priceTier === "efectivo" ? "bg-emerald-400 text-emerald-950" : "bg-zinc-800 text-emerald-400/70 hover:bg-zinc-700"}`}
                  >Efvo</button>
                  <button
                    onClick={() => setPriceTier("mayorista")}
                    className={`flex-1 py-1.5 text-xs font-medium transition-colors border-l border-zinc-700 ${priceTier === "mayorista" ? "bg-amber-400 text-amber-950" : "bg-zinc-800 text-amber-400/70 hover:bg-zinc-700"}`}
                  >Mayorista</button>
                </div>
              )}
            </div>

            {/* Totales con crédito */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-500">Subtotal</span>
                <span className="text-sm font-medium text-white">{formatPrice(subtotal)}</span>
              </div>

              {creditAmount > 0 && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-emerald-400">Crédito aplicado</span>
                    <span className="text-sm font-medium text-emerald-400">-{formatPrice(creditApplied)}</span>
                  </div>
                  <div className="h-px bg-zinc-700 my-0.5" />
                  {saldoAPagar > 0 ? (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-400 font-medium">Saldo a pagar</span>
                      <span className="text-base font-bold text-white">{formatPrice(saldoAPagar)}</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-emerald-400 font-medium">Saldo a favor</span>
                      <span className="text-base font-bold text-emerald-400">{formatPrice(saldoAFavor)}</span>
                    </div>
                  )}
                </>
              )}

              {creditAmount === 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-500 font-medium">Total</span>
                  <span className="text-base font-bold text-white">{formatPrice(subtotal)}</span>
                </div>
              )}
            </div>

            <p className="text-[10px] text-zinc-600">
              El costo de envío se calcula al confirmar.
            </p>
            <button
              disabled={submitting}
              onClick={() => setModal(true)}
              className="w-full bg-white text-zinc-900 rounded-xl py-3 text-sm font-semibold
                         hover:bg-zinc-100 transition-colors disabled:opacity-50"
            >
              {submitting ? "Procesando..." : "Completar venta →"}
            </button>
          </div>
        )}
      </div>

      {modal && (
        <OrderModal
          total={subtotal}
          returnCreditAmount={creditAmount}
          priceTier={effectiveTier}
          onClose={() => { setModal(false); setSaleError(""); }}
          onConfirm={handleConfirm}
        />
      )}

      {/* Modal de recibo */}
      {receiptData && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 rounded-2xl border border-zinc-700 flex flex-col max-h-[90vh] w-full max-w-sm">
            <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-400" />
                Venta registrada
              </h2>
              <button
                onClick={() => { setReceiptData(null); setCreditNoteData(null); }}
                className="text-zinc-500 hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Aviso de saldo a favor */}
            {creditNoteData && (
              <div className="mx-4 mt-3 flex items-center gap-2 bg-emerald-950/60 border border-emerald-800/50
                              rounded-xl px-3 py-2.5">
                <FileText size={14} className="text-emerald-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-emerald-300 font-medium">Saldo a favor del cliente</p>
                  <p className="text-sm font-bold text-white">{formatPrice(creditNoteData.remaining)}</p>
                </div>
              </div>
            )}

            <div className="flex-1 overflow-auto flex justify-center p-4 bg-zinc-800/50">
              <ReceiptTicket ref={receiptRef} data={receiptData} />
            </div>

            <div className="flex flex-wrap gap-2 px-5 py-3 border-t border-zinc-800">
              <button
                onClick={() => { setReceiptData(null); setCreditNoteData(null); }}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl py-2.5 text-sm
                           font-medium transition-colors"
              >
                Cerrar
              </button>
              <button
                onClick={() => window.print()}
                className="flex-1 bg-white text-zinc-900 rounded-xl py-2.5 text-sm font-semibold
                           hover:bg-zinc-100 transition-colors flex items-center justify-center gap-2"
              >
                <Printer size={15} /> Ticket
              </button>
              <button
                onClick={handlePrintGiftTicket}
                className="flex-1 bg-zinc-700 hover:bg-zinc-600 text-white rounded-xl py-2.5 text-sm
                           font-semibold transition-colors flex items-center justify-center gap-2"
              >
                <Gift size={15} /> Regalo
              </button>
              {creditNoteData && (
                <button
                  onClick={handlePrintCreditNote}
                  className="w-full bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl py-2.5 text-sm
                             font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  <FileText size={15} /> Nota de crédito ({formatPrice(creditNoteData.remaining)})
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Áreas ocultas para impresión */}
      {receiptData && (
        <div id="receipt-print-area" style={{ display: "none" }}>
          <ReceiptTicket ref={receiptRef} data={receiptData} />
        </div>
      )}
      {receiptData && (
        <div id="gift-ticket-print-area" style={{ display: "none" }}>
          <ReceiptTicket ref={giftRef} data={receiptData} hidePrice />
        </div>
      )}
      {creditNoteData && (
        <div id="credit-note-print-area" style={{ display: "none" }}>
          <CreditNote ref={creditNoteRef} data={creditNoteData} />
        </div>
      )}
    </div>
  );
}
