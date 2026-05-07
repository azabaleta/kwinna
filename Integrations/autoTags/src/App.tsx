import { useState, useMemo, useEffect, useCallback } from 'react'
import { LabelGrid } from '@/components/LabelGrid'
import { ConfigPanel } from '@/components/ConfigPanel'
import { GlossaryGenerator } from '@/components/GlossaryGenerator'
import { parseCodes } from '@/utils/barcode'
import { calculateGrid, DEFAULT_CONFIG, type LayoutConfig } from '@/utils/layout'
import { generatePDF } from '@/utils/generatePDF'
import { fetchProducts } from '@/api/glossary'

type Tab = 'generator' | 'glossary'

export default function App() {
  const [tab, setTab] = useState<Tab>('generator')
  const [rawInput, setRawInput] = useState('')
  const [config, setConfig] = useState<LayoutConfig>(DEFAULT_CONFIG)
  const [currentPage, setCurrentPage] = useState(1)
  const [isGenerating, setIsGenerating] = useState(false)
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null)
  const [codeDescriptions, setCodeDescriptions] = useState<Record<string, string>>({})

  const { valid: codes, invalid } = useMemo(() => parseCodes(rawInput), [rawInput])
  const layout = useMemo(() => calculateGrid(config, codes.length), [config, codes.length])

  useEffect(() => {
    setCurrentPage((p) => Math.min(p, layout.totalPages))
  }, [layout.totalPages])

  useEffect(() => {
    if (codes.length === 0) { setCodeDescriptions({}); return }
    fetchProducts()
      .then((products) => {
        const map: Record<string, string> = {}
        for (const p of products) map[p.fullCode] = p.description
        setCodeDescriptions(map)
      })
      .catch(() => {})
  }, [codes])

  const handleDownload = useCallback(async () => {
    if (codes.length === 0) return
    setIsGenerating(true)
    try {
      await generatePDF(codes, config, codeDescriptions, logoDataUrl)
    } finally {
      setIsGenerating(false)
    }
  }, [codes, config, codeDescriptions, logoDataUrl])

  return (
    <div className="h-screen bg-gray-950 text-gray-100 flex flex-col overflow-hidden">
      <header className="border-b border-gray-800 px-6 py-3 shrink-0 flex items-center gap-6">
        <h1 className="text-base font-semibold tracking-tight text-gray-100">
          autoTags{' '}
          <span className="text-gray-500 font-normal text-sm">— Generador EAN-8</span>
        </h1>

        <nav className="flex gap-1">
          <TabButton active={tab === 'generator'} onClick={() => setTab('generator')}>
            Imprimir etiquetas
          </TabButton>
          <TabButton active={tab === 'glossary'} onClick={() => setTab('glossary')}>
            Glosario de productos
          </TabButton>
        </nav>
      </header>

      {tab === 'generator' ? (
        <div className="flex flex-1 min-h-0">
          <aside className="w-72 border-r border-gray-800 overflow-y-auto shrink-0">
            <ConfigPanel
              config={config}
              onChange={setConfig}
              rawInput={rawInput}
              onRawInputChange={setRawInput}
              codes={codes}
              invalid={invalid}
              layout={layout}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
              onDownload={handleDownload}
              isGenerating={isGenerating}
              logoDataUrl={logoDataUrl}
              onLogoChange={setLogoDataUrl}
            />
          </aside>

          <main className="flex-1 flex items-center justify-center p-8 overflow-auto bg-gray-900">
            <div className="w-full" style={{ maxWidth: 'min(420px, 60vh * 210/297)' }}>
              {codes.length > 0 ? (
                <LabelGrid
                  codes={codes}
                  config={config}
                  layout={layout}
                  currentPage={currentPage}
                  logoDataUrl={logoDataUrl}
                  codeDescriptions={codeDescriptions}
                />
              ) : (
                <div
                  className="bg-white shadow-2xl w-full flex items-center justify-center"
                  style={{ aspectRatio: '210/297' }}
                >
                  <p className="text-gray-400 text-sm text-center px-8">
                    Ingresa códigos en el panel izquierdo para ver la preview
                  </p>
                </div>
              )}
            </div>
          </main>
        </div>
      ) : (
        <GlossaryGenerator />
      )}
    </div>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
        active
          ? 'bg-gray-800 text-gray-100'
          : 'text-gray-500 hover:text-gray-300 hover:bg-gray-900'
      }`}
    >
      {children}
    </button>
  )
}
