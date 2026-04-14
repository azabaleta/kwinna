import "dotenv/config";
import cors from "cors";
import express from "express";
import morgan from "morgan";

import { authGuard, errorHandler, requestLogger } from "./middlewares";
import { authRoutes, productRoutes, saleRoutes, stockRoutes } from "./routes";

const app = express();
const PORT = process.env["PORT"] ?? 3001;

// ─── Global Middlewares ───────────────────────────────────────────────────────

app.use(cors());
app.use(express.json());
app.use(morgan("combined"));
app.use(requestLogger);

// ─── Public Routes ────────────────────────────────────────────────────────────

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/auth", authRoutes);

// ─── Protected Routes (authGuard aplicado a nivel de router) ──────────────────

app.use("/products", authGuard, productRoutes);
app.use("/stock", authGuard, stockRoutes);
// /sales: auth se gestiona a nivel de ruta — POST es público, GET requiere admin/operator
app.use("/sales", saleRoutes);

// ─── Global Error Handler ─────────────────────────────────────────────────────

app.use(errorHandler);

// ─── Start ────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  process.stdout.write(`\x1b[32m[API]\x1b[0m Running on http://localhost:${PORT}\n`);
});
