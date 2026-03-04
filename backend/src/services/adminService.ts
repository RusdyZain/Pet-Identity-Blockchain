import { AppDataSource } from "../config/dataSource";
import { User } from "../entities/User";
import { Pet } from "../entities/Pet";
import { MedicalRecord } from "../entities/MedicalRecord";
import { CorrectionRequest } from "../entities/CorrectionRequest";
import { OwnershipHistory } from "../entities/OwnershipHistory";
import { Notification } from "../entities/Notification";
import { UserRole } from "../types/enums";
import { AppError } from "../utils/errors";
import { hashPassword } from "../utils/password";
import { getAddress } from "ethers";

const userSelect = ["user.id", "user.name", "user.email", "user.role", "user.walletAddress"];

export const listUsers = async (params?: {
  role?: UserRole;
  search?: string;
}) => {
  const repo = AppDataSource.getRepository(User);
  const qb = repo
    .createQueryBuilder("user")
    .select(userSelect)
    .orderBy("user.id", "DESC");

  if (params?.role) {
    qb.where("user.role = :role", { role: params.role });
  }

  if (params?.search) {
    const search = `%${params.search}%`;
    qb.andWhere("(user.name ILIKE :search OR user.email ILIKE :search)", {
      search,
    });
  }

  return qb.getMany();
};

export const createUser = async (params: {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  walletAddress?: string;
}) => {
  const name = params.name.trim();
  const email = params.email.trim().toLowerCase();

  if (!name || !email || !params.password) {
    throw new AppError("Missing required fields", 400);
  }

  if (!Object.values(UserRole).includes(params.role)) {
    throw new AppError("Role tidak valid", 400);
  }

  const repo = AppDataSource.getRepository(User);
  const existing = await repo.findOne({ where: { email } });
  if (existing) {
    throw new AppError("Email already registered", 400);
  }

  let normalizedWalletAddress: string | null = null;
  if (typeof params.walletAddress === "string" && params.walletAddress.trim()) {
    try {
      normalizedWalletAddress = getAddress(params.walletAddress.trim());
    } catch (_error) {
      throw new AppError("Wallet address tidak valid", 400);
    }
    const existingWallet = await repo
      .createQueryBuilder("user")
      .select(["user.id"])
      .where("LOWER(user.walletAddress) = LOWER(:walletAddress)", {
        walletAddress: normalizedWalletAddress,
      })
      .getOne();
    if (existingWallet) {
      throw new AppError("Wallet already registered", 400);
    }
  }

  const passwordHash = await hashPassword(params.password);
  const user = await repo.save(
    repo.create({
      name,
      email,
      passwordHash,
      role: params.role,
      walletAddress: normalizedWalletAddress,
    })
  );

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    walletAddress: user.walletAddress ?? null,
  };
};

