import { Router } from "express";
import authRoutes from "./authRoutes";
import petRoutes from "./petRoutes";
import medicalRecordRoutes from "./medicalRecordRoutes";
import correctionRoutes from "./correctionRoutes";
import notificationRoutes from "./notificationRoutes";
import traceRoutes from "./traceRoutes";
import adminRoutes from "./adminRoutes";
import debugBlockchainRoutes from "./debugBlockchain";
import ownerRoutes from "./ownerRoutes";

const router = Router();

// Gabungkan seluruh modul route.
router.use(authRoutes);
router.use("/pets", petRoutes);
router.use(medicalRecordRoutes);
router.use(correctionRoutes);
router.use(notificationRoutes);
router.use(traceRoutes);
router.use(adminRoutes);
router.use(debugBlockchainRoutes);
router.use(ownerRoutes);

export default router;
