import { useEffect, useRef } from 'react'
import bwipjs from '@bwip-js/browser'

interface BarcodePreviewProps {
  fullCode: string // 8 dígitos EAN-8 completos
}

export function BarcodePreview({ fullCode }: BarcodePreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    try {
      bwipjs.toCanvas(canvas, {
        bcid: 'ean8',
        text: fullCode,
        scale: 3,
        height: 12,
        includetext: true,
        textxalign: 'center',
        backgroundcolor: 'ffffff',
      })
    } catch {
      // Código inválido — limpiar canvas
      const ctx = canvas.getContext('2d')
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height)
    }
  }, [fullCode])

  return (
    <div className="flex flex-col items-center gap-2">
      <canvas ref={canvasRef} className="rounded" />
      <p className="text-xs text-gray-500 tabular-nums tracking-widest">{fullCode}</p>
    </div>
  )
}
