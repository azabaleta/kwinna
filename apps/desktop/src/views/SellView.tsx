import { useEffect, useRef, useState } from "react";
import { Search, X, Plus, Minus, ShoppingCart, AlertTriangle, CheckCircle2 } from "lucide-react";
import type { Product, Stock } from "@kwinna/contracts";
import { usePosStore } from "../store/use-pos-store";
import { fetchProducts } from "../services/products";
import { fetchAllStock } from "../services/stock";
import { createPosSale } from "../services/sales";
import { formatPrice, matchProduct, normalize } from "../lib/utils";
import { ApiError } from "../lib/api";

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
  const [sku,    setSku]    = useState("");
  const [result, setResult] = useState<Product | null>(null);
  const [warn,   setWarn]   = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function getStock(productId: string, size?: string): number {
    const rows = stock.filter((s) => s.productId === productId);
    if (size) return rows.find((s) => s.size === size)?.quantity ?? 0;
    return rows.reduce((sum, r) => sum + r.quantity, 0);
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const found = products.find((p) => normalize(p.sku) === normalize(sku));
    if (!found) {
      setResult(null);
      setWarn(`SKU "${sku}" no encontrado.`);
      return;
    }
    const totalStock = getStock(found.id);
    if (totalStock <= 0) {
      setWarn(`Sin stock disponible para ${found.name}.`);
      setResult(found);
      return;
    }
    setWarn("");
    setResult(found);
  }

  function addProduct(product: Product, size?: string) {
    const avail = getStock(product.id, size);
    if (avail <= 0) {
      setWarn(`Sin stock para talle ${size ?? "único"}.`);
      return;
    }
    onAdd(product, size);
    setSku("");
    setResult(null);
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
            onChange={(e) => { setSku(e.target.value); setWarn(""); setResult(null); }}
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

      {result && (
        <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4">
          <div className="flex items-start gap-3">
            {result.images[0] && (
              <img src={result.images[0]} alt="" className="w-12 h-12 rounded-lg object-cover" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white">{result.name}</p>
              <p className="text-xs text-zinc-500">{result.sku} · {formatPrice(result.price)}</p>
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
                    Agregar al carrito
                  </button>
                );
              })()}
            </div>
          </div>
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
}: {
  item:     ReturnType<typeof usePosStore.getState>["cart"][number];
  onRemove: () => void;
  onDelta:  (d: number) => void;
}) {
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
        {formatPrice(item.product.price * item.quantity)}
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
  const [products, setProducts] = useState<Product[]>([]);
  const [stock,    setStock]    = useState<Stock[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [modal,    setModal]    = useState(false);
  const [success,  setSuccess]  = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [saleError,  setSaleError]  = useState("");

  const { cart, addToCart, removeFromCart, updateQty, clearCart } = usePosStore();

  const subtotal = cart.reduce((sum, i) => sum + i.product.price * i.quantity, 0);

  useEffect(() => {
    Promise.all([fetchProducts(), fetchAllStock()])
      .then(([p, s]) => { setProducts(p); setStock(s); })
      .finally(() => setLoading(false));
  }, []);

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
        saleNotes:        data.saleNotes     || undefined,
      });
      clearCart();
      setModal(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 4000);
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
        <h2 className="text-sm font-semibold text-white mb-4">Agregar artículos</h2>
        {loading ? (
          <p className="text-zinc-500 text-sm">Cargando...</p>
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
            <div className="flex items-center justify-between">
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

      {success && (
        <div className="fixed bottom-6 right-6 flex items-center gap-2 bg-emerald-900 border
                        border-emerald-700 text-emerald-200 text-sm rounded-xl px-4 py-3 shadow-xl">
          <CheckCircle2 size={16} /> Venta registrada correctamente
        </div>
      )}
    </div>
  );
}
