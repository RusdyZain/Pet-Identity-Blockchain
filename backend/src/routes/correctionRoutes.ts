import { Router } from "express";
import { UserRole } from "@prisma/client";
import {
  listCorrectionsController,
  reviewCorrectionController,
} from "../controllers/correctionController";
import { authenticate, authorize } from "../middlewares/authMiddleware";

const router = Router();

router.get(
  "/corrections",
  authenticate(),
  authorize([UserRole.CLINIC, UserRole.ADMIN]),
  listCorrectionsController
);

router.patch(
  "/corrections/:id",
  authenticate(),
  authorize([UserRole.CLINIC, UserRole.ADMIN]),
  reviewCorrectionController
);

export default router;
