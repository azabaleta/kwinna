import { useEffect, useState } from "react";
import { Search, CheckCircle2 } from "lucide-react";
import type { Product } from "@kwinna/contracts";
import { RETURN_REASON_LABELS, type ReturnReason } from "@kwinna/contracts";
import { fetchProducts } from "../services/products";
import { createReturn } from "../services/returns";
import { formatPrice, normalize } from "../lib/utils";
import { ApiError } from "../lib/api";

const REASONS = Object.entries(RETURN_REASON_LABELS) as [ReturnReason, string][];

export default function ReturnView() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading,  setLoading]  = useState(true);

  // Form state
  const [skuQuery, setSkuQuery]  = useState("");
  const [selected, setSelected]  = useState<Product | null>(null);
  const [size,     setSize]      = useState("");
  const [qty,      setQty]       = useState(1);
  const [reason,   setReason]    = useState<ReturnReason | "">("");
  const [notes,    setNotes]     = useState("");
  const [restock,  setRestock]   = useState(true);
  const [saleId,   setSaleId]    = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState("");
  const [success,    setSuccess]    = useState(false);

  useEffect(() => {
    fetchProducts()
      .then(setProducts)
      .finally(() => setLoading(false));
  }, []);

  function handleProductSearch(e: React.FormEvent) {
    e.preventDefault();
    const found = products.find((p) => normalize(p.sku) === normalize(skuQuery));
    if (found) {
      setSelected(found);
      setError("");
    } else {
      setSelected(null);
      setError(`SKU "${skuQuery}" no encontrado.`);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected || !reason) return;
    setSubmitting(true);
    setError("");
    try {
      await createReturn({
        productId: selected.id,
        size:      size || undefined,
        quantity:  qty,
        reason,
        notes:     notes || undefined,
        restock,
        saleId:    saleId || undefined,
      });
      // Reset
      setSelected(null);
      setSkuQuery("");
      setSize(""); setQty(1); setReason(""); setNotes(""); setRestock(true); setSaleId("");
      setSuccess(true);
      setTimeout(() => setSuccess(false), 4000);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Error al registrar la devolución.";
      if (msg === "tiempo de cambio expirado") {
        setError("Tiempo de cambio expirado. La transacción tiene más de 30 días.");
      } else {
        setError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-6 max-w-xl">
      <h1 className="text-lg font-semibold text-white mb-6">Registrar devolución</h1>

      {/* Step 1: find product */}
      <section className="mb-6">
        <h3 className="text-xs text-zinc-400 uppercase tracking-wider mb-3">1. Producto</h3>
        <form onSubmit={handleProductSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              value={skuQuery}
              onChange={(e) => setSkuQuery(e.target.value)}
              placeholder="SKU del producto..."
              className="w-full bg-zinc-900 text-white rounded-lg pl-9 pr-4 py-2.5 text-sm
                         border border-zinc-800 focus:border-zinc-600 outline-none transition-colors"
            />
          </div>
          <button
            type="submit"
            className="bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg px-4 text-sm font-medium transition-colors"
          >
            Buscar
          </button>
        </form>

        {selected && (
          <div className="mt-3 bg-zinc-900 border border-zinc-700 rounded-xl p-3 flex items-center gap-3">
            {selected.images[0] && (
              <img src={selected.images[0]} alt="" className="w-12 h-12 rounded-lg object-cover" />
            )}
            <div>
              <p className="text-sm font-medium text-white">{selected.name}</p>
              <p className="text-xs text-zinc-500">{selected.sku} · {formatPrice(selected.price)}</p>
            </div>
          </div>
        )}
      </section>

      {/* Step 2: return details */}
      {selected && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <section>
            <h3 className="text-xs text-zinc-400 uppercase tracking-wider mb-3">2. Detalle</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-zinc-400">Talle (dejar vacío si no aplica)</label>
                <input
                  value={size}
                  onChange={(e) => setSize(e.target.value)}
                  className="bg-zinc-800 text-white rounded-lg px-3 py-2 text-sm outline-none
                             border border-transparent focus:border-zinc-600"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-zinc-400">Cantidad</label>
                <input
                  type="number"
                  min={1}
                  value={qty}
                  onChange={(e) => setQty(Number(e.target.value))}
                  className="bg-zinc-800 text-white rounded-lg px-3 py-2 text-sm outline-none
                             border border-transparent focus:border-zinc-600"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-zinc-400">Motivo *</label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value as ReturnReason)}
                  required
                  className="bg-zinc-800 text-white rounded-lg px-3 py-2 text-sm outline-none
                             border border-transparent focus:border-zinc-600"
                >
                  <option value="">Seleccionar…</option>
                  {REASONS.map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2 flex flex-col gap-1">
                <label className="text-xs text-zinc-400">
                  N° de transacción{" "}
                  <span className="text-zinc-600">(opcional — recomendado)</span>
                </label>
                <input
                  value={saleId}
                  onChange={(e) => setSaleId(e.target.value)}
                  placeholder="ID de la venta original"
                  className="bg-zinc-800 text-white rounded-lg px-3 py-2 text-sm outline-none
                             border border-transparent focus:border-zinc-600"
                />
                <p className="text-[11px] text-zinc-600">
                  Si la transacción tiene más de 30 días no se podrá procesar el cambio.
                </p>
              </div>
              <div className="col-span-2 flex flex-col gap-1">
                <label className="text-xs text-zinc-400">Notas adicionales</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="bg-zinc-800 text-white rounded-lg px-3 py-2 text-sm outline-none
                             border border-transparent focus:border-zinc-600 resize-none"
                />
              </div>
              <div className="col-span-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setRestock((v) => !v)}
                  className={`w-10 h-5 rounded-full transition-colors ${
                    restock ? "bg-emerald-600" : "bg-zinc-700"
                  }`}
                >
                  <span
                    className={`block w-4 h-4 bg-white rounded-full mx-0.5 transition-transform ${
                      restock ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
                <span className="text-sm text-zinc-300">
                  Devolver al stock {restock ? "(artículo en buen estado)" : "(artículo dañado / baja)"}
                </span>
              </div>
            </div>
          </section>

          {error && (
            <p className="text-red-400 text-sm bg-red-950/30 border border-red-900/30 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting || !reason}
            className="bg-white text-zinc-900 rounded-xl py-3 text-sm font-semibold
                       hover:bg-zinc-100 transition-colors disabled:opacity-50"
          >
            {submitting ? "Registrando..." : "Registrar devolución"}
          </button>
        </form>
      )}

      {!loading && !selected && !skuQuery && (
        <p className="text-zinc-600 text-sm text-center py-12">
          Ingresá el SKU del producto para comenzar.
        </p>
      )}

      {success && (
        <div className="fixed bottom-6 right-6 flex items-center gap-2 bg-emerald-900 border
                        border-emerald-700 text-emerald-200 text-sm rounded-xl px-4 py-3 shadow-xl">
          <CheckCircle2 size={16} /> Devolución registrada correctamente
        </div>
      )}
    </div>
  );
}
