import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Search, CheckCircle2, ArrowRight, RotateCcw, Printer, X, Receipt, Package } from "lucide-react";
import type { Product, Return, ReturnReason, Sale, SaleItem } from "@kwinna/contracts";
import { RETURN_REASON_LABELS, RETURN_REASON_RESALABLE } from "@kwinna/contracts";
import { useProducts } from "../hooks/use-products";
import { useStock } from "../hooks/use-stock";
import { createReturn, lookupSaleByCode } from "../services/returns";
import { usePosStore } from "../store/use-pos-store";
import { formatPrice, matchProduct, normalize } from "../lib/utils";
import { ApiError } from "../lib/api";
import CreditNote from "../components/CreditNote";
import type { CreditNoteData } from "../components/CreditNote";

const REASONS = Object.entries(RETURN_REASON_LABELS) as [ReturnReason, string][];

const PAYMENT_LABELS: Record<string, string> = {
  efectivo:        "Efectivo",
  transferencia:   "Transferencia",
  transfer:        "Transferencia",
  debito:          "Débito",
  credito:         "Crédito",
  orden_de_compra: "Orden de compra",
  por_devolucion:  "Por devolución",
  mercadopago:     "MercadoPago",
};

type ReturnMode = "product" | "transaction";

interface ReturnResult {
  creditAmount:   number;
  reason:         ReturnReason;
  productName:    string;
  returnData:     Return;
  creditNoteId:   string;
  creditNoteCode: string;
}

