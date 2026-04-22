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
  confirmAddMedicalRecordTx,
  confirmVerifyMedicalRecordTx,
  isClinic,
  prepareAddMedicalRecordTx,
  prepareVerifyMedicalRecordTx,
} from "../blockchain/petIdentityClient";
import { AppDataSource } from "../config/dataSource";
import { Pet } from "../entities/Pet";
import { MedicalRecord } from "../entities/MedicalRecord";
import { resolveOnChainPetId } from "../blockchain/petIdentityResolver";
import { buildMedicalRecordDataHash } from "../utils/dataHash";
import { ensureUserWalletAddress } from "../services/userWalletService";

const parseMedicalRecordPayload = (payload: Record<string, unknown>) => {
  const vaccineType = `${payload.vaccine_type ?? ""}`.trim();
  const batchNumber = `${payload.batch_number ?? ""}`.trim();
  const givenAtRaw = `${payload.given_at ?? ""}`.trim();
  const notes =
    typeof payload.notes === "string" && payload.notes.trim().length > 0
      ? payload.notes.trim()
      : undefined;
  const evidenceUrl =
    typeof payload.evidence_url === "string" &&
    payload.evidence_url.trim().length > 0
      ? payload.evidence_url.trim()
      : undefined;
  const txHash = typeof payload.txHash === "string" ? payload.txHash.trim() : "";

  if (!vaccineType || !batchNumber || !givenAtRaw) {
    throw new AppError("Missing required fields", 400);
  }

  const givenAt = new Date(givenAtRaw);
  if (Number.isNaN(givenAt.getTime())) {
    throw new AppError("Tanggal pemberian tidak valid", 400);
  }

  return {
    vaccineType,
    batchNumber,
    givenAt,
    notes,
    evidenceUrl,
    txHash,
  };
};

export const prepareMedicalRecordController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) throw new AppError("Unauthorized", 401);
    const petId = Number(req.params.petId);
    if (!Number.isInteger(petId)) {
      throw new AppError("Invalid pet id", 400);
    }

    const parsed = parseMedicalRecordPayload(req.body as Record<string, unknown>);
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

    const onChainPetId = await resolveOnChainPetId(pet);
    const dataHash = buildMedicalRecordDataHash({
      petId,
      vaccineType: parsed.vaccineType,
      batchNumber: parsed.batchNumber,
      givenAt: parsed.givenAt,
      notes: parsed.notes ?? null,
      evidenceUrl: parsed.evidenceUrl ?? null,
    });

    const txRequest = prepareAddMedicalRecordTx(onChainPetId, dataHash);
    res.json({ onChainPetId, dataHash, txRequest });
  } catch (error) {
    next(error);
  }
};

// Handler pembuatan catatan medis (DB + blockchain).
export const createMedicalRecordController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) throw new AppError("Unauthorized", 401);
    const petId = Number(req.params.petId);
    if (!Number.isInteger(petId)) {
      throw new AppError("Invalid pet id", 400);
    }
    const parsed = parseMedicalRecordPayload(req.body as Record<string, unknown>);
    if (!parsed.txHash) {
      throw new AppError("txHash is required", 400);
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

    const onChainPetId = await resolveOnChainPetId(pet);
    const dataHash = buildMedicalRecordDataHash({
      petId,
      vaccineType: parsed.vaccineType,
      batchNumber: parsed.batchNumber,
      givenAt: parsed.givenAt,
      notes: parsed.notes ?? null,
      evidenceUrl: parsed.evidenceUrl ?? null,
    });

    try {
      const walletAddress = req.user.walletAddress;
      await ensureUserWalletAddress(req.user.id, walletAddress);

      const { recordId: onChainRecordId, metadata } =
        await confirmAddMedicalRecordTx({
          txHash: parsed.txHash,
          expectedPetId: onChainPetId,
          expectedDataHash: dataHash,
          expectedWalletAddress: walletAddress,
        });

      const record = await createMedicalRecord({
        petId,
        clinicId: req.user.id,
        onChainRecordId,
        dataHash,
        txHash: metadata.txHash,
        blockNumber: metadata.blockNumber,
        blockTimestamp: metadata.blockTimestamp,
        vaccineType: parsed.vaccineType,
        batchNumber: parsed.batchNumber,
        givenAt: parsed.givenAt,
        ...(parsed.notes ? { notes: parsed.notes } : {}),
        ...(parsed.evidenceUrl ? { evidenceUrl: parsed.evidenceUrl } : {}),
      });

      return res.status(201).json({
        record,
        blockchain: {
          txHash: metadata.txHash,
          blockNumber: metadata.blockNumber,
          blockTimestamp: metadata.blockTimestamp.toISOString(),
          onChainRecordId: onChainRecordId.toString(),
        },
      });
    } catch (blockchainError: unknown) {
      if (blockchainError instanceof AppError) {
        return res
          .status(blockchainError.statusCode)
          .json({ message: blockchainError.message });
      }

      console.error(
        "Failed to add medical record on blockchain",
        blockchainError
      );
      return res.status(500).json({
        message: "Failed to sync medical record to blockchain",
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

export const prepareVerifyMedicalRecordController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) throw new AppError("Unauthorized", 401);
    const recordId = Number(req.params.id);
    if (!Number.isInteger(recordId)) {
      throw new AppError("Invalid medical record id", 400);
    }
    const { status } = req.body;
    if (!status) throw new AppError("Status wajib diisi", 400);

    const record = await AppDataSource.getRepository(MedicalRecord).findOne({
      where: { id: recordId },
      select: { onChainRecordId: true },
    });
    if (!record || !record.onChainRecordId) {
      throw new AppError("Medical record not registered on blockchain", 400);
    }

    const chainStatus =
      status === MedicalRecordStatus.VERIFIED
        ? 1
        : status === MedicalRecordStatus.REJECTED
        ? 2
        : 0;

    if (chainStatus === 0) {
      throw new AppError("Status tidak valid", 400);
    }

    const txRequest = prepareVerifyMedicalRecordTx(
      record.onChainRecordId,
      chainStatus
    );
    res.json({
      onChainRecordId: record.onChainRecordId,
      chainStatus,
      txRequest,
    });
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
    if (!Number.isInteger(recordId)) {
      throw new AppError("Invalid medical record id", 400);
    }
    const { status, txHash } = req.body;
    if (!status) throw new AppError("Status wajib diisi", 400);
    if (!txHash) throw new AppError("txHash wajib diisi", 400);

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

    const walletAddress = req.user.walletAddress;
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

    const { metadata } = await confirmVerifyMedicalRecordTx({
      txHash,
      expectedRecordId: record.onChainRecordId,
      expectedStatus: chainStatus,
      expectedWalletAddress: walletAddress,
    });

    const updated = await verifyMedicalRecord(
      recordId,
      req.user.id,
      status as MedicalRecordStatus,
      metadata.txHash,
      metadata.blockNumber,
      metadata.blockTimestamp
    );
    res.json({
      record: updated,
      blockchain: {
        txHash: metadata.txHash,
        blockNumber: metadata.blockNumber,
        blockTimestamp: metadata.blockTimestamp.toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const checkIsClinicController = async (req: Request, res: Response, next: NextFunction) => {
  console.log("Checking if user is clinic...");
  try {
    if (!req.user) throw new AppError("Unauthorized", 401);
    const walletAddress = req.user.walletAddress;
    await ensureUserWalletAddress(req.user.id, walletAddress);
    const isClinicCheck = await isClinic(walletAddress);
    console.log("isClinicCheck:", isClinicCheck);
    res.json({ isClinic: isClinicCheck });
  } catch (error) {
    next(error);
  }
};
