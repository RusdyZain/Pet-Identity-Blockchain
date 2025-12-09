import { Request, Response, NextFunction } from 'express';
import {
  createMedicalRecord,
  listMedicalRecords,
  listPendingRecordsForClinic,
  verifyMedicalRecord,
} from '../services/medicalRecordService';
import { AppError } from '../utils/errors';
import { MedicalRecordStatus } from '@prisma/client';

export const createMedicalRecordController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const petId = Number(req.params.petId);
    const { vaccine_type, batch_number, given_at, notes, evidence_url } = req.body;
    if (!vaccine_type || !batch_number || !given_at) {
      throw new AppError('Missing required fields', 400);
    }

    const givenAt = new Date(given_at);
    if (Number.isNaN(givenAt.getTime())) {
      throw new AppError('Tanggal pemberian tidak valid', 400);
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

    res.status(201).json(record);
  } catch (error) {
    next(error);
  }
};

export const listMedicalRecordsController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const petId = Number(req.params.petId);
    const records = await listMedicalRecords(petId, req.user);
    res.json(records);
  } catch (error) {
    next(error);
  }
};

export const listPendingRecordsController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const records = await listPendingRecordsForClinic(req.user.id);
    res.json(records);
  } catch (error) {
    next(error);
  }
};

export const verifyMedicalRecordController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const recordId = Number(req.params.id);
    const { status } = req.body;
    if (!status) throw new AppError('Status wajib diisi', 400);

    const updated = await verifyMedicalRecord(
      recordId,
      req.user.id,
      status as MedicalRecordStatus,
    );
    res.json(updated);
  } catch (error) {
    next(error);
  }
};
