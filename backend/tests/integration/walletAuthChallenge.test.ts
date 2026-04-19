import "reflect-metadata";
import type { DataSource } from "typeorm";
import { Wallet } from "ethers";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { UserRole } from "../../src/types/enums";

process.env.WALLET_CHALLENGE_STORE = "database";

let dataSource: DataSource;
let createWalletChallenge: (
  walletAddress: string
) => Promise<{ walletAddress: string; message: string; expiresAt: string }>;
let registerUser: (params: {
  name: string;
  email: string;
  role: UserRole;
  walletAddress: string;
  message: string;
  signature: string;
}) => Promise<unknown>;
let loginUser: (params: {
  walletAddress: string;
  message: string;
  signature: string;
}) => Promise<{ token: string; user: unknown }>;

const registerWalletUser = async (params: {
  wallet: Wallet;
  name: string;
  email: string;
}) => {
  const challenge = await createWalletChallenge(params.wallet.address);
  const signature = await params.wallet.signMessage(challenge.message);

  await registerUser({
    name: params.name,
    email: params.email,
    role: UserRole.OWNER,
    walletAddress: params.wallet.address,
    message: challenge.message,
    signature,
  });
};

describe("Wallet challenge auth storage flow", () => {
  beforeAll(async () => {
    const [
      { AppDataSource },
      { ensureSchema },
      { resetWalletChallengeStoreForTesting },
      authServiceModule,
    ] = await Promise.all([
      import("../../src/config/dataSource"),
      import("../../src/config/ensureSchema"),
      import("../../src/services/walletChallengeStore"),
      import("../../src/services/authService"),
    ]);

    dataSource = AppDataSource;
    createWalletChallenge = authServiceModule.createWalletChallenge;
    registerUser = authServiceModule.registerUser;
    loginUser = authServiceModule.loginUser;

    resetWalletChallengeStoreForTesting();

    if (!dataSource.isInitialized) {
      await dataSource.initialize();
    }
    await ensureSchema();
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.destroy();
    }
  });

  it("creates challenge with unique nonce", async () => {
    const wallet = Wallet.createRandom();

    const first = await createWalletChallenge(wallet.address);
    const second = await createWalletChallenge(wallet.address);

    expect(first.walletAddress).toBe(wallet.address);
    expect(first.message).toContain(`Wallet: ${wallet.address}`);
    expect(first.message).toMatch(/Nonce: [0-9a-f]{32}/);
    expect(first.message).not.toBe(second.message);
    expect(new Date(first.expiresAt).getTime()).toBeGreaterThan(Date.now());
  });

  it("rejects expired challenge on login", async () => {
    const wallet = Wallet.createRandom();
    const challenge = await createWalletChallenge(wallet.address);

    await dataSource.query(
      `UPDATE "wallet_challenges"
       SET "expires_at" = NOW() - INTERVAL '1 second'
       WHERE "wallet_address" = $1`,
      [wallet.address.toLowerCase()]
    );

    const signature = await wallet.signMessage(challenge.message);
    await expect(
      loginUser({
        walletAddress: wallet.address,
        message: challenge.message,
        signature,
      })
    ).rejects.toMatchObject({
      message: "Wallet challenge expired",
    });
  });

  it("rejects reused challenge", async () => {
    const suffix = `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
    const wallet = Wallet.createRandom();
    await registerWalletUser({
      wallet,
      name: "Challenge User",
      email: `challenge.user.${suffix}@example.com`,
    });

    const challenge = await createWalletChallenge(wallet.address);
    const signature = await wallet.signMessage(challenge.message);

    const firstLogin = await loginUser({
      walletAddress: wallet.address,
      message: challenge.message,
      signature,
    });
    expect(firstLogin.token).toBeTruthy();

    await expect(
      loginUser({
        walletAddress: wallet.address,
        message: challenge.message,
        signature,
      })
    ).rejects.toMatchObject({
      message: "Wallet challenge not found or already used",
    });
  });
});
