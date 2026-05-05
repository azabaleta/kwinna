import { useRef, useState } from "react";
import { Search, X, Plus, Minus, ShoppingCart, AlertTriangle, CheckCircle2, Printer, RefreshCw } from "lucide-react";
import type { Product, Stock, PriceTier } from "@kwinna/contracts";
import { usePosStore } from "../store/use-pos-store";
import { useProducts } from "../hooks/use-products";
import { useStock, useInvalidateStock } from "../hooks/use-stock";
import { createPosSale } from "../services/sales";
import { useAuthStore } from "../store/use-auth-store";
import { formatPrice, formatRoundedPrice, matchProduct, normalize } from "../lib/utils";
import { ApiError } from "../lib/api";
import ReceiptTicket from "../components/ReceiptTicket";
import type { ReceiptData } from "../components/ReceiptTicket";

const PAYMENT_METHODS = [
  { label: "Efectivo",        value: "efectivo"         },
  { label: "Transferencia",   value: "transferencia"    },
  { label: "Débito",          value: "debito"           },
  { label: "Crédito",         value: "credito"          },
  { label: "Orden de compra", value: "orden_de_compra"  },
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
  onAdd,
}: {
  products: Product[];
  stock:    Stock[];
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

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!sku.trim()) return;

    // Priorizar búsqueda exacta por SKU
    const exact = products.find((p) => normalize(p.sku) === normalize(sku));
    if (exact) {
      setWarn("");
      setResults([exact]);
      return;
    }

    // Búsqueda flexible por nombre o SKU parcial
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
    const avail = getStock(product.id, size);
    if (avail <= 0) {
      setWarn(`Sin stock para talle ${size ?? "único"}.`);
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
                    const sizes = stock
                      .filter((s) => s.productId === result.id && s.size && s.quantity > 0)
                      .map((s) => s.size!);
                    const noSizeStock = getStock(result.id, "");

                    if (sizes.length > 0) {
                      return (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {sizes.map((sz) => (
                            <button
                              key={sz}
                              onClick={() => addProduct(result, sz)}
                              className="text-xs bg-zinc-800 hover:bg-white hover:text-zinc-900 text-white
                                         rounded px-2 py-1 transition-colors font-medium"
                            >
                              {sz}
                            </button>
                          ))}
                        </div>
                      );
                    }
                    return (
                      <button
                        onClick={() => addProduct(result)}
                        disabled={noSizeStock <= 0}
                        className="mt-2 text-xs bg-white text-zinc-900 rounded px-3 py-1
                                   hover:bg-zinc-100 transition-colors font-medium disabled:opacity-40"
                      >
                        {noSizeStock <= 0 ? "Sin stock" : "Agregar al carrito"}
                      </button>
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
}: {
  item:     ReturnType<typeof usePosStore.getState>["cart"][number];
  onRemove: () => void;
  onDelta:  (d: number) => void;
  priceTier: PriceTier;
}) {
  let unitPrice = item.product.price;
  if (priceTier === "efectivo") unitPrice = Math.round((unitPrice * 0.8) / 100) * 100;
  if (priceTier === "mayorista") unitPrice = Math.round((unitPrice * 0.65) / 100) * 100;

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
        <span className="w-6 text-center text-sm text-white">{item.quantity}</span>
        <button
          onClick={() => onDelta(1)}
          className="w-6 h-6 rounded bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center"
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

function OrderModal({
  total,
  onClose,
  onConfirm,
}: {
  total:     number;
  onClose:   () => void;
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
  }) => void;
}) {
  const [name,     setName]     = useState("");
  const [lastName, setLastName] = useState("");
  const [dni,      setDni]      = useState("");
  const [email,    setEmail]    = useState("");
  const [phone,    setPhone]    = useState("");
  const [address,  setAddress]  = useState("");
  const [city,     setCity]     = useState("");
  const [province, setProvince] = useState("");
  const [payment,  setPayment]  = useState("");
  const [notes,    setNotes]    = useState("");
  const [errors,   setErrors]   = useState<string[]>([]);

  function validate() {
    const errs: string[] = [];
    if (!name.trim()) errs.push("Nombre obligatorio");
    if (!address.trim()) errs.push("Dirección obligatoria");
    if (!city.trim()) errs.push("Ciudad obligatoria");
    if (!province) errs.push("Provincia obligatoria");
    if (!payment) errs.push("Medio de pago obligatorio");
    return errs;
  }

  function handleConfirm() {
    const errs = validate();
    if (errs.length) { setErrors(errs); return; }
    onConfirm({
      customerName:     `${name.trim()} ${lastName.trim()}`.trim(),
      customerEmail:    email.trim() || `pos_${Date.now()}@kwinna.local`,
      customerPhone:    phone.trim(),
      customerDni:      dni.trim(),
      shippingAddress:  address.trim(),
      shippingCity:     city.trim(),
      shippingProvince: province,
      paymentMethod:    payment,
      saleNotes:        notes.trim(),
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
          {/* Customer section */}
          <section>
            <h3 className="text-xs text-zinc-400 uppercase tracking-wider mb-3">Cliente</h3>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Nombre *" value={name} onChange={setName} />
              <Field label="Apellido" value={lastName} onChange={setLastName} />
              <Field label="DNI" value={dni} onChange={setDni} />
              <Field label="Teléfono" value={phone} onChange={setPhone} />
              <div className="col-span-2">
                <Field
                  label="Email (opcional — indica si es cliente web)"
                  value={email}
                  onChange={setEmail}
                  type="email"
                />
              </div>
            </div>
          </section>

          {/* Shipping */}
          <section>
            <h3 className="text-xs text-zinc-400 uppercase tracking-wider mb-3">Entrega</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Field label="Dirección *" value={address} onChange={setAddress} />
              </div>
              <Field label="Ciudad *" value={city} onChange={setCity} />
              <div className="flex flex-col gap-1">
                <label className="text-xs text-zinc-400">Provincia *</label>
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

          {/* Payment */}
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
                <Field
                  label="Observaciones"
                  value={notes}
                  onChange={setNotes}
                  multiline
                />
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
  const [modal,      setModal]      = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [saleError,  setSaleError]  = useState("");
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const receiptRef = useRef<HTMLDivElement>(null);

  const { products, isLoading: productsLoading } = useProducts();
  const { stock, isLoading: stockLoading, isRefetching } = useStock();
  const invalidateStock = useInvalidateStock();
  const loading = productsLoading || stockLoading;

  const { cart, addToCart, removeFromCart, updateQty, clearCart, priceTier, setPriceTier } = usePosStore();
  const vendorId = useAuthStore((s) => s.user?.id);

  const subtotal = cart.reduce((sum, i) => {
    let p = i.product.price;
    if (priceTier === "efectivo") p = Math.round((p * 0.8) / 100) * 100;
    else if (priceTier === "mayorista") p = Math.round((p * 0.65) / 100) * 100;
    return sum + p * i.quantity;
  }, 0);

  interface ConfirmData {
    customerName: string; customerEmail: string; customerPhone: string;
    customerDni: string; shippingAddress: string; shippingCity: string;
    shippingProvince: string; paymentMethod: string; saleNotes: string;
  }

  async function handleConfirm(data: ConfirmData) {
    setSubmitting(true);
    setSaleError("");
    try {
      await createPosSale({
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
      });

      // Snapshot receipt data BEFORE clearing the cart
      const receiptItems = cart.map((i) => {
        let p = i.product.price;
        if (priceTier === "efectivo") p = Math.round((p * 0.8) / 100) * 100;
        else if (priceTier === "mayorista") p = Math.round((p * 0.65) / 100) * 100;
        return {
          name:      i.product.name,
          sku:       i.product.sku,
          size:      i.size,
          quantity:  i.quantity,
          unitPrice: p,
        };
      });

      setReceiptData({
        items:         receiptItems,
        total:         subtotal,
        customerName:  data.customerName,
        customerDni:   data.customerDni || undefined,
        paymentMethod: data.paymentMethod,
        priceTier:     priceTier,
        saleNotes:     data.saleNotes || undefined,
        date:          new Date(),
      });

      // Invalidar stock inmediatamente para que el siguiente operador vea disponibilidad real
      invalidateStock();
      clearCart();
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
      <div className="flex-1 p-6 overflow-auto border-r border-zinc-800">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-white">Agregar artículos</h2>
          {isRefetching && (
            <span className="flex items-center gap-1 text-[10px] text-zinc-500">
              <RefreshCw size={10} className="animate-spin" /> Actualizando stock…
            </span>
          )}
        </div>
        {loading ? (
          <div className="flex flex-col gap-3">
            <div className="h-10 bg-zinc-800 animate-pulse rounded-lg" />
            <div className="h-4 bg-zinc-800 animate-pulse rounded w-1/3" />
          </div>
        ) : (
          <SkuBar products={products} stock={stock} onAdd={addToCart} />
        )}
      </div>

      {/* Right: Cart */}
      <div className="w-80 flex flex-col bg-zinc-900">
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center gap-2">
          <ShoppingCart size={15} className="text-zinc-400" />
          <span className="text-sm font-semibold text-white">
            Orden ({cart.length} {cart.length === 1 ? "artículo" : "artículos"})
          </span>
        </div>

        <div className="flex-1 overflow-auto px-5">
          {cart.length === 0 ? (
            <p className="text-zinc-600 text-sm text-center py-12">
              La orden está vacía.<br />Buscá artículos por SKU.
            </p>
          ) : (
            cart.map((item) => (
              <CartRow
                key={`${item.product.id}:${item.size ?? ""}`}
                item={item}
                priceTier={priceTier}
                onRemove={() => removeFromCart(item.product.id, item.size)}
                onDelta={(d) => updateQty(item.product.id, item.size, d)}
              />
            ))
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

            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-zinc-500">Subtotal</span>
              <span className="text-base font-bold text-white">{formatPrice(subtotal)}</span>
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
          onClose={() => { setModal(false); setSaleError(""); }}
          onConfirm={handleConfirm}
        />
      )}

      {receiptData && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 rounded-2xl border border-zinc-700 flex flex-col max-h-[90vh] w-full max-w-sm">
            <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-400" />
                Venta registrada
              </h2>
              <button
                onClick={() => setReceiptData(null)}
                className="text-zinc-500 hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-auto flex justify-center p-4 bg-zinc-800/50">
              <ReceiptTicket ref={receiptRef} data={receiptData} />
            </div>

            <div className="flex gap-3 px-5 py-3 border-t border-zinc-800">
              <button
                onClick={() => setReceiptData(null)}
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
                <Printer size={15} /> Imprimir ticket
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden print area — only visible during window.print() */}
      {receiptData && (
        <div id="receipt-print-area" style={{ display: "none" }}>
          <ReceiptTicket ref={receiptRef} data={receiptData} />
        </div>
      )}
    </div>
  );
}
