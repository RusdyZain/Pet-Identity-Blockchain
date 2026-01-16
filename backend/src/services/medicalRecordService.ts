import { MedicalRecordStatus, UserRole } from "@prisma/client";
import { prisma } from "../config/prisma";
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
  vaccineType: string;
  batchNumber: string;
  givenAt: Date;
  notes?: string;
  evidenceUrl?: string;
}) => {
  const pet = await prisma.pet.findUnique({
    where: { id: params.petId },
    select: { id: true, ownerId: true, name: true },
  });

  if (!pet) {
    throw new AppError("Pet not found", 404);
  }

  return prisma.medicalRecord.create({
    data: {
      petId: params.petId,
      clinicId: params.clinicId,
      vaccineType: params.vaccineType,
      batchNumber: params.batchNumber,
      givenAt: params.givenAt,
      notes: params.notes ?? null,
      evidenceUrl: params.evidenceUrl ?? null,
      status: MedicalRecordStatus.PENDING,
    },
  });
};

// List catatan medis untuk satu hewan, dengan validasi akses.
export const listMedicalRecords = async (
  petId: number,
  user: Express.UserContext
) => {
  const pet = await prisma.pet.findUnique({
    where: { id: petId },
    select: { ownerId: true },
  });
  if (!pet) throw new AppError("Pet not found", 404);

  if (user.role === UserRole.OWNER && pet.ownerId !== user.id) {
    throw new AppError("Forbidden", 403);
  }

  return prisma.medicalRecord.findMany({
    where: { petId },
    orderBy: { givenAt: "desc" },
  });
};

// List catatan PENDING khusus klinik yang bersangkutan.
export const listPendingRecordsForClinic = async (clinicId: number) => {
  return prisma.medicalRecord.findMany({
    where: { clinicId, status: MedicalRecordStatus.PENDING },
    include: {
      pet: { select: { id: true, name: true, publicId: true } },
    },
    orderBy: { givenAt: "desc" },
  });
};

// Verifikasi atau tolak catatan medis yang masih PENDING.
export const verifyMedicalRecord = async (
  recordId: number,
  reviewerId: number,
  status: MedicalRecordStatus
) => {
  if (!REVIEWABLE_MEDICAL_STATUS.includes(status)) {
    throw new AppError("Status tidak valid", 400);
  }

  const record = await prisma.medicalRecord.findUnique({
    where: { id: recordId },
    include: { pet: { select: { ownerId: true, name: true } } },
  });

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

  const updated = await prisma.medicalRecord.update({
    where: { id: recordId },
    data: {
      status,
      verifiedById: reviewerId,
      verifiedAt: new Date(),
    },
  });

  const statusText =
    status === MedicalRecordStatus.VERIFIED ? "terverifikasi" : "ditolak";
  await createNotification({
    userId: record.pet.ownerId,
    title: "Status catatan vaksin berubah",
    message: `Catatan ${record.vaccineType} untuk ${record.pet.name} ${statusText}.`,
  });

  return updated;
};
