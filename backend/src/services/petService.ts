import { MedicalRecordStatus, PetStatus, Prisma, UserRole } from '@prisma/client';
import { randomUUID } from 'crypto';
import { prisma } from '../config/prisma';
import { AppError } from '../utils/errors';
import { createNotification } from './notificationService';
import { correctionFieldMap, getPetFieldValue, CorrectionField } from './correctionFields';

const maskOwnerName = (name: string) => {
  if (!name) return '';
  const parts = name.split(' ').filter(Boolean);
  const [first = ''] = parts;
  const initials = parts
    .slice(1)
    .map((part) => part?.[0] ?? '')
    .join('');
  return `${first} ${initials}`.trim();
};

const calculateAge = (birthDate: Date) => {
  const diff = Date.now() - birthDate.getTime();
  const ageDate = new Date(diff);
  return Math.abs(ageDate.getUTCFullYear() - 1970);
};

export const createPet = async (ownerId: number, data: {
  name: string;
  species: string;
  breed: string;
  birthDate: Date;
  color: string;
  physicalMark: string;
}) => {
  const [segment] = randomUUID().split('-');
  const publicId = `PET-${(segment || randomUUID()).slice(0, 8).toUpperCase()}`;

  const pet = await prisma.pet.create({
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

export const listPets = async (user: Express.UserContext, query?: { search?: string }) => {
  const where: Prisma.PetWhereInput = {};
  if (user.role === UserRole.OWNER) {
    where.ownerId = user.id;
  } else if (query?.search) {
    where.OR = [
      { name: { contains: query.search, mode: 'insensitive' } },
      { publicId: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  return prisma.pet.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });
};

export const getPetById = async (petId: number, user: Express.UserContext) => {
  const pet = await prisma.pet.findUnique({
    where: { id: petId },
    include: { owner: { select: { id: true, name: true, email: true } } },
  });

  if (!pet) throw new AppError('Pet not found', 404);
  if (user.role === UserRole.OWNER && pet.ownerId !== user.id) {
    throw new AppError('Forbidden', 403);
  }

  return pet;
};

export const getOwnershipHistory = async (petId: number, user: Express.UserContext) => {
  const pet = await prisma.pet.findUnique({ where: { id: petId } });
  if (!pet) throw new AppError('Pet not found', 404);
  if (pet.status !== PetStatus.TRANSFER_PENDING) {
    throw new AppError('Tidak ada transfer yang perlu diterima', 400);
  }

  if (user.role === UserRole.OWNER && pet.ownerId !== user.id) {
    throw new AppError('Forbidden', 403);
  }

  return prisma.ownershipHistory.findMany({
    where: { petId },
    include: {
      fromOwner: { select: { id: true, name: true, email: true } },
      toOwner: { select: { id: true, name: true, email: true } },
    },
    orderBy: { id: 'desc' },
  });
};

export const initiateTransfer = async (petId: number, currentOwnerId: number, newOwnerEmail: string) => {
  const pet = await prisma.pet.findUnique({ where: { id: petId } });
  if (!pet || pet.ownerId !== currentOwnerId) {
    throw new AppError('Pet not found or access denied', 404);
  }
  if (pet.status === PetStatus.TRANSFER_PENDING) {
    throw new AppError('Transfer sedang diproses', 400);
  }

  const newOwner = await prisma.user.findUnique({
    where: { email: newOwnerEmail.trim().toLowerCase() },
  });

  if (!newOwner || newOwner.role !== UserRole.OWNER) {
    throw new AppError('New owner must be a registered OWNER', 400);
  }

  if (newOwner.id === currentOwnerId) {
    throw new AppError('Cannot transfer to yourself', 400);
  }

  const pendingTransfer = await prisma.ownershipHistory.findFirst({
    where: { petId, transferredAt: null },
  });

  if (pendingTransfer) {
    throw new AppError('Transfer already pending', 400);
  }

  await prisma.$transaction([
    prisma.ownershipHistory.create({
      data: {
        petId,
        fromOwnerId: currentOwnerId,
        toOwnerId: newOwner.id,
      },
    }),
    prisma.pet.update({
      where: { id: petId },
      data: { status: PetStatus.TRANSFER_PENDING },
    }),
  ]);

  await createNotification({
    userId: newOwner.id,
    title: 'Permintaan transfer kepemilikan',
    message: `Anda diminta menjadi pemilik baru hewan ${pet.name}. Terima transfer di aplikasi.`,
  });

  return { message: 'Transfer request created' };
};

export const acceptTransfer = async (petId: number, newOwnerId: number) => {
  const transfer = await prisma.ownershipHistory.findFirst({
    where: { petId, toOwnerId: newOwnerId, transferredAt: null },
  });
  if (!transfer) {
    throw new AppError('No pending transfer for this pet', 404);
  }

  const pet = await prisma.pet.findUnique({ where: { id: petId } });
  if (!pet) throw new AppError('Pet not found', 404);

  const [updatedPet] = await prisma.$transaction([
    prisma.pet.update({
      where: { id: petId },
      data: { ownerId: newOwnerId, status: PetStatus.REGISTERED },
    }),
    prisma.ownershipHistory.update({
      where: { id: transfer.id },
      data: { transferredAt: new Date() },
    }),
  ]);

  await createNotification({
    userId: transfer.fromOwnerId,
    title: 'Transfer selesai',
    message: `Kepemilikan hewan ${pet.name} kini sudah diterima pemilik baru.`,
  });
  await createNotification({
    userId: transfer.toOwnerId,
    title: 'Transfer diterima',
    message: `Anda kini tercatat sebagai pemilik ${pet.name}.`,
  });

  return updatedPet;
};

export const getTraceByPublicId = async (publicId: string) => {
  const pet = await prisma.pet.findUnique({
    where: { publicId },
    include: {
      owner: { select: { name: true } },
      medicalRecords: {
        where: { status: MedicalRecordStatus.VERIFIED },
        orderBy: { givenAt: 'desc' },
      },
    },
  });

  if (!pet) {
    throw new AppError('Pet not found', 404);
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

export const createCorrectionRequest = async (params: {
  petId: number;
  ownerId: number;
  fieldName: string;
  newValue: string;
  reason?: string;
}) => {
  const pet = await prisma.pet.findUnique({ where: { id: params.petId } });
  if (!pet || pet.ownerId !== params.ownerId) {
    throw new AppError('Pet not found or access denied', 404);
  }

  if (!(params.fieldName in correctionFieldMap)) {
    throw new AppError('Field tidak dapat dikoreksi', 400);
  }

  const oldValue = getPetFieldValue(pet, params.fieldName as CorrectionField);

  return prisma.correctionRequest.create({
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
