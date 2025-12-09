"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminSummaryController = void 0;
const statsService_1 = require("../services/statsService");
const adminSummaryController = async (_req, res, next) => {
    try {
        const summary = await (0, statsService_1.getAdminSummary)();
        res.json(summary);
    }
    catch (error) {
        next(error);
    }
};
exports.adminSummaryController = adminSummaryController;
//# sourceMappingURL=adminController.js.map