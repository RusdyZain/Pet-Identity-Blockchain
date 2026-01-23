import { Router } from "express";
import { UserRole } from "../types/enums";
import { authenticate, authorize } from "../middlewares/authMiddleware";
import {
  adminSummaryController,
  createUserController,
  deleteUserController,
  listAllPetsController,
  listUsersController,
  updateUserController,
} from "../controllers/adminController";

const router = Router();

// Route admin untuk ringkasan statistik.
router.get(
  "/admin/summary",
  authenticate(),
  authorize([UserRole.ADMIN]),
  adminSummaryController
);

router.get(
  "/admin/users",
  authenticate(),
  authorize([UserRole.ADMIN]),
  listUsersController
);

router.post(
  "/admin/users",
  authenticate(),
  authorize([UserRole.ADMIN]),
  createUserController
);

router.patch(
  "/admin/users/:id",
  authenticate(),
  authorize([UserRole.ADMIN]),
  updateUserController
);

router.delete(
  "/admin/users/:id",
  authenticate(),
  authorize([UserRole.ADMIN]),
  deleteUserController
);

router.get(
  "/admin/pets",
  authenticate(),
  authorize([UserRole.ADMIN]),
  listAllPetsController
);

export default router;
