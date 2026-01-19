import { Request, Response, NextFunction } from "express";
import {
  listCorrections,
  reviewCorrection,
} from "../services/correctionService";
import { AppError } from "../utils/errors";
import { CorrectionStatus } from "@prisma/client";
import { getBackendWalletAddress } from "../blockchain/petIdentityClient";
import { ensureUserWalletAddress } from "../services/userWalletService";

// Handler list koreksi data.
export const listCorrectionsController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) throw new AppError("Unauthorized", 401);
    const status = req.query.status as CorrectionStatus | undefined;
    const corrections = await listCorrections(status);
    res.json(corrections);
  } catch (error) {
    next(error);
  }
};

// Handler review koreksi (approve/reject).
export const reviewCorrectionController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) throw new AppError("Unauthorized", 401);
    const correctionId = Number(req.params.id);
    const { status, reason } = req.body;
    if (!status) throw new AppError("Status wajib diisi", 400);

    const walletAddress = getBackendWalletAddress();
    await ensureUserWalletAddress(req.user.id, walletAddress);

    const updated = await reviewCorrection({
      correctionId,
      reviewerId: req.user.id,
      status: status as CorrectionStatus,
      reason,
    });
    res.json(updated);
  } catch (error) {
    next(error);
  }
};
