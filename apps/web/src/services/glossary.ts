import apiClient from "@/lib/axios";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GlossaryCategory { id: number; code: string; name: string }
export interface GlossaryItemType { id: number; categoryId: number; code: string; name: string }
export interface GlossaryQuality  { id: number; itemTypeId: number; code: string; name: string }
export interface GlossaryVariant  { id: number; qualityId: number; code: string; name: string }
export interface SkuEntry         { fullCode: string; description: string }

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function get<T>(path: string, params?: Record<string, string | number>): Promise<T> {
  const res = await apiClient.get(path, { params });
  return (res.data as { data: T }).data;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await apiClient.post(path, body);
  return (res.data as { data: T }).data;
}

async function patch<T>(path: string, body: unknown): Promise<T> {
  const res = await apiClient.patch(path, body);
  return (res.data as { data: T }).data;
}

// ─── Categories ───────────────────────────────────────────────────────────────

export const fetchCategories = () =>
  get<GlossaryCategory[]>("/glossary/categories");

export const createCategory = (data: { code: string; name: string }) =>
  post<GlossaryCategory>("/glossary/categories", data);

export const updateCategory = (id: number, name: string) =>
  patch<GlossaryCategory>(`/glossary/categories/${id}`, { name });

// ─── Item types ───────────────────────────────────────────────────────────────

export const fetchItemTypes = (categoryId: number) =>
  get<GlossaryItemType[]>("/glossary/item-types", { categoryId });

export const createItemType = (data: { categoryId: number; code: string; name: string }) =>
  post<GlossaryItemType>("/glossary/item-types", data);

export const updateItemType = (id: number, name: string) =>
  patch<GlossaryItemType>(`/glossary/item-types/${id}`, { name });

// ─── Qualities ────────────────────────────────────────────────────────────────

export const fetchQualities = (itemTypeId: number) =>
  get<GlossaryQuality[]>("/glossary/qualities", { itemTypeId });

export const createQuality = (data: { itemTypeId: number; code: string; name: string }) =>
  post<GlossaryQuality>("/glossary/qualities", data);

export const updateQuality = (id: number, name: string) =>
  patch<GlossaryQuality>(`/glossary/qualities/${id}`, { name });

// ─── Variants ─────────────────────────────────────────────────────────────────

export const fetchVariants = (qualityId: number) =>
  get<GlossaryVariant[]>("/glossary/variants", { qualityId });

export const createVariant = (data: { qualityId: number; code: string; name: string }) =>
  post<GlossaryVariant>("/glossary/variants", data);

export const updateVariant = (id: number, name: string) =>
  patch<GlossaryVariant>(`/glossary/variants/${id}`, { name });

// ─── Products (sku-lookup para el impresor de etiquetas) ──────────────────────

export const fetchSkuEntries = (prefix?: string) =>
  get<SkuEntry[]>("/products/sku-lookup", prefix ? { prefix } : undefined);
