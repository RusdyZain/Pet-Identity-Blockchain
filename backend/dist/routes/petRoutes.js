"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const petController_1 = require("../controllers/petController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = (0, express_1.Router)();
router.post('/', (0, authMiddleware_1.authenticate)(), (0, authMiddleware_1.authorize)([client_1.UserRole.OWNER]), petController_1.createPetController);
router.get('/', (0, authMiddleware_1.authenticate)(), (0, authMiddleware_1.authorize)([client_1.UserRole.OWNER, client_1.UserRole.CLINIC, client_1.UserRole.ADMIN]), petController_1.listPetsController);
router.get('/:id', (0, authMiddleware_1.authenticate)(), (0, authMiddleware_1.authorize)([client_1.UserRole.OWNER, client_1.UserRole.CLINIC, client_1.UserRole.ADMIN]), petController_1.getPetController);
router.get('/:petId/ownership-history', (0, authMiddleware_1.authenticate)(), (0, authMiddleware_1.authorize)([client_1.UserRole.OWNER, client_1.UserRole.CLINIC, client_1.UserRole.ADMIN]), petController_1.ownershipHistoryController);
router.post('/:petId/transfer', (0, authMiddleware_1.authenticate)(), (0, authMiddleware_1.authorize)([client_1.UserRole.OWNER]), petController_1.initiateTransferController);
router.post('/:petId/transfer/accept', (0, authMiddleware_1.authenticate)(), (0, authMiddleware_1.authorize)([client_1.UserRole.OWNER]), petController_1.acceptTransferController);
router.post('/:petId/corrections', (0, authMiddleware_1.authenticate)(), (0, authMiddleware_1.authorize)([client_1.UserRole.OWNER]), petController_1.createCorrectionController);
exports.default = router;
//# sourceMappingURL=petRoutes.js.map