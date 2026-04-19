import { AppDataSource } from "../../config/dataSource";
import { WalletChallenge } from "../../entities/WalletChallenge";
import type {
  ConsumeWalletChallengeInput,
  WalletChallengeConsumeStatus,
  WalletChallengeRecord,
  WalletChallengeStore,
} from "./types";

export class DatabaseWalletChallengeStore implements WalletChallengeStore {
  private readonly challengeRepo = AppDataSource.getRepository(WalletChallenge);

  async saveChallenge(record: WalletChallengeRecord): Promise<void> {
    await this.challengeRepo.upsert(
      this.challengeRepo.create({
        walletAddress: record.walletAddress.toLowerCase(),
        message: record.message,
        expiresAt: record.expiresAt,
      }),
      ["walletAddress"]
    );
  }

  async consumeChallenge(
    input: ConsumeWalletChallengeInput
  ): Promise<WalletChallengeConsumeStatus> {
    const now = input.now ?? new Date();
    const walletAddress = input.walletAddress.toLowerCase();
    const challenge = await this.challengeRepo.findOne({
      where: { walletAddress },
    });

    if (!challenge) {
      return "missing";
    }

    if (challenge.expiresAt.getTime() <= now.getTime()) {
      await this.challengeRepo
        .createQueryBuilder()
        .delete()
        .where("wallet_address = :walletAddress", { walletAddress })
        .andWhere("expires_at <= :now", { now })
        .execute();
      return "expired";
    }

    if (challenge.message !== input.message) {
      return "mismatch";
    }

    const consumeResult = await this.challengeRepo
      .createQueryBuilder()
      .delete()
      .where("wallet_address = :walletAddress", { walletAddress })
      .andWhere("message = :message", { message: input.message })
      .andWhere("expires_at > :now", { now })
      .execute();

    return (consumeResult.affected ?? 0) === 1 ? "consumed" : "missing";
  }

  async cleanupExpired(now: Date = new Date()): Promise<void> {
    await this.challengeRepo
      .createQueryBuilder()
      .delete()
      .where("expires_at <= :now", { now })
      .execute();
  }
}
