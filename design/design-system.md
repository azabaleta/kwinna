# DESIGN SYSTEM: KWINNA

## THEME OVERVIEW
- light mode (default)
- Dark mode (option)
- Minimal, moderno, limpio
- Enfocado en legibilidad y contraste

---

## COLOR SYSTEM

### Brand Colors

- Primary: #70005E
- Secondary: #F5F5F4
- Tertiary: #E5DACE

### Neutral Colors

- Background: #0F172A
- Surface: #111827
- Neutral: #F9F9F8
- Text: #E5E7EB

---

## COLOR USAGE RULES

- Primary → acciones principales (CTA, botones)
- Secondary → elementos secundarios (chips, labels)
- Tertiary → acentos (badges, highlights)
- Background → fondo general
- Surface → cards, modals, containers
- Text → contenido principal

---

## TYPOGRAPHY

### Font Family

- Manrope (global)

### Usage

- Headings → Manrope (bold / semibold)
- Body → Manrope (regular)
- Labels → Manrope (medium)

---

## SHAPE SYSTEM

- Border radius: 1rem (ligeramente redondeado)
- Mantener consistencia en todos los componentes
- Evitar bordes duros

---

## SPACING SYSTEM

- Base spacing: 2
- Espaciado consistente entre componentes
- Evitar layouts densos o sobrecargados

---

## UI PRINCIPLES

- Evitar bordes pesados
- Usar sombras suaves
- Priorizar jerarquía visual
- Mantener consistencia en padding/margin

---

## COMPONENT GUIDELINES

### Buttons

- Variantes:
  - Primary
  - Secondary
  - Outline

### Cards

- Background: Surface
- Border radius consistente
- Shadow suave

### Inputs

- Claros y accesibles
- Estados: focus, error, disabled

---

## ASSETS

- Logos en /design/logos
- SVGs deben reutilizarse (no recrear)
- Referencias visuales en /design/references

---

## IMPLEMENTATION RULES

- Tailwind debe mapear estos tokens
- No usar colores hardcodeados fuera de este sistema
- Mantener consistencia entre frontend y diseño

---

## DESIGN TOKENS SOURCE

Ver: /design/tokens.json