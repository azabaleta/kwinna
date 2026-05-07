export function calculateCheckDigit(sevenDigits: string): number {
  const d = sevenDigits.split('').map(Number)
  // Odd positions (1,3,5,7) → indices 0,2,4,6 × 3  |  Even (2,4,6) → indices 1,3,5 × 1
  const sum = d[0] * 3 + d[1] + d[2] * 3 + d[3] + d[4] * 3 + d[5] + d[6] * 3
  return (10 - (sum % 10)) % 10
}

export function buildEAN8(sevenDigits: string): string {
  return sevenDigits + calculateCheckDigit(sevenDigits)
}

export interface ParseResult {
  valid: string[]
  invalid: string[]
}

export function parseCodes(raw: string): ParseResult {
  const tokens = raw
    .split(/[\n,]+/)
    .map((t) => t.trim())
    .filter(Boolean)

  const valid: string[] = []
  const invalid: string[] = []

  for (const token of tokens) {
    if (/^\d{7}$/.test(token)) {
      valid.push(buildEAN8(token))
    } else if (/^\d{8}$/.test(token)) {
      valid.push(token)
    } else {
      invalid.push(token)
    }
  }

  return { valid, invalid }
}
