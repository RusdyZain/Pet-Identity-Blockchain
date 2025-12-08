"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCorrectionRequest = exports.getTraceByPublicId = exports.acceptTransfer = exports.initiateTransfer = exports.getOwnershipHistory = exports.getPetById = exports.listPets = exports.createPet = void 0;
const client_1 = require("@prisma/client");
const crypto_1 = require("crypto");
const prisma_1 = require("../config/prisma");
const errors_1 = require("../utils/errors");
const notificationService_1 = require("./notificationService");
const correctionFields_1 = require("./correctionFields");
const maskOwnerName = (name) => {
    if (!name)
        return '';
    const parts = name.split(' ').filter(Boolean);
    const [first = ''] = parts;
    const initials = parts
        .slice(1)
        .map((part) => part?.[0] ?? '')
        .join('');
    return `${first} ${initials}`.trim();
};
const calculateAge = (birthDate) => {
    const diff = Date.now() - birthDate.getTime();
    const ageDate = new Date(diff);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
};
const createPet = async (ownerId, data) => {
    const [segment] = (0, crypto_1.randomUUID)().split('-');
    const publicId = `PET-${(segment || (0, crypto_1.randomUUID)()).slice(0, 8).toUpperCase()}`;
    const pet = await prisma_1.prisma.pet.create({
        data: {
            publicId,
            name: data.name,
            species: data.species,
            breed: data.breed,
            birthDate: data.birthDate,
            age: calculateAge(data.birthDate),
            color: data.color,
            physicalMark: data.physicalMark,
            ownerId,
        },
    });
    return pet;
};
exports.createPet = createPet;
const listPets = async (user, query) => {
    const where = {};
    if (user.role === client_1.UserRole.OWNER) {
        where.ownerId = user.id;
    }
    else if (query?.search) {
        where.OR = [
            { name: { contains: query.search, mode: 'insensitive' } },
            { publicId: { contains: query.search, mode: 'insensitive' } },
        ];
    }
    return prisma_1.prisma.pet.findMany({
        where,
        orderBy: { createdAt: 'desc' },
    });
};
exports.listPets = listPets;
const getPetById = async (petId, user) => {
    const pet = await prisma_1.prisma.pet.findUnique({
        where: { id: petId },
        include: { owner: { select: { id: true, name: true, email: true } } },
    });
    if (!pet)
        throw new errors_1.AppError('Pet not found', 404);
    if (user.role === client_1.UserRole.OWNER && pet.ownerId !== user.id) {
        throw new errors_1.AppError('Forbidden', 403);
    }
    return pet;
};
exports.getPetById = getPetById;
const getOwnershipHistory = async (petId, user) => {
    const pet = await prisma_1.prisma.pet.findUnique({ where: { id: petId } });
    if (!pet)
        throw new errors_1.AppError('Pet not found', 404);
    if (pet.status !== client_1.PetStatus.TRANSFER_PENDING) {
        throw new errors_1.AppError('Tidak ada transfer yang perlu diterima', 400);
    }
    if (user.role === client_1.UserRole.OWNER && pet.ownerId !== user.id) {
        throw new errors_1.AppError('Forbidden', 403);
    }
    return prisma_1.prisma.ownershipHistory.findMany({
        where: { petId },
        include: {
            fromOwner: { select: { id: true, name: true, email: true } },
            toOwner: { select: { id: true, name: true, email: true } },
        },
        orderBy: { id: 'desc' },
    });
};
exports.getOwnershipHistory = getOwnershipHistory;
const initiateTransfer = async (petId, currentOwnerId, newOwnerEmail) => {
    const pet = await prisma_1.prisma.pet.findUnique({ where: { id: petId } });
    if (!pet || pet.ownerId !== currentOwnerId) {
        throw new errors_1.AppError('Pet not found or access denied', 404);
    }
    if (pet.status === client_1.PetStatus.TRANSFER_PENDING) {
        throw new errors_1.AppError('Transfer sedang diproses', 400);
    }
    const newOwner = await prisma_1.prisma.user.findUnique({
        where: { email: newOwnerEmail.trim().toLowerCase() },
    });
    if (!newOwner || newOwner.role !== client_1.UserRole.OWNER) {
        throw new errors_1.AppError('New owner must be a registered OWNER', 400);
    }
    if (newOwner.id === currentOwnerId) {
        throw new errors_1.AppError('Cannot transfer to yourself', 400);
    }
    const pendingTransfer = await prisma_1.prisma.ownershipHistory.findFirst({
        where: { petId, transferredAt: null },
    });
    if (pendingTransfer) {
        throw new errors_1.AppError('Transfer already pending', 400);
    }
    await prisma_1.prisma.$transaction([
        prisma_1.prisma.ownershipHistory.create({
            data: {
                petId,
                fromOwnerId: currentOwnerId,
                toOwnerId: newOwner.id,
            },
        }),
        prisma_1.prisma.pet.update({
            where: { id: petId },
            data: { status: client_1.PetStatus.TRANSFER_PENDING },
        }),
    ]);
    await (0, notificationService_1.createNotification)({
        userId: newOwner.id,
        title: 'Permintaan transfer kepemilikan',
        message: `Anda diminta menjadi pemilik baru hewan ${pet.name}. Terima transfer di aplikasi.`,
    });
    return { message: 'Transfer request created' };
};
exports.initiateTransfer = initiateTransfer;
const acceptTransfer = async (petId, newOwnerId) => {
    const transfer = await prisma_1.prisma.ownershipHistory.findFirst({
        where: { petId, toOwnerId: newOwnerId, transferredAt: null },
    });
    if (!transfer) {
        throw new errors_1.AppError('No pending transfer for this pet', 404);
    }
    const pet = await prisma_1.prisma.pet.findUnique({ where: { id: petId } });
    if (!pet)
        throw new errors_1.AppError('Pet not found', 404);
    const [updatedPet] = await prisma_1.prisma.$transaction([
        prisma_1.prisma.pet.update({
            where: { id: petId },
            data: { ownerId: newOwnerId, status: client_1.PetStatus.REGISTERED },
        }),
        prisma_1.prisma.ownershipHistory.update({
            where: { id: transfer.id },
            data: { transferredAt: new Date() },
        }),
    ]);
    await (0, notificationService_1.createNotification)({
        userId: transfer.fromOwnerId,
        title: 'Transfer selesai',
        message: `Kepemilikan hewan ${pet.name} kini sudah diterima pemilik baru.`,
    });
    await (0, notificationService_1.createNotification)({
        userId: transfer.toOwnerId,
        title: 'Transfer diterima',
        message: `Anda kini tercatat sebagai pemilik ${pet.name}.`,
    });
    return updatedPet;
};
exports.acceptTransfer = acceptTransfer;
const getTraceByPublicId = async (publicId) => {
    const pet = await prisma_1.prisma.pet.findUnique({
        where: { publicId },
        include: {
            owner: { select: { name: true } },
            medicalRecords: {
                where: { status: client_1.MedicalRecordStatus.VERIFIED },
                orderBy: { givenAt: 'desc' },
            },
        },
    });
    if (!pet) {
        throw new errors_1.AppError('Pet not found', 404);
    }
    const vaccineSummary = pet.medicalRecords.map((record) => ({
        vaccineType: record.vaccineType,
        lastGivenAt: record.givenAt,
        status: record.status,
    }));
    return {
        name: pet.name,
        species: pet.species,
        breed: pet.breed,
        ownerName: maskOwnerName(pet.owner?.name ?? ''),
        vaccines: vaccineSummary,
    };
};
exports.getTraceByPublicId = getTraceByPublicId;
const createCorrectionRequest = async (params) => {
    const pet = await prisma_1.prisma.pet.findUnique({ where: { id: params.petId } });
    if (!pet || pet.ownerId !== params.ownerId) {
        throw new errors_1.AppError('Pet not found or access denied', 404);
    }
    if (!(params.fieldName in correctionFields_1.correctionFieldMap)) {
        throw new errors_1.AppError('Field tidak dapat dikoreksi', 400);
    }
    const oldValue = (0, correctionFields_1.getPetFieldValue)(pet, params.fieldName);
    return prisma_1.prisma.correctionRequest.create({
        data: {
            petId: params.petId,
            ownerId: params.ownerId,
            fieldName: params.fieldName,
            oldValue: `${oldValue ?? ''}`,
            newValue: params.newValue,
            reason: params.reason ?? null,
        },
    });
};
exports.createCorrectionRequest = createCorrectionRequest;
//# sourceMappingURL=petService.js.map