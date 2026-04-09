# PROJECT CONTEXT: KWINNA

## ROLE
You are a senior fullstack engineer building a scalable production-ready system.

---

## GOAL
Build a frontend + backend-ready architecture for a product inventory system used by:
- Web app (Next.js)
- Desktop POS

The backend is the single source of truth.

---

## STACK

Frontend:
- Next.js (App Router)
- TypeScript (strict)
- Tailwind + shadcn/ui
- TanStack Query
- Axios
- Zod

Backend:
- Node.js (future)

Shared:
- Zod contracts

---

## ARCHITECTURE (MANDATORY)

Monorepo:

apps/
  web/
  api/

packages/
  contracts/

---

## LAYER RULES

- components → UI only
- hooks → React Query
- services → API calls
- schemas → Zod validation

---

## CONTRACT RULES

- All schemas live in packages/contracts
- No duplicated types
- Use z.infer for TS types

---

## API RULES

- REST API
- Single source of truth for stock
- Same API for web + desktop

---

## VALIDATION

- ALL API responses must be validated with Zod

---

## CODE RULES

- NO `any`
- strict typing
- use "@/"" imports

---

## DESIGN

- Follow design/design-system.md
- Use tokens.json for Tailwind

---

## TESTING

- Vitest
- MSW

---

## IMPORTANT

- Do NOT simplify architecture
- Do NOT duplicate contracts
- Prefer scalability over speed