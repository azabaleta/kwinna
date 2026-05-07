import { useRef, useState } from "react";
import { Search, X, Plus, Minus, ShoppingCart, AlertTriangle, CheckCircle2, Printer, RefreshCw, UserRound, UserPlus, ChevronDown, Banknote, FileText } from "lucide-react";
import type { Product, Stock, PriceTier, CustomerSearchResult } from "@kwinna/contracts";
import type { CartItem } from "../store/use-pos-store";
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

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!sku.trim()) return;

    const exact = products.find((p) => normalize(p.sku) === normalize(sku));
    if (exact) {
      setWarn("");
      setResults([exact]);
      return;
    }

    const matches = products.filter((p) => matchProduct(p.name, p.sku, sku));
    if (matches.length === 0) {
      setResults([]);
      setWarn(`No se encontró nada para "${sku}".`);
      return;
    }

    setWarn("");
    setResults(matches);
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
                    <span className="text-emerald-400 font-medium">Efvo: {formatRoundedPrice(result.price * 0.8)}</span>
                    <span className="text-amber-400 font-medium">May: {formatRoundedPrice(result.price * 0.65)}</span>
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
  let unitPrice = item.product.price;
  if (priceTier === "efectivo") unitPrice = Math.round((unitPrice * 0.8) / 100) * 100;
  if (priceTier === "mayorista") unitPrice = Math.round((unitPrice * 0.65) / 100) * 100;

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
        {formatRoundedPrice(unitPrice * item.quantity)}
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
  onClose,
  onConfirm,
}: {
  total:               number;
  returnCreditAmount?: number;
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
  const [payment,  setPayment]  = useState(returnCreditAmount > 0 ? "por_devolucion" : "");
  const [notes,    setNotes]    = useState("");
  const [errors,   setErrors]   = useState<string[]>([]);

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
    if (!payment) errs.push("Medio de pago obligatorio");
    return errs;
  }

  function handleConfirm() {
    const errs = validate();
    if (errs.length) { setErrors(errs); return; }

    if (customerMode === "new") {
      onConfirm({
        customerName:     newName.trim(),
        customerEmail:    newEmail.trim() || `pos_${Date.now()}@kwinna.local`,
        customerPhone:    newPhone.trim(),
        customerDni:      newDni.trim(),
        shippingAddress:  address.trim(),
        shippingCity:     city.trim(),
        shippingProvince: province,
        paymentMethod:    payment,
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
      paymentMethod:    payment,
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
                          <p className="text-sm text-white truncate">{r.name}</p>
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
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-zinc-400">Medio de pago *</label>
                <select
                  value={payment}
                  onChange={(e) => setPayment(e.target.value)}
                  className="bg-zinc-800 text-white rounded-lg px-3 py-2 text-sm outline-none
                             border border-transparent focus:border-zinc-600 transition-colors"
                >
                  <option value="">Seleccionar…</option>
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <Field label="Observaciones" value={notes} onChange={setNotes} multiline />
              </div>
            </div>
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
  const receiptRef    = useRef<HTMLDivElement>(null);
  const creditNoteRef = useRef<HTMLDivElement>(null);

  const { products, isLoading: productsLoading } = useProducts();
  const { stock, isLoading: stockLoading, isRefetching } = useStock();
  const invalidateStock = useInvalidateStock();
  const loading = productsLoading || stockLoading;

  const { cart, addToCart, removeFromCart, updateQty, clearCart, priceTier, setPriceTier, returnCredit, setReturnCredit } = usePosStore();
  const vendorId = useAuthStore((s) => s.user?.id);

  const subtotal = cart.reduce((sum, i) => {
    let p = i.product.price;
    if (priceTier === "efectivo") p = Math.round((p * 0.8) / 100) * 100;
    else if (priceTier === "mayorista") p = Math.round((p * 0.65) / 100) * 100;
    return sum + p * i.quantity;
  }, 0);

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

  interface ConfirmData {
    customerName: string; customerEmail: string; customerPhone: string;
    customerDni: string; shippingAddress: string; shippingCity: string;
    shippingProvince: string; paymentMethod: string; saleNotes: string;
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

      const { residualCreditNote } = await createPosSale({
        items: cart.map((i) => ({
          productId: i.product.id,
          quantity:  i.quantity,
          size:      i.size,
        })),
        customerName:     data.customerName,
        customerEmail:    data.customerEmail,
        customerPhone:    data.customerPhone || undefined,
        customerDni:      data.customerDni   || undefined,
        shippingAddress:  data.shippingAddress,
        shippingCity:     data.shippingCity,
        shippingProvince: data.shippingProvince,
        channel:          "pos",
        paymentMethod:    data.paymentMethod || undefined,
        priceTier:        priceTier,
        saleNotes:        data.saleNotes     || undefined,
        vendorId:         vendorId,
        userId:           data.userId,
        posCustomerId,
        creditNoteId:     creditSnapshot?.creditNoteId,
      });

      // Snapshot receipt ANTES de limpiar el carrito
      const receiptItems = cart.map((i) => {
        let p = i.product.price;
        if (priceTier === "efectivo") p = Math.round((p * 0.8) / 100) * 100;
        else if (priceTier === "mayorista") p = Math.round((p * 0.65) / 100) * 100;
        return { name: i.product.name, sku: i.product.sku, size: i.size, quantity: i.quantity, unitPrice: p };
      });

      setReceiptData({
        items:          receiptItems,
        total:          subtotal,
        customerName:   data.customerName,
        customerDni:    data.customerDni || undefined,
        paymentMethod:  data.paymentMethod,
        priceTier:      priceTier,
        saleNotes:      data.saleNotes || undefined,
        date:           new Date(),
        creditApplied:  creditApplied > 0 ? creditApplied : undefined,
        creditNoteCode: creditSnapshot?.creditNoteCode,
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
      clearCart();       // también limpia returnCredit en el store
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
          <SkuBar products={products} stock={stock} cart={cart} onAdd={addToCart} />
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
          {cart.length === 0 ? (
            <p className="text-zinc-600 text-sm text-center py-12">
              La orden está vacía.<br />Buscá artículos por SKU.
            </p>
          ) : (
            cart.map((item) => {
              const sRows = stock.filter((s) => s.productId === item.product.id);
              const avail = item.size
                ? (sRows.find((s) => s.size === item.size)?.quantity ?? 0)
                : sRows.reduce((n, s) => n + s.quantity, 0);
              return (
                <CartRow
                  key={`${item.product.id}:${item.size ?? ""}`}
                  item={item}
                  priceTier={priceTier}
                  availableStock={avail}
                  onRemove={() => removeFromCart(item.product.id, item.size)}
                  onDelta={(d) => updateQty(item.product.id, item.size, d)}
                />
              );
            })
          )}
        </div>

        {cart.length > 0 && (
          <div className="px-5 py-4 border-t border-zinc-800 flex flex-col gap-3">
            {saleError && (
              <p className="text-red-400 text-xs bg-red-950/30 border border-red-900/30
                            rounded-lg px-3 py-2">
                {saleError}
              </p>
            )}

            <div className="flex flex-col gap-1.5 mb-1">
              <label className="text-xs text-zinc-400">Lista de Precios</label>
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
      {creditNoteData && (
        <div id="credit-note-print-area" style={{ display: "none" }}>
          <CreditNote ref={creditNoteRef} data={creditNoteData} />
        </div>
      )}
    </div>
  );
}
