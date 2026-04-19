import { ENV } from "../../config/env";
import { DatabaseWalletChallengeStore } from "./databaseWalletChallengeStore";
import { RedisWalletChallengeStore } from "./redisWalletChallengeStore";
import type { WalletChallengeStore } from "./types";

let walletChallengeStorePromise: Promise<WalletChallengeStore> | undefined;

const createWalletChallengeStore = async (): Promise<WalletChallengeStore> => {
  const databaseStore = new DatabaseWalletChallengeStore();

  if (ENV.walletChallengeStore === "database") {
    return databaseStore;
  }

  if (!ENV.redisUrl) {
    if (ENV.walletChallengeStore === "redis") {
      throw new Error(
        "REDIS_URL is required when WALLET_CHALLENGE_STORE=redis"
      );
    }
    return databaseStore;
  }

  try {
    return await RedisWalletChallengeStore.create({
      redisUrl: ENV.redisUrl,
      keyPrefix: ENV.walletChallengeRedisKeyPrefix,
      connectTimeoutMs: ENV.walletChallengeRedisConnectTimeoutMs,
    });
  } catch (error) {
    if (ENV.walletChallengeStore === "redis") {
      throw error;
    }

    // eslint-disable-next-line no-console
    console.warn(
      "[wallet-challenge] Redis store unavailable, fallback to database store.",
      error
    );
    return databaseStore;
  }
};

export const getWalletChallengeStore = async (): Promise<WalletChallengeStore> => {
  if (!walletChallengeStorePromise) {
    walletChallengeStorePromise = createWalletChallengeStore();
  }
  return walletChallengeStorePromise;
};

export const resetWalletChallengeStoreForTesting = () => {
  walletChallengeStorePromise = undefined;
};

export type {
  WalletChallengeConsumeStatus,
  WalletChallengeRecord,
  WalletChallengeStore,
} from "./types";
