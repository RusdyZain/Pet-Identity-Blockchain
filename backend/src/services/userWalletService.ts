import { prisma } from "../config/prisma";
import { AppError } from "../utils/errors";

export const ensureUserWalletAddress = async (
  userId: number,
  walletAddress: string
) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { walletAddress: true },
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

  await prisma.user.update({
    where: { id: userId },
    data: { walletAddress },
  });
};
