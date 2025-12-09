import { Router } from 'express';
import authRoutes from './authRoutes';
import petRoutes from './petRoutes';
import medicalRecordRoutes from './medicalRecordRoutes';
import correctionRoutes from './correctionRoutes';
import notificationRoutes from './notificationRoutes';
import traceRoutes from './traceRoutes';
import adminRoutes from './adminRoutes';

const router = Router();

router.use(authRoutes);
router.use('/pets', petRoutes);
router.use(medicalRecordRoutes);
router.use(correctionRoutes);
router.use(notificationRoutes);
router.use(traceRoutes);
router.use(adminRoutes);

export default router;
