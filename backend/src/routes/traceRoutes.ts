import { Router } from "express";
import { traceController } from "../controllers/traceController";

const router = Router();

router.get("/trace/:publicId", traceController);

export default router;
