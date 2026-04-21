import { Router } from "express";
import { UserRole } from "../types/enums";
import {
  checkIsClinicController,
  createMedicalRecordController,
  listMedicalRecordsController,
  listPendingRecordsController,
  prepareMedicalRecordController,
  prepareVerifyMedicalRecordController,
  verifyMedicalRecordController,
} from "../controllers/medicalRecordController";
import { authenticate, authorize } from "../middlewares/authMiddleware";

const router = Router();

// Route untuk catatan medis/vaksin.
router.post(
  "/pets/:petId/medical-records/prepare",
  authenticate(),
  authorize([UserRole.CLINIC]),
  prepareMedicalRecordController
);

router.post(
  "/pets/:petId/medical-records",
  authenticate(),
  authorize([UserRole.CLINIC]),
  createMedicalRecordController
);

router.get(
  "/pets/:petId/medical-records",
  authenticate(),
  authorize([UserRole.OWNER, UserRole.CLINIC, UserRole.ADMIN]),
  listMedicalRecordsController
);

router.get(
  "/medical-records/pending",
  authenticate(),
  authorize([UserRole.CLINIC]),
  listPendingRecordsController
);

router.patch(
  "/medical-records/:id/verify/prepare",
  authenticate(),
  authorize([UserRole.CLINIC]),
  prepareVerifyMedicalRecordController
);

router.patch(
  "/medical-records/:id/verify",
  authenticate(),
  authorize([UserRole.CLINIC]),
  verifyMedicalRecordController
);

router.get(
  "/medical-records/check-is-user-clinic",
  authenticate(),
  checkIsClinicController
);


export default router;
