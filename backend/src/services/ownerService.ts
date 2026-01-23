import { UserRole } from "../types/enums";
import { AppDataSource } from "../config/dataSource";
import { User } from "../entities/User";
import { Pet } from "../entities/Pet";
import { CorrectionRequest } from "../entities/CorrectionRequest";
import { OwnershipHistory } from "../entities/OwnershipHistory";
import { Notification } from "../entities/Notification";
import { AppError } from "../utils/errors";
import { hashPassword } from "../utils/password";

const ownerSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  walletAddress: true,
};

// Ambil data akun owner berdasarkan userId.
export const getOwnerProfile = async (userId: number) => {
  const owner = await AppDataSource.getRepository(User).findOne({
    where: { id: userId, role: UserRole.OWNER },
    select: ownerSelect,
  });

  if (!owner) {
    throw new AppError("Owner not found", 404);
  }

  return owner;
};

// Update data akun owner (nama, email, password).
export const updateOwnerProfile = async (params: {
  userId: number;
  name?: string;
  email?: string;
  password?: string;
}) => {
  const { userId, name, email, password } = params;
  if (!name && !email && !password) {
    throw new AppError("Tidak ada data yang diperbarui", 400);
  }

  const userRepo = AppDataSource.getRepository(User);
  const owner = await userRepo.findOne({
    where: { id: userId, role: UserRole.OWNER },
    select: { id: true, email: true },
  });

  if (!owner) {
    throw new AppError("Owner not found", 404);
  }

  const data: Partial<User> = {};

  if (typeof name === "string") {
    const trimmedName = name.trim();
    if (!trimmedName) {
      throw new AppError("Nama tidak boleh kosong", 400);
    }
    data.name = trimmedName;
  }

  if (typeof email === "string") {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      throw new AppError("Email tidak boleh kosong", 400);
    }
    if (trimmedEmail !== owner.email) {
      const existing = await userRepo.findOne({
        where: { email: trimmedEmail },
        select: { id: true },
      });
      if (existing && existing.id !== userId) {
        throw new AppError("Email already registered", 400);
      }
    }
    data.email = trimmedEmail;
  }

  if (typeof password === "string") {
    const trimmedPassword = password.trim();
    if (!trimmedPassword) {
      throw new AppError("Password tidak boleh kosong", 400);
    }
    data.passwordHash = await hashPassword(trimmedPassword);
  }

  await userRepo.update({ id: userId }, data);
  const updated = await userRepo.findOne({
    where: { id: userId },
    select: ownerSelect,
  });
  if (!updated) {
    throw new AppError("Owner not found", 404);
  }
  return updated;
};

// Hapus akun owner jika tidak memiliki data terkait.
export const deleteOwnerProfile = async (userId: number) => {
  const userRepo = AppDataSource.getRepository(User);
  const owner = await userRepo.findOne({
    where: { id: userId, role: UserRole.OWNER },
    select: { id: true },
  });

  if (!owner) {
    throw new AppError("Owner not found", 404);
  }

  const petRepo = AppDataSource.getRepository(Pet);
  const correctionRepo = AppDataSource.getRepository(CorrectionRequest);
  const historyRepo = AppDataSource.getRepository(OwnershipHistory);

  const [petCount, correctionCount, ownershipCount] = await Promise.all([
    petRepo.count({ where: { ownerId: userId } }),
    correctionRepo.count({ where: { ownerId: userId } }),
    historyRepo.count({
      where: [{ fromOwnerId: userId }, { toOwnerId: userId }],
    }),
  ]);

  if (petCount > 0 || correctionCount > 0 || ownershipCount > 0) {
    throw new AppError(
      "Tidak dapat menghapus akun karena masih ada data terkait",
      400
    );
  }

  await AppDataSource.transaction(async (manager) => {
    await manager
      .getRepository(Notification)
      .delete({ userId });
    await manager.getRepository(User).delete({ id: userId });
  });

  return { message: "Akun berhasil dihapus" };
};
