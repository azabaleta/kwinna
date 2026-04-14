import { Router } from "express";
import { ProductCreateInputSchema } from "@kwinna/contracts";
import { getProduct, listProducts, postProduct } from "../controllers/product.controller";
import { requireRole } from "../middlewares/require-role";
import { validate } from "../middlewares/validate";

const router = Router();

// GET /products — público (catálogo de tienda)
router.get("/",    listProducts);
// GET /products/:id — público
router.get("/:id", getProduct);

// POST /products — solo admin/operator (authGuard ya aplicado en main.ts)
router.post(
  "/",
  requireRole(["admin", "operator"]),
  validate(ProductCreateInputSchema),
  postProduct,
);

export default router;
