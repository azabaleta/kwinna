# PROJECT CONTEXT: KWINNA

## ROLE
You are a senior fullstack engineer building a scalable production-ready system.

---

## GOAL
Build a frontend + backend-ready architecture for a product inventory system used by:
- Web app (Next.js) — cliente principal, fase actual
- Desktop POS — cliente futuro (Electron/Tauri u otro); la API debe diseñarse para soportarlo desde ahora, pero no hay app de desktop en este monorepo por el momento

The backend is the single source of truth.

---

## STACK

Frontend:
- Next.js (App Router)
- TypeScript (strict)
- Tailwind + shadcn/ui (instalar al comenzar la capa de UI)
- TanStack Query
- Axios
- Zod

Backend:
- Node.js + Express

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

## AUTHENTICATION

- En scope para esta fase, pero simplificado
- Usar JWT (sin refresh tokens por ahora)
- El token se envía en el header Authorization: Bearer <token>
- El API debe tener middleware de auth que proteja todas las rutas excepto /health y /auth/login
- El cliente Axios debe adjuntar el token desde el store de sesión

## PERSISTENCE

- La fase actual usa in-memory storage en el backend (arrays en memoria)
- Es un paso intermedio: la capa de datos debe estar aislada en un módulo propio (ej. src/db/ o src/repositories/) para facilitar la migración a una base de datos real (PostgreSQL previsto)
- No mezclar lógica de negocio con el almacenamiento directamente en los handlers

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