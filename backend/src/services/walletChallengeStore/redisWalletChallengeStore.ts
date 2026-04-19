import { createClient } from "redis";
import type {
  ConsumeWalletChallengeInput,
  WalletChallengeConsumeStatus,
  WalletChallengeRecord,
  WalletChallengeStore,
} from "./types";

const CONSUME_CHALLENGE_SCRIPT = `
local value = redis.call("GET", KEYS[1])
if not value then
  return 0
end

local ok, payload = pcall(cjson.decode, value)
if not ok then
  redis.call("DEL", KEYS[1])
  return 0
end

if payload["message"] ~= ARGV[1] then
  return 3
end

local expiresAtMs = tonumber(payload["expiresAtMs"])
local nowMs = tonumber(ARGV[2])
if not expiresAtMs or expiresAtMs <= nowMs then
  redis.call("DEL", KEYS[1])
  return 2
end

redis.call("DEL", KEYS[1])
return 1
`;

type RedisWalletChallengeStoreOptions = {
  redisUrl: string;
  keyPrefix: string;
  connectTimeoutMs: number;
};

export class RedisWalletChallengeStore implements WalletChallengeStore {
  private readonly client: ReturnType<typeof createClient>;
  private readonly keyPrefix: string;

  private constructor(
    client: ReturnType<typeof createClient>,
    keyPrefix: string
  ) {
    this.client = client;
    this.keyPrefix = keyPrefix;
  }

  static async create(
    options: RedisWalletChallengeStoreOptions
  ): Promise<RedisWalletChallengeStore> {
    const client = createClient({
      url: options.redisUrl,
      socket: {
        connectTimeout: options.connectTimeoutMs,
      },
    });

    client.on("error", (error) => {
      // eslint-disable-next-line no-console
      console.warn("[wallet-challenge] Redis client error:", error.message);
    });

    await client.connect();
    await client.ping();

    return new RedisWalletChallengeStore(client, options.keyPrefix);
  }

  async saveChallenge(record: WalletChallengeRecord): Promise<void> {
    const nowMs = Date.now();
    const expiresAtMs = record.expiresAt.getTime();
    const ttlMs = Math.max(expiresAtMs - nowMs, 1);
    const payload = JSON.stringify({
      message: record.message,
      expiresAtMs,
    });

    await this.client.set(this.buildKey(record.walletAddress), payload, {
      PX: ttlMs,
    });
  }

  async consumeChallenge(
    input: ConsumeWalletChallengeInput
  ): Promise<WalletChallengeConsumeStatus> {
    const result = await this.client.eval(CONSUME_CHALLENGE_SCRIPT, {
      keys: [this.buildKey(input.walletAddress)],
      arguments: [input.message, String((input.now ?? new Date()).getTime())],
    });

    switch (Number(result)) {
      case 1:
        return "consumed";
      case 2:
        return "expired";
      case 3:
        return "mismatch";
      default:
        return "missing";
    }
  }

  async cleanupExpired(_now: Date = new Date()): Promise<void> {
    // Redis key expiry handles TTL cleanup automatically.
  }

  private buildKey(walletAddress: string): string {
    return `${this.keyPrefix}:${walletAddress.toLowerCase()}`;
  }
}
