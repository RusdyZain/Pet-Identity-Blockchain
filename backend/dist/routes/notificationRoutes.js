"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const notificationController_1 = require("../controllers/notificationController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = (0, express_1.Router)();
router.get('/notifications', (0, authMiddleware_1.authenticate)(), (0, authMiddleware_1.authorize)([client_1.UserRole.OWNER, client_1.UserRole.CLINIC, client_1.UserRole.ADMIN]), notificationController_1.listNotificationsController);
router.patch('/notifications/:id/read', (0, authMiddleware_1.authenticate)(), (0, authMiddleware_1.authorize)([client_1.UserRole.OWNER, client_1.UserRole.CLINIC, client_1.UserRole.ADMIN]), notificationController_1.markNotificationReadController);
exports.default = router;
//# sourceMappingURL=notificationRoutes.js.map