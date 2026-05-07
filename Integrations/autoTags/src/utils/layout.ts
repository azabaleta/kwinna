export interface LayoutConfig {
  labelWidth: number
  labelHeight: number
  gap: number
  marginTop: number
  marginBottom: number
  marginLeft: number
  marginRight: number
  descFontSize: number  // description font size in points (pt)
}

export interface GridLayout {
  cols: number
  rows: number
  labelsPerPage: number
  totalPages: number
}

export const A4_WIDTH = 210
export const A4_HEIGHT = 297

export const DEFAULT_CONFIG: LayoutConfig = {
  labelWidth: 38,
  labelHeight: 21,
  gap: 2,
  marginTop: 10,
  marginBottom: 10,
  marginLeft: 10,
  marginRight: 10,
  descFontSize: 6,
}

export function calculateGrid(config: LayoutConfig, totalLabels: number): GridLayout {
  const { labelWidth, labelHeight, gap, marginTop, marginBottom, marginLeft, marginRight } = config

  const cols = Math.max(
    1,
    Math.floor((A4_WIDTH - marginLeft - marginRight + gap) / (labelWidth + gap)),
  )
  const rows = Math.max(
    1,
    Math.floor((A4_HEIGHT - marginTop - marginBottom + gap) / (labelHeight + gap)),
  )
  const labelsPerPage = cols * rows
  const totalPages = totalLabels > 0 ? Math.ceil(totalLabels / labelsPerPage) : 1

  return { cols, rows, labelsPerPage, totalPages }
}
