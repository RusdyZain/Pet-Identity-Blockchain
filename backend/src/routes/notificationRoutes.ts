import { Router } from "express";
import { UserRole } from "@prisma/client";
import {
  listNotificationsController,
  markNotificationReadController,
} from "../controllers/notificationController";
import { authenticate, authorize } from "../middlewares/authMiddleware";

const router = Router();

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
