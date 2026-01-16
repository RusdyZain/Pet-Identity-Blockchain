import { Request, Response, NextFunction } from "express";
import {
  createMedicalRecord,
  listMedicalRecords,
  listPendingRecordsForClinic,
  verifyMedicalRecord,
} from "../services/medicalRecordService";
import { AppError } from "../utils/errors";
import { MedicalRecordStatus } from "@prisma/client";
import { addMedicalRecord } from "../blockchain/petIdentityClient";
import { prisma } from "../config/prisma";

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

    const pet = await prisma.pet.findUnique({ where: { id: petId } });
    if (!pet) {
      throw new AppError("Pet not found", 404);
    }
    if (!pet.onChainPetId) {
      throw new AppError("Pet is not registered on blockchain", 400);
    }

    const givenAt = new Date(given_at);
    if (Number.isNaN(givenAt.getTime())) {
      throw new AppError("Tanggal pemberian tidak valid", 400);
    }

    const record = await createMedicalRecord({
      petId,
      clinicId: req.user.id,
      vaccineType: vaccine_type,
      batchNumber: batch_number,
      givenAt,
      notes,
      evidenceUrl: evidence_url,
    });

    try {
      const receipt = await addMedicalRecord(
        Number(pet.onChainPetId),
        record.vaccineType,
        record.batchNumber,
        Math.floor(givenAt.getTime() / 1000)
      );
      return res.status(201).json({
        record,
        blockchain: {
          txHash: receipt.hash,
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

    const updated = await verifyMedicalRecord(
      recordId,
      req.user.id,
      status as MedicalRecordStatus
    );
    res.json(updated);
  } catch (error) {
    next(error);
  }
};
