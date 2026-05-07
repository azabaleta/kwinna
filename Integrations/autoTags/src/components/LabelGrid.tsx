import { useEffect, useRef } from 'react'
import * as bwipjs from '@bwip-js/browser'
import { type LayoutConfig, type GridLayout, A4_WIDTH, A4_HEIGHT } from '@/utils/layout'

interface LabelGridProps {
  codes: string[]
  config: LayoutConfig
  layout: GridLayout
  currentPage: number
  logoDataUrl?: string | null
  codeDescriptions?: Record<string, string>
}

export function LabelGrid({ codes, config, layout, currentPage, logoDataUrl, codeDescriptions }: LabelGridProps) {
  const { cols, labelsPerPage } = layout
  const start = (currentPage - 1) * labelsPerPage
  const pageCodes = codes.slice(start, start + labelsPerPage)

  return (
    <div
      className="relative bg-white shadow-2xl w-full"
      style={{ aspectRatio: `${A4_WIDTH}/${A4_HEIGHT}` }}
    >
      {pageCodes.map((code, index) => {
        const col = index % cols
        const row = Math.floor(index / cols)

        const left = ((config.marginLeft + col * (config.labelWidth + config.gap)) / A4_WIDTH) * 100
        const top = ((config.marginTop + row * (config.labelHeight + config.gap)) / A4_HEIGHT) * 100
        const width = (config.labelWidth / A4_WIDTH) * 100
        const height = (config.labelHeight / A4_HEIGHT) * 100

        return (
          <LabelCell
            key={`${code}-${index}`}
            code={code}
            left={left}
            top={top}
            width={width}
            height={height}
            logoDataUrl={logoDataUrl ?? null}
            description={codeDescriptions?.[code] ?? ''}
            labelHeightMm={config.labelHeight}
            descFontPt={config.descFontSize}
          />
        )
      })}

      {/* Margin guides (faint) */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          left: `${(config.marginLeft / A4_WIDTH) * 100}%`,
          top: `${(config.marginTop / A4_HEIGHT) * 100}%`,
          right: `${(config.marginRight / A4_WIDTH) * 100}%`,
          bottom: `${(config.marginBottom / A4_HEIGHT) * 100}%`,
          border: '1px dashed rgba(148,163,184,0.3)',
        }}
      />
    </div>
  )
}

interface LabelCellProps {
  code: string
  left: number
  top: number
  width: number
  height: number
  logoDataUrl: string | null
  description: string
  labelHeightMm: number
  descFontPt: number
}

const LOGO_FRAC = 0.28
// 1pt = 4/3 CSS px (at 96 dpi)
const PT_TO_PX = 4 / 3
// Line spacing multiplier (cap height + descenders + leading)
const LINE_SPACING = 1.35

function LabelCell({
  code, left, top, width, height,
  logoDataUrl, description,
  labelHeightMm, descFontPt,
}: LabelCellProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const hasLogo = !!logoDataUrl
  const hasDesc = !!description

  // Approximate description line height in mm (1pt = 25.4/72 mm).
  // Used to reserve space when estimating the barcode zone for bwipjs height.
  const descLineHeightMm = (descFontPt / 72) * 25.4 * LINE_SPACING

  // Barcode zone in mm for bwipjs `height` parameter.
  // We subtract one line of description as an estimate; the flex layout handles
  // the actual space negotiation at render time.
  const barcodeZoneMm =
    labelHeightMm * (1 - (hasLogo ? LOGO_FRAC : 0))
    - 1  // ~1mm total padding
    - (hasDesc ? descLineHeightMm : 0)

  // `height` in bwipjs controls bar length only — NOT text size.
  // Text size is set by `scale` (width-derived), so it stays constant
  // when the user changes the label height or descFontSize sliders.
  const bwipHeight = Math.max(5, Math.round(Math.max(3, barcodeZoneMm) * 0.65))

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    try {
      bwipjs.toCanvas(canvas, {
        bcid: 'ean8',
        text: code,
        scale: 2,
        height: bwipHeight,
        includetext: true,
        textxalign: 'center',
      })
    } catch (err) {
      console.error(`Preview render error for ${code}:`, err)
    }
  }, [code, bwipHeight])

  return (
    <div
      className="absolute overflow-hidden flex flex-col"
      style={{
        left: `${left}%`,
        top: `${top}%`,
        width: `${width}%`,
        height: `${height}%`,
        padding: '1%',
        boxSizing: 'border-box',
        border: '0.5px solid rgba(150, 150, 150, 0.4)',
      }}
    >
      {/* Logo: fixed fraction of label height */}
      {hasLogo && (
        <div
          style={{
            height: `${LOGO_FRAC * 100}%`,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <img
            src={logoDataUrl!}
            alt=""
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block' }}
          />
        </div>
      )}

      {/* Barcode: fills all remaining space after logo and description.
          As description grows (more lines or larger font), this zone shrinks
          and max-height constrains the canvas, shortening the bars. */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        <canvas
          ref={canvasRef}
          style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block' }}
        />
      </div>

      {/* Description: auto height — never clips ascenders or descenders.
          Font size is controlled by the slider (descFontPt → CSS px).
          word-break and white-space enable multi-line wrapping. */}
      {hasDesc && (
        <div
          title={description}
          style={{
            flexShrink: 0,
            width: '100%',
            textAlign: 'center',
            marginTop: '3%',
            fontSize: `${descFontPt * PT_TO_PX}px`,
            lineHeight: LINE_SPACING,
            color: '#111',
            overflowWrap: 'break-word',
            wordBreak: 'break-word',
            whiteSpace: 'pre-wrap',
          }}
        >
          {description}
        </div>
      )}
    </div>
  )
}
