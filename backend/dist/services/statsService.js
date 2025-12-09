"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAdminSummary = void 0;
const prisma_1 = require("../config/prisma");
const getAdminSummary = async () => {
    const [totalPets, totalMedicalRecords, totalTransfers] = await Promise.all([
        prisma_1.prisma.pet.count(),
        prisma_1.prisma.medicalRecord.count(),
        prisma_1.prisma.ownershipHistory.count({ where: { transferredAt: { not: null } } }),
    ]);
    return {
        totalPets,
        totalMedicalRecords,
        totalTransfers,
    };
};
exports.getAdminSummary = getAdminSummary;
//# sourceMappingURL=statsService.js.map