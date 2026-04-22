import { useEffect, useState } from "react";
import { Search, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Product } from "@kwinna/contracts";
import { SEASON_LABELS } from "@kwinna/contracts";
import { fetchProducts } from "../services/products";
import { formatPrice, matchProduct } from "../lib/utils";
import { usePosStore } from "../store/use-pos-store";

export default function SearchView() {
  const [products, setProducts] = useState<Product[]>([]);
  const [query,    setQuery]    = useState("");
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");

  const addToCart = usePosStore((s) => s.addToCart);
  const navigate  = useNavigate();

  useEffect(() => {
    fetchProducts()
      .then(setProducts)
      .catch(() => setError("No se pudieron cargar los productos."))
      .finally(() => setLoading(false));
  }, []);

  const filtered = products.filter((p) => matchProduct(p.name, p.sku, query));

  function handleAddToCart(product: Product) {
    addToCart(product);
    navigate("/sell");
  }

  return (
    <div className="p-6 h-full flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre o SKU..."
            className="w-full bg-zinc-900 text-white rounded-lg pl-9 pr-4 py-2.5 text-sm
                       border border-zinc-800 focus:border-zinc-600 outline-none transition-colors"
          />
        </div>
        <span className="text-xs text-zinc-500">{filtered.length} productos</span>
      </div>

      {loading && (
        <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm">
          Cargando productos...
        </div>
      )}

      {error && (
        <div className="text-red-400 text-sm bg-red-950/30 border border-red-900/30 rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="flex-1 overflow-auto">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map((product) => (
              <ProductCard key={product.id} product={product} onAdd={handleAddToCart} />
            ))}
            {filtered.length === 0 && (
              <div className="col-span-full text-center text-zinc-500 text-sm py-16">
                No se encontraron productos para "{query}"
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ProductCard({
  product,
  onAdd,
}: {
  product: Product;
  onAdd:   (p: Product) => void;
}) {
  const thumb = product.images[0];

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
        {/* Season badge */}
        {product.season && (
          <span className="absolute top-2 left-2 text-[10px] bg-black/70 text-zinc-300 px-1.5 py-0.5 rounded">
            {SEASON_LABELS[product.season]}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="p-3 flex flex-col gap-2">
        <div>
          <p className="text-sm font-medium text-white leading-tight line-clamp-2">{product.name}</p>
          <p className="text-[11px] text-zinc-500 mt-0.5">{product.sku}</p>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-white">{formatPrice(product.price)}</span>
          <button
            onClick={() => onAdd(product)}
            className="flex items-center gap-1 text-xs bg-white text-zinc-900 rounded-lg px-2.5 py-1.5
                       hover:bg-zinc-100 transition-colors font-medium"
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
