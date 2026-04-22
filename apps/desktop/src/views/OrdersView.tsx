import { useEffect, useState } from "react";
import { RefreshCw, ChevronDown, ChevronUp, CheckCircle2, Package } from "lucide-react";
import type { Sale } from "@kwinna/contracts";
import { fetchWebOrders, markAsAssembled } from "../services/sales";
import { formatDate, formatPrice } from "../lib/utils";
import { ApiError } from "../lib/api";

type StatusFilter = "all" | "completed" | "assembled";

export default function OrdersView() {
  const [orders,    setOrders]    = useState<Sale[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState("");
  const [filter,    setFilter]    = useState<StatusFilter>("all");
  const [expanded,  setExpanded]  = useState<string | null>(null);
  const [marking,   setMarking]   = useState<string | null>(null);
  const [toastMsg,  setToastMsg]  = useState("");

  function load() {
    setLoading(true);
    setError("");
    fetchWebOrders()
      .then(setOrders)
      .catch(() => setError("No se pudieron cargar los pedidos."))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function handleMarkAssembled(sale: Sale) {
    setMarking(sale.id);
    try {
      const updated = await markAsAssembled(sale.id);
      setOrders((prev) => prev.map((o) => o.id === updated.id ? updated : o));
      showToast("Pedido marcado como armado");
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Error al actualizar el pedido.");
    } finally {
      setMarking(null);
    }
  }

  function showToast(msg: string) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 4000);
  }

  const displayed = orders.filter((o) => {
    if (filter === "completed") return o.status === "completed";
    if (filter === "assembled") return o.status === "assembled";
    return true;
  });

  const pendingCount  = orders.filter((o) => o.status === "completed").length;
  const assembledCount = orders.filter((o) => o.status === "assembled").length;

  return (
    <div className="p-6 h-full flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-white">Pedidos web</h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            {pendingCount} para armar · {assembledCount} armados
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white
                     transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Actualizar
        </button>
      </div>

      {/* Filter pills */}
      <div className="flex gap-2">
        {(["all", "completed", "assembled"] as StatusFilter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
              filter === f
                ? "bg-white text-zinc-900"
                : "bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800"
            }`}
          >
            {f === "all" ? "Todos" : f === "completed" ? "Para armar" : "Armados"}
          </button>
        ))}
      </div>

      {error && (
        <div className="text-red-400 text-sm bg-red-950/30 border border-red-900/30 rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {loading && (
        <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm">
          Cargando pedidos...
        </div>
      )}

      {!loading && !error && (
        <div className="flex-1 overflow-auto flex flex-col gap-3">
          {displayed.length === 0 && (
            <div className="text-center text-zinc-600 text-sm py-20">
              <Package size={32} className="mx-auto mb-3 opacity-30" />
              No hay pedidos para mostrar.
            </div>
          )}
          {displayed.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              expanded={expanded === order.id}
              onToggle={() => setExpanded(expanded === order.id ? null : order.id)}
              onMarkAssembled={() => handleMarkAssembled(order)}
              marking={marking === order.id}
            />
          ))}
        </div>
      )}

      {toastMsg && (
        <div className="fixed bottom-6 right-6 flex items-center gap-2 bg-emerald-900 border
                        border-emerald-700 text-emerald-200 text-sm rounded-xl px-4 py-3 shadow-xl">
          <CheckCircle2 size={16} /> {toastMsg}
        </div>
      )}
    </div>
  );
}

function OrderCard({
  order,
  expanded,
  onToggle,
  onMarkAssembled,
  marking,
}: {
  order:           Sale;
  expanded:        boolean;
  onToggle:        () => void;
  onMarkAssembled: () => void;
  marking:         boolean;
}) {
  const isAssembled = order.status === "assembled";

  return (
    <div className={`bg-zinc-900 rounded-xl border transition-colors ${
      isAssembled ? "border-zinc-800 opacity-70" : "border-zinc-700"
    }`}>
      {/* Summary row */}
      <div className="flex items-center gap-4 px-5 py-4">
        {/* Status dot */}
        <span
          className={`w-2 h-2 rounded-full flex-shrink-0 ${
            isAssembled ? "bg-emerald-500" : "bg-amber-400"
          }`}
        />

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{order.customerName}</p>
          <p className="text-xs text-zinc-500 truncate">
            {order.shippingCity}, {order.shippingProvince} · {formatDate(order.createdAt)}
          </p>
        </div>

        {/* Total */}
        <span className="text-sm font-semibold text-white flex-shrink-0">
          {formatPrice(order.total)}
        </span>

        {/* Badge */}
        <span
          className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
            isAssembled
              ? "bg-emerald-900/60 text-emerald-400"
              : "bg-amber-900/60 text-amber-300"
          }`}
        >
          {isAssembled ? "Armado" : "Para armar"}
        </span>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {!isAssembled && (
            <button
              onClick={onMarkAssembled}
              disabled={marking}
              className="text-xs bg-emerald-800 hover:bg-emerald-700 text-emerald-200
                         rounded-lg px-3 py-1.5 font-medium transition-colors disabled:opacity-50"
            >
              {marking ? "..." : "Marcar armado"}
            </button>
          )}
          <button
            onClick={onToggle}
            className="text-zinc-500 hover:text-white transition-colors"
          >
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-5 pb-5 border-t border-zinc-800 pt-4 flex flex-col gap-3">
          {/* Items */}
          <div>
            <p className="text-[11px] text-zinc-500 uppercase tracking-wide mb-2">Artículos</p>
            <div className="flex flex-col gap-1.5">
              {order.items.map((item, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-zinc-300">
                    {item.quantity}× {item.productId.slice(0, 8)}…
                    {item.size ? ` (T.${item.size})` : ""}
                  </span>
                  <span className="text-zinc-400">{formatPrice(item.subtotal)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Shipping */}
          <div>
            <p className="text-[11px] text-zinc-500 uppercase tracking-wide mb-1">Envío</p>
            <p className="text-sm text-zinc-300">
              {order.shippingAddress}, {order.shippingCity}, {order.shippingProvince}
            </p>
            <p className="text-xs text-zinc-500 mt-0.5">
              Costo de envío: {formatPrice(order.shippingCost)}
            </p>
          </div>

          {/* Customer */}
          <div>
            <p className="text-[11px] text-zinc-500 uppercase tracking-wide mb-1">Cliente</p>
            <p className="text-sm text-zinc-300">{order.customerEmail}</p>
            {order.customerPhone && (
              <p className="text-xs text-zinc-500">{order.customerPhone}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
