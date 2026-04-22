import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import {
  ProductBulkInputSchema,
  ProductCreateInputSchema,
  ProductDeleteInputSchema,
  ProductUpdateInputSchema,
} from "@kwinna/contracts";
import {
  bulkPostProducts,
  deleteProductHandler,
  getProduct,
  listProducts,
  patchProduct,
  postProduct,
} from "../controllers/product.controller";
import { authGuard } from "../middlewares/auth-guard";
import { requireRole } from "../middlewares/require-role";
import { validate } from "../middlewares/validate";

const router = Router();

// 60 requests por IP por minuto — permite navegación fluida, frena scraping y query flooding
const productReadLimiter = rateLimit({
  windowMs:        60 * 1000,
  max:             60,
  standardHeaders: true,
  legacyHeaders:   false,
  message:         { error: "Demasiadas solicitudes. Intentá de nuevo en un minuto.", code: 429 },
});

// Valida que el parámetro :id sea un UUID válido antes de llegar al controller
const uuidSchema = z.string().uuid();
function validateUuidParam(req: Request, res: Response, next: NextFunction): void {
  if (!uuidSchema.safeParse(req.params["id"]).success) {
    res.status(400).json({ error: "ID de producto inválido", code: 400 });
    return;
  }
  next();
}

// GET /products — público (catálogo de tienda)
router.get("/",    productReadLimiter, listProducts);
// GET /products/:id — público
router.get("/:id", productReadLimiter, validateUuidParam, getProduct);

// POST /products — solo admin/operator
router.post(
  "/",
  authGuard,
  requireRole(["admin", "operator"]),
  validate(ProductCreateInputSchema),
  postProduct,
);

// POST /products/bulk — importación masiva desde Excel/CSV
// Recibe array de { product, stock[] } y los inserta en una sola transacción.
// SKUs duplicados se omiten silenciosamente (idempotente).
router.post(
  "/bulk",
  authGuard,
  requireRole(["admin", "operator"]),
  validate(ProductBulkInputSchema),
  bulkPostProducts,
);

// PATCH /products/:id — admin/operator; actualiza campos presentes en el body
router.patch(
  "/:id",
  authGuard,
  requireRole(["admin", "operator"]),
  validateUuidParam,
  validate(ProductUpdateInputSchema),
  patchProduct,
);

// DELETE /products/:id — solo admin; requiere contraseña del admin en el body
router.delete(
  "/:id",
  authGuard,
  requireRole(["admin"]),
  validateUuidParam,
  validate(ProductDeleteInputSchema),
  deleteProductHandler,
);

export default router;
