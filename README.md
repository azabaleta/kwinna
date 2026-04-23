# Kwinna

E-commerce y punto de venta (POS) para indumentaria femenina. Monorepo con backend API, tienda web y panel de administración.

---

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | Next.js 15 (App Router), TypeScript, Tailwind CSS, shadcn/ui, Zustand, TanStack Query |
| Backend | Node.js, Express, PostgreSQL, Drizzle ORM |
| Contratos | Zod (Single Source of Truth compartido entre apps) |
| Imágenes | Cloudinary |
| Pagos | MercadoPago Checkout Pro |
| Emails | Resend |
| Reportes | Google Drive API |

---

## Estructura

```
kwinna/
├── apps/
│   ├── api/          Express + Drizzle — REST API
│   └── web/          Next.js — Tienda pública + panel admin
└── packages/
    └── contracts/    Schemas Zod compartidos (tipos, validaciones)
```

---

## Requisitos

- Node.js 20+
- pnpm 9+
- PostgreSQL 15+

---

## Inicio rápido

```bash
# Clonar e instalar dependencias
git clone https://github.com/tu-usuario/kwinna.git
cd kwinna
pnpm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus valores locales

# Compilar contratos
pnpm --filter @kwinna/contracts build

# Correr migraciones
pnpm --filter @kwinna/api db:migrate

# Crear usuario admin
pnpm --filter @kwinna/api db:seed-admin

# Iniciar en modo desarrollo (API + Web en paralelo)
pnpm dev
```

La API corre en `http://localhost:3001` y la web en `http://localhost:3000`.

> En desarrollo la web usa mocks MSW (`NEXT_PUBLIC_USE_MOCKS=true`) — no necesitás la API corriendo para navegar la tienda.

---

## Variables de entorno

Copiá `.env.example` a `.env` y completá los valores. Las marcadas con `*` son obligatorias en producción.

```
# API
JWT_SECRET *           Secret para firmar JWT (mínimo 32 chars)
DATABASE_URL *         Cadena de conexión PostgreSQL
API_URL *              URL pública del backend
APP_URL *              URL pública del frontend
CORS_ORIGIN *          Orígenes CORS permitidos (separados por coma)
MP_ACCESS_TOKEN *      Access token de MercadoPago
MP_WEBHOOK_SECRET      Secret HMAC para webhooks de MP
RESEND_API_KEY *       API key de Resend
EMAIL_FROM             Dirección de envío (ej: Kwinna <ventas@kwinna.com.ar>)
ADMIN_EMAIL *          Email del admin principal
ADMIN_NAME *           Nombre del admin principal
ADMIN_PASSWORD_HASH *  Hash bcrypt de la contraseña admin

# Google Drive (reportes)
GOOGLE_SERVICE_ACCOUNT_EMAIL
GOOGLE_PRIVATE_KEY
GOOGLE_DRIVE_FOLDER_ID

# Web (Vercel)
NEXT_PUBLIC_API_URL *
NEXT_PUBLIC_APP_URL *
NEXT_PUBLIC_USE_MOCKS            true en dev, false en producción
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME *
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET *
JWT_SECRET *           Mismo valor que el API (usado en middleware Edge)
```

Generar `JWT_SECRET`:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Generar `ADMIN_PASSWORD_HASH`:
```bash
node -e "require('bcryptjs').hash('TuContraseña', 12).then(console.log)"
```

---

## Scripts útiles

```bash
# Desarrollo
pnpm dev                                    # API + Web en paralelo

# Base de datos
pnpm --filter @kwinna/api db:migrate        # Aplicar migraciones
pnpm --filter @kwinna/api db:generate       # Generar nueva migración
pnpm --filter @kwinna/api db:seed-admin     # Crear/actualizar usuario admin
pnpm --filter @kwinna/api db:studio         # Abrir Drizzle Studio

# Build producción
pnpm --filter @kwinna/contracts build       # Compilar contratos (requerido antes del API)
pnpm --filter @kwinna/api build             # Compilar API
pnpm --filter @kwinna/web build             # Compilar web

# Lint
pnpm lint
```

---

## Despliegue

| Servicio | Plataforma |
|---|---|
| API + PostgreSQL | Railway |
| Web | Vercel |

Ver guías detalladas en:
- [`docs/Guia_Despliegue_Railway_Backend.md`](docs/Guia_Despliegue_Railway_Backend.md)
- [`docs/Guia_Despliegue_Vercel_Frontend.md`](docs/Guia_Despliegue_Vercel_Frontend.md)

**Build command (Railway):**
```
pnpm --filter @kwinna/contracts build && pnpm --filter @kwinna/api build
```

**Start command (Railway):**
```
pnpm --filter @kwinna/api db:migrate && pnpm --filter @kwinna/api start
```

---

## Funcionalidades

**Tienda pública**
- Catálogo con filtros, búsqueda y ordenamiento
- Página de detalle de producto con galería de imágenes
- Carrito persistente y checkout con MercadoPago
- Registro, login y verificación de email
- Recuperación de contraseña
- Perfil de cliente y favoritos

**Panel de administración** (`/admin`)
- Gestión de inventario con carga individual y masiva por CSV
- Control de stock por talle
- Gestión de pedidos web y POS
- Registro de devoluciones
- Dashboard con métricas (conversión, AOV, sell-through, rotación de inventario)
- Reportes exportables a Google Drive

---

## Licencia

Privado — todos los derechos reservados.
