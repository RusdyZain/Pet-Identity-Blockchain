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

const parseNumberEnv = (
  key: string,
  value: string | undefined
): number | undefined => {
  if (value === undefined) {
    return undefined;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid number env ${key}: ${value}`);
  }
  return parsed;
};

const parsePositiveNumberEnv = (
  key: string,
  value: string | undefined
): number | undefined => {
  const parsed = parseNumberEnv(key, value);
  if (parsed === undefined) {
    return undefined;
  }
  if (parsed <= 0) {
    throw new Error(`Invalid positive number env ${key}: ${value}`);
  }
  return parsed;
};

const parseWalletChallengeStore = (
  value: string | undefined
): "auto" | "redis" | "database" => {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) {
    return "auto";
  }

  if (
    normalized === "auto" ||
    normalized === "redis" ||
    normalized === "database"
  ) {
    return normalized;
  }

  throw new Error(`Invalid WALLET_CHALLENGE_STORE: ${value}`);
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
  evidenceStorageDriver:
    optionalTrim(process.env.EVIDENCE_STORAGE_DRIVER)?.toLowerCase() ?? "local",
  evidenceStoragePath:
    optionalTrim(process.env.EVIDENCE_STORAGE_PATH) ?? "uploads/evidence",
  evidencePublicBaseUrl: optionalTrim(process.env.EVIDENCE_PUBLIC_BASE_URL),
  ipfsApiUrl: optionalTrim(process.env.IPFS_API_URL),
  ipfsBearerToken: optionalTrim(process.env.IPFS_BEARER_TOKEN),
  ipfsGatewayBaseUrl:
    optionalTrim(process.env.IPFS_GATEWAY_BASE_URL) ?? "https://ipfs.io/ipfs",
  vaccineReminderEnabled:
    parseBooleanEnv(
      "VACCINE_REMINDER_ENABLED",
      process.env.VACCINE_REMINDER_ENABLED
    ) ?? true,
  vaccineReminderIntervalMs:
    parseNumberEnv(
      "VACCINE_REMINDER_INTERVAL_MS",
      process.env.VACCINE_REMINDER_INTERVAL_MS
    ) ?? 6 * 60 * 60 * 1000,
  vaccineReminderDueAfterDays:
    parseNumberEnv(
      "VACCINE_REMINDER_DUE_AFTER_DAYS",
      process.env.VACCINE_REMINDER_DUE_AFTER_DAYS
    ) ?? 365,
  vaccineReminderLookaheadDays:
    parseNumberEnv(
      "VACCINE_REMINDER_LOOKAHEAD_DAYS",
      process.env.VACCINE_REMINDER_LOOKAHEAD_DAYS
    ) ?? 14,
  vaccineReminderOverdueLookbackDays:
    parseNumberEnv(
      "VACCINE_REMINDER_OVERDUE_LOOKBACK_DAYS",
      process.env.VACCINE_REMINDER_OVERDUE_LOOKBACK_DAYS
    ) ?? 30,
  walletChallengeStore: parseWalletChallengeStore(
    process.env.WALLET_CHALLENGE_STORE
  ),
  walletChallengeTtlMs:
    parsePositiveNumberEnv(
      "WALLET_CHALLENGE_TTL_MS",
      process.env.WALLET_CHALLENGE_TTL_MS
    ) ?? 5 * 60 * 1000,
  redisUrl: optionalTrim(process.env.REDIS_URL),
  walletChallengeRedisKeyPrefix:
    optionalTrim(process.env.WALLET_CHALLENGE_REDIS_KEY_PREFIX) ??
    "wallet_challenge",
  walletChallengeRedisConnectTimeoutMs:
    parsePositiveNumberEnv(
      "WALLET_CHALLENGE_REDIS_CONNECT_TIMEOUT_MS",
      process.env.WALLET_CHALLENGE_REDIS_CONNECT_TIMEOUT_MS
    ) ?? 1000,
};

// Peringatan awal bila koneksi database belum diset.
if (!ENV.databaseUrl) {
  // eslint-disable-next-line no-console
  console.warn("DATABASE_URL is not set. Database connection may fail.");
}
