import { useState } from "react";
import { RefreshCw, ChevronDown, ChevronUp, CheckCircle2, Package, ChevronLeft, ChevronRight } from "lucide-react";
import type { Sale, Product } from "@kwinna/contracts";
import { useWebOrders, useMarkAssembled } from "../hooks/use-orders";
import { useProducts } from "../hooks/use-products";
import { formatDate, formatPrice } from "../lib/utils";
import { ApiError } from "../lib/api";

type StatusFilter = "all" | "completed" | "assembled";

const PAGE_SIZE = 20;

export default function OrdersView() {
  const [filter,   setFilter]   = useState<StatusFilter>("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState("");
  const [page,     setPage]     = useState(0);

  const { orders, isLoading, isError, isRefetching, refetch } = useWebOrders();
  const { products } = useProducts();
  const { mutateAsync: markAssembled, isPending: marking } = useMarkAssembled();

  // Build product map for O(1) lookup in order items
  const productMap = new Map<string, Product>(products.map((p) => [p.id, p]));

  const displayed = orders.filter((o) => {
    if (filter === "completed") return o.status === "completed";
    if (filter === "assembled") return o.status === "assembled";
    return true;
  });

  const totalPages = Math.ceil(displayed.length / PAGE_SIZE);
  const paginated  = displayed.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  function handleFilterChange(f: StatusFilter) {
    setFilter(f);
    setPage(0);
  }

  const pendingCount   = orders.filter((o) => o.status === "completed").length;
  const assembledCount = orders.filter((o) => o.status === "assembled").length;

  async function handleMarkAssembled(sale: Sale) {
    try {
      await markAssembled(sale.id);
      showToast("Pedido marcado como armado");
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Error al actualizar el pedido.");
    }
  }

  function showToast(msg: string) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 4000);
  }

  return (
    <div className="p-6 h-full flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-white">Pedidos web</h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            {pendingCount} para armar · {assembledCount} armados
            {isRefetching && (
              <span className="ml-2 inline-flex items-center gap-1 text-zinc-600">
                <RefreshCw size={10} className="animate-spin" /> actualizando
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => void refetch()}
          disabled={isLoading || isRefetching}
          className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white
                     transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={(isLoading || isRefetching) ? "animate-spin" : ""} />
          Actualizar
        </button>
      </div>

      {/* Filter pills */}
      <div className="flex gap-2">
        {(["all", "completed", "assembled"] as StatusFilter[]).map((f) => (
          <button
            key={f}
            onClick={() => handleFilterChange(f)}
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

      {isError && (
        <div className="text-red-400 text-sm bg-red-950/30 border border-red-900/30 rounded-lg px-4 py-3">
          No se pudieron cargar los pedidos.
        </div>
      )}

      {/* Skeleton loading */}
      {isLoading && (
        <div className="flex-1 overflow-auto flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-zinc-900 rounded-xl border border-zinc-800 h-20 animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && !isError && (
        <div className="flex-1 overflow-auto flex flex-col gap-3">
          {paginated.length === 0 ? (
            <div className="text-center text-zinc-600 text-sm py-20">
              <Package size={32} className="mx-auto mb-3 opacity-30" />
              No hay pedidos para mostrar.
            </div>
          ) : (
            paginated.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                productMap={productMap}
                expanded={expanded === order.id}
                onToggle={() => setExpanded(expanded === order.id ? null : order.id)}
                onMarkAssembled={() => void handleMarkAssembled(order)}
                marking={marking}
              />
            ))
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2 border-t border-zinc-800 mt-1">
              <span className="text-xs text-zinc-500 tabular-nums">
                {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, displayed.length)} de {displayed.length}
              </span>
              <div className="flex items-center gap-1">
                <button
                  disabled={page === 0}
                  onClick={() => setPage(page - 1)}
                  className="w-7 h-7 rounded bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center
                             disabled:opacity-30 transition-colors"
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="text-xs text-zinc-400 px-2 tabular-nums">{page + 1} / {totalPages}</span>
                <button
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage(page + 1)}
                  className="w-7 h-7 rounded bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center
                             disabled:opacity-30 transition-colors"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
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
  productMap,
  expanded,
  onToggle,
  onMarkAssembled,
  marking,
}: {
  order:           Sale;
  productMap:      Map<string, Product>;
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
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isAssembled ? "bg-emerald-500" : "bg-amber-400"}`} />

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{order.customerName}</p>
          <p className="text-xs text-zinc-500 truncate">
            {order.shippingCity}, {order.shippingProvince} · {formatDate(order.createdAt)}
          </p>
        </div>

        <span className="text-sm font-semibold text-white flex-shrink-0">
          {formatPrice(order.total)}
        </span>

        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
          isAssembled ? "bg-emerald-900/60 text-emerald-400" : "bg-amber-900/60 text-amber-300"
        }`}>
          {isAssembled ? "Armado" : "Para armar"}
        </span>

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
          <button onClick={onToggle} className="text-zinc-500 hover:text-white transition-colors">
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-5 pb-5 border-t border-zinc-800 pt-4 flex flex-col gap-3">
          <div>
            <p className="text-[11px] text-zinc-500 uppercase tracking-wide mb-2">Artículos</p>
            <div className="flex flex-col gap-2">
              {order.items.map((item, i) => {
                const product = productMap.get(item.productId);
                const thumb   = product?.images?.[0];
                return (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-zinc-800 flex-shrink-0">
                      {thumb ? (
                        <img src={thumb} alt={product?.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package size={16} className="text-zinc-600" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {product?.name ?? "Producto no encontrado"}
                      </p>
                      <p className="text-xs text-zinc-500">
                        SKU: {product?.sku ?? "—"}{item.size ? ` · Talle ${item.size}` : ""}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm text-white">{formatPrice(item.subtotal)}</p>
                      <p className="text-xs text-zinc-500">{item.quantity}× {formatPrice(item.unitPrice)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <p className="text-[11px] text-zinc-500 uppercase tracking-wide mb-1">Envío</p>
            <p className="text-sm text-zinc-300">
              {order.shippingAddress}, {order.shippingCity}, {order.shippingProvince}
            </p>
            <p className="text-xs text-zinc-500 mt-0.5">
              Costo de envío: {formatPrice(order.shippingCost)}
            </p>
          </div>

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
