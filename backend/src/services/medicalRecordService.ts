import { MedicalRecordStatus, UserRole } from "../types/enums";
import { AppDataSource } from "../config/dataSource";
import { MedicalRecord } from "../entities/MedicalRecord";
import { Pet } from "../entities/Pet";
import { AppError } from "../utils/errors";
import { createNotification } from "./notificationService";

// Status yang diizinkan saat review catatan medis.
const REVIEWABLE_MEDICAL_STATUS: MedicalRecordStatus[] = [
  MedicalRecordStatus.VERIFIED,
  MedicalRecordStatus.REJECTED,
];

// Buat catatan medis baru dengan status PENDING.
export const createMedicalRecord = async (params: {
  petId: number;
  clinicId: number;
  onChainRecordId: number;
  dataHash: string;
  txHash: string;
  vaccineType: string;
  batchNumber: string;
  givenAt: Date;
  notes?: string;
  evidenceUrl?: string;
}) => {
  const petRepo = AppDataSource.getRepository(Pet);
  const recordRepo = AppDataSource.getRepository(MedicalRecord);
  const pet = await petRepo.findOne({
    where: { id: params.petId },
    select: { id: true, ownerId: true, name: true },
  });

  if (!pet) {
    throw new AppError("Pet not found", 404);
  }

  return recordRepo.save(
    recordRepo.create({
      petId: params.petId,
      clinicId: params.clinicId,
      onChainRecordId: params.onChainRecordId,
      dataHash: params.dataHash,
      txHash: params.txHash,
      vaccineType: params.vaccineType,
      batchNumber: params.batchNumber,
      givenAt: params.givenAt,
      notes: params.notes ?? null,
      evidenceUrl: params.evidenceUrl ?? null,
      status: MedicalRecordStatus.PENDING,
    })
  );
};

// List catatan medis untuk satu hewan, dengan validasi akses.
export const listMedicalRecords = async (
  petId: number,
  user: Express.UserContext
) => {
  const petRepo = AppDataSource.getRepository(Pet);
  const recordRepo = AppDataSource.getRepository(MedicalRecord);
  const pet = await petRepo.findOne({
    where: { id: petId },
    select: { ownerId: true },
  });
  if (!pet) throw new AppError("Pet not found", 404);

  if (user.role === UserRole.OWNER && pet.ownerId !== user.id) {
    throw new AppError("Forbidden", 403);
  }

  return recordRepo.find({
    where: { petId },
    order: { givenAt: "DESC" },
  });
};

// List catatan PENDING khusus klinik yang bersangkutan.
export const listPendingRecordsForClinic = async (clinicId: number) => {
  return AppDataSource.getRepository(MedicalRecord)
    .createQueryBuilder("record")
    .leftJoin("record.pet", "pet")
    .select(["record", "pet.id", "pet.name", "pet.publicId"])
    .where("record.clinicId = :clinicId", { clinicId })
    .andWhere("record.status = :status", {
      status: MedicalRecordStatus.PENDING,
    })
    .orderBy("record.givenAt", "DESC")
    .getMany();
};

// Verifikasi atau tolak catatan medis yang masih PENDING.
export const verifyMedicalRecord = async (
  recordId: number,
  reviewerId: number,
  status: MedicalRecordStatus,
  txHash: string
) => {
  if (!REVIEWABLE_MEDICAL_STATUS.includes(status)) {
    throw new AppError("Status tidak valid", 400);
  }

  const recordRepo = AppDataSource.getRepository(MedicalRecord);
  const record = await recordRepo
    .createQueryBuilder("record")
    .leftJoin("record.pet", "pet")
    .select(["record", "pet.ownerId", "pet.name"])
    .where("record.id = :recordId", { recordId })
    .getOne();

  if (!record) throw new AppError("Medical record not found", 404);
  if (record.status !== MedicalRecordStatus.PENDING) {
    throw new AppError("Catatan sudah diverifikasi", 400);
  }

  if (record.clinicId !== reviewerId) {
    throw new AppError(
      "Hanya klinik pembuat catatan yang dapat memverifikasi",
      403
    );
  }

  await recordRepo.update(
    { id: recordId },
    {
      status,
      verifiedById: reviewerId,
      verifiedAt: new Date(),
      txHash,
    }
  );
  const updated = await recordRepo.findOne({ where: { id: recordId } });
  if (!updated || !record.pet) {
    throw new AppError("Medical record not found", 404);
  }

  const statusText =
    status === MedicalRecordStatus.VERIFIED ? "terverifikasi" : "ditolak";
  await createNotification({
    userId: record.pet.ownerId,
    title: "Status catatan vaksin berubah",
    message: `Catatan ${record.vaccineType} untuk ${record.pet.name} ${statusText}.`,
  });

  return updated;
};
