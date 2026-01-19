import { CorrectionStatus, Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";
import { AppError } from "../utils/errors";
import { createNotification } from "./notificationService";
import { updatePetBasicData } from "../blockchain/petIdentityClient";
import {
  getBlockchainErrorMessage,
  resolveOnChainPetId,
} from "../blockchain/petIdentityResolver";
import { buildPetDataHash } from "../utils/dataHash";
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
  let onChainDataHash: string | null = null;
  let onChainTxHash: string | null = null;
  if (params.status === CorrectionStatus.APPROVED) {
    const fieldName = correction.fieldName as CorrectionField;
    if (!(fieldName in correctionFieldMap)) {
      throw new AppError("Field tidak dapat dikoreksi", 400);
    }

    const value = parsePetFieldValue(fieldName, correction.newValue);
    const nextPet = {
      publicId: correction.pet.publicId,
      name: correction.pet.name,
      species: correction.pet.species,
      breed: correction.pet.breed,
      birthDate: correction.pet.birthDate,
      color: correction.pet.color,
      physicalMark: correction.pet.physicalMark,
    };

    if (fieldName === "name") {
      nextPet.name = String(value);
    } else if (fieldName === "species") {
      nextPet.species = String(value);
    } else if (fieldName === "breed") {
      nextPet.breed = String(value);
    } else if (fieldName === "birth_date") {
      nextPet.birthDate = value as Date;
    } else if (fieldName === "color") {
      nextPet.color = String(value);
    } else if (fieldName === "physical_mark") {
      nextPet.physicalMark = String(value);
    }

    onChainDataHash = buildPetDataHash(nextPet);
    petUpdateData = {
      [correctionFieldMap[fieldName]]: value,
    };
  }

  if (onChainDataHash) {
    const onChainPetId = await resolveOnChainPetId({
      id: correction.petId,
      publicId: correction.pet.publicId,
      onChainPetId: correction.pet.onChainPetId,
      dataHash: onChainDataHash,
      name: correction.pet.name,
      species: correction.pet.species,
      breed: correction.pet.breed,
      birthDate: correction.pet.birthDate,
      color: correction.pet.color,
      physicalMark: correction.pet.physicalMark,
    });

    try {
      const receipt = await updatePetBasicData(onChainPetId, onChainDataHash);
      onChainTxHash = receipt.hash;
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
        data: {
          ...petUpdateData,
          ...(onChainDataHash ? { dataHash: onChainDataHash } : {}),
          ...(onChainTxHash ? { txHash: onChainTxHash } : {}),
        },
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
        ...(onChainTxHash ? { txHash: onChainTxHash } : {}),
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
