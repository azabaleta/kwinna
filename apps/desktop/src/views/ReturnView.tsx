import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, CheckCircle2, ArrowRight, RotateCcw } from "lucide-react";
import type { Product, Return, ReturnReason } from "@kwinna/contracts";
import { RETURN_REASON_LABELS } from "@kwinna/contracts";
import { useProducts } from "../hooks/use-products";
import { createReturn } from "../services/returns";
import { usePosStore } from "../store/use-pos-store";
import { formatPrice, normalize } from "../lib/utils";
import { ApiError } from "../lib/api";

const REASONS = Object.entries(RETURN_REASON_LABELS) as [ReturnReason, string][];

interface ReturnResult {
  creditAmount: number;
  reason:       ReturnReason;
  productName:  string;
  returnData:   Return;
}

export default function ReturnView() {
  const { products, isLoading } = useProducts();
  const navigate                = useNavigate();
  const { setReturnCredit }     = usePosStore();

  const [skuQuery, setSkuQuery] = useState("");
  const [selected, setSelected] = useState<Product | null>(null);
  const [size,     setSize]     = useState("");
  const [qty,      setQty]      = useState(1);
  const [reason,   setReason]   = useState<ReturnReason | "">("");
  const [notes,    setNotes]    = useState("");
  const [restock,  setRestock]  = useState(true);
  const [saleId,   setSaleId]   = useState("");

  const [submitting,   setSubmitting]   = useState(false);
  const [error,        setError]        = useState("");
  const [returnResult, setReturnResult] = useState<ReturnResult | null>(null);

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
      const result = await createReturn({
        productId: selected.id,
        size:      size || undefined,
        quantity:  qty,
        reason,
        notes:     notes || undefined,
        restock,
        saleId:    saleId || undefined,
      });

      // Crédito = precio que devuelve el backend (precio real del producto × cantidad)
      const creditAmount = result.unitPrice * result.quantity;

      setReturnResult({
        creditAmount,
        reason:      reason as ReturnReason,
        productName: selected.name,
        returnData:  result,
      });

      // Reset form para la próxima devolución
      setSelected(null);
      setSkuQuery("");
      setSize(""); setQty(1); setReason(""); setNotes(""); setRestock(true); setSaleId("");

    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Error al registrar la devolución.";
      setError(
        msg === "tiempo de cambio expirado"
          ? "Tiempo de cambio expirado. La transacción tiene más de 30 días."
          : msg
      );
    } finally {
      setSubmitting(false);
    }
  }

  function handleUseCreditInSale() {
    if (!returnResult) return;
    setReturnCredit({
      amount:       returnResult.creditAmount,
      reason:       returnResult.reason,
    });
    navigate("/sell");
  }

  function handleNewReturn() {
    setReturnResult(null);
  }

  // ── Panel de resultado post-devolución ────────────────────────────────────
  if (returnResult) {
    return (
      <div className="p-6 max-w-xl">
        <div className="bg-zinc-900 border border-emerald-800/50 rounded-2xl p-6 flex flex-col gap-5">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-900/60 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 size={20} className="text-emerald-400" />
            </div>
            <div>
              <p className="text-base font-semibold text-white">Devolución registrada</p>
              <p className="text-sm text-zinc-400">{returnResult.productName}</p>
            </div>
          </div>

          {/* Credit amount */}
          <div className="bg-zinc-800 rounded-xl px-5 py-4">
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Crédito generado</p>
            <p className="text-3xl font-bold text-white">{formatPrice(returnResult.creditAmount)}</p>
            <p className="text-xs text-zinc-500 mt-1">
              Motivo: {RETURN_REASON_LABELS[returnResult.reason]}
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <button
              onClick={handleUseCreditInSale}
              className="w-full flex items-center justify-center gap-2 bg-white text-zinc-900
                         rounded-xl py-3 text-sm font-semibold hover:bg-zinc-100 transition-colors"
            >
              Nueva venta con crédito ({formatPrice(returnResult.creditAmount)})
              <ArrowRight size={15} />
            </button>
            <button
              onClick={handleNewReturn}
              className="w-full flex items-center justify-center gap-2 bg-zinc-800 text-zinc-300
                         rounded-xl py-3 text-sm font-medium hover:bg-zinc-700 transition-colors"
            >
              <RotateCcw size={14} /> Registrar otra devolución
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Formulario de devolución ──────────────────────────────────────────────
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
              placeholder={isLoading ? "Cargando productos…" : "SKU del producto..."}
              disabled={isLoading}
              className="w-full bg-zinc-900 text-white rounded-lg pl-9 pr-4 py-2.5 text-sm
                         border border-zinc-800 focus:border-zinc-600 outline-none transition-colors
                         disabled:opacity-40 disabled:cursor-not-allowed"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg px-4 text-sm font-medium
                       transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Buscar
          </button>
        </form>

        {isLoading && (
          <p className="text-xs text-zinc-500 mt-2">Cargando catálogo de productos…</p>
        )}

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
                  className={`w-10 h-5 rounded-full transition-colors ${restock ? "bg-emerald-600" : "bg-zinc-700"}`}
                >
                  <span className={`block w-4 h-4 bg-white rounded-full mx-0.5 transition-transform ${restock ? "translate-x-5" : "translate-x-0"}`} />
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

      {!isLoading && !selected && !skuQuery && (
        <p className="text-zinc-600 text-sm text-center py-12">
          Ingresá el SKU del producto para comenzar.
        </p>
      )}

      {error && !selected && (
        <p className="text-red-400 text-sm bg-red-950/30 border border-red-900/30 rounded-lg px-3 py-2 mt-3">
          {error}
        </p>
      )}
    </div>
  );
}
