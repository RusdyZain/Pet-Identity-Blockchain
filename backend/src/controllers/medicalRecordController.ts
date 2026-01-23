import { Request, Response, NextFunction } from "express";
import {
  createMedicalRecord,
  listMedicalRecords,
  listPendingRecordsForClinic,
  verifyMedicalRecord,
} from "../services/medicalRecordService";
import { AppError } from "../utils/errors";
import { MedicalRecordStatus } from "../types/enums";
import {
  addMedicalRecord,
  getBackendWalletAddress,
  verifyMedicalRecord as verifyMedicalRecordOnChain,
} from "../blockchain/petIdentityClient";
import { AppDataSource } from "../config/dataSource";
import { Pet } from "../entities/Pet";
import { MedicalRecord } from "../entities/MedicalRecord";
import { resolveOnChainPetId } from "../blockchain/petIdentityResolver";
import { buildMedicalRecordDataHash } from "../utils/dataHash";
import { ensureUserWalletAddress } from "../services/userWalletService";

// Handler pembuatan catatan medis (DB + blockchain).
export const createMedicalRecordController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) throw new AppError("Unauthorized", 401);
    const petId = Number(req.params.petId);
    const { vaccine_type, batch_number, given_at, notes, evidence_url } =
      req.body;
    if (!vaccine_type || !batch_number || !given_at) {
      throw new AppError("Missing required fields", 400);
    }

    const pet = await AppDataSource.getRepository(Pet).findOne({
      where: { id: petId },
      select: {
        id: true,
        publicId: true,
        onChainPetId: true,
        dataHash: true,
        name: true,
        species: true,
        breed: true,
        birthDate: true,
        color: true,
        physicalMark: true,
      },
    });
    if (!pet) {
      throw new AppError("Pet not found", 404);
    }

    const givenAt = new Date(given_at);
    if (Number.isNaN(givenAt.getTime())) {
      throw new AppError("Tanggal pemberian tidak valid", 400);
    }

    const onChainPetId = await resolveOnChainPetId(pet);
    const dataHash = buildMedicalRecordDataHash({
      petId,
      vaccineType: vaccine_type,
      batchNumber: batch_number,
      givenAt,
      notes,
      evidenceUrl: evidence_url,
    });

    try {
      const walletAddress = getBackendWalletAddress();
      await ensureUserWalletAddress(req.user.id, walletAddress);

      const { receipt, recordId: onChainRecordId } = await addMedicalRecord(
        onChainPetId,
        dataHash
      );

      const record = await createMedicalRecord({
        petId,
        clinicId: req.user.id,
        onChainRecordId: Number(onChainRecordId),
        dataHash,
        txHash: receipt.hash,
        vaccineType: vaccine_type,
        batchNumber: batch_number,
        givenAt,
        notes,
        evidenceUrl: evidence_url,
      });

      return res.status(201).json({
        record,
        blockchain: {
          txHash: receipt.hash,
          onChainRecordId: onChainRecordId.toString(),
        },
      });
    } catch (blockchainError: any) {
      console.error(
        "Failed to add medical record on blockchain",
        blockchainError
      );
      return res.status(500).json({
        error:
          blockchainError?.message ??
          "Failed to sync medical record to blockchain",
      });
    }
  } catch (error) {
    next(error);
  }
};

// Handler daftar catatan medis untuk satu hewan.
export const listMedicalRecordsController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) throw new AppError("Unauthorized", 401);
    const petId = Number(req.params.petId);
    const records = await listMedicalRecords(petId, req.user);
    res.json(records);
  } catch (error) {
    next(error);
  }
};

// Handler daftar catatan PENDING untuk klinik.
export const listPendingRecordsController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) throw new AppError("Unauthorized", 401);
    const records = await listPendingRecordsForClinic(req.user.id);
    res.json(records);
  } catch (error) {
    next(error);
  }
};

// Handler verifikasi catatan medis oleh klinik.
export const verifyMedicalRecordController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) throw new AppError("Unauthorized", 401);
    const recordId = Number(req.params.id);
    const { status } = req.body;
    if (!status) throw new AppError("Status wajib diisi", 400);

    const record = await AppDataSource.getRepository(MedicalRecord).findOne({
      where: { id: recordId },
      select: { onChainRecordId: true },
    });
    if (!record) {
      throw new AppError("Medical record not found", 404);
    }
    if (!record.onChainRecordId) {
      throw new AppError("Medical record not registered on blockchain", 400);
    }

    const walletAddress = getBackendWalletAddress();
    await ensureUserWalletAddress(req.user.id, walletAddress);

    const chainStatus =
      status === MedicalRecordStatus.VERIFIED
        ? 1
        : status === MedicalRecordStatus.REJECTED
        ? 2
        : 0;

    if (chainStatus === 0) {
      throw new AppError("Status tidak valid", 400);
    }

    const receipt = await verifyMedicalRecordOnChain(
      record.onChainRecordId,
      chainStatus
    );

    const updated = await verifyMedicalRecord(
      recordId,
      req.user.id,
      status as MedicalRecordStatus,
      receipt.hash
    );
    res.json(updated);
  } catch (error) {
    next(error);
  }
};
