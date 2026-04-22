import { Router } from "express";
import { authGuard, requireRole } from "../middlewares";
import {
  getSnapshots,
  getSnapshot,
  postSnapshot,
  removeSnapshot,
  exportSnapshotToDrive,
} from "../controllers/reports.controller";

const router = Router();

// Todos los endpoints requieren admin u operator.
router.use(authGuard, requireRole(["admin", "operator"]));

router.get("/snapshots",                    getSnapshots);
router.get("/snapshots/:id",               getSnapshot);
router.post("/snapshots",                  postSnapshot);
router.post("/snapshots/:id/export-drive", exportSnapshotToDrive);
router.delete("/snapshots/:id",            removeSnapshot);

export default router;
