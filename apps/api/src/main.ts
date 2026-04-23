import "dotenv/config";
import cors from "cors";
import express from "express";
import morgan from "morgan";

import { authGuard, errorHandler, optionalAuth, requestLogger } from "./middlewares";
import { analyticsRoutes, authRoutes, productRoutes, reportsRoutes, returnsRoutes, saleRoutes, stockRoutes } from "./routes";
import { registerReportsJob } from "./jobs/reports.job";

const app = express();
const PORT = process.env["PORT"] ?? 3001;

// ─── Trust proxy ──────────────────────────────────────────────────────────────
// Railway / Render / Fly.io despachan tráfico a través de un reverse proxy.
// Sin esto, express-rate-limit ve la IP del proxy (igual para todos los clientes)
// y el rate limiting deja de funcionar por IP real.
app.set("trust proxy", 1);

// ─── CORS ─────────────────────────────────────────────────────────────────────
// CORS_ORIGIN accepts a comma-separated list of allowed origins so Railway /
// Render / Vercel deployments can inject the real frontend URL without a code
// change.  Falls back to localhost for local development only.
//
// Example (Railway):  CORS_ORIGIN=https://kwinna.vercel.app
// Example (multi):    CORS_ORIGIN=https://kwinna.vercel.app,https://kwinna.com.ar

const allowedOrigins: Set<string> = new Set(
  (process.env["CORS_ORIGIN"] ?? "http://localhost:3000")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean)
);

app.use(
  cors({
    origin(origin, callback) {
      // Allow server-to-server requests that carry no Origin header, and any
      // origin that was explicitly listed in the env var.
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin '${origin}' is not allowed`));
      }
    },
    credentials: true,
  })
);

// ─── Global Middlewares ───────────────────────────────────────────────────────
// Limite de 100 KB previene payloads gigantes antes de que lleguen a los controllers.
app.use(express.json({ limit: "100kb" }));
// 'combined' en producción incluye IP, user-agent y referrer — útil para auditoría.
// 'dev' en desarrollo da output coloreado y compacto.
app.use(morgan(process.env["NODE_ENV"] === "production" ? "combined" : "dev"));
app.use(requestLogger);

// ─── Public Routes ────────────────────────────────────────────────────────────

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/auth",      authRoutes);
app.use("/analytics", analyticsRoutes);
app.use("/returns",   returnsRoutes);
app.use("/reports",   reportsRoutes);

// ─── Semi-protected Routes ────────────────────────────────────────────────────
// /products y /stock usan optionalAuth: los GETs son públicos (catálogo/stock
// de tienda) y los writes aplican authGuard + requireRole dentro de cada router.

app.use("/products", optionalAuth, productRoutes);
app.use("/stock", optionalAuth, stockRoutes);
// /sales: auth se gestiona a nivel de ruta — POST es público, GET requiere admin/operator
app.use("/sales", saleRoutes);

// ─── Global Error Handler ─────────────────────────────────────────────────────

app.use(errorHandler);

// ─── Start ────────────────────────────────────────────────────────────────────

const server = app.listen(PORT, () => {
  process.stdout.write(`\x1b[32m[API]\x1b[0m Running on http://localhost:${PORT}\n`);
  registerReportsJob();
});

// ─── Graceful shutdown ────────────────────────────────────────────────────────
// Railway / Render envían SIGTERM antes de escalar o reiniciar el contenedor.
// Esperamos que las requests activas terminen antes de cerrar el proceso.

function shutdown(signal: string) {
  process.stdout.write(`\n[API] ${signal} recibido — cerrando servidor...\n`);
  server.close(() => {
    process.stdout.write("[API] Servidor cerrado correctamente.\n");
    process.exit(0);
  });

  // Si el servidor no cierra en 10 s, forzar salida.
  setTimeout(() => {
    process.stderr.write("[API] Timeout de cierre forzado.\n");
    process.exit(1);
  }, 10_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT",  () => shutdown("SIGINT"));
