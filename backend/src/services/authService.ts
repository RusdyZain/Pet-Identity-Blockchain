import { UserRole } from "../types/enums";
import { AppDataSource } from "../config/dataSource";
import { User } from "../entities/User";
import { AppError } from "../utils/errors";
import { hashPassword, comparePassword } from "../utils/password";
import { signJwt } from "../utils/jwt";
import { getBackendWalletAddress } from "../blockchain/petIdentityClient";

// Role yang diizinkan untuk daftar mandiri.
const SELF_REGISTER_ROLES: UserRole[] = [UserRole.OWNER, UserRole.CLINIC];

// Registrasi user baru (hanya OWNER/CLINIC).
export const registerUser = async (params: {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}) => {
  if (!SELF_REGISTER_ROLES.includes(params.role)) {
    throw new AppError("Only OWNER or CLINIC can self-register", 400);
  }

  const email = params.email.toLowerCase();
  const userRepo = AppDataSource.getRepository(User);

  const existing = await userRepo.findOne({ where: { email } });
  if (existing) {
    throw new AppError("Email already registered", 400);
  }

  const passwordHash = await hashPassword(params.password);
  const walletAddress = getBackendWalletAddress();
  const user = await userRepo.save(
    userRepo.create({
      name: params.name,
      email,
      passwordHash,
      role: params.role,
      walletAddress,
    })
  );

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
};

// Login user dan hasilkan token + data profil.
export const loginUser = async (params: {
  email: string;
  password: string;
}) => {
  const email = params.email.toLowerCase();
  const userRepo = AppDataSource.getRepository(User);
  const user = await userRepo
    .createQueryBuilder("user")
    .addSelect("user.passwordHash")
    .where("user.email = :email", { email })
    .getOne();

  if (!user) {
    throw new AppError("Invalid credentials", 401);
  }

  const isValid = await comparePassword(params.password, user.passwordHash);
  if (!isValid) {
    throw new AppError("Invalid credentials", 401);
  }

  const token = signJwt({ userId: user.id, role: user.role });

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
};
