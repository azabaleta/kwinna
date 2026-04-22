import type { MetadataRoute } from "next";
import { ProductListResponseSchema } from "@kwinna/contracts";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://kwinna.com.ar";
// API_URL is the server-side (private) internal URL — cheaper on PaaS networks
// and safe to point to an internal hostname.  Falls back to the public browser
// var so a single NEXT_PUBLIC_API_URL still works in simpler setups.
const API_URL =
  process.env.API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:3001";

// Static routes with their change frequency and priority
const STATIC_ROUTES: MetadataRoute.Sitemap = [
  {
    url:              APP_URL,
    lastModified:     new Date(),
    changeFrequency:  "weekly",
    priority:         1,
  },
  {
    url:              `${APP_URL}/shop`,
    lastModified:     new Date(),
    changeFrequency:  "daily",
    priority:         0.9,
  },
];

async function fetchProductRoutes(): Promise<MetadataRoute.Sitemap> {
  try {
    const res = await fetch(`${API_URL}/products`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];

    const { data: products } = ProductListResponseSchema.parse(
      await res.json()
    );

    return products.map((product) => ({
      url:             `${APP_URL}/shop/${product.id}`,
      lastModified:    new Date(product.updatedAt),
      changeFrequency: "weekly" as const,
      priority:        0.7,
    }));
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const productRoutes = await fetchProductRoutes();
  return [...STATIC_ROUTES, ...productRoutes];
}
