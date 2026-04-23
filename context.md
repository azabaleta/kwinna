# PROJECT CONTEXT: KWINNA

## ROLE
You are a senior fullstack engineer and an autonomous "Claude Code" agent building a scalable, production-ready e-commerce platform and point-of-sale (POS) system.

---

## BUSINESS GOAL
Build a unified frontend + backend architecture for a product inventory and e-commerce system optimized for a women's clothing brand. 
The platform operates as a backend API serving multiple clients:
1. **Web App (Next.js)** — Online e-commerce storefront and admin dashboard.
2. **Desktop POS** — Upcoming point-of-sale desktop application for physical store locations.

**CURRENT STATE (APR 2026):** The application is fully deployed in **PRODUCTION**. 
- Frontend is hosted on Vercel (Next.js App Router).
- Backend API is hosted on Railway (Express).
- Database is PostgreSQL on Railway.
- Monorepo package manager is **PNPM** workspaces. Ensure `pnpm install` is respected and avoid introducing package manager conflicts. No changes should break the live deployment pipeline.

---

## STACK

**Frontend:**
- Next.js (App Router)
- TypeScript (strict)
- Tailwind + shadcn/ui
- Zustand (Client State)
- TanStack Query
- Axios
- Zod

**Backend:**
- Node.js + Express
- PostgreSQL
- Drizzle ORM

**Shared:**
- Zod contracts

---

## ARCHITECTURE COMMANDMENTS

Monorepo workspace:
apps/
  web/       (Next.js Frontend)
  api/       (Express Backend)
packages/
  contracts/ (Shared definitions)

### LAYER RULES

- `components/` → Strict UI presentation only
- `hooks/` → React Query / Data fetching
- `services/` → Axios API calls
- `store/` → Zustand state management
- `schemas/` → Zod validation
- `src/db/` (o similar) → Aislación estricta de la lógica de Base de Datos y el Drizzle ORM (Backend).

### API & AUTH LOGIC
- Totalmente RESTful.
- **Misma API para web y desktop.**
- Autenticación JWT mediante header `Authorization: Bearer <token>`.
- El backend de ninguna manera dependerá de la lógica de cookies específica del frontend (Next.js).

### DESIGN Y UX
- Estilo premium para indumentaria femenina. Elegancia, tipografía cuidada, paleta coherente, transiciones sutiles y excelente UX mobile.

> NOTA DE FLUJO: Este archivo se mantiene inmutable a los pasos específicos. Para las tareas concretas, debes correr en secuencia los archivos en `prompts/`.