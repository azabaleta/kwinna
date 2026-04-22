import type { Metadata } from "next";
import { ProductResponseSchema } from "@kwinna/contracts";
import { ProductDetailClient } from "./product-detail-client";

// Prefer the private server-side URL (same-network on PaaS) and fall back to
// the public browser var so a single env is enough in simpler deployments.
const API_URL =
  process.env.API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:3001";

async function fetchProductMeta(id: string) {
  try {
    const res = await fetch(`${API_URL}/products/${id}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    return ProductResponseSchema.parse(await res.json()).data;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const product = await fetchProductMeta(id);
  if (!product) return { title: "Producto | Kwinna" };

  const image = product.images[0];
  const description =
    product.description ?? `${product.name} — Kwinna Moda Femenina`;

  return {
    title: product.name,
    description,
    openGraph: {
      title:       product.name,
      description,
      type:        "website",
      images:      image
        ? [{ url: image, width: 800, height: 1067, alt: product.name }]
        : [],
    },
    twitter: {
      card:        "summary_large_image",
      title:       product.name,
      description,
      images:      image ? [image] : [],
    },
  };
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ProductDetailClient id={id} />;
}
