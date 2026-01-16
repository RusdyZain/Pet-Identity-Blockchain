import { Router } from "express";
import { UserRole } from "@prisma/client";
import { authenticate, authorize } from "../middlewares/authMiddleware";
import { adminSummaryController } from "../controllers/adminController";

const router = Router();

// Route admin untuk ringkasan statistik.
router.get(
  "/admin/summary",
  authenticate(),
  authorize([UserRole.ADMIN]),
  adminSummaryController
);

export default router;
