export type WalletChallengeConsumeStatus =
  | "consumed"
  | "missing"
  | "expired"
  | "mismatch";

export type WalletChallengeRecord = {
  walletAddress: string;
  message: string;
  expiresAt: Date;
};

export type ConsumeWalletChallengeInput = {
  walletAddress: string;
  message: string;
  now?: Date;
};

export interface WalletChallengeStore {
  saveChallenge(record: WalletChallengeRecord): Promise<void>;
  consumeChallenge(
    input: ConsumeWalletChallengeInput
  ): Promise<WalletChallengeConsumeStatus>;
  cleanupExpired(now?: Date): Promise<void>;
}
