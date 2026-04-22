import { IsNull } from "typeorm";
import {
  MedicalRecordStatus,
  NotificationEventType,
  PetStatus,
  UserRole,
} from "../types/enums";
import { randomUUID } from "crypto";
import { AppDataSource } from "../config/dataSource";
import { Pet } from "../entities/Pet";
import { User } from "../entities/User";
import { OwnershipHistory } from "../entities/OwnershipHistory";
import { CorrectionRequest } from "../entities/CorrectionRequest";
import { AppError } from "../utils/errors";
import {
  createNotification,
  createNotificationsForUsers,
} from "./notificationService";
import { resolveOnChainPetId } from "../blockchain/petIdentityResolver";
import {
  correctionFieldMap,
  getPetFieldValue,
  CorrectionField,
} from "./correctionFields";
import { buildCorrectionDataHash } from "../utils/dataHash";
import {
  maskPublicOwnerName,
  serializeTracePublicOwnershipItem,
} from "./tracePublicSerializer";

// Buat publicId singkat untuk hewan baru.
export const generatePublicId = () => {
  const [segment] = randomUUID().split("-");
  return `PET-${(segment || randomUUID()).slice(0, 8).toUpperCase()}`;
};

// Hitung umur berdasarkan tanggal lahir.
const calculateAge = (birthDate: Date) => {
  const diff = Date.now() - birthDate.getTime();
  const ageDate = new Date(diff);
  return Math.abs(ageDate.getUTCFullYear() - 1970);
};

type TransferContext = {
  pet: Pet;
  newOwner: User;
  onChainPetId: number;
  currentOwnerWalletAddress: string;
  newOwnerWalletAddress: string;
};

type OwnershipHistoryStatus = "PENDING" | "COMPLETED";

const listCorrectionReviewerUserIds = async () => {
  const reviewers = await AppDataSource.getRepository(User).find({
    where: [{ role: UserRole.CLINIC }, { role: UserRole.ADMIN }],
    select: { id: true },
  });
  return reviewers.map((reviewer) => reviewer.id);
};

const buildOwnershipTimelineQuery = (petId: number) =>
  AppDataSource.getRepository(OwnershipHistory)
    .createQueryBuilder("history")
    .leftJoin("history.fromOwner", "fromOwner")
    .leftJoin("history.toOwner", "toOwner")
    .select([
      "history.id",
      "history.petId",
      "history.onChainPetId",
      "history.txHash",
      "history.blockNumber",
      "history.blockTimestamp",
      "history.createdAt",
      "history.transferredAt",
      "fromOwner.id",
      "fromOwner.name",
      "fromOwner.email",
      "toOwner.id",
      "toOwner.name",
      "toOwner.email",
    ])
    .where("history.petId = :petId", { petId })
    .orderBy("COALESCE(history.transferredAt, history.createdAt)", "ASC")
    .addOrderBy("history.createdAt", "ASC")
    .addOrderBy("history.id", "ASC");

const buildPublicTraceOwnershipTimelineQuery = (petId: number) =>
  AppDataSource.getRepository(OwnershipHistory)
    .createQueryBuilder("history")
    .leftJoin("history.fromOwner", "fromOwner")
    .leftJoin("history.toOwner", "toOwner")
    .select([
      "history.id",
      "history.createdAt",
      "history.transferredAt",
      "fromOwner.name",
      "fromOwner.walletAddress",
      "toOwner.name",
      "toOwner.walletAddress",
    ])
    .where("history.petId = :petId", { petId })
    .orderBy("COALESCE(history.transferredAt, history.createdAt)", "ASC")
    .addOrderBy("history.createdAt", "ASC")
    .addOrderBy("history.id", "ASC");

const resolveOwnershipStatus = (
  transferredAt: Date | null
): OwnershipHistoryStatus => (transferredAt ? "COMPLETED" : "PENDING");

