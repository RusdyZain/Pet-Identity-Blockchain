import { Router } from 'express';
import authRoutes from './authRoutes';
import petRoutes from './petRoutes';
import medicalRecordRoutes from './medicalRecordRoutes';
import correctionRoutes from './correctionRoutes';
import notificationRoutes from './notificationRoutes';
import traceRoutes from './traceRoutes';

const router = Router();

router.use(authRoutes);
router.use(petRoutes);
router.use(medicalRecordRoutes);
router.use(correctionRoutes);
router.use(notificationRoutes);
router.use(traceRoutes);

export default router;
