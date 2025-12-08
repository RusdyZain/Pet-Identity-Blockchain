"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reviewCorrectionController = exports.listCorrectionsController = void 0;
const correctionService_1 = require("../services/correctionService");
const errors_1 = require("../utils/errors");
const listCorrectionsController = async (req, res, next) => {
    try {
        if (!req.user)
            throw new errors_1.AppError('Unauthorized', 401);
        const status = req.query.status;
        const corrections = await (0, correctionService_1.listCorrections)(status);
        res.json(corrections);
    }
    catch (error) {
        next(error);
    }
};
exports.listCorrectionsController = listCorrectionsController;
const reviewCorrectionController = async (req, res, next) => {
    try {
        if (!req.user)
            throw new errors_1.AppError('Unauthorized', 401);
        const correctionId = Number(req.params.id);
        const { status, reason } = req.body;
        if (!status)
            throw new errors_1.AppError('Status wajib diisi', 400);
        const updated = await (0, correctionService_1.reviewCorrection)({
            correctionId,
            reviewerId: req.user.id,
            status: status,
            reason,
        });
        res.json(updated);
    }
    catch (error) {
        next(error);
    }
};
exports.reviewCorrectionController = reviewCorrectionController;
//# sourceMappingURL=correctionController.js.map