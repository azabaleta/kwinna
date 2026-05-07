import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { Plus, Copy, Save, Check, Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { BarcodePreview } from '@/components/BarcodePreview'
import { InlineCreateModal } from '@/components/InlineCreateModal'
import { GlossaryList } from '@/components/GlossaryList'
import {
  fetchCategories,
  fetchQualities,
  fetchItemTypes,
  fetchVariants,
  fetchProducts,
  createCategory,
  createQuality,
  createItemType,
  createVariant,
  saveProduct,
  updateCategory,
  updateItemType,
  updateQuality,
  updateVariant,
  type Category,
  type Quality,
  type ItemType,
  type Variant,
  type Product,
} from '@/api/glossary'
import { buildEAN8 } from '@/utils/barcode'

type ModalTarget = 'category' | 'quality' | 'itemType' | 'variant' | null
type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export function GlossaryGenerator() {
  // ─── Catálogos ──────────────────────────────────────────────────────────────
  const [categories, setCategories] = useState<Category[]>([])
  const [qualities, setQualities]   = useState<Quality[]>([])
  const [itemTypes, setItemTypes]   = useState<ItemType[]>([])
  const [variants, setVariants]     = useState<Variant[]>([])

  // Calidades por tipo y variantes por calidad (para la lista de glosario)
  const [qualitiesByItemType, setQualitiesByItemType] = useState<Record<number, Quality[]>>({})
  const [variantsByQuality, setVariantsByQuality]     = useState<Record<number, Variant[]>>({})
  // Cachés ref para lecturas sincrónicas sin crear dependencias en efectos
  const qualitiesCacheRef      = useRef<Record<number, Quality[]>>({})
  const variantsByQualityRef   = useRef<Record<number, Variant[]>>({})

  // Productos guardados indexados por fullCode
  const [savedProducts, setSavedProducts] = useState<Record<string, Product>>({})

  // ─── Selección ──────────────────────────────────────────────────────────────
  const [categoryId, setCategoryId] = useState<number | ''>('')
  const [qualityId, setQualityId]   = useState<number | ''>('')
  const [itemTypeId, setItemTypeId] = useState<number | ''>('')
  const [variantId, setVariantId]   = useState<number | ''>('')
  const [description, setDescription] = useState('')

  // Refs para propagar selecciones a través de la cadena de cascada
  const pendingQualityId = useRef<number | null>(null)
  const pendingVariantId = useRef<number | null>(null)

  // ─── UI state ───────────────────────────────────────────────────────────────
  const [modal, setModal]           = useState<ModalTarget>(null)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [saveError, setSaveError]   = useState('')
  const [copied, setCopied]         = useState(false)
  const [apiError, setApiError]     = useState('')

  // ─── Carga inicial: solo categorías (calidades son por tipo) ────────────────
  useEffect(() => {
    fetchCategories()
      .then(setCategories)
      .catch(() => setApiError('No se pudo conectar con el servidor. Asegúrate de que la API esté corriendo.'))
  }, [])

  // ─── Cascada: categoría → tipos ─────────────────────────────────────────────
  useEffect(() => {
    setItemTypeId('')
    setQualityId('')
    setVariantId('')
    setItemTypes([])
    setQualities([])
    setVariants([])
    setQualitiesByItemType({})
    setVariantsByQuality({})
    qualitiesCacheRef.current = {}
    variantsByQualityRef.current = {}
    if (!categoryId) return
    fetchItemTypes(Number(categoryId)).then(setItemTypes).catch(console.error)
  }, [categoryId])

  // ─── Carga de calidades + variantes para la lista de glosario ───────────────
  useEffect(() => {
    if (itemTypes.length === 0) return
    Promise.all(
      itemTypes.map((t) => fetchQualities(t.id).then((qs) => [t.id, qs] as [number, Quality[]]))
    ).then((qualEntries) => {
      const qualMap = Object.fromEntries(qualEntries)
      setQualitiesByItemType(qualMap)
      qualitiesCacheRef.current = qualMap
      const allQualities = qualEntries.flatMap(([, qs]) => qs)
      return Promise.all(
        allQualities.map((q) => fetchVariants(q.id).then((vs) => [q.id, vs] as [number, Variant[]]))
      )
    }).then((varEntries) => {
      const varMap = Object.fromEntries(varEntries)
      setVariantsByQuality(varMap)
      variantsByQualityRef.current = varMap
    }).catch(console.error)
  }, [itemTypes])

  // ─── Cascada: tipo → calidades ───────────────────────────────────────────────
  useEffect(() => {
    if (!itemTypeId) {
      setQualityId('')
      setVariantId('')
      setQualities([])
      setVariants([])
      return
    }
    const id = Number(itemTypeId)
    const cached = qualitiesCacheRef.current[id]
    if (cached) {
      setQualities(cached)
    } else {
      fetchQualities(id).then((qs) => {
        setQualities(qs)
        qualitiesCacheRef.current[id] = qs
        setQualitiesByItemType((prev) => ({ ...prev, [id]: qs }))
      }).catch(console.error)
    }
    setVariants([])
    if (pendingQualityId.current !== null) {
      setQualityId(pendingQualityId.current)
      pendingQualityId.current = null
    } else {
      setQualityId('')
      setVariantId('')
    }
  }, [itemTypeId])

  // ─── Cascada: calidad → variantes ────────────────────────────────────────────
  useEffect(() => {
    if (!qualityId) {
      setVariantId('')
      setVariants([])
      return
    }
    const id = Number(qualityId)
    const cached = variantsByQualityRef.current[id]
    if (cached) {
      setVariants(cached)
    } else {
      fetchVariants(id).then((vs) => {
        setVariants(vs)
        variantsByQualityRef.current[id] = vs
        setVariantsByQuality((prev) => ({ ...prev, [id]: vs }))
      }).catch(console.error)
    }
    if (pendingVariantId.current !== null) {
      setVariantId(pendingVariantId.current)
      pendingVariantId.current = null
    } else {
      setVariantId('')
    }
  }, [qualityId])

  // ─── Código derivado ────────────────────────────────────────────────────────
  const selected = useMemo(() => ({
    category: categories.find((c) => c.id === Number(categoryId)),
    quality:  qualities.find((q)  => q.id === Number(qualityId)),
    itemType: itemTypes.find((t)  => t.id === Number(itemTypeId)),
    variant:  variants.find((v)   => v.id === Number(variantId)),
  }), [categories, qualities, itemTypes, variants, categoryId, qualityId, itemTypeId, variantId])

  const sevenDigits = useMemo(() => {
    const { category, quality, itemType, variant } = selected
    if (!category || !quality || !itemType || !variant) return null
    return `${category.code}${quality.code}${itemType.code}${variant.code}`
  }, [selected])

  const fullCode = sevenDigits ? buildEAN8(sevenDigits) : null

  // ─── Prefijo para búsqueda de productos guardados ────────────────────────────
  const productPrefix = useMemo(() => {
    if (!selected.category) return null
    return selected.quality
      ? `${selected.category.code}${selected.quality.code}`
      : selected.category.code
  }, [selected.category, selected.quality])

  useEffect(() => {
    if (!productPrefix) { setSavedProducts({}); return }
    fetchProducts(productPrefix)
      .then((prods) => setSavedProducts(Object.fromEntries(prods.map((p) => [p.fullCode, p]))))
      .catch(console.error)
  }, [productPrefix])

  // ─── Acciones ────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!sevenDigits || !description.trim()) return
    setSaveStatus('saving')
    setSaveError('')
    try {
      const product = await saveProduct({ sevenDigits, description: description.trim() })
      setSavedProducts((prev) => ({ ...prev, [product.fullCode]: product }))
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2500)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Error al guardar')
      setSaveStatus('error')
    }
  }

  async function handleCopy() {
    if (!fullCode) return
    await navigator.clipboard.writeText(fullCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const handleCopyCode = useCallback(async (code: string) => {
    await navigator.clipboard.writeText(code)
  }, [])

  // Selección desde la lista de glosario (3 niveles: tipo → calidad → variante)
  const handleSelectFromList = useCallback((type: ItemType, quality: Quality, variant: Variant) => {
    pendingQualityId.current = quality.id
    pendingVariantId.current = variant.id
    setItemTypeId(type.id)
  }, [])

  // ─── Renombrar ───────────────────────────────────────────────────────────────

  const handleRenameCategory = useCallback(async (id: number, newName: string) => {
    await updateCategory(id, newName)
    setCategories((prev) => prev.map((c) => c.id === id ? { ...c, name: newName } : c))
  }, [])

  const handleRenameItemType = useCallback(async (id: number, newName: string) => {
    await updateItemType(id, newName)
    setItemTypes((prev) => prev.map((t) => t.id === id ? { ...t, name: newName } : t))
  }, [])

  const handleRenameQuality = useCallback(async (id: number, newName: string) => {
    await updateQuality(id, newName)
    const apply = (qs: Quality[]) => qs.map((q) => q.id === id ? { ...q, name: newName } : q)
    setQualities((prev) => apply(prev))
    setQualitiesByItemType((prev) => {
      const next: Record<number, Quality[]> = {}
      for (const k in prev) next[k] = apply(prev[k])
      return next
    })
    for (const k in qualitiesCacheRef.current) {
      qualitiesCacheRef.current[k] = apply(qualitiesCacheRef.current[k])
    }
  }, [])

  const handleRenameVariant = useCallback(async (id: number, newName: string) => {
    await updateVariant(id, newName)
    const apply = (vs: Variant[]) => vs.map((v) => v.id === id ? { ...v, name: newName } : v)
    setVariants((prev) => apply(prev))
    setVariantsByQuality((prev) => {
      const next: Record<number, Variant[]> = {}
      for (const k in prev) next[k] = apply(prev[k])
      return next
    })
    for (const k in variantsByQualityRef.current) {
      variantsByQualityRef.current[k] = apply(variantsByQualityRef.current[k])
    }
  }, [])

  // ─── Creación inline ─────────────────────────────────────────────────────────

  async function handleCreateCategory(code: string, name: string) {
    const cat = await createCategory({ code, name })
    setCategories((prev) => [...prev, cat].sort((a, b) => a.code.localeCompare(b.code)))
    setCategoryId(cat.id)
  }

  async function handleCreateQuality(code: string, name: string) {
    const q = await createQuality({ itemTypeId: Number(itemTypeId), code, name })
    const sorted = [...(qualitiesCacheRef.current[Number(itemTypeId)] ?? []), q]
      .sort((a, b) => a.code.localeCompare(b.code))
    setQualities(sorted)
    qualitiesCacheRef.current[Number(itemTypeId)] = sorted
    setQualitiesByItemType((prev) => ({ ...prev, [Number(itemTypeId)]: sorted }))
    setQualityId(q.id)
  }

  async function handleCreateItemType(code: string, name: string) {
    const t = await createItemType({ categoryId: Number(categoryId), code, name })
    setItemTypes((prev) => [...prev, t].sort((a, b) => a.code.localeCompare(b.code)))
    setQualitiesByItemType((prev) => ({ ...prev, [t.id]: [] }))
    qualitiesCacheRef.current[t.id] = []
    setItemTypeId(t.id)
  }

  async function handleCreateVariant(code: string, name: string) {
    const v = await createVariant({ qualityId: Number(qualityId), code, name })
    const sorted = [...(variantsByQualityRef.current[Number(qualityId)] ?? []), v]
      .sort((a, b) => a.code.localeCompare(b.code))
    setVariants(sorted)
    variantsByQualityRef.current[Number(qualityId)] = sorted
    setVariantsByQuality((prev) => ({ ...prev, [Number(qualityId)]: sorted }))
    setVariantId(v.id)
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  if (apiError) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="flex items-start gap-2 text-amber-400 max-w-sm text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          {apiError}
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-auto">

      {/* ── Panel superior: selectores + preview ── */}
      <div className="flex flex-col lg:flex-row shrink-0">

        {/* Selectores */}
        <aside className="w-full lg:w-80 border-b lg:border-b-0 lg:border-r border-gray-800 p-5 space-y-5 shrink-0">
          <SelectorRow
            label="Categoría"
            hint="dígitos 1-2"
            value={categoryId}
            onChange={(v) => setCategoryId(v === '' ? '' : Number(v))}
            options={categories}
            onAdd={() => setModal('category')}
          />
          <SelectorRow
            label="Tipo de prenda"
            hint="dígitos 4-5"
            value={itemTypeId}
            onChange={(v) => setItemTypeId(v === '' ? '' : Number(v))}
            options={itemTypes}
            disabled={!categoryId}
            disabledHint="Selecciona una categoría primero"
            onAdd={() => setModal('itemType')}
            addDisabled={!categoryId}
          />
          <SelectorRow
            label="Calidad"
            hint="dígito 3"
            value={qualityId}
            onChange={(v) => setQualityId(v === '' ? '' : Number(v))}
            options={qualities}
            disabled={!itemTypeId}
            disabledHint="Selecciona un tipo de prenda primero"
            onAdd={() => setModal('quality')}
            addDisabled={false}
          />
          <SelectorRow
            label="Variante / Color"
            hint="dígitos 6-7"
            value={variantId}
            onChange={(v) => setVariantId(v === '' ? '' : Number(v))}
            options={variants}
            disabled={!itemTypeId || !qualityId}
            disabledHint={!itemTypeId ? 'Selecciona un tipo de prenda primero' : 'Selecciona una calidad primero'}
            onAdd={() => setModal('variant')}
            addDisabled={!itemTypeId || !qualityId}
          />

          {/* Código formado en vivo */}
          <div className="rounded-lg bg-gray-900 border border-gray-800 p-3 space-y-2">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Código 7 dígitos</p>
            <div className="flex gap-1 font-mono text-lg">
              <Segment value={selected.category?.code} digits={2} label="cat" />
              <Segment value={selected.quality?.code}  digits={1} label="cal" />
              <Segment value={selected.itemType?.code} digits={2} label="tipo" />
              <Segment value={selected.variant?.code}  digits={2} label="var" />
            </div>
          </div>
        </aside>

        {/* Preview y acciones */}
        <main className="flex-1 flex flex-col items-center justify-center gap-6 p-8">
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-6 flex flex-col items-center gap-4 w-full max-w-xs">
            {fullCode ? (
              <BarcodePreview fullCode={fullCode} />
            ) : (
              <div className="h-24 flex items-center justify-center text-gray-600 text-sm">
                Completa los 4 selectores
              </div>
            )}
          </div>

          <div className="w-full max-w-xs space-y-1.5">
            <Label className="text-xs text-gray-400">Descripción del producto</Label>
            <input
              type="text"
              value={description}
              onChange={(e) => { setDescription(e.target.value); if (saveStatus === 'error') setSaveStatus('idle') }}
              placeholder="ej. Camisa Oxford Blanca Hombre Premium"
              className="flex h-9 w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-1 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 focus:ring-offset-gray-950"
            />
          </div>

          <div className="flex gap-2 w-full max-w-xs">
            <Button variant="outline" className="flex-1" onClick={handleCopy} disabled={!fullCode}>
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copiado' : 'Copiar código'}
            </Button>
            <Button
              className="flex-1"
              onClick={handleSave}
              disabled={!fullCode || !description.trim() || saveStatus === 'saving'}
            >
              {saveStatus === 'saving' ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Guardando…</>
              ) : saveStatus === 'saved' ? (
                <><Check className="w-4 h-4" /> Guardado</>
              ) : (
                <><Save className="w-4 h-4" /> Guardar</>
              )}
            </Button>
          </div>

          {saveStatus === 'error' && saveError && (
            <div className="flex items-center gap-1.5 text-red-400 text-xs w-full max-w-xs">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {saveError}
            </div>
          )}
        </main>
      </div>

      {/* ── Lista de glosario (aparece cuando hay categoría seleccionada) ── */}
      {selected.category && (
        <GlossaryList
          category={selected.category}
          itemTypes={itemTypes}
          qualitiesByItemType={qualitiesByItemType}
          variantsByQuality={variantsByQuality}
          savedProducts={savedProducts}
          selectedItemTypeId={itemTypeId}
          selectedQualityId={qualityId}
          selectedVariantId={variantId}
          onSelect={handleSelectFromList}
          onCopyCode={handleCopyCode}
          onRenameCategory={handleRenameCategory}
          onRenameItemType={handleRenameItemType}
          onRenameQuality={handleRenameQuality}
          onRenameVariant={handleRenameVariant}
        />
      )}

      {/* Modales de creación inline */}
      {modal === 'category' && (
        <InlineCreateModal
          title="Nueva categoría"
          codeLength={2}
          usedCodes={categories.map((c) => c.code)}
          onConfirm={handleCreateCategory}
          onClose={() => setModal(null)}
        />
      )}
      {modal === 'quality' && (
        <InlineCreateModal
          title="Nueva calidad"
          codeLength={1}
          usedCodes={qualities.map((q) => q.code)}
          onConfirm={handleCreateQuality}
          onClose={() => setModal(null)}
        />
      )}
      {modal === 'itemType' && (
        <InlineCreateModal
          title="Nuevo tipo de prenda"
          codeLength={2}
          usedCodes={itemTypes.map((t) => t.code)}
          onConfirm={handleCreateItemType}
          onClose={() => setModal(null)}
        />
      )}
      {modal === 'variant' && (
        <InlineCreateModal
          title="Nueva variante / color"
          codeLength={2}
          usedCodes={variants.map((v) => v.code)}
          onConfirm={handleCreateVariant}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

interface SelectorRowProps {
  label: string
  hint: string
  value: number | ''
  onChange: (v: string) => void
  options: { id: number; code: string; name: string }[]
  disabled?: boolean
  disabledHint?: string
  onAdd: () => void
  addDisabled?: boolean
}

function SelectorRow({
  label, hint, value, onChange, options, disabled, disabledHint, onAdd, addDisabled,
}: SelectorRowProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-sm text-gray-200">
          {label}{' '}
          <span className="text-gray-600 font-normal text-xs">({hint})</span>
        </Label>
        <button
          onClick={onAdd}
          disabled={addDisabled}
          title={`Crear ${label.toLowerCase()}`}
          className="flex items-center justify-center w-6 h-6 rounded border border-gray-700 text-gray-400 hover:text-gray-100 hover:border-gray-500 hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
      <Select
        value={value === '' ? '' : String(value)}
        onChange={(e) => onChange(e.target.value)}
        placeholder={disabled ? (disabledHint ?? `Selecciona ${label}`) : `Selecciona ${label}`}
        disabled={disabled || options.length === 0}
      >
        {options.map((o) => (
          <option key={o.id} value={String(o.id)}>
            {o.code} — {o.name}
          </option>
        ))}
      </Select>
      {!disabled && options.length === 0 && (
        <p className="text-xs text-gray-600">Sin opciones. Usa "+" para crear.</p>
      )}
    </div>
  )
}

function Segment({ value, digits, label }: { value: string | undefined; digits: number; label: string }) {
  const display = value ?? '─'.repeat(digits)
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className={`tracking-widest text-xl tabular-nums transition-colors ${value ? 'text-gray-100' : 'text-gray-700'}`}>
        {display}
      </span>
      <span className="text-[9px] text-gray-600 uppercase">{label}</span>
    </div>
  )
}
