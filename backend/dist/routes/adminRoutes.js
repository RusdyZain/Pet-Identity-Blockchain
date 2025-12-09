"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const adminController_1 = require("../controllers/adminController");
const router = (0, express_1.Router)();
router.get('/admin/summary', (0, authMiddleware_1.authenticate)(), (0, authMiddleware_1.authorize)([client_1.UserRole.ADMIN]), adminController_1.adminSummaryController);
exports.default = router;
//# sourceMappingURL=adminRoutes.js.map