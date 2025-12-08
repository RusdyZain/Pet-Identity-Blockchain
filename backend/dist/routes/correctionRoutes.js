"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const correctionController_1 = require("../controllers/correctionController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = (0, express_1.Router)();
router.get('/corrections', (0, authMiddleware_1.authenticate)(), (0, authMiddleware_1.authorize)([client_1.UserRole.CLINIC, client_1.UserRole.ADMIN]), correctionController_1.listCorrectionsController);
router.patch('/corrections/:id', (0, authMiddleware_1.authenticate)(), (0, authMiddleware_1.authorize)([client_1.UserRole.CLINIC, client_1.UserRole.ADMIN]), correctionController_1.reviewCorrectionController);
exports.default = router;
//# sourceMappingURL=correctionRoutes.js.map