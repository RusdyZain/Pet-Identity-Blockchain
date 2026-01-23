import { IsNull } from "typeorm";
import { MedicalRecordStatus, PetStatus, UserRole } from "../types/enums";
import { randomUUID } from "crypto";
import { AppDataSource } from "../config/dataSource";
import { Pet } from "../entities/Pet";
import { User } from "../entities/User";
import { OwnershipHistory } from "../entities/OwnershipHistory";
import { CorrectionRequest } from "../entities/CorrectionRequest";
import { AppError } from "../utils/errors";
import { createNotification } from "./notificationService";
import {
  correctionFieldMap,
  getPetFieldValue,
  CorrectionField,
} from "./correctionFields";
import { buildCorrectionDataHash } from "../utils/dataHash";

// Buat publicId singkat untuk hewan baru.
export const generatePublicId = () => {
  const [segment] = randomUUID().split("-");
  return `PET-${(segment || randomUUID()).slice(0, 8).toUpperCase()}`;
};

// Sembunyikan sebagian nama pemilik untuk tampilan publik.
const maskOwnerName = (name: string) => {
  if (!name) return "";
  const parts = name.split(" ").filter(Boolean);
  const [first = ""] = parts;
  const initials = parts
    .slice(1)
    .map((part) => part?.[0] ?? "")
    .join("");
  return `${first} ${initials}`.trim();
};

// Hitung umur berdasarkan tanggal lahir.
const calculateAge = (birthDate: Date) => {
  const diff = Date.now() - birthDate.getTime();
  const ageDate = new Date(diff);
  return Math.abs(ageDate.getUTCFullYear() - 1970);
};

// Simpan hewan baru ke database.
export const createPet = async (
  ownerId: number,
  data: {
    publicId?: string;
    onChainPetId?: number | null;
    dataHash: string;
    txHash: string;
    name: string;
    species: string;
    breed: string;
    birthDate: Date;
    color: string;
    physicalMark: string;
  }
) => {
  const publicId = data.publicId ?? generatePublicId();

  const petRepo = AppDataSource.getRepository(Pet);
  const pet = await petRepo.save(
    petRepo.create({
      publicId,
      onChainPetId: data.onChainPetId ?? null,
      dataHash: data.dataHash,
      txHash: data.txHash,
      name: data.name,
      species: data.species,
      breed: data.breed,
      birthDate: data.birthDate,
      age: calculateAge(data.birthDate),
      color: data.color,
      physicalMark: data.physicalMark,
      ownerId,
    })
  );

  return pet;
};

// Daftar hewan yang bisa dilihat user (tergantung role).
export const listPets = async (
  user: Express.UserContext,
  query?: { search?: string }
) => {
  const petRepo = AppDataSource.getRepository(Pet);
  const qb = petRepo
    .createQueryBuilder("pet")
    .orderBy("pet.createdAt", "DESC");

  if (user.role === UserRole.OWNER) {
    qb.where("pet.ownerId = :ownerId", { ownerId: user.id });
  } else if (query?.search) {
    qb.where("pet.name ILIKE :search OR pet.publicId ILIKE :search", {
      search: `%${query.search}%`,
    });
  }

  return qb.getMany();
};

// Ambil detail hewan dengan validasi akses.
export const getPetById = async (petId: number, user: Express.UserContext) => {
  const petRepo = AppDataSource.getRepository(Pet);
  const pet = await petRepo
    .createQueryBuilder("pet")
    .leftJoin("pet.owner", "owner")
    .select(["pet", "owner.id", "owner.name", "owner.email"])
    .where("pet.id = :petId", { petId })
    .getOne();

  if (!pet) throw new AppError("Pet not found", 404);
  if (user.role === UserRole.OWNER && pet.ownerId !== user.id) {
    throw new AppError("Forbidden", 403);
  }

  return pet;
};

// Ambil riwayat transfer untuk hewan tertentu.
export const getOwnershipHistory = async (
  petId: number,
  user: Express.UserContext
) => {
  const petRepo = AppDataSource.getRepository(Pet);
  const historyRepo = AppDataSource.getRepository(OwnershipHistory);
  const pet = await petRepo.findOne({ where: { id: petId } });
  if (!pet) throw new AppError("Pet not found", 404);
  if (pet.status !== PetStatus.TRANSFER_PENDING) {
    throw new AppError("Tidak ada transfer yang perlu diterima", 400);
  }

  if (user.role === UserRole.OWNER && pet.ownerId !== user.id) {
    throw new AppError("Forbidden", 403);
  }

  return historyRepo
    .createQueryBuilder("history")
    .leftJoin("history.fromOwner", "fromOwner")
    .leftJoin("history.toOwner", "toOwner")
    .select([
      "history",
      "fromOwner.id",
      "fromOwner.name",
      "fromOwner.email",
      "toOwner.id",
      "toOwner.name",
      "toOwner.email",
    ])
    .where("history.petId = :petId", { petId })
    .orderBy("history.id", "DESC")
    .getMany();
};

// Mulai proses transfer kepemilikan ke pemilik baru.
export const initiateTransfer = async (
  petId: number,
  currentOwnerId: number,
  newOwnerEmail: string
) => {
  const petRepo = AppDataSource.getRepository(Pet);
  const userRepo = AppDataSource.getRepository(User);
  const historyRepo = AppDataSource.getRepository(OwnershipHistory);
  const pet = await petRepo.findOne({ where: { id: petId } });
  if (!pet || pet.ownerId !== currentOwnerId) {
    throw new AppError("Pet not found or access denied", 404);
  }
  if (pet.status === PetStatus.TRANSFER_PENDING) {
    throw new AppError("Transfer sedang diproses", 400);
  }

  const newOwner = await userRepo.findOne({
    where: { email: newOwnerEmail.trim().toLowerCase() },
  });

  if (!newOwner || newOwner.role !== UserRole.OWNER) {
    throw new AppError("New owner must be a registered OWNER", 400);
  }

  if (newOwner.id === currentOwnerId) {
    throw new AppError("Cannot transfer to yourself", 400);
  }

  const pendingTransfer = await historyRepo.findOne({
    where: { petId, transferredAt: IsNull() },
  });

  if (pendingTransfer) {
    throw new AppError("Transfer already pending", 400);
  }

  await AppDataSource.transaction(async (manager) => {
    await manager.getRepository(OwnershipHistory).save({
      petId,
      fromOwnerId: currentOwnerId,
      toOwnerId: newOwner.id,
    });
    await manager.getRepository(Pet).update(
      { id: petId },
      { status: PetStatus.TRANSFER_PENDING }
    );
  });

  await createNotification({
    userId: newOwner.id,
    title: "Permintaan transfer kepemilikan",
    message: `Anda diminta menjadi pemilik baru hewan ${pet.name}. Terima transfer di aplikasi.`,
  });

  return { message: "Transfer request created" };
};

// Terima transfer kepemilikan oleh pemilik baru.
export const acceptTransfer = async (petId: number, newOwnerId: number) => {
  const historyRepo = AppDataSource.getRepository(OwnershipHistory);
  const petRepo = AppDataSource.getRepository(Pet);
  const transfer = await historyRepo.findOne({
    where: { petId, toOwnerId: newOwnerId, transferredAt: IsNull() },
  });
  if (!transfer) {
    throw new AppError("No pending transfer for this pet", 404);
  }

  const pet = await petRepo.findOne({ where: { id: petId } });
  if (!pet) throw new AppError("Pet not found", 404);

  let updatedPet: Pet | null = null;
  await AppDataSource.transaction(async (manager) => {
    await manager
      .getRepository(Pet)
      .update(
        { id: petId },
        { ownerId: newOwnerId, status: PetStatus.REGISTERED }
      );
    await manager
      .getRepository(OwnershipHistory)
      .update({ id: transfer.id }, { transferredAt: new Date() });
    updatedPet = await manager.getRepository(Pet).findOne({
      where: { id: petId },
    });
  });

  await createNotification({
    userId: transfer.fromOwnerId,
    title: "Transfer selesai",
    message: `Kepemilikan hewan ${pet.name} kini sudah diterima pemilik baru.`,
  });
  await createNotification({
    userId: transfer.toOwnerId,
    title: "Transfer diterima",
    message: `Anda kini tercatat sebagai pemilik ${pet.name}.`,
  });

  if (!updatedPet) {
    throw new AppError("Pet not found", 404);
  }
  return updatedPet;
};

// Data trace publik berdasarkan publicId (tanpa menampilkan nama lengkap pemilik).
export const getTraceByPublicId = async (publicId: string) => {
  const petRepo = AppDataSource.getRepository(Pet);
  const pet = await petRepo
    .createQueryBuilder("pet")
    .leftJoin("pet.owner", "owner")
    .leftJoinAndSelect(
      "pet.medicalRecords",
      "medicalRecords",
      "medicalRecords.status = :status",
      {
        status: MedicalRecordStatus.VERIFIED,
      }
    )
    .select([
      "pet",
      "owner.name",
      "medicalRecords.id",
      "medicalRecords.vaccineType",
      "medicalRecords.givenAt",
      "medicalRecords.status",
    ])
    .where("pet.publicId = :publicId", { publicId })
    .orderBy("medicalRecords.givenAt", "DESC")
    .getOne();

  if (!pet) {
    throw new AppError("Pet not found", 404);
  }

  const vaccineSummary = (pet.medicalRecords ?? []).map((record) => ({
    vaccineType: record.vaccineType,
    lastGivenAt: record.givenAt,
    status: record.status,
  }));

  return {
    name: pet.name,
    species: pet.species,
    breed: pet.breed,
    ownerName: maskOwnerName(pet.owner?.name ?? ""),
    vaccines: vaccineSummary,
  };
};

// Ajukan koreksi data hewan dari pemilik.
export const createCorrectionRequest = async (params: {
  petId: number;
  ownerId: number;
  fieldName: string;
  newValue: string;
  reason?: string;
}) => {
  const petRepo = AppDataSource.getRepository(Pet);
  const correctionRepo = AppDataSource.getRepository(CorrectionRequest);
  const pet = await petRepo.findOne({ where: { id: params.petId } });
  if (!pet || pet.ownerId !== params.ownerId) {
    throw new AppError("Pet not found or access denied", 404);
  }

  if (!(params.fieldName in correctionFieldMap)) {
    throw new AppError("Field tidak dapat dikoreksi", 400);
  }

  const oldValue = getPetFieldValue(pet, params.fieldName as CorrectionField);
  const dataHash = buildCorrectionDataHash({
    petId: params.petId,
    ownerId: params.ownerId,
    fieldName: params.fieldName,
    oldValue: `${oldValue ?? ""}`,
    newValue: params.newValue,
    reason: params.reason ?? null,
  });

  return correctionRepo.save(
    correctionRepo.create({
      petId: params.petId,
      ownerId: params.ownerId,
      dataHash,
      fieldName: params.fieldName,
      oldValue: `${oldValue ?? ""}`,
      newValue: params.newValue,
      reason: params.reason ?? null,
    })
  );
};
