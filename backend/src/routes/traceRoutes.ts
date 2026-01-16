import { Router } from "express";
import { traceController } from "../controllers/traceController";

const router = Router();

// Route publik untuk trace berdasarkan publicId.
router.get("/trace/:publicId", traceController);

export default router;
