import { useState, useRef, useEffect } from 'react'
import { Copy, Pencil, Check, X } from 'lucide-react'
import { type Category, type Quality, type ItemType, type Variant, type Product } from '@/api/glossary'
import { buildEAN8 } from '@/utils/barcode'

interface GlossaryListProps {
  category: Category
  itemTypes: ItemType[]
  qualitiesByItemType: Record<number, Quality[]>
  variantsByQuality: Record<number, Variant[]>
  savedProducts: Record<string, Product>
  selectedItemTypeId: number | ''
  selectedQualityId: number | ''
  selectedVariantId: number | ''
  onSelect: (type: ItemType, quality: Quality, variant: Variant) => void
  onCopyCode: (code: string) => void
  onRenameCategory: (id: number, newName: string) => Promise<void>
  onRenameItemType: (id: number, newName: string) => Promise<void>
  onRenameQuality: (id: number, newName: string) => Promise<void>
  onRenameVariant: (id: number, newName: string) => Promise<void>
}

export function GlossaryList({
  category,
  itemTypes,
  qualitiesByItemType,
  variantsByQuality,
  savedProducts,
  selectedItemTypeId,
  selectedQualityId,
  selectedVariantId,
  onSelect,
  onCopyCode,
  onRenameCategory,
  onRenameItemType,
  onRenameQuality,
  onRenameVariant,
}: GlossaryListProps) {
  if (itemTypes.length === 0) {
    return (
      <div className="border-t border-gray-800 px-6 py-8 text-center text-sm text-gray-600">
        Sin tipos de prenda para esta categoría. Usa el "+" para crear.
      </div>
    )
  }

  return (
    <section className="border-t border-gray-800">
      {/* Cabecera */}
      <div className="flex items-center gap-3 px-6 py-3 bg-gray-900/50">
        <span className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Glosario</span>
        <span className="font-mono text-xs text-gray-600">{category.code}</span>
        <InlineEditName
          name={category.name}
          textClass="text-xs text-gray-400"
          onSave={(n) => onRenameCategory(category.id, n)}
        />
      </div>

      <div className="divide-y divide-gray-800/60">
        {itemTypes.map((type) => {
          const typeQualities = qualitiesByItemType[type.id] ?? []
          const isTypeSelected = selectedItemTypeId === type.id

          return (
            <div key={type.id} className={isTypeSelected ? 'bg-blue-950/20' : ''}>
              {/* Encabezado del tipo */}
              <div className="flex items-center gap-2 px-6 py-2.5 group/type">
                <span className="font-mono text-xs text-gray-500 tabular-nums shrink-0">{type.code}</span>
                <InlineEditName
                  name={type.name}
                  textClass="text-sm font-medium text-gray-200"
                  onSave={(n) => onRenameItemType(type.id, n)}
                />
                <span className="ml-auto text-xs text-gray-600 tabular-nums shrink-0">
                  {typeQualities.length} {typeQualities.length === 1 ? 'calidad' : 'calidades'}
                </span>
              </div>

              {typeQualities.length === 0 && (
                <p className="px-8 pb-2.5 text-xs text-gray-700">
                  Sin calidades. Selecciona este tipo y usa "+" para crear.
                </p>
              )}

              {/* Por cada calidad, sus variantes */}
              {typeQualities.map((quality) => {
                const qVariants = variantsByQuality[quality.id] ?? []
                const isQualitySelected = isTypeSelected && selectedQualityId === quality.id

                return (
                  <div key={quality.id}>
                    {/* Encabezado de calidad */}
                    <div className={`flex items-center gap-2 px-8 py-1.5 ${isQualitySelected ? 'bg-amber-950/20' : 'bg-gray-900/20'}`}>
                      <span className={`font-mono text-xs tabular-nums rounded px-1.5 py-0.5 border shrink-0 ${
                        isQualitySelected
                          ? 'bg-amber-900/40 border-amber-700/60 text-amber-300'
                          : 'bg-gray-800 border-gray-700 text-gray-400'
                      }`}>
                        {quality.code}
                      </span>
                      <InlineEditName
                        name={quality.name}
                        textClass="text-xs text-gray-400"
                        onSave={(n) => onRenameQuality(quality.id, n)}
                      />
                      <span className="ml-auto text-xs text-gray-600 tabular-nums shrink-0">
                        {qVariants.length} {qVariants.length === 1 ? 'variante' : 'variantes'}
                      </span>
                    </div>

                    {/* Filas de variantes */}
                    {qVariants.length > 0 && (
                      <div className="pb-1">
                        {qVariants.map((variant) => {
                          const seven = `${category.code}${quality.code}${type.code}${variant.code}`
                          const full  = buildEAN8(seven)
                          const saved = savedProducts[full]
                          const isSelected = isQualitySelected && selectedVariantId === variant.id

                          return (
                            <div
                              key={variant.id}
                              className={`
                                flex items-center gap-3 px-10 py-1.5 transition-colors group
                                hover:bg-gray-800/60
                                ${isSelected ? 'bg-blue-900/30 hover:bg-blue-900/40' : ''}
                              `}
                            >
                              <button
                                onClick={() => onSelect(type, quality, variant)}
                                className="flex items-center gap-3 flex-1 min-w-0 text-left"
                              >
                                <span className="font-mono text-xs text-gray-500 tabular-nums w-6 shrink-0">
                                  {variant.code}
                                </span>
                                <span className={`min-w-0 truncate text-sm ${isSelected ? 'text-gray-100' : 'text-gray-400'}`}>
                                  {variant.name}
                                </span>
                              </button>

                              <InlineEditName
                                name={variant.name}
                                textClass="hidden"
                                iconOnly
                                onSave={(n) => onRenameVariant(variant.id, n)}
                              />

                              <CodePill
                                category={category.code}
                                quality={quality.code}
                                type={type.code}
                                variant={variant.code}
                                full={full}
                              />

                              <span
                                className={`shrink-0 text-xs truncate max-w-[180px] ${
                                  saved ? 'text-emerald-400' : 'text-gray-700'
                                }`}
                                title={saved?.description}
                              >
                                {saved ? `✓ ${saved.description}` : '—'}
                              </span>

                              <button
                                onClick={() => onCopyCode(full)}
                                title="Copiar código EAN-8"
                                className="shrink-0 opacity-0 group-hover:opacity-100 text-gray-600 hover:text-gray-200 transition-all"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {qVariants.length === 0 && (
                      <p className="px-10 pb-2 text-xs text-gray-700">
                        Sin variantes. Selecciona esta calidad y usa "+" para crear.
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </section>
  )
}

// ─── Edición inline de nombre ─────────────────────────────────────────────────

function InlineEditName({
  name,
  textClass,
  iconOnly = false,
  onSave,
}: {
  name: string
  textClass: string
  iconOnly?: boolean
  onSave: (newName: string) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [value, setValue]     = useState(name)
  const [saving, setSaving]   = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) inputRef.current?.select()
  }, [editing])

  // Sync when name prop changes (parent updated state after save)
  useEffect(() => {
    if (!editing) setValue(name)
  }, [name, editing])

  async function save() {
    const trimmed = value.trim()
    if (!trimmed || trimmed === name) { setEditing(false); return }
    setSaving(true)
    try {
      await onSave(trimmed)
    } catch {
      setValue(name)
    } finally {
      setSaving(false)
      setEditing(false)
    }
  }

  function cancel() {
    setValue(name)
    setEditing(false)
  }

  if (editing) {
    return (
      <span className="flex items-center gap-1 flex-1 min-w-0">
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); save() }
            if (e.key === 'Escape') cancel()
          }}
          onBlur={save}
          disabled={saving}
          className="flex-1 min-w-0 bg-gray-800 border border-blue-600 rounded px-2 py-0.5 text-xs text-gray-100 focus:outline-none"
        />
        <button onMouseDown={(e) => { e.preventDefault(); save() }} className="text-emerald-500 hover:text-emerald-300 shrink-0">
          <Check className="w-3 h-3" />
        </button>
        <button onMouseDown={(e) => { e.preventDefault(); cancel() }} className="text-gray-600 hover:text-gray-300 shrink-0">
          <X className="w-3 h-3" />
        </button>
      </span>
    )
  }

  return (
    <span className="flex items-center gap-1 group/edit min-w-0">
      {!iconOnly && <span className={`${textClass} truncate`}>{name}</span>}
      <button
        onClick={() => setEditing(true)}
        title="Editar nombre"
        className="opacity-0 group-hover/edit:opacity-100 text-gray-600 hover:text-gray-300 transition-opacity shrink-0"
      >
        <Pencil className="w-3 h-3" />
      </button>
    </span>
  )
}

// ─── Pastillas de código ──────────────────────────────────────────────────────

function CodePill({
  category, quality, type, variant, full,
}: {
  category: string; quality: string
  type: string; variant: string; full: string
}) {
  return (
    <span className="shrink-0 flex items-center gap-0.5 font-mono text-xs tabular-nums">
      <Seg value={category} color="text-violet-400" />
      <Sep />
      <Seg value={quality} color="text-amber-400" />
      <Sep />
      <Seg value={type} color="text-sky-400" />
      <Sep />
      <Seg value={variant} color="text-teal-400" />
      <span className="text-gray-700 mx-0.5">→</span>
      <span className="text-gray-300">{full}</span>
    </span>
  )
}

function Seg({ value, color }: { value: string; color: string }) {
  return <span className={color}>{value}</span>
}
function Sep() {
  return <span className="text-gray-700">·</span>
}
