import { CorrectionStatus, NotificationEventType } from "../types/enums";
import { AppDataSource } from "../config/dataSource";
import { CorrectionRequest } from "../entities/CorrectionRequest";
import { Pet } from "../entities/Pet";
import { AppError } from "../utils/errors";
import { createNotification } from "./notificationService";
import {
  confirmUpdatePetBasicDataTx,
  prepareUpdatePetBasicDataTx,
} from "../blockchain/petIdentityClient";
import { resolveOnChainPetId } from "../blockchain/petIdentityResolver";
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

type ApprovedCorrectionPayload = {
  correction: CorrectionRequest;
  petUpdateData: Record<string, unknown>;
  onChainDataHash: string;
  onChainPetId: number;
};

const loadPendingCorrection = async (correctionId: number) => {
  const correctionRepo = AppDataSource.getRepository(CorrectionRequest);
  const correction = await correctionRepo.findOne({
    where: { id: correctionId },
    relations: { pet: true, owner: true },
  });

  if (!correction) throw new AppError("Correction not found", 404);
  if (correction.status !== CorrectionStatus.PENDING) {
    throw new AppError("Correction already reviewed", 400);
  }
  if (!correction.pet) {
    throw new AppError("Pet not found", 404);
  }

  return correction;
};

const buildApprovedCorrectionPayload = async (
  correction: CorrectionRequest
): Promise<ApprovedCorrectionPayload> => {
  const fieldName = correction.fieldName as CorrectionField;
  if (!(fieldName in correctionFieldMap)) {
    throw new AppError("Field tidak dapat dikoreksi", 400);
  }

  const value = parsePetFieldValue(fieldName, correction.newValue);
  const nextPet = {
    publicId: correction.pet!.publicId,
    name: correction.pet!.name,
    species: correction.pet!.species,
    breed: correction.pet!.breed,
    birthDate: correction.pet!.birthDate,
    color: correction.pet!.color,
    physicalMark: correction.pet!.physicalMark,
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

  const onChainDataHash = buildPetDataHash(nextPet);
  const onChainPetId = await resolveOnChainPetId({
    id: correction.petId,
    publicId: correction.pet!.publicId,
    onChainPetId: correction.pet!.onChainPetId,
    dataHash: onChainDataHash,
    name: correction.pet!.name,
    species: correction.pet!.species,
    breed: correction.pet!.breed,
    birthDate: correction.pet!.birthDate,
    color: correction.pet!.color,
    physicalMark: correction.pet!.physicalMark,
  });

  return {
    correction,
    petUpdateData: {
      [correctionFieldMap[fieldName]]: value,
    },
    onChainDataHash,
    onChainPetId,
  };
};

// List koreksi data (bisa difilter status).
export const listCorrections = async (status?: CorrectionStatus) => {
  const repo = AppDataSource.getRepository(CorrectionRequest);
  const qb = repo
    .createQueryBuilder("correction")
    .leftJoin("correction.pet", "pet")
    .leftJoin("correction.owner", "owner")
    .select([
      "correction",
      "pet.id",
      "pet.name",
      "pet.publicId",
      "owner.id",
      "owner.name",
    ])
    .orderBy("correction.createdAt", "DESC");

  if (status) {
    qb.where("correction.status = :status", { status });
  }

  return qb.getMany();
};

export const prepareCorrectionReview = async (params: {
  correctionId: number;
  status: CorrectionStatus;
}) => {
  if (!REVIEWABLE_STATUSES.includes(params.status)) {
    throw new AppError("Status tidak valid", 400);
  }

  const correction = await loadPendingCorrection(params.correctionId);
  if (params.status !== CorrectionStatus.APPROVED) {
    return {
      requiresOnChainTx: false,
    };
  }

  const approvedPayload = await buildApprovedCorrectionPayload(correction);
  return {
    requiresOnChainTx: true,
    onChainPetId: approvedPayload.onChainPetId,
    dataHash: approvedPayload.onChainDataHash,
    txRequest: prepareUpdatePetBasicDataTx(
      approvedPayload.onChainPetId,
      approvedPayload.onChainDataHash
    ),
  };
};

// Setujui atau tolak koreksi, sekaligus update data jika disetujui.
export const reviewCorrection = async (params: {
  correctionId: number;
  reviewerId: number;
  reviewerWalletAddress: string;
  status: CorrectionStatus;
  txHash?: string;
  reason?: string;
}) => {
  if (!REVIEWABLE_STATUSES.includes(params.status)) {
    throw new AppError("Status tidak valid", 400);
  }

  const correction = await loadPendingCorrection(params.correctionId);
  let approvedPayload: ApprovedCorrectionPayload | null = null;
  let onChainTxHash: string | null = null;
  let onChainBlockNumber: number | null = null;
  let onChainBlockTimestamp: Date | null = null;
  if (params.status === CorrectionStatus.APPROVED) {
    if (!params.txHash) {
      throw new AppError(
        "txHash wajib disertakan untuk koreksi APPROVED",
        400
      );
    }
    approvedPayload = await buildApprovedCorrectionPayload(correction);
    const { metadata } = await confirmUpdatePetBasicDataTx({
      txHash: params.txHash,
      expectedPetId: approvedPayload.onChainPetId,
      expectedDataHash: approvedPayload.onChainDataHash,
      expectedWalletAddress: params.reviewerWalletAddress,
    });
    onChainTxHash = metadata.txHash;
    onChainBlockNumber = metadata.blockNumber;
    onChainBlockTimestamp = metadata.blockTimestamp;
  }

  const updatedCorrection = await AppDataSource.transaction(
    async (manager) => {
      if (approvedPayload) {
        await manager.getRepository(Pet).update(
          { id: correction.petId },
          {
            ...(approvedPayload.petUpdateData as Partial<Pet>),
            dataHash: approvedPayload.onChainDataHash,
            ...(onChainTxHash ? { txHash: onChainTxHash } : {}),
            ...(onChainBlockNumber !== null
              ? { blockNumber: onChainBlockNumber }
              : {}),
            ...(onChainBlockTimestamp
              ? { blockTimestamp: onChainBlockTimestamp }
              : {}),
          }
        );
      }

      await manager.getRepository(CorrectionRequest).update(
        { id: params.correctionId },
        {
          status: params.status,
          reviewedById: params.reviewerId,
          reviewedAt: new Date(),
          reason: params.reason ?? null,
          ...(onChainTxHash ? { txHash: onChainTxHash } : {}),
          ...(onChainBlockNumber !== null
            ? { blockNumber: onChainBlockNumber }
            : {}),
          ...(onChainBlockTimestamp
            ? { blockTimestamp: onChainBlockTimestamp }
            : {}),
        }
      );

      return manager.getRepository(CorrectionRequest).findOne({
        where: { id: params.correctionId },
      });
    }
  );

  if (!updatedCorrection) {
    throw new AppError("Correction not found", 404);
  }

  const statusText =
    params.status === CorrectionStatus.APPROVED ? "disetujui" : "ditolak";
  await createNotification({
    userId: correction.ownerId,
    title: "Permintaan koreksi diperbarui",
    message: `Koreksi ${correction.fieldName} untuk ${correction.pet!.name} ${statusText}.`,
    eventType: NotificationEventType.CORRECTION_REVIEWED,
    petId: correction.petId,
    sourceId: correction.id,
    actionUrl: `/owner/pets/${correction.petId}`,
  });

  return updatedCorrection;
};
