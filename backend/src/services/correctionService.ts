import { CorrectionStatus, Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import { AppError } from '../utils/errors';
import { createNotification } from './notificationService';
import { CorrectionField, correctionFieldMap, parsePetFieldValue } from './correctionFields';

const REVIEWABLE_STATUSES: CorrectionStatus[] = [
  CorrectionStatus.APPROVED,
  CorrectionStatus.REJECTED,
];

export const listCorrections = async (status?: CorrectionStatus) => {
  const where = status ? { status } : undefined;
  return prisma.correctionRequest.findMany({
    ...(where ? { where } : {}),
    include: {
      pet: { select: { id: true, name: true, publicId: true } },
      owner: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
};

export const reviewCorrection = async (params: {
  correctionId: number;
  reviewerId: number;
  status: CorrectionStatus;
  reason?: string;
}) => {
  if (!REVIEWABLE_STATUSES.includes(params.status)) {
    throw new AppError('Status tidak valid', 400);
  }

  const correction = await prisma.correctionRequest.findUnique({
    where: { id: params.correctionId },
    include: {
      pet: true,
      owner: true,
    },
  });

  if (!correction) throw new AppError('Correction not found', 404);
  if (correction.status !== CorrectionStatus.PENDING) {
    throw new AppError('Correction already reviewed', 400);
  }

  const actions: Prisma.PrismaPromise<any>[] = [];
  if (params.status === CorrectionStatus.APPROVED) {
    const fieldName = correction.fieldName as CorrectionField;
    if (!(fieldName in correctionFieldMap)) {
      throw new AppError('Field tidak dapat dikoreksi', 400);
    }

    const value = parsePetFieldValue(fieldName, correction.newValue);
    actions.push(
      prisma.pet.update({
        where: { id: correction.petId },
        data: {
          [correctionFieldMap[fieldName]]: value,
        },
      }),
    );
  }

  actions.push(
    prisma.correctionRequest.update({
      where: { id: params.correctionId },
      data: {
        status: params.status,
        reviewedById: params.reviewerId,
        reviewedAt: new Date(),
        reason: params.reason ?? null,
      },
    }),
  );

  const results = await prisma.$transaction(actions);
  const updatedCorrection = results[results.length - 1];

  const statusText =
    params.status === CorrectionStatus.APPROVED ? 'disetujui' : 'ditolak';
  await createNotification({
    userId: correction.ownerId,
    title: 'Permintaan koreksi diperbarui',
    message: `Koreksi ${correction.fieldName} untuk ${correction.pet.name} ${statusText}.`,
  });

  return updatedCorrection;
};
