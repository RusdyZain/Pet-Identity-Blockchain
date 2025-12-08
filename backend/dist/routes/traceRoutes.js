"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const traceController_1 = require("../controllers/traceController");
const router = (0, express_1.Router)();
router.get('/trace/:publicId', traceController_1.traceController);
exports.default = router;
//# sourceMappingURL=traceRoutes.js.map