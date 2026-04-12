import { Router } from "express";
import { SaleSchema } from "@kwinna/contracts";
import { postSale } from "../controllers/sale.controller";
import { validate } from "../middlewares/validate";

const router = Router();

const SaleBodySchema = SaleSchema.pick({ items: true });

router.post("/", validate(SaleBodySchema), postSale);

export default router;