const mapDashboardOwnershipHistoryItem = (history: OwnershipHistory) => ({
  id: history.id,
  petId: history.petId,
  onChainPetId: history.onChainPetId,
  txHash: history.txHash,
  blockNumber: history.blockNumber,
  blockTimestamp: history.blockTimestamp
    ? history.blockTimestamp.toISOString()
    : null,
  requestedAt: history.createdAt.toISOString(),
  transferredAt: history.transferredAt
    ? history.transferredAt.toISOString()
    : null,
  status: resolveOwnershipStatus(history.transferredAt),
  fromOwner: {
    id: history.fromOwner?.id ?? null,
    name: history.fromOwner?.name ?? "",
    email: history.fromOwner?.email ?? "",
  },
  toOwner: {
    id: history.toOwner?.id ?? null,
    name: history.toOwner?.name ?? "",
    email: history.toOwner?.email ?? "",
  },
});

export const getTransferContext = async (
  petId: number,
  currentOwnerId: number,
  newOwnerEmail: string
): Promise<TransferContext> => {
  const petRepo = AppDataSource.getRepository(Pet);
  const userRepo = AppDataSource.getRepository(User);
  const historyRepo = AppDataSource.getRepository(OwnershipHistory);

  const pet = await petRepo.findOne({
    where: { id: petId },
    select: {
      id: true,
      ownerId: true,
      status: true,
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
  if (!pet || pet.ownerId !== currentOwnerId) {
    throw new AppError("Pet not found or access denied", 404);
  }

  if (pet.status === PetStatus.TRANSFER_PENDING) {
    throw new AppError("Transfer sedang diproses", 400);
  }

  const newOwner = await userRepo.findOne({
    where: { email: newOwnerEmail.trim().toLowerCase() },
    select: { id: true, role: true, walletAddress: true, email: true, name: true },
  });

  if (!newOwner || newOwner.role !== UserRole.OWNER) {
    throw new AppError("New owner must be a registered OWNER", 400);
  }

  if (!newOwner.walletAddress) {
    throw new AppError("New owner does not have a registered wallet address", 400);
  }

  if (newOwner.id === currentOwnerId) {
    throw new AppError("Cannot transfer to yourself", 400);
  }

  const pendingTransfer = await historyRepo.findOne({
    where: { petId, transferredAt: IsNull() },
    select: { id: true },
  });

  if (pendingTransfer) {
    throw new AppError("Transfer already pending", 400);
  }

  const currentOwner = await userRepo.findOne({
    where: { id: currentOwnerId },
    select: { walletAddress: true },
  });

  if (!currentOwner?.walletAddress) {
    throw new AppError("Current owner wallet is not registered", 400);
  }

  const onChainPetId = await resolveOnChainPetId(pet);

  return {
    pet,
    newOwner,
    onChainPetId,
    currentOwnerWalletAddress: currentOwner.walletAddress,
    newOwnerWalletAddress: newOwner.walletAddress,
  };
};

// Simpan hewan baru ke database.
export const createPet = async (
  ownerId: number,
  data: {
    publicId?: string;
    onChainPetId?: number | null;
    dataHash: string;
    txHash: string;
    blockNumber: number;
    blockTimestamp: Date;
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
      blockNumber: data.blockNumber,
      blockTimestamp: data.blockTimestamp,
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
  const pet = await petRepo.findOne({ where: { id: petId } });
  if (!pet) throw new AppError("Pet not found", 404);

  if (user.role === UserRole.OWNER && pet.ownerId !== user.id) {
    const isParticipant = await AppDataSource.getRepository(OwnershipHistory).exist({
      where: [
        { petId, fromOwnerId: user.id },
        { petId, toOwnerId: user.id },
      ],
    });
    if (!isParticipant) {
      throw new AppError("Forbidden", 403);
    }
  }

  const history = await buildOwnershipTimelineQuery(petId).getMany();

  return {
    view: "dashboard_internal",
    petId,
    total: history.length,
    items: history.map(mapDashboardOwnershipHistoryItem),
  };
};

// Mulai proses transfer kepemilikan ke pemilik baru.
export const initiateTransfer = async (
  petId: number,
  currentOwnerId: number,
  newOwnerEmail: string,
  blockchain: {
    onChainPetId: number;
    txHash: string;
    blockNumber: number;
    blockTimestamp: Date;
  }
) => {
  const context = await getTransferContext(petId, currentOwnerId, newOwnerEmail);

  let updatedPet: Pet | null = null;
  await AppDataSource.transaction(async (manager) => {
    await manager.getRepository(Pet).update(
      { id: petId },
      { ownerId: context.newOwner.id, status: PetStatus.REGISTERED }
    );

    await manager.getRepository(OwnershipHistory).save({
      petId,
      fromOwnerId: currentOwnerId,
      toOwnerId: context.newOwner.id,
      onChainPetId: blockchain.onChainPetId,
      txHash: blockchain.txHash,
      blockNumber: blockchain.blockNumber,
      blockTimestamp: blockchain.blockTimestamp,
      transferredAt: blockchain.blockTimestamp,
    });

    updatedPet = await manager.getRepository(Pet).findOne({
      where: { id: petId },
    });
  });

  await createNotification({
    userId: context.newOwner.id,
    title: "Transfer kepemilikan selesai",
    message: `Kepemilikan hewan ${context.pet.name} telah dipindahkan ke akun Anda dan tervalidasi on-chain.`,
    eventType: NotificationEventType.TRANSFER_INITIATED,
    petId: context.pet.id,
    sourceId: blockchain.txHash,
    actionUrl: `/owner/pets/${context.pet.id}`,
  });
  await createNotification({
    userId: currentOwnerId,
    title: "Transfer kepemilikan berhasil",
    message: `Kepemilikan hewan ${context.pet.name} berhasil dipindahkan dan tervalidasi on-chain.`,
    eventType: NotificationEventType.TRANSFER_INITIATED,
    petId: context.pet.id,
    sourceId: blockchain.txHash,
    actionUrl: `/owner/pets/${context.pet.id}`,
  });

  if (!updatedPet) {
    throw new AppError("Pet not found", 404);
  }

  return {
    message: "Ownership transferred successfully",
    pet: updatedPet,
    blockchain: {
      txHash: blockchain.txHash,
      blockNumber: blockchain.blockNumber,
      blockTimestamp: blockchain.blockTimestamp.toISOString(),
      onChainPetId: blockchain.onChainPetId.toString(),
    },
  };
};

// Terima transfer kepemilikan oleh pemilik baru.
export const acceptTransfer = async (petId: number, newOwnerId: number) => {
  const historyRepo = AppDataSource.getRepository(OwnershipHistory);
  const petRepo = AppDataSource.getRepository(Pet);
  const pet = await petRepo.findOne({ where: { id: petId } });
  if (!pet) throw new AppError("Pet not found", 404);

  // Transfer yang sudah tersinkron on-chain dianggap selesai dan endpoint ini idempotent.
  if (pet.ownerId === newOwnerId) {
    return pet;
  }

  const transfer = await historyRepo.findOne({
    where: { petId, toOwnerId: newOwnerId, transferredAt: IsNull() },
  });
  if (!transfer) {
    throw new AppError("No pending transfer for this pet", 404);
  }

  if (!transfer.txHash || !transfer.blockTimestamp || transfer.blockNumber === null) {
    throw new AppError("Pending transfer has no verified on-chain transaction", 400);
  }

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
      .update({ id: transfer.id }, { transferredAt: transfer.blockTimestamp });
    updatedPet = await manager.getRepository(Pet).findOne({
      where: { id: petId },
    });
  });

  await createNotification({
    userId: transfer.fromOwnerId,
    title: "Transfer selesai",
    message: `Kepemilikan hewan ${pet.name} kini sudah diterima pemilik baru.`,
    eventType: NotificationEventType.TRANSFER_ACCEPTED,
    petId: pet.id,
    sourceId: transfer.id,
    actionUrl: `/owner/pets/${pet.id}`,
  });
  await createNotification({
    userId: transfer.toOwnerId,
    title: "Transfer diterima",
    message: `Anda kini tercatat sebagai pemilik ${pet.name}.`,
    eventType: NotificationEventType.TRANSFER_ACCEPTED,
    petId: pet.id,
    sourceId: transfer.id,
    actionUrl: `/owner/pets/${pet.id}`,
  });

  if (!updatedPet) {
    throw new AppError("Pet not found", 404);
  }
  return updatedPet;
};

// Tolak transfer kepemilikan yang masih pending oleh calon pemilik baru.
export const rejectTransfer = async (petId: number, newOwnerId: number) => {
  const historyRepo = AppDataSource.getRepository(OwnershipHistory);
  const petRepo = AppDataSource.getRepository(Pet);
  const transfer = await historyRepo.findOne({
    where: { petId, toOwnerId: newOwnerId, transferredAt: IsNull() },
  });

  if (!transfer) {
    throw new AppError("No pending transfer for this pet", 404);
  }

  const pet = await petRepo.findOne({
    where: { id: petId },
    select: { id: true, name: true, ownerId: true, status: true },
  });
  if (!pet) {
    throw new AppError("Pet not found", 404);
  }

  await AppDataSource.transaction(async (manager) => {
    await manager.getRepository(OwnershipHistory).delete({ id: transfer.id });

    if (pet.status === PetStatus.TRANSFER_PENDING) {
      await manager.getRepository(Pet).update(
        { id: petId },
        { status: PetStatus.REGISTERED, ownerId: transfer.fromOwnerId }
      );
    }
  });

  await createNotification({
    userId: transfer.fromOwnerId,
    title: "Transfer kepemilikan ditolak",
    message: `Permintaan transfer untuk hewan ${pet.name} ditolak oleh calon pemilik baru.`,
    eventType: NotificationEventType.TRANSFER_REJECTED,
    petId: pet.id,
    sourceId: transfer.id,
    actionUrl: `/owner/pets/${pet.id}`,
  });
  await createNotification({
    userId: transfer.toOwnerId,
    title: "Anda menolak transfer kepemilikan",
    message: `Transfer kepemilikan hewan ${pet.name} telah dibatalkan.`,
    eventType: NotificationEventType.TRANSFER_REJECTED,
    petId: pet.id,
    sourceId: transfer.id,
    actionUrl: `/owner/pets/${pet.id}`,
  });

  const updatedPet = await petRepo.findOne({ where: { id: petId } });
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

  const ownershipHistory = await buildPublicTraceOwnershipTimelineQuery(
    pet.id
  ).getMany();

  return {
    publicId: pet.publicId,
    name: pet.name,
    species: pet.species,
    breed: pet.breed,
    ownerName: maskPublicOwnerName(pet.owner?.name ?? ""),
    vaccines: vaccineSummary,
    ownershipHistory: {
      view: "trace_public",
      total: ownershipHistory.length,
      items: ownershipHistory.map(serializeTracePublicOwnershipItem),
    },
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

  const createdCorrection = await correctionRepo.save(
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

  try {
    const reviewerUserIds = await listCorrectionReviewerUserIds();
    await createNotificationsForUsers({
      userIds: reviewerUserIds,
      title: "Permintaan koreksi baru",
      message: `Owner mengajukan koreksi ${params.fieldName} untuk ${pet.name}.`,
      eventType: NotificationEventType.CORRECTION_SUBMITTED,
      petId: pet.id,
      sourceId: createdCorrection.id,
      actionUrl: "/clinic/corrections",
    });
  } catch (error) {
    console.error("[notification] correction submitted fanout failed", {
      correctionId: createdCorrection.id,
      petId: pet.id,
      ownerId: params.ownerId,
      error,
    });
  }

  return createdCorrection;
};
