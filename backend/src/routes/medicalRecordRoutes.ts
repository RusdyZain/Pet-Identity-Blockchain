import { Router } from 'express';
import { UserRole } from '@prisma/client';
import {
  createMedicalRecordController,
  listMedicalRecordsController,
  verifyMedicalRecordController,
} from '../controllers/medicalRecordController';
import { authenticate, authorize } from '../middlewares/authMiddleware';

const router = Router();

router.post(
  '/pets/:petId/medical-records',
  authenticate(),
  authorize([UserRole.CLINIC]),
  createMedicalRecordController,
);

router.get(
  '/pets/:petId/medical-records',
  authenticate(),
  authorize([UserRole.OWNER, UserRole.CLINIC, UserRole.ADMIN]),
  listMedicalRecordsController,
);

router.patch(
  '/medical-records/:id/verify',
  authenticate(),
  authorize([UserRole.CLINIC]),
  verifyMedicalRecordController,
);

export default router;
