import { Router } from "express";
import { AuthSchema } from "@kwinna/contracts";
import { postLogin } from "../controllers/auth.controller";
import { validate } from "../middlewares/validate";

const router = Router();

router.post("/login", validate(AuthSchema), postLogin);

export default router;