export const updateUser = async (
  userId: number,
  params: {
    name?: string;
    email?: string;
    password?: string;
    role?: UserRole;
    walletAddress?: string;
  }
) => {
  const repo = AppDataSource.getRepository(User);
  const existing = await repo.findOne({
    where: { id: userId },
    select: ["id", "email"],
  });

  if (!existing) {
    throw new AppError("User not found", 404);
  }

  const data: Partial<User> = {};

  if (typeof params.name === "string") {
    const name = params.name.trim();
    if (!name) throw new AppError("Nama tidak boleh kosong", 400);
    data.name = name;
  }

  if (typeof params.email === "string") {
    const email = params.email.trim().toLowerCase();
    if (!email) throw new AppError("Email tidak boleh kosong", 400);
    if (email !== existing.email) {
      const emailExists = await repo.findOne({ where: { email } });
      if (emailExists && emailExists.id !== userId) {
        throw new AppError("Email already registered", 400);
      }
    }
    data.email = email;
  }

  if (typeof params.role === "string") {
    if (!Object.values(UserRole).includes(params.role)) {
      throw new AppError("Role tidak valid", 400);
    }
    data.role = params.role;
  }

  if (typeof params.walletAddress === "string") {
    const walletAddress = params.walletAddress.trim();
    if (!walletAddress) {
      data.walletAddress = null;
    } else {
      let normalizedWallet: string;
      try {
        normalizedWallet = getAddress(walletAddress);
      } catch (_error) {
        throw new AppError("Wallet address tidak valid", 400);
      }
      const existingWallet = await repo
        .createQueryBuilder("user")
        .select(["user.id"])
        .where("LOWER(user.walletAddress) = LOWER(:walletAddress)", {
          walletAddress: normalizedWallet,
        })
        .andWhere("user.id <> :userId", { userId })
        .getOne();
      if (existingWallet) {
        throw new AppError("Wallet already registered", 400);
      }
      data.walletAddress = normalizedWallet;
    }
  }

  if (typeof params.password === "string") {
    const password = params.password.trim();
    if (!password) throw new AppError("Password tidak boleh kosong", 400);
    data.passwordHash = await hashPassword(password);
  }

  if (Object.keys(data).length === 0) {
    throw new AppError("Tidak ada data yang diperbarui", 400);
  }

  await repo.update({ id: userId }, data);
  const updated = await repo
    .createQueryBuilder("user")
    .select(userSelect)
    .where("user.id = :id", { id: userId })
    .getOne();

  if (!updated) {
    throw new AppError("User not found", 404);
  }

  return updated;
};

export const deleteUser = async (userId: number) => {
  const repo = AppDataSource.getRepository(User);
  const user = await repo.findOne({ where: { id: userId }, select: ["id"] });
  if (!user) throw new AppError("User not found", 404);

  const petRepo = AppDataSource.getRepository(Pet);
  const medicalRepo = AppDataSource.getRepository(MedicalRecord);
  const correctionRepo = AppDataSource.getRepository(CorrectionRequest);
  const ownershipRepo = AppDataSource.getRepository(OwnershipHistory);
  const notificationRepo = AppDataSource.getRepository(Notification);

  const [
    petsCount,
    clinicRecordsCount,
    verifiedCount,
    correctionsCount,
    reviewsCount,
    ownershipCount,
    notificationCount,
  ] = await Promise.all([
    petRepo.count({ where: { ownerId: userId } }),
    medicalRepo.count({ where: { clinicId: userId } }),
    medicalRepo.count({ where: { verifiedById: userId } }),
    correctionRepo.count({ where: { ownerId: userId } }),
    correctionRepo.count({ where: { reviewedById: userId } }),
    ownershipRepo.count({
      where: [{ fromOwnerId: userId }, { toOwnerId: userId }],
    }),
    notificationRepo.count({ where: { userId } }),
  ]);

  if (
    petsCount > 0 ||
    clinicRecordsCount > 0 ||
    verifiedCount > 0 ||
    correctionsCount > 0 ||
    reviewsCount > 0 ||
    ownershipCount > 0
  ) {
    throw new AppError(
      "Tidak dapat menghapus akun karena masih ada data terkait",
      400
    );
  }

  await AppDataSource.transaction(async (manager) => {
    if (notificationCount > 0) {
      await manager.getRepository(Notification).delete({ userId });
    }
    await manager.getRepository(User).delete({ id: userId });
  });

  return { message: "Akun berhasil dihapus" };
};

export const listAllPets = async (params?: { search?: string }) => {
  const repo = AppDataSource.getRepository(Pet);
  const qb = repo
    .createQueryBuilder("pet")
    .leftJoin("pet.owner", "owner")
    .select(["pet", "owner.id", "owner.name", "owner.email"])
    .orderBy("pet.createdAt", "DESC");

  if (params?.search) {
    const search = `%${params.search}%`;
    qb.where(
      "(pet.name ILIKE :search OR pet.publicId ILIKE :search OR owner.name ILIKE :search)",
      { search }
    );
  }

  return qb.getMany();
};
