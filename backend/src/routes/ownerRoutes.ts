import { Router } from "express";
import { UserRole } from "../types/enums";
import {
  deleteOwnerProfileController,
  getOwnerProfileController,
  updateOwnerProfileController,
} from "../controllers/ownerController";
import { authenticate, authorize } from "../middlewares/authMiddleware";

const router = Router();

// CRUD akun owner (profil sendiri).
router.get(
  "/owners/me",
  authenticate(),
  authorize([UserRole.OWNER]),
  getOwnerProfileController
);

router.patch(
  "/owners/me",
  authenticate(),
  authorize([UserRole.OWNER]),
  updateOwnerProfileController
);

router.delete(
  "/owners/me",
  authenticate(),
  authorize([UserRole.OWNER]),
  deleteOwnerProfileController
);

export default router;
