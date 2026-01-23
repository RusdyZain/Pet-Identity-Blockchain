import { Router } from "express";
import { UserRole } from "../types/enums";
import {
  listNotificationsController,
  markNotificationReadController,
} from "../controllers/notificationController";
import { authenticate, authorize } from "../middlewares/authMiddleware";

const router = Router();

// Route untuk notifikasi user.
router.get(
  "/notifications",
  authenticate(),
  authorize([UserRole.OWNER, UserRole.CLINIC, UserRole.ADMIN]),
  listNotificationsController
);

router.patch(
  "/notifications/:id/read",
  authenticate(),
  authorize([UserRole.OWNER, UserRole.CLINIC, UserRole.ADMIN]),
  markNotificationReadController
);

export default router;
