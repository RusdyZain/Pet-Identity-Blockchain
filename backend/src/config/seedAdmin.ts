import { randomBytes } from "crypto";
import { getAddress } from "ethers";
import { ENV } from "./env";
import { AppDataSource } from "./dataSource";
import { User } from "../entities/User";
import { UserRole } from "../types/enums";
import { hashPassword } from "../utils/password";

const hasAdminSeedConfig = () =>
  Boolean(
    ENV.adminSeedName ||
      ENV.adminSeedEmail ||
      ENV.adminSeedWalletAddress ||
      ENV.adminSeedPassword
  );

// Seed akun admin dari ENV saat startup agar bootstrap tidak perlu SQL manual.
export const seedAdminFromEnv = async () => {
  const enabled = ENV.adminSeedEnabled ?? hasAdminSeedConfig();
  if (!enabled) {
    return;
  }

  const email = ENV.adminSeedEmail?.toLowerCase();
  const walletAddress = ENV.adminSeedWalletAddress;
  const name = ENV.adminSeedName ?? "Admin";
  const password = ENV.adminSeedPassword;

  if (!email) {
    throw new Error("ADMIN_EMAIL is required when admin seeding is enabled");
  }
  if (!walletAddress) {
    throw new Error(
      "ADMIN_WALLET_ADDRESS is required when admin seeding is enabled"
    );
  }

  let normalizedWalletAddress: string;
  try {
    normalizedWalletAddress = getAddress(walletAddress);
  } catch (_error) {
    throw new Error("ADMIN_WALLET_ADDRESS is not a valid wallet address");
  }

  const repo = AppDataSource.getRepository(User);
  const [existingByEmail, existingByWallet] = await Promise.all([
    repo.findOne({
      where: { email },
      select: ["id", "email", "name", "role", "walletAddress"],
    }),
    repo
      .createQueryBuilder("user")
      .select(["user.id", "user.email", "user.name", "user.role", "user.walletAddress"])
      .where('LOWER(user.walletAddress) = LOWER(:walletAddress)', {
        walletAddress: normalizedWalletAddress,
      })
      .getOne(),
  ]);

  if (
    existingByWallet &&
    existingByEmail &&
    existingByWallet.id !== existingByEmail.id
  ) {
    throw new Error(
      `Admin seed conflict: wallet ${normalizedWalletAddress} is already used by ${existingByWallet.email}`
    );
  }

  if (existingByWallet && !existingByEmail) {
    throw new Error(
      `Admin seed conflict: wallet ${normalizedWalletAddress} is already registered under ${existingByWallet.email}. Set ADMIN_EMAIL to that account or use another wallet.`
    );
  }

  if (existingByEmail) {
    const updateData: Partial<User> = {};

    if (existingByEmail.role !== UserRole.ADMIN) {
      updateData.role = UserRole.ADMIN;
    }

    if (
      (existingByEmail.walletAddress ?? "").toLowerCase() !==
      normalizedWalletAddress.toLowerCase()
    ) {
      updateData.walletAddress = normalizedWalletAddress;
    }

    if (existingByEmail.name !== name) {
      updateData.name = name;
    }

    if (password) {
      updateData.passwordHash = await hashPassword(password);
    }

    if (Object.keys(updateData).length > 0) {
      await repo.update({ id: existingByEmail.id }, updateData);
    }

    console.log(`[seed-admin] Admin synced for ${email}`);
    return;
  }

  const initialPassword = password || randomBytes(24).toString("hex");
  const passwordHash = await hashPassword(initialPassword);

  await repo.save(
    repo.create({
      name,
      email,
      role: UserRole.ADMIN,
      walletAddress: normalizedWalletAddress,
      passwordHash,
    })
  );

  console.log(`[seed-admin] Admin created for ${email}`);
};
