"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authRoutes_1 = __importDefault(require("./authRoutes"));
const petRoutes_1 = __importDefault(require("./petRoutes"));
const medicalRecordRoutes_1 = __importDefault(require("./medicalRecordRoutes"));
const correctionRoutes_1 = __importDefault(require("./correctionRoutes"));
const notificationRoutes_1 = __importDefault(require("./notificationRoutes"));
const traceRoutes_1 = __importDefault(require("./traceRoutes"));
const adminRoutes_1 = __importDefault(require("./adminRoutes"));
const router = (0, express_1.Router)();
router.use(authRoutes_1.default);
router.use('/pets', petRoutes_1.default);
router.use(medicalRecordRoutes_1.default);
router.use(correctionRoutes_1.default);
router.use(notificationRoutes_1.default);
router.use(traceRoutes_1.default);
router.use(adminRoutes_1.default);
exports.default = router;
//# sourceMappingURL=index.js.map