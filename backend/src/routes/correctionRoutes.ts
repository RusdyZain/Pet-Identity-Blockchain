import { Router } from "express";
import { UserRole } from "../types/enums";
import {
  listCorrectionsController,
  prepareReviewCorrectionController,
  reviewCorrectionController,
} from "../controllers/correctionController";
import { authenticate, authorize } from "../middlewares/authMiddleware";

const router = Router();

// Route untuk review koreksi data.
router.get(
  "/corrections",
  authenticate(),
  authorize([UserRole.CLINIC, UserRole.ADMIN]),
  listCorrectionsController
);

router.patch(
  "/corrections/:id/prepare",
  authenticate(),
  authorize([UserRole.CLINIC, UserRole.ADMIN]),
  prepareReviewCorrectionController
);

router.patch(
  "/corrections/:id",
  authenticate(),
  authorize([UserRole.CLINIC, UserRole.ADMIN]),
  reviewCorrectionController
);

export default router;
