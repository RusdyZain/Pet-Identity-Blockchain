import { randomBytes } from "crypto";
import { getAddress, verifyMessage } from "ethers";
import { UserRole } from "../types/enums";
import { AppDataSource } from "../config/dataSource";
import { ENV } from "../config/env";
import { User } from "../entities/User";
import { AppError } from "../utils/errors";
import { hashPassword } from "../utils/password";
import { signJwt } from "../utils/jwt";
import { getWalletChallengeStore } from "./walletChallengeStore";

const SELF_REGISTER_ROLES: UserRole[] = [UserRole.OWNER];
const WALLET_CHALLENGE_TTL_MS = ENV.walletChallengeTtlMs;

const normalizeWalletAddress = (walletAddress: string): string => {
  const candidate = walletAddress?.trim();
  if (!candidate) {
    throw new AppError("walletAddress is required", 400);
  }
  try {
    return getAddress(candidate);
  } catch (_error) {
    throw new AppError("Invalid wallet address", 400);
  }
};

const cleanupExpiredChallenges = async () => {
  const challengeStore = await getWalletChallengeStore();
  await challengeStore.cleanupExpired();
};

const findUserByWalletAddress = async (walletAddress: string) => {
  const userRepo = AppDataSource.getRepository(User);
  return userRepo
    .createQueryBuilder("user")
    .where("LOWER(user.walletAddress) = LOWER(:walletAddress)", {
      walletAddress,
    })
    .getOne();
};

const consumeAndValidateChallenge = async (
  walletAddress: string,
  message: string
) => {
  const challengeStore = await getWalletChallengeStore();
  const consumeStatus = await challengeStore.consumeChallenge({
    walletAddress,
    message,
  });

  if (consumeStatus === "consumed") {
    return;
  }
  if (consumeStatus === "expired") {
    throw new AppError("Wallet challenge expired", 400);
  }
  if (consumeStatus === "mismatch") {
    throw new AppError("Wallet challenge mismatch", 400);
  }

  throw new AppError("Wallet challenge not found or already used", 400);
};

const verifyWalletSignature = async (params: {
  walletAddress: string;
  message: string;
  signature: string;
}) => {
  const walletAddress = normalizeWalletAddress(params.walletAddress);
  const message = params.message?.trim();
  const signature = params.signature?.trim();

  if (!message || !signature) {
    throw new AppError("Missing wallet authentication payload", 400);
  }

  await consumeAndValidateChallenge(walletAddress, message);

  let recoveredAddress: string;
  try {
    recoveredAddress = getAddress(verifyMessage(message, signature));
  } catch (_error) {
    throw new AppError("Invalid wallet signature", 401);
  }

  if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
    throw new AppError("Signature does not match wallet address", 401);
  }

  return walletAddress;
};

export const createWalletChallenge = async (walletAddress: string) => {
  await cleanupExpiredChallenges();
  const normalizedAddress = normalizeWalletAddress(walletAddress);
  const nonce = randomBytes(16).toString("hex");
  const issuedAt = new Date();
  const expiresAt = new Date(issuedAt.getTime() + WALLET_CHALLENGE_TTL_MS);

  const message = [
    "PetIdentity Wallet Authentication",
    `Wallet: ${normalizedAddress}`,
    `Nonce: ${nonce}`,
    `Issued At: ${issuedAt.toISOString()}`,
    `Expires At: ${expiresAt.toISOString()}`,
  ].join("\n");

  const challengeStore = await getWalletChallengeStore();
  await challengeStore.saveChallenge({
    walletAddress: normalizedAddress.toLowerCase(),
    message,
    expiresAt,
  });

  return {
    walletAddress: normalizedAddress,
    message,
    expiresAt: expiresAt.toISOString(),
  };
};

export const registerUser = async (params: {
  name: string;
  email: string;
  role: UserRole;
  walletAddress: string;
  message: string;
  signature: string;
}) => {
  if (!SELF_REGISTER_ROLES.includes(params.role)) {
    throw new AppError("Only OWNER can self-register", 400);
  }

  const name = params.name?.trim();
  if (!name) {
    throw new AppError("Name is required", 400);
  }

  const email = params.email?.trim().toLowerCase();
  if (!email) {
    throw new AppError("Email is required", 400);
  }

  const verifiedWalletAddress = await verifyWalletSignature({
    walletAddress: params.walletAddress,
    message: params.message,
    signature: params.signature,
  });

  const userRepo = AppDataSource.getRepository(User);
  const [existingByEmail, existingByWallet] = await Promise.all([
    userRepo.findOne({ where: { email } }),
    findUserByWalletAddress(verifiedWalletAddress),
  ]);

  if (existingByEmail) {
    throw new AppError("Email already registered", 400);
  }
  if (existingByWallet) {
    throw new AppError("Wallet already registered", 400);
  }

  const passwordHash = await hashPassword(randomBytes(24).toString("hex"));
  const user = await userRepo.save(
    userRepo.create({
      name,
      email,
      passwordHash,
      role: params.role,
      walletAddress: verifiedWalletAddress,
    })
  );

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    walletAddress: user.walletAddress,
  };
};

export const loginUser = async (params: {
  walletAddress: string;
  message: string;
  signature: string;
}) => {
  const verifiedWalletAddress = await verifyWalletSignature({
    walletAddress: params.walletAddress,
    message: params.message,
    signature: params.signature,
  });

  const user = await findUserByWalletAddress(verifiedWalletAddress);
  if (!user) {
    throw new AppError("Wallet is not registered", 404);
  }

  const token = signJwt({
    userId: user.id,
    role: user.role,
    walletAddress: verifiedWalletAddress,
  });

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      walletAddress: user.walletAddress,
    },
  };
};
