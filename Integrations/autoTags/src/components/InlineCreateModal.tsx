import { useState, useEffect, useRef } from 'react'
import { X, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

type CodeLength = 1 | 2

interface InlineCreateModalProps {
  title: string
  codeLength: CodeLength
  usedCodes: string[]    // códigos ya en uso para mostrar el contador
  onConfirm: (code: string, name: string) => Promise<void>
  onClose: () => void
}

export function InlineCreateModal({
  title,
  codeLength,
  usedCodes,
  onConfirm,
  onClose,
}: InlineCreateModalProps) {
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const codeInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    codeInputRef.current?.focus()
  }, [])

  // Cantidad total de slots según la longitud del código
  const totalSlots = codeLength === 1 ? 10 : 100
  const available = totalSlots - usedCodes.length

  function validateCode(raw: string): string | null {
    if (raw.length !== codeLength) return `El código debe tener exactamente ${codeLength} dígito(s)`
    if (!/^\d+$/.test(raw)) return 'El código debe ser numérico'
    if (usedCodes.includes(raw)) return `El código "${raw}" ya está en uso`
    return null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const validationError = validateCode(code)
    if (validationError) { setError(validationError); return }
    if (!name.trim()) { setError('El nombre no puede estar vacío'); return }
    setSaving(true)
    try {
      await onConfirm(code, name.trim())
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-sm rounded-xl border border-gray-700 bg-gray-900 shadow-2xl p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-100">{title}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-200 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Contador */}
        <div className="flex items-center justify-between rounded-md bg-gray-800 px-3 py-2 text-xs">
          <span className="text-gray-400">Slots disponibles</span>
          <span className={available < 5 ? 'text-amber-400 font-semibold' : 'text-gray-200 font-semibold'}>
            {available} / {totalSlots}
          </span>
        </div>

        {/* Códigos en uso */}
        {usedCodes.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs text-gray-500">En uso:</p>
            <div className="flex flex-wrap gap-1">
              {usedCodes.map((c) => (
                <span
                  key={c}
                  className="rounded bg-gray-800 border border-gray-700 px-1.5 py-0.5 text-xs text-gray-400 tabular-nums"
                >
                  {c}
                </span>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex gap-2">
            {/* Código */}
            <div className="space-y-1 w-20 shrink-0">
              <Label className="text-xs text-gray-400">Código</Label>
              <input
                ref={codeInputRef}
                type="text"
                maxLength={codeLength}
                value={code}
                onChange={(e) => { setCode(e.target.value.replace(/\D/g, '')); setError('') }}
                placeholder={'0'.repeat(codeLength)}
                className="flex h-9 w-full rounded-md border border-gray-700 bg-gray-950 px-3 py-1 text-sm text-gray-100 tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            {/* Nombre */}
            <div className="space-y-1 flex-1 min-w-0">
              <Label className="text-xs text-gray-400">Nombre</Label>
              <input
                type="text"
                value={name}
                onChange={(e) => { setName(e.target.value); setError('') }}
                placeholder="ej. Camisa Oxford"
                className="flex h-9 w-full rounded-md border border-gray-700 bg-gray-950 px-3 py-1 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-1.5 text-red-400 text-xs">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {error}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="ghost" size="sm" className="flex-1" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" className="flex-1" disabled={saving}>
              {saving ? 'Guardando…' : 'Crear'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
