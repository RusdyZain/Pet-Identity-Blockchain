import { AppDataSource } from "../config/dataSource";
import { User } from "../entities/User";
import { AppError } from "../utils/errors";

export const ensureUserWalletAddress = async (
  userId: number,
  walletAddress: string
) => {
  const userRepo = AppDataSource.getRepository(User);
  const user = await userRepo.findOne({
    where: { id: userId },
    select: { id: true, walletAddress: true },
  });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  if (user.walletAddress) {
    if (user.walletAddress.toLowerCase() !== walletAddress.toLowerCase()) {
      throw new AppError("Wallet address mismatch", 400);
    }
    return;
  }

  await userRepo.update({ id: userId }, { walletAddress });
};
