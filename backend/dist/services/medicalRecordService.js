"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyMedicalRecord = exports.listMedicalRecords = exports.createMedicalRecord = void 0;
const client_1 = require("@prisma/client");
const prisma_1 = require("../config/prisma");
const errors_1 = require("../utils/errors");
const notificationService_1 = require("./notificationService");
const REVIEWABLE_MEDICAL_STATUS = [
    client_1.MedicalRecordStatus.VERIFIED,
    client_1.MedicalRecordStatus.REJECTED,
];
const createMedicalRecord = async (params) => {
    const pet = await prisma_1.prisma.pet.findUnique({
        where: { id: params.petId },
        select: { id: true, ownerId: true, name: true },
    });
    if (!pet) {
        throw new errors_1.AppError('Pet not found', 404);
    }
    return prisma_1.prisma.medicalRecord.create({
        data: {
            petId: params.petId,
            clinicId: params.clinicId,
            vaccineType: params.vaccineType,
            batchNumber: params.batchNumber,
            givenAt: params.givenAt,
            notes: params.notes ?? null,
            evidenceUrl: params.evidenceUrl ?? null,
            status: client_1.MedicalRecordStatus.PENDING,
        },
    });
};
exports.createMedicalRecord = createMedicalRecord;
const listMedicalRecords = async (petId, user) => {
    const pet = await prisma_1.prisma.pet.findUnique({
        where: { id: petId },
        select: { ownerId: true },
    });
    if (!pet)
        throw new errors_1.AppError('Pet not found', 404);
    if (user.role === client_1.UserRole.OWNER && pet.ownerId !== user.id) {
        throw new errors_1.AppError('Forbidden', 403);
    }
    return prisma_1.prisma.medicalRecord.findMany({
        where: { petId },
        orderBy: { givenAt: 'desc' },
    });
};
exports.listMedicalRecords = listMedicalRecords;
const verifyMedicalRecord = async (recordId, reviewerId, status) => {
    if (!REVIEWABLE_MEDICAL_STATUS.includes(status)) {
        throw new errors_1.AppError('Status tidak valid', 400);
    }
    const record = await prisma_1.prisma.medicalRecord.findUnique({
        where: { id: recordId },
        include: { pet: { select: { ownerId: true, name: true } } },
    });
    if (!record)
        throw new errors_1.AppError('Medical record not found', 404);
    if (record.status !== client_1.MedicalRecordStatus.PENDING) {
        throw new errors_1.AppError('Catatan sudah diverifikasi', 400);
    }
    if (record.clinicId !== reviewerId) {
        throw new errors_1.AppError('Hanya klinik pembuat catatan yang dapat memverifikasi', 403);
    }
    const updated = await prisma_1.prisma.medicalRecord.update({
        where: { id: recordId },
        data: {
            status,
            verifiedById: reviewerId,
            verifiedAt: new Date(),
        },
    });
    const statusText = status === client_1.MedicalRecordStatus.VERIFIED ? 'terverifikasi' : 'ditolak';
    await (0, notificationService_1.createNotification)({
        userId: record.pet.ownerId,
        title: 'Status catatan vaksin berubah',
        message: `Catatan ${record.vaccineType} untuk ${record.pet.name} ${statusText}.`,
    });
    return updated;
};
exports.verifyMedicalRecord = verifyMedicalRecord;
//# sourceMappingURL=medicalRecordService.js.map