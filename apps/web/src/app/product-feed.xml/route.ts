import { ProductListResponseSchema, StockListResponseSchema } from "@kwinna/contracts";
import type { Product } from "@kwinna/contracts";

// ─── Feed de catálogo para Meta Commerce ─────────────────────────────────────
// Genera un feed XML (RSS 2.0 + namespace de Google, formato aceptado por Meta)
// con los productos visibles en la tienda. Meta reprograma la lectura por su
// cuenta. Se resuelve 100% en la web reusando los endpoints públicos
// GET /products y GET /stock — mismo patrón que app/sitemap.ts, sin tocar el
// backend. URL a cargar en Commerce Manager: https://somoskwinna.com/product-feed.xml

// Revalidación cada hora — el feed no necesita ser tiempo real.
export const revalidate = 3600;

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://kwinna.com.ar";
const API_URL =
  process.env.API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:3001";

/** Escapa los caracteres reservados de XML en un valor de texto. */
function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Unidades totales en stock por productId (suma de todas las variantes de talle). */
async function fetchStockIndex(): Promise<Record<string, number>> {
  try {
    const res = await fetch(`${API_URL}/stock`, { next: { revalidate: 3600 } });
    if (!res.ok) return {};
    const { data: stock } = StockListResponseSchema.parse(await res.json());

    const index: Record<string, number> = {};
    for (const s of stock) {
      index[s.productId] = (index[s.productId] ?? 0) + s.quantity;
    }
    return index;
  } catch {
    return {};
  }
}

async function fetchProducts(): Promise<Product[]> {
  try {
    const res = await fetch(`${API_URL}/products`, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const { data } = ProductListResponseSchema.parse(await res.json());
    return data;
  } catch {
    return [];
  }
}

/** Convierte un producto en un <item> del feed. */
function productToItem(product: Product, stockQty: number): string {
  const availability = stockQty > 0 ? "in stock" : "out of stock";
  const [mainImage, ...restImages] = product.images;
  const description = product.description?.trim() || product.name;
  const productType = product.tags[0];

  const parts: string[] = [
    `<g:id>${escapeXml(product.id)}</g:id>`,
    `<g:title>${escapeXml(product.name)}</g:title>`,
    `<g:description>${escapeXml(description)}</g:description>`,
    `<g:link>${escapeXml(`${APP_URL}/shop/${product.id}`)}</g:link>`,
    `<g:price>${product.price.toFixed(2)} ARS</g:price>`,
    `<g:availability>${availability}</g:availability>`,
    `<g:condition>new</g:condition>`,
    `<g:brand>Kwinna</g:brand>`,
    `<g:identifier_exists>no</g:identifier_exists>`,
  ];

  if (mainImage) parts.push(`<g:image_link>${escapeXml(mainImage)}</g:image_link>`);
  for (const img of restImages) {
    parts.push(`<g:additional_image_link>${escapeXml(img)}</g:additional_image_link>`);
  }
  if (productType) parts.push(`<g:product_type>${escapeXml(productType)}</g:product_type>`);

  return `    <item>\n      ${parts.join("\n      ")}\n    </item>`;
}

export async function GET(): Promise<Response> {
  const [products, stockIndex] = await Promise.all([
    fetchProducts(),
    fetchStockIndex(),
  ]);

  // Solo productos visibles en la tienda pública (showInShop !== false).
  const items = products
    .filter((p) => p.showInShop !== false)
    .map((p) => productToItem(p, stockIndex[p.id] ?? 0))
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Kwinna — Catálogo</title>
    <link>${escapeXml(APP_URL)}</link>
    <description>Feed de productos de Kwinna para Meta Commerce</description>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
