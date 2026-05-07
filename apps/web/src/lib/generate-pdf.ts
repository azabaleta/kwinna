import * as bwipjs from '@bwip-js/browser'
import { jsPDF } from 'jspdf'
import { type LayoutConfig, calculateGrid, A4_WIDTH, A4_HEIGHT } from './layout'

const DPI = 300
const MM_PER_INCH = 25.4
const EAN8_MODULES = 81

const LOGO_FRAC = 0.28
const DESC_LINE_SPACING = 1.35

function renderBarcodeToCanvas(code: string, widthMm: number, heightMm: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  const requiredPx = Math.ceil((widthMm / MM_PER_INCH) * DPI)
  const scale = Math.max(3, Math.ceil(requiredPx / EAN8_MODULES))
  const bwipHeight = Math.max(5, Math.round(heightMm * 0.6))

  bwipjs.toCanvas(canvas, {
    bcid: 'ean8',
    text: code,
    scale,
    height: bwipHeight,
    includetext: true,
    textxalign: 'center',
  })

  return canvas
}

function fitInLabel(
  imgW: number, imgH: number,
  zoneX: number, zoneY: number, zoneW: number, zoneH: number,
) {
  const ratio = Math.min(zoneW / imgW, zoneH / imgH)
  const drawW = imgW * ratio
  const drawH = imgH * ratio
  const x = zoneX + (zoneW - drawW) / 2
  const y = zoneY + (zoneH - drawH) / 2
  return { x, y, w: drawW, h: drawH }
}

async function loadImageToPng(dataUrl: string): Promise<{ pngData: string; w: number; h: number }> {
  const img = new Image()
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = reject
    img.src = dataUrl
  })
  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  canvas.getContext('2d')!.drawImage(img, 0, 0)
  return { pngData: canvas.toDataURL('image/png'), w: img.naturalWidth, h: img.naturalHeight }
}

export async function generatePDF(
  codes: string[],
  config: LayoutConfig,
  codeDescriptions: Record<string, string> = {},
  logoDataUrl: string | null = null,
): Promise<void> {
  const { cols, labelsPerPage } = calculateGrid(config, codes.length)

  const doc = new jsPDF({ unit: 'mm', format: [A4_WIDTH, A4_HEIGHT], orientation: 'portrait' })

  let logo: { pngData: string; w: number; h: number } | null = null
  if (logoDataUrl) {
    try { logo = await loadImageToPng(logoDataUrl) } catch { /* skip */ }
  }

  const lineHeightMm = (config.descFontSize / 72) * 25.4 * DESC_LINE_SPACING
  const padding = 1

  for (let i = 0; i < codes.length; i++) {
    const posInPage = i % labelsPerPage
    if (posInPage === 0 && i > 0) doc.addPage()

    const col = posInPage % cols
    const row = Math.floor(posInPage / cols)
    const labelX = config.marginLeft + col * (config.labelWidth + config.gap)
    const labelY = config.marginTop + row * (config.labelHeight + config.gap)
    const innerW = config.labelWidth - padding * 2
    const innerH = config.labelHeight - padding * 2

    const description = codeDescriptions[codes[i]!] ?? ''
    let descLines: string[] = []
    let descZoneH = 0
    if (description) {
      doc.setFontSize(config.descFontSize)
      descLines = doc.splitTextToSize(description, innerW - 0.5)
      descZoneH = descLines.length * lineHeightMm + 0.5 + 0.4
    }

    const logoZoneH = logo ? innerH * LOGO_FRAC : 0
    const barcodeH = Math.max(3, innerH - logoZoneH - descZoneH)

    doc.setDrawColor(160, 160, 160)
    doc.setLineWidth(0.15)
    doc.rect(labelX, labelY, config.labelWidth, config.labelHeight, 'S')

    let currentY = labelY + padding

    if (logo) {
      const ratio = Math.min(innerW / logo.w, logoZoneH / logo.h)
      const drawW = logo.w * ratio
      const drawH = logo.h * ratio
      const logoX = labelX + padding + (innerW - drawW) / 2
      const logoY = currentY + (logoZoneH - drawH) / 2
      doc.addImage(logo.pngData, 'PNG', logoX, logoY, drawW, drawH)
      currentY += logoZoneH
    }

    try {
      const canvas = renderBarcodeToCanvas(codes[i]!, innerW, barcodeH)
      const imgData = canvas.toDataURL('image/png')
      const { x, y, w, h } = fitInLabel(canvas.width, canvas.height, labelX + padding, currentY, innerW, barcodeH)
      doc.addImage(imgData, 'PNG', x, y, w, h)
    } catch (err) {
      console.error(`Error rendering ${codes[i]}:`, err)
    }
    currentY += barcodeH

    if (descLines.length > 0) {
      doc.setFontSize(config.descFontSize)
      doc.setTextColor(0, 0, 0)
      const cx = labelX + config.labelWidth / 2
      const textBlockH = descLines.length * lineHeightMm
      const firstBaseline = currentY + 0.5 + (descZoneH - 0.5 - textBlockH) / 2 + lineHeightMm * 0.82
      descLines.forEach((line: string, idx: number) => {
        doc.text(line, cx, firstBaseline + idx * lineHeightMm, { align: 'center', baseline: 'alphabetic' })
      })
    }
  }

  doc.save('etiquetas.pdf')
}
