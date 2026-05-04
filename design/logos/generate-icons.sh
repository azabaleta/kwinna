#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# generate-icons.sh — Genera todos los íconos de Kwinna desde icon-master.svg
# Requiere: inkscape >= 1.0  (sudo apt install inkscape)
# Uso:      bash design/logos/generate-icons.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SVG="$DIR/icon-master.svg"
OUT="$DIR"

# ── Verificar dependencias ────────────────────────────────────────────────────
if ! command -v inkscape &>/dev/null; then
  echo "❌  Inkscape no encontrado. Instalalo con:"
  echo "    sudo apt update && sudo apt install -y inkscape"
  exit 1
fi

echo "🎨  Generando íconos desde: $SVG"
echo "📁  Destino:                $OUT"
echo ""

# Función de exportación
px() {
  local size="$1"
  local name="$2"
  inkscape \
    --export-type=png \
    --export-width="$size" \
    --export-height="$size" \
    --export-filename="$OUT/$name" \
    "$SVG" 2>/dev/null
  echo "  ✓  $name  (${size}×${size})"
}

# ── PWA ───────────────────────────────────────────────────────────────────────
echo "── PWA ──────────────────────────────────────────────────────────────────"
px  192  "pwa-icon-192.png"
px  512  "pwa-icon-512.png"

# ── Tauri / Desktop ───────────────────────────────────────────────────────────
echo ""
echo "── Tauri ────────────────────────────────────────────────────────────────"
px   32  "tauri-32x32.png"
px   64  "tauri-64x64.png"
px  128  "tauri-128x128.png"
px  256  "tauri-128x128@2x.png"
px 1024  "tauri-icon.png"

# Windows Store logos
px   30  "tauri-Square30x30Logo.png"
px   44  "tauri-Square44x44Logo.png"
px   50  "tauri-StoreLogo.png"
px   71  "tauri-Square71x71Logo.png"
px   89  "tauri-Square89x89Logo.png"
px  107  "tauri-Square107x107Logo.png"
px  142  "tauri-Square142x142Logo.png"
px  150  "tauri-Square150x150Logo.png"
px  284  "tauri-Square284x284Logo.png"
px  310  "tauri-Square310x310Logo.png"

# ── .ico (Windows) via ImageMagick ───────────────────────────────────────────
echo ""
echo "── .ico / .icns ─────────────────────────────────────────────────────────"
if command -v convert &>/dev/null; then
  convert \
    "$OUT/tauri-32x32.png" \
    "$OUT/tauri-128x128.png" \
    "$OUT/tauri-128x128@2x.png" \
    "$OUT/tauri-icon.png" \
    "$OUT/tauri-icon.ico"
  echo "  ✓  tauri-icon.ico"
else
  echo "  ⚠️  .ico omitido — instalá imagemagick: sudo apt install imagemagick"
fi

# ── .icns (macOS) via icnsutils ──────────────────────────────────────────────
if command -v png2icns &>/dev/null; then
  png2icns "$OUT/tauri-icon.icns" \
    "$OUT/tauri-32x32.png" \
    "$OUT/tauri-64x64.png" \
    "$OUT/tauri-128x128.png" \
    "$OUT/tauri-128x128@2x.png" \
    "$OUT/tauri-icon.png"
  echo "  ✓  tauri-icon.icns"
else
  echo "  ⚠️  .icns omitido — instalá icnsutils: sudo apt install icnsutils"
  echo "     O corré 'pnpm tauri icon' para generarlo automáticamente."
fi

echo ""
echo "✅  Listo. Ahora corré los comandos de movimiento del paso siguiente."
