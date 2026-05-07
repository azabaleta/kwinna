export interface Category { id: number; code: string; name: string }
export interface Quality  { id: number; itemTypeId: number; code: string; name: string }
export interface ItemType { id: number; categoryId: number; code: string; name: string }
export interface Variant  { id: number; qualityId: number; code: string; name: string }
export interface Product  { id: number; fullCode: string; description: string; createdAt: string }

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init)
  const body = await res.json()
  if (!res.ok) throw new Error((body as { error: string }).error ?? 'Error desconocido')
  return body as T
}

// ─── Queries ─────────────────────────────────────────────────────────────────

export const fetchCategories = () => apiFetch<Category[]>('/api/categories')
export const fetchQualities = (itemTypeId: number) =>
  apiFetch<Quality[]>(`/api/qualities?itemTypeId=${itemTypeId}`)

export const fetchItemTypes = (categoryId: number) =>
  apiFetch<ItemType[]>(`/api/item-types?categoryId=${categoryId}`)

export const fetchVariants = (qualityId: number) =>
  apiFetch<Variant[]>(`/api/variants?qualityId=${qualityId}`)

export const fetchProducts = (prefix?: string) =>
  apiFetch<Product[]>(prefix ? `/api/products?prefix=${prefix}` : '/api/products')

// ─── Mutaciones ───────────────────────────────────────────────────────────────

const post = <T>(url: string, body: unknown) =>
  apiFetch<T>(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

const patch = <T>(url: string, body: unknown) =>
  apiFetch<T>(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

export const createCategory = (data: { code: string; name: string }) =>
  post<Category>('/api/categories', data)

export const createQuality = (data: { itemTypeId: number; code: string; name: string }) =>
  post<Quality>('/api/qualities', data)

export const createItemType = (data: { categoryId: number; code: string; name: string }) =>
  post<ItemType>('/api/item-types', data)

export const createVariant = (data: { qualityId: number; code: string; name: string }) =>
  post<Variant>('/api/variants', data)

export const saveProduct = (data: { sevenDigits: string; description: string }) =>
  post<Product>('/api/products', data)

export const updateCategory = (id: number, name: string) => patch<Category>(`/api/categories/${id}`, { name })
export const updateItemType  = (id: number, name: string) => patch<ItemType>(`/api/item-types/${id}`, { name })
export const updateQuality   = (id: number, name: string) => patch<Quality>(`/api/qualities/${id}`, { name })
export const updateVariant   = (id: number, name: string) => patch<Variant>(`/api/variants/${id}`, { name })