export default function ReturnView() {
  const { products, isLoading } = useProducts();
  const { stock }               = useStock();
  const navigate                = useNavigate();
  const { setReturnCredit }     = usePosStore();
  const creditNoteRef           = useRef<HTMLDivElement>(null);

  // ── Modo ─────────────────────────────────────────────────────────────────
  const [mode, setMode] = useState<ReturnMode>("product");

  // ── Estado modo "por producto" ────────────────────────────────────────────
  const [skuQuery, setSkuQuery] = useState("");
  const [results,  setResults]  = useState<Product[]>([]);

  // ── Estado modo "por transacción" ─────────────────────────────────────────
  const [txCode,      setTxCode]      = useState("");
  const [txSale,      setTxSale]      = useState<Sale | null>(null);
  const [txSearching, setTxSearching] = useState(false);
  const [txError,     setTxError]     = useState("");
  const [txItem,      setTxItem]      = useState<SaleItem | null>(null);

  // ── Estado compartido del formulario ─────────────────────────────────────
  const [selected, setSelected] = useState<Product | null>(null);
  const [size,     setSize]     = useState("");
  const [qty,      setQty]      = useState(1);
  const [reason,   setReason]   = useState<ReturnReason | "">("");
  const [notes,    setNotes]    = useState("");
  const [restock,  setRestock]  = useState(true);
  const [saleId,   setSaleId]   = useState("");

  const [submitting,     setSubmitting]     = useState(false);
  const [error,          setError]          = useState("");
  const [returnResult,   setReturnResult]   = useState<ReturnResult | null>(null);
  const [creditNoteData, setCreditNoteData] = useState<CreditNoteData | null>(null);

  // ── Cambiar modo ──────────────────────────────────────────────────────────
  function switchMode(m: ReturnMode) {
    setMode(m);
    resetForm();
    setSkuQuery(""); setResults([]);
    setTxCode(""); setTxSale(null); setTxError(""); setTxItem(null);
    setError("");
  }

  function resetForm() {
    setSelected(null); setSize(""); setQty(1);
    setReason(""); setNotes(""); setRestock(true); setSaleId("");
  }

  // ── Buscar venta por código de transacción ────────────────────────────────
  async function handleTxSearch(e: React.FormEvent) {
    e.preventDefault();
    const code = txCode.trim().replace(/\s/g, "");
    if (!code) return;
    setTxError(""); setTxSale(null); setTxItem(null); resetForm();
    setTxSearching(true);
    try {
      const sale = await lookupSaleByCode(code);
      setTxSale(sale);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Error al buscar la transacción";
      setTxError(
        err instanceof ApiError && err.status === 404
          ? `No se encontró ninguna venta con el código "${code.toUpperCase()}".`
          : msg
      );
    } finally {
      setTxSearching(false);
    }
  }

  // ── Seleccionar un ítem de la transacción ─────────────────────────────────
  function selectTxItem(item: SaleItem) {
    setTxItem(item);
    const prod = products.find((p) => p.id === item.productId) ?? null;
    setSelected(prod);
    setSize(item.size ?? "");
    setSaleId(txSale!.id);
    setQty(item.quantity);
    setError("");
  }

  // ── Búsqueda por producto ─────────────────────────────────────────────────
  function handleProductSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!skuQuery.trim()) return;
    setError("");
    const exact = products.find((p) => normalize(p.sku) === normalize(skuQuery));
    if (exact) { setSelected(exact); setResults([]); setSkuQuery(""); return; }
    const matches = products.filter((p) => matchProduct(p.name, p.sku, skuQuery));
    if (matches.length === 0) { setResults([]); setError(`No se encontró nada para "${skuQuery}".`); return; }
    if (matches.length === 1) { setSelected(matches[0]!); setResults([]); setSkuQuery(""); return; }
    setResults(matches);
  }

  function selectProduct(p: Product) {
    setSelected(p); setResults([]); setSkuQuery(""); setError("");
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected || !reason || qty < 1) return;
    setSubmitting(true); setError("");
    try {
      const { returnData, creditNote } = await createReturn({
        productId: selected.id,
        size:      size || undefined,
        quantity:  qty,
        reason,
        notes:     notes || undefined,
        restock,
        saleId:    saleId || undefined,
      });

      const creditAmount = returnData.unitPrice * returnData.quantity;

      setReturnResult({
        creditAmount,
        reason:         reason as ReturnReason,
        productName:    selected.name,
        returnData,
        creditNoteId:   creditNote.id,
        creditNoteCode: creditNote.code,
      });
      setCreditNoteData({
        originalCredit: creditAmount,
        usedInSale:     0,
        remaining:      creditAmount,
        reason:         reason as ReturnReason,
        date:           new Date(),
        code:           creditNote.code,
      });

      resetForm();
      setSkuQuery(""); setResults([]);
      setTxCode(""); setTxSale(null); setTxItem(null);

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
      amount:         returnResult.creditAmount,
      reason:         returnResult.reason,
      creditNoteId:   returnResult.creditNoteId,
      creditNoteCode: returnResult.creditNoteCode,
    });
    navigate("/sell");
  }

  function handleNewReturn() {
    setReturnResult(null); setCreditNoteData(null);
  }

  function handlePrintCreditNote() {
    document.body.setAttribute("data-print-mode", "credit-note");
    window.print();
    document.body.removeAttribute("data-print-mode");
  }

  // ── Panel de resultado post-devolución ────────────────────────────────────
  if (returnResult) {
    return (
      <div className="p-6 max-w-xl">
        <div className="bg-zinc-900 border border-emerald-800/50 rounded-2xl p-6 flex flex-col gap-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-900/60 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 size={20} className="text-emerald-400" />
            </div>
            <div>
              <p className="text-base font-semibold text-white">Devolución registrada</p>
              <p className="text-sm text-zinc-400">{returnResult.productName}</p>
            </div>
          </div>

          <div className="bg-zinc-800 rounded-xl px-5 py-4">
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Crédito generado</p>
            <p className="text-3xl font-bold text-white">{formatPrice(returnResult.creditAmount)}</p>
            <p className="text-xs text-zinc-500 mt-1">Motivo: {RETURN_REASON_LABELS[returnResult.reason]}</p>
            <div className="mt-3 pt-3 border-t border-zinc-700">
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Código de nota de crédito</p>
              <p className="text-lg font-mono font-bold text-emerald-400 tracking-widest">
                {returnResult.creditNoteCode}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={handlePrintCreditNote}
              className="w-full flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-600
                         text-white rounded-xl py-3 text-sm font-semibold transition-colors"
            >
              <Printer size={15} /> Imprimir nota de crédito
            </button>
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

        {creditNoteData && (
          <div id="credit-note-print-area" style={{ display: "none" }}>
            <CreditNote ref={creditNoteRef} data={creditNoteData} />
          </div>
        )}
      </div>
    );
  }

  // ── Formulario de devolución ──────────────────────────────────────────────
  const maxQty = txItem ? txItem.quantity : 999;

  return (
    <div className="p-6 max-w-xl">
      <h1 className="text-lg font-semibold text-white mb-4">Registrar devolución</h1>

      {/* Toggle de modo */}
      <div className="flex rounded-xl bg-zinc-900 border border-zinc-800 p-1 mb-6 gap-1">
        <button
          type="button"
          onClick={() => switchMode("transaction")}
          className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-colors
            ${mode === "transaction"
              ? "bg-white text-zinc-900"
              : "text-zinc-400 hover:text-zinc-200"}`}
        >
          <Receipt size={14} />
          Por transacción
        </button>
        <button
          type="button"
          onClick={() => switchMode("product")}
          className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-colors
            ${mode === "product"
              ? "bg-white text-zinc-900"
              : "text-zinc-400 hover:text-zinc-200"}`}
        >
          <Package size={14} />
          Por producto
        </button>
      </div>

      {/* ── MODO TRANSACCIÓN ── */}
      {mode === "transaction" && (
        <section className="mb-6">
          <h3 className="text-xs text-zinc-400 uppercase tracking-wider mb-3">1. Código de transacción</h3>
          <form onSubmit={handleTxSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Receipt size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                value={txCode}
                onChange={(e) => { setTxCode(e.target.value.toUpperCase()); setTxSale(null); setTxItem(null); setTxError(""); resetForm(); }}
                placeholder="Ej: A3F7B2D910"
                maxLength={10}
                className="w-full bg-zinc-900 text-white rounded-lg pl-9 pr-4 py-2.5 text-sm font-mono
                           border border-zinc-800 focus:border-zinc-600 outline-none transition-colors uppercase"
              />
            </div>
            <button
              type="submit"
              disabled={txSearching || txCode.trim().length < 6}
              className="bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg px-4 text-sm font-medium
                         transition-colors disabled:opacity-40"
            >
              {txSearching ? "Buscando…" : "Buscar"}
            </button>
          </form>
          <p className="text-[11px] text-zinc-600 mt-1.5">
            El código aparece en el ticket de compra (N° transacción).
          </p>

          {txError && (
            <div className="flex items-center gap-2 text-amber-400 text-sm bg-amber-950/30
                            border border-amber-900/30 rounded-lg px-3 py-2 mt-3">
              <AlertTriangle size={14} /> {txError}
            </div>
          )}

          {/* Tarjeta de la venta encontrada */}
          {txSale && !txItem && (
            <div className="mt-4 bg-zinc-900 border border-zinc-700 rounded-xl overflow-hidden">
              {/* Header de la venta */}
              <div className="px-4 py-3 border-b border-zinc-800">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">{txSale.customerName}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {new Date(txSale.createdAt).toLocaleDateString("es-AR", {
                        day: "2-digit", month: "long", year: "numeric",
                      })}
                      {txSale.paymentMethod && (
                        <> · {PAYMENT_LABELS[txSale.paymentMethod] ?? txSale.paymentMethod}</>
                      )}
                    </p>
                  </div>
                  <p className="text-sm font-bold text-white">{formatPrice(txSale.total)}</p>
                </div>
              </div>

              {/* Lista de ítems */}
              <div className="p-2">
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider px-2 py-1">
                  Seleccioná la prenda a devolver
                </p>
                {txSale.items.map((item, i) => {
                  const prod = products.find((p) => p.id === item.productId);
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => selectTxItem(item)}
                      className="w-full flex items-center gap-3 rounded-lg p-2.5 text-left
                                 hover:bg-zinc-800 transition-colors"
                    >
                      {prod?.images[0] && (
                        <img src={prod.images[0]} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {prod?.name ?? item.productId.slice(0, 8) + "…"}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {item.size ? `Talle ${item.size} · ` : ""}
                          {item.quantity} u. · {formatPrice(item.unitPrice)} c/u
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-semibold text-white">{formatPrice(item.subtotal)}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Ítem seleccionado */}
          {txSale && txItem && (
            <div className="mt-4 bg-zinc-900 border border-emerald-800/50 rounded-xl p-3">
              <div className="flex items-center gap-3">
                {(() => {
                  const prod = products.find((p) => p.id === txItem.productId);
                  return prod?.images[0] ? (
                    <img src={prod.images[0]} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                  ) : null;
                })()}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {products.find((p) => p.id === txItem.productId)?.name ?? txItem.productId.slice(0, 8) + "…"}
                  </p>
                  <p className="text-xs text-emerald-400 mt-0.5">
                    Precio pagado: {formatPrice(txItem.unitPrice)}
                    {txItem.size ? ` · Talle ${txItem.size}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => { setTxItem(null); resetForm(); }}
                  className="text-zinc-600 hover:text-zinc-300 transition-colors flex-shrink-0"
                >
                  <X size={15} />
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ── MODO PRODUCTO ── */}
      {mode === "product" && (
        <section className="mb-6">
          <h3 className="text-xs text-zinc-400 uppercase tracking-wider mb-3">1. Producto</h3>
          <form onSubmit={handleProductSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                value={skuQuery}
                onChange={(e) => { setSkuQuery(e.target.value); setResults([]); setError(""); }}
                placeholder={isLoading ? "Cargando productos…" : "Buscar por SKU o nombre..."}
                disabled={isLoading}
                className="w-full bg-zinc-900 text-white rounded-lg pl-9 pr-4 py-2.5 text-sm
                           border border-zinc-800 focus:border-zinc-600 outline-none transition-colors
                           disabled:opacity-40"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg px-4 text-sm font-medium
                         transition-colors disabled:opacity-40"
            >
              Buscar
            </button>
          </form>

          {error && !selected && (
            <div className="flex items-center gap-2 text-amber-400 text-sm bg-amber-950/30
                            border border-amber-900/30 rounded-lg px-3 py-2 mt-2">
              <AlertTriangle size={14} /> {error}
            </div>
          )}

          {results.length > 0 && (
            <div className="flex flex-col gap-2 mt-3">
              {results.map((p) => (
                <button
                  key={p.id}
                  onClick={() => selectProduct(p)}
                  className="flex items-center gap-3 bg-zinc-900 border border-zinc-700 hover:border-zinc-500
                             rounded-xl p-3 text-left transition-colors"
                >
                  {p.images[0] && (
                    <img src={p.images[0]} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{p.name}</p>
                    <p className="text-xs text-zinc-500">{p.sku} · {formatPrice(p.price)}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {selected && mode === "product" && (
            <div className="mt-3 bg-zinc-900 border border-zinc-700 rounded-xl p-3 flex items-center gap-3">
              {selected.images[0] && (
                <img src={selected.images[0]} alt="" className="w-12 h-12 rounded-lg object-cover" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">{selected.name}</p>
                <p className="text-xs text-zinc-500">{selected.sku} · {formatPrice(selected.price)}</p>
              </div>
              <button
                onClick={() => { setSelected(null); setResults([]); }}
                className="text-zinc-600 hover:text-zinc-300 transition-colors flex-shrink-0"
              >
                <X size={15} />
              </button>
            </div>
          )}
        </section>
      )}

      {/* ── Formulario de detalle (compartido) ── */}
      {selected && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <section>
            <h3 className="text-xs text-zinc-400 uppercase tracking-wider mb-3">
              {mode === "transaction" ? "2. Detalle de la devolución" : "2. Detalle"}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {/* Talle — solo editable en modo producto */}
              {mode === "product" && (() => {
                const sizeRows = stock
                  .filter((s) => s.productId === selected.id && s.size)
                  .map((s) => s.size!);
                const hasSizes = sizeRows.length > 0;
                return (
                  <div className="col-span-2 flex flex-col gap-1">
                    <label className="text-xs text-zinc-400">
                      Talle{hasSizes ? " *" : " (dejar vacío si no aplica)"}
                    </label>
                    {hasSizes ? (
                      <div className="flex flex-wrap gap-1.5">
                        {sizeRows.map((sz) => (
                          <button
                            key={sz}
                            type="button"
                            onClick={() => setSize(size === sz ? "" : sz)}
                            className={`text-xs rounded px-3 py-1.5 font-medium transition-colors border
                              ${size === sz
                                ? "bg-white text-zinc-900 border-white"
                                : "bg-zinc-800 text-zinc-300 border-zinc-700 hover:border-zinc-500"
                              }`}
                          >
                            {sz}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <input
                        value={size}
                        onChange={(e) => setSize(e.target.value)}
                        placeholder="Sin talle"
                        className="bg-zinc-800 text-white rounded-lg px-3 py-2 text-sm outline-none
                                   border border-transparent focus:border-zinc-600"
                      />
                    )}
                  </div>
                );
              })()}

              {/* Cantidad */}
              <div className="flex flex-col gap-1">
                <label className="text-xs text-zinc-400">Cantidad</label>
                <input
                  type="number"
                  min={1}
                  max={maxQty}
                  value={qty}
                  onChange={(e) => setQty(Math.max(1, Math.min(maxQty, Number(e.target.value))))}
                  className="bg-zinc-800 text-white rounded-lg px-3 py-2 text-sm outline-none
                             border border-transparent focus:border-zinc-600"
                />
                {mode === "transaction" && txItem && (
                  <p className="text-[11px] text-zinc-600">Máx: {txItem.quantity} (comprado)</p>
                )}
              </div>

              {/* Motivo */}
              <div className="flex flex-col gap-1">
                <label className="text-xs text-zinc-400">Motivo *</label>
                <select
                  value={reason}
                  onChange={(e) => {
                    const r = e.target.value as ReturnReason;
                    setReason(r);
                    if (r) setRestock(RETURN_REASON_RESALABLE[r]);
                  }}
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

              {/* N° transacción — solo en modo producto */}
              {mode === "product" && (
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
              )}

              {/* Notas */}
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

              {/* Toggle restock */}
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

      {mode === "product" && !isLoading && !selected && !skuQuery && results.length === 0 && (
        <p className="text-zinc-600 text-sm text-center py-12">
          Ingresá el SKU o nombre del producto para comenzar.
        </p>
      )}

      {mode === "transaction" && !txSale && !txSearching && !txError && (
        <p className="text-zinc-600 text-sm text-center py-12">
          Ingresá el código del ticket para ver el detalle de la compra.
        </p>
      )}
    </div>
  );
}
