import { Router } from "express";
import { UserRole } from "../types/enums";
import {
  acceptTransferController,
  createCorrectionController,
  createPetController,
  getPetController,
  initiateTransferController,
  listPetsController,
  ownershipHistoryController,
} from "../controllers/petController";
import { authenticate, authorize } from "../middlewares/authMiddleware";

const router = Router();

// Route untuk data hewan dan alur transfer/koreksi.
router.post(
  "/",
  authenticate(),
  authorize([UserRole.OWNER]),
  createPetController
);

router.get(
  "/",
  authenticate(),
  authorize([UserRole.OWNER, UserRole.CLINIC, UserRole.ADMIN]),
  listPetsController
);

router.get(
  "/:id",
  authenticate(),
  authorize([UserRole.OWNER, UserRole.CLINIC, UserRole.ADMIN]),
  getPetController
);

router.get(
  "/:petId/ownership-history",
  authenticate(),
  authorize([UserRole.OWNER, UserRole.CLINIC, UserRole.ADMIN]),
  ownershipHistoryController
);

router.post(
  "/:petId/transfer",
  authenticate(),
  authorize([UserRole.OWNER]),
  initiateTransferController
);

router.post(
  "/:petId/transfer/accept",
  authenticate(),
  authorize([UserRole.OWNER]),
  acceptTransferController
);

router.post(
  "/:petId/corrections",
  authenticate(),
  authorize([UserRole.OWNER]),
  createCorrectionController
);

export default router;
