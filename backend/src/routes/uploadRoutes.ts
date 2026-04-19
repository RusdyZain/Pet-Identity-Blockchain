import { Router } from "express";
import multer from "multer";
import { uploadEvidenceController } from "../controllers/uploadController";
import { authenticate, authorize } from "../middlewares/authMiddleware";
import { UserRole } from "../types/enums";
import { AppError } from "../utils/errors";

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 8 * 1024 * 1024,
  },
  fileFilter: (_req, file, callback) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      callback(new AppError("Unsupported file type", 400));
      return;
    }
    callback(null, true);
  },
});

const router = Router();

router.post(
  "/uploads/evidence",
  authenticate(),
  authorize([UserRole.CLINIC, UserRole.ADMIN]),
  upload.single("file"),
  uploadEvidenceController
);

export default router;
