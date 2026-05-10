import { useState } from "react";
import { Search, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Product, Stock } from "@kwinna/contracts";
import { SEASON_LABELS } from "@kwinna/contracts";
import { useProducts } from "../hooks/use-products";
import { useStock } from "../hooks/use-stock";
import { useDebounce } from "../lib/use-debounce";
import { formatRoundedPrice, matchProduct } from "../lib/utils";
import { usePosStore } from "../store/use-pos-store";
import BarcodeScannerButton from "../components/BarcodeScannerButton";

const PAGE_SIZE = 24;

export default function SearchView() {
  const [query, setQuery] = useState("");
  const [page,  setPage]  = useState(0);

  const { products, isLoading, isError } = useProducts();
  const { stock }  = useStock();
  const addToCart  = usePosStore((s) => s.addToCart);
  const navigate   = useNavigate();

  const debouncedQuery = useDebounce(query, 180);

  const filtered = debouncedQuery
    ? products.filter((p) => matchProduct(p.name, p.sku, debouncedQuery))
    : products;

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated  = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  function handleQueryChange(q: string) {
    setQuery(q);
    setPage(0);
  }

  function handleAddToCart(product: Product) {
    addToCart(product);
    navigate("/sell");
  }

  return (
    <div className="p-6 h-full flex flex-col gap-5">
      {/* Search bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md flex gap-2">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              autoFocus
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              placeholder="Buscar por nombre o SKU..."
              className="w-full bg-zinc-900 text-white rounded-lg pl-9 pr-4 py-2.5 text-sm
                         border border-zinc-800 focus:border-zinc-600 outline-none transition-colors"
            />
          </div>
          <BarcodeScannerButton onScan={handleQueryChange} />
        </div>
        <span className="text-xs text-zinc-500 tabular-nums">
          {isLoading ? "Cargando…" : `${filtered.length} productos`}
        </span>
      </div>

      {/* Loading skeletons */}
      {isLoading && (
        <div className="flex-1 overflow-auto">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
                <div className="aspect-square bg-zinc-800 animate-pulse" />
                <div className="p-3 flex flex-col gap-2">
                  <div className="h-4 bg-zinc-800 animate-pulse rounded" />
                  <div className="h-3 bg-zinc-800 animate-pulse rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {isError && (
        <div className="text-red-400 text-sm bg-red-950/30 border border-red-900/30 rounded-lg px-4 py-3">
          No se pudieron cargar los productos.
        </div>
      )}

      {/* Product grid */}
      {!isLoading && !isError && (
        <div className="flex-1 overflow-auto flex flex-col gap-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {paginated.map((product) => (
              <ProductCard key={product.id} product={product} stock={stock} onAdd={handleAddToCart} />
            ))}
            {filtered.length === 0 && (
              <div className="col-span-full text-center text-zinc-500 text-sm py-16">
                No se encontraron productos para &ldquo;{query}&rdquo;
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2 border-t border-zinc-800 mt-1">
              <span className="text-xs text-zinc-500 tabular-nums">
                {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} de {filtered.length}
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
    </div>
  );
}

function StockBadge({ qty }: { qty: number }) {
  if (qty === 0) return <span className="text-[10px] text-zinc-600">0</span>;
  if (qty <= 3)  return <span className="text-[10px] font-semibold text-amber-400 tabular-nums">{qty}</span>;
  return <span className="text-[10px] text-zinc-400 tabular-nums">{qty}</span>;
}

function ProductCard({
  product,
  stock,
  onAdd,
}: {
  product: Product;
  stock:   Stock[];
  onAdd:   (p: Product) => void;
}) {
  const thumb     = product.images[0];
  const sizeRows  = stock.filter((s) => s.productId === product.id && s.size);
  const totalStock = sizeRows.length > 0
    ? sizeRows.reduce((n, s) => n + s.quantity, 0)
    : (stock.find((s) => s.productId === product.id && !s.size)?.quantity ?? 0);

  return (
    <div className="bg-zinc-900 rounded-xl overflow-hidden border border-zinc-800 hover:border-zinc-600 transition-colors group">
      {/* Image */}
      <div className="aspect-square bg-zinc-800 relative overflow-hidden">
        {thumb ? (
          <img
            src={thumb}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-600 text-xs">
            Sin foto
          </div>
        )}
        {product.season && (
          <span className="absolute top-2 left-2 text-[10px] bg-black/70 text-zinc-300 px-1.5 py-0.5 rounded">
            {SEASON_LABELS[product.season]}
          </span>
        )}
        {product.showInShop === false && (
          <span className="absolute top-2 right-2 text-[10px] bg-violet-600/90 text-white px-1.5 py-0.5 rounded font-medium">
            Exclusivo tienda
          </span>
        )}
      </div>

      {/* Info */}
      <div className="p-3 flex flex-col gap-2">
        <div>
          <p className="text-sm font-medium text-white leading-tight line-clamp-2">{product.name}</p>
          <p className="text-[11px] text-zinc-500 mt-0.5">{product.sku}</p>
        </div>

        <div className="flex flex-col gap-1 border-t border-zinc-800 pt-2 pb-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-zinc-400">Lista</span>
            <span className="text-xs text-zinc-300">{formatRoundedPrice(product.price)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-zinc-400">Efectivo</span>
            <span className="text-sm font-semibold text-emerald-400">{formatRoundedPrice(product.price * 0.8)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-zinc-400">Mayorista</span>
            <span className="text-xs font-semibold text-amber-400">{formatRoundedPrice(product.price * 0.65)}</span>
          </div>
        </div>

        {/* Stock por talle */}
        <div className="flex flex-wrap gap-1 pt-1 border-t border-zinc-800">
          {sizeRows.length > 0 ? (
            sizeRows.map((s) => (
              <span
                key={s.size}
                className={`inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded font-medium ${
                  s.quantity === 0 ? "bg-zinc-800/40 text-zinc-600"
                  : s.quantity <= 3 ? "bg-amber-950/60 text-amber-400 ring-1 ring-amber-800/50"
                  : "bg-zinc-800 text-zinc-300"
                }`}
              >
                {s.size}
                <span className="opacity-70">·</span>
                <StockBadge qty={s.quantity} />
              </span>
            ))
          ) : (
            <span className={`text-[10px] px-1.5 py-0.5 rounded ${
              totalStock === 0 ? "bg-zinc-800/40 text-zinc-600"
              : totalStock <= 3 ? "bg-amber-950/60 text-amber-400"
              : "bg-zinc-800 text-zinc-300"
            }`}>
              Stock · <StockBadge qty={totalStock} />
            </span>
          )}
        </div>

        <div className="flex items-center justify-end mt-1">
          <button
            onClick={() => onAdd(product)}
            disabled={totalStock === 0}
            className="flex items-center gap-1 text-xs bg-white text-zinc-900 rounded-lg px-2.5 py-1.5
                       hover:bg-zinc-100 transition-colors font-medium w-full justify-center
                       disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus size={13} /> Agregar
          </button>
        </div>
        {product.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {product.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
