import { CorrectionStatus, Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";
import { AppError } from "../utils/errors";
import { createNotification } from "./notificationService";
import { updatePetBasicData } from "../blockchain/petIdentityClient";
import {
  getBlockchainErrorMessage,
  resolveOnChainPetId,
} from "../blockchain/petIdentityResolver";
import {
  CorrectionField,
  correctionFieldMap,
  parsePetFieldValue,
} from "./correctionFields";

// Status yang diizinkan saat review koreksi.
const REVIEWABLE_STATUSES: CorrectionStatus[] = [
  CorrectionStatus.APPROVED,
  CorrectionStatus.REJECTED,
];

const CHAIN_FIELDS = new Set<CorrectionField>([
  "name",
  "species",
  "breed",
  "birth_date",
]);

const buildOnChainPayload = (
  pet: {
    name: string;
    species: string;
    breed: string;
    birthDate: Date;
  },
  fieldName: CorrectionField,
  value: unknown
) => ({
  name: fieldName === "name" ? String(value) : pet.name,
  species: fieldName === "species" ? String(value) : pet.species,
  breed: fieldName === "breed" ? String(value) : pet.breed,
  birthDate: fieldName === "birth_date" ? (value as Date) : pet.birthDate,
});

// List koreksi data (bisa difilter status).
export const listCorrections = async (status?: CorrectionStatus) => {
  const where = status ? { status } : undefined;
  return prisma.correctionRequest.findMany({
    ...(where ? { where } : {}),
    include: {
      pet: { select: { id: true, name: true, publicId: true } },
      owner: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
};

// Setujui atau tolak koreksi, sekaligus update data jika disetujui.
export const reviewCorrection = async (params: {
  correctionId: number;
  reviewerId: number;
  status: CorrectionStatus;
  reason?: string;
}) => {
  if (!REVIEWABLE_STATUSES.includes(params.status)) {
    throw new AppError("Status tidak valid", 400);
  }

  const correction = await prisma.correctionRequest.findUnique({
    where: { id: params.correctionId },
    include: {
      pet: true,
      owner: true,
    },
  });

  if (!correction) throw new AppError("Correction not found", 404);
  if (correction.status !== CorrectionStatus.PENDING) {
    throw new AppError("Correction already reviewed", 400);
  }

  const actions: Prisma.PrismaPromise<any>[] = [];
  let petUpdateData: Record<string, unknown> | null = null;
  let onChainPayload:
    | {
        name: string;
        species: string;
        breed: string;
        birthDate: Date;
      }
    | null = null;
  if (params.status === CorrectionStatus.APPROVED) {
    const fieldName = correction.fieldName as CorrectionField;
    if (!(fieldName in correctionFieldMap)) {
      throw new AppError("Field tidak dapat dikoreksi", 400);
    }

    const value = parsePetFieldValue(fieldName, correction.newValue);
    petUpdateData = {
      [correctionFieldMap[fieldName]]: value,
    };
    if (CHAIN_FIELDS.has(fieldName)) {
      onChainPayload = buildOnChainPayload(correction.pet, fieldName, value);
    }
  }

  if (onChainPayload) {
    const onChainPetId = await resolveOnChainPetId({
      id: correction.petId,
      publicId: correction.pet.publicId,
      onChainPetId: correction.pet.onChainPetId,
      name: onChainPayload.name,
      species: onChainPayload.species,
      breed: onChainPayload.breed,
      birthDate: onChainPayload.birthDate,
    });

    try {
      await updatePetBasicData(
        onChainPetId,
        onChainPayload.name,
        onChainPayload.species,
        onChainPayload.breed,
        Math.floor(onChainPayload.birthDate.getTime() / 1000)
      );
    } catch (error) {
      const message =
        getBlockchainErrorMessage(error) ??
        "Failed to sync correction to blockchain";
      throw new AppError(message, 500);
    }
  }

  if (petUpdateData) {
    actions.push(
      prisma.pet.update({
        where: { id: correction.petId },
        data: petUpdateData,
      })
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
    })
  );

  const results = await prisma.$transaction(actions);
  const updatedCorrection = results[results.length - 1];

  const statusText =
    params.status === CorrectionStatus.APPROVED ? "disetujui" : "ditolak";
  await createNotification({
    userId: correction.ownerId,
    title: "Permintaan koreksi diperbarui",
    message: `Koreksi ${correction.fieldName} untuk ${correction.pet.name} ${statusText}.`,
  });

  return updatedCorrection;
};
