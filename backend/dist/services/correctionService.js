"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reviewCorrection = exports.listCorrections = void 0;
const client_1 = require("@prisma/client");
const prisma_1 = require("../config/prisma");
const errors_1 = require("../utils/errors");
const notificationService_1 = require("./notificationService");
const correctionFields_1 = require("./correctionFields");
const REVIEWABLE_STATUSES = [
    client_1.CorrectionStatus.APPROVED,
    client_1.CorrectionStatus.REJECTED,
];
const listCorrections = async (status) => {
    const where = status ? { status } : undefined;
    return prisma_1.prisma.correctionRequest.findMany({
        ...(where ? { where } : {}),
        include: {
            pet: { select: { id: true, name: true, publicId: true } },
            owner: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
    });
};
exports.listCorrections = listCorrections;
const reviewCorrection = async (params) => {
    if (!REVIEWABLE_STATUSES.includes(params.status)) {
        throw new errors_1.AppError('Status tidak valid', 400);
    }
    const correction = await prisma_1.prisma.correctionRequest.findUnique({
        where: { id: params.correctionId },
        include: {
            pet: true,
            owner: true,
        },
    });
    if (!correction)
        throw new errors_1.AppError('Correction not found', 404);
    if (correction.status !== client_1.CorrectionStatus.PENDING) {
        throw new errors_1.AppError('Correction already reviewed', 400);
    }
    const actions = [];
    if (params.status === client_1.CorrectionStatus.APPROVED) {
        const fieldName = correction.fieldName;
        if (!(fieldName in correctionFields_1.correctionFieldMap)) {
            throw new errors_1.AppError('Field tidak dapat dikoreksi', 400);
        }
        const value = (0, correctionFields_1.parsePetFieldValue)(fieldName, correction.newValue);
        actions.push(prisma_1.prisma.pet.update({
            where: { id: correction.petId },
            data: {
                [correctionFields_1.correctionFieldMap[fieldName]]: value,
            },
        }));
    }
    actions.push(prisma_1.prisma.correctionRequest.update({
        where: { id: params.correctionId },
        data: {
            status: params.status,
            reviewedById: params.reviewerId,
            reviewedAt: new Date(),
            reason: params.reason ?? null,
        },
    }));
    const results = await prisma_1.prisma.$transaction(actions);
    const updatedCorrection = results[results.length - 1];
    const statusText = params.status === client_1.CorrectionStatus.APPROVED ? 'disetujui' : 'ditolak';
    await (0, notificationService_1.createNotification)({
        userId: correction.ownerId,
        title: 'Permintaan koreksi diperbarui',
        message: `Koreksi ${correction.fieldName} untuk ${correction.pet.name} ${statusText}.`,
    });
    return updatedCorrection;
};
exports.reviewCorrection = reviewCorrection;
//# sourceMappingURL=correctionService.js.map