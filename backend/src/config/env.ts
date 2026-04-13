import dotenv from "dotenv";

// Muat variabel lingkungan dari file .env ke process.env.
dotenv.config();

const parseBooleanEnv = (
  key: string,
  value: string | undefined
): boolean | undefined => {
  if (value === undefined) {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }

  throw new Error(`Invalid boolean env ${key}: ${value}`);
};

const optionalTrim = (value: string | undefined): string | undefined => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

// Konfigurasi aplikasi yang dibaca dari environment.
export const ENV = {
  port: Number(process.env.PORT) || 4000,
  jwtSecret: process.env.JWT_SECRET || "changeme",
  databaseUrl: process.env.DATABASE_URL || "",
  adminSeedEnabled: parseBooleanEnv(
    "ADMIN_SEED_ENABLED",
    process.env.ADMIN_SEED_ENABLED
  ),
  adminSeedName: optionalTrim(process.env.ADMIN_NAME),
  adminSeedEmail: optionalTrim(process.env.ADMIN_EMAIL),
  adminSeedWalletAddress: optionalTrim(process.env.ADMIN_WALLET_ADDRESS),
  adminSeedPassword: optionalTrim(process.env.ADMIN_PASSWORD),
};

// Peringatan awal bila koneksi database belum diset.
if (!ENV.databaseUrl) {
  // eslint-disable-next-line no-console
  console.warn("DATABASE_URL is not set. Database connection may fail.");
}
