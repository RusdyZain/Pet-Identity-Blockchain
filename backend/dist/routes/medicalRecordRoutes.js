"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const medicalRecordController_1 = require("../controllers/medicalRecordController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = (0, express_1.Router)();
router.post(
  "/pets/:petId/medical-records",
  (0, authMiddleware_1.authenticate)(),
  (0, authMiddleware_1.authorize)([client_1.UserRole.CLINIC]),
  medicalRecordController_1.createMedicalRecordController
);
router.get(
  "/pets/:petId/medical-records",
  (0, authMiddleware_1.authenticate)(),
  (0, authMiddleware_1.authorize)([
    client_1.UserRole.OWNER,
    client_1.UserRole.CLINIC,
    client_1.UserRole.ADMIN,
  ]),
  medicalRecordController_1.listMedicalRecordsController
);
router.get(
  "/medical-records/pending",
  (0, authMiddleware_1.authenticate)(),
  (0, authMiddleware_1.authorize)([client_1.UserRole.CLINIC]),
  medicalRecordController_1.listPendingRecordsController
);
router.patch(
  "/medical-records/:id/verify",
  (0, authMiddleware_1.authenticate)(),
  (0, authMiddleware_1.authorize)([client_1.UserRole.CLINIC]),
  medicalRecordController_1.verifyMedicalRecordController
);
exports.default = router;
//# sourceMappingURL=medicalRecordRoutes.js.map
