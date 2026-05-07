import { Router } from "express";
import { z } from "zod";
import { authGuard } from "../middlewares/auth-guard";
import { requireRole } from "../middlewares/require-role";
import { validate } from "../middlewares/validate";
import {
  getCategories,  postCategory,  patchCategory,
  getItemTypes,   postItemType,  patchItemType,
  getQualities,   postQuality,   patchQuality,
  getVariants,    postVariant,   patchVariant,
} from "../controllers/glossary.controller";

const router = Router();

// Todas las rutas del glosario requieren admin
router.use(authGuard, requireRole(["admin"]));

// ─── Schemas de validación ────────────────────────────────────────────────────

const CategoryCreateSchema = z.object({
  code: z.string().length(2),
  name: z.string().min(1),
});

const ItemTypeCreateSchema = z.object({
  categoryId: z.number().int().positive(),
  code:       z.string().length(2),
  name:       z.string().min(1),
});

const QualityCreateSchema = z.object({
  itemTypeId: z.number().int().positive(),
  code:       z.string().length(1),
  name:       z.string().min(1),
});

const VariantCreateSchema = z.object({
  qualityId: z.number().int().positive(),
  code:      z.string().length(2),
  name:      z.string().min(1),
});

const RenameSchema = z.object({ name: z.string().min(1) });

// ─── Rutas ────────────────────────────────────────────────────────────────────

router.get("/categories",         getCategories);
router.post("/categories",        validate(CategoryCreateSchema), postCategory);
router.patch("/categories/:id",   validate(RenameSchema),        patchCategory);

router.get("/item-types",         getItemTypes);
router.post("/item-types",        validate(ItemTypeCreateSchema), postItemType);
router.patch("/item-types/:id",   validate(RenameSchema),        patchItemType);

router.get("/qualities",          getQualities);
router.post("/qualities",         validate(QualityCreateSchema),  postQuality);
router.patch("/qualities/:id",    validate(RenameSchema),        patchQuality);

router.get("/variants",           getVariants);
router.post("/variants",          validate(VariantCreateSchema),  postVariant);
router.patch("/variants/:id",     validate(RenameSchema),        patchVariant);

export default router;
