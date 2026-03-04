import { Request, Response, NextFunction } from "express";
import {
  listCorrections,
  prepareCorrectionReview,
  reviewCorrection,
} from "../services/correctionService";
import { AppError } from "../utils/errors";
import { CorrectionStatus } from "../types/enums";
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

export const prepareReviewCorrectionController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) throw new AppError("Unauthorized", 401);
    const correctionId = Number(req.params.id);
    if (!Number.isInteger(correctionId)) {
      throw new AppError("Invalid correction id", 400);
    }
    const { status } = req.body;
    if (!status) throw new AppError("Status wajib diisi", 400);

    const payload = await prepareCorrectionReview({
      correctionId,
      status: status as CorrectionStatus,
    });
    res.json(payload);
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
    if (!Number.isInteger(correctionId)) {
      throw new AppError("Invalid correction id", 400);
    }
    const { status, reason, txHash } = req.body;
    if (!status) throw new AppError("Status wajib diisi", 400);

    const walletAddress = req.user.walletAddress;
    await ensureUserWalletAddress(req.user.id, walletAddress);

    const updated = await reviewCorrection({
      correctionId,
      reviewerId: req.user.id,
      reviewerWalletAddress: walletAddress,
      status: status as CorrectionStatus,
      txHash,
      reason,
    });
    res.json(updated);
  } catch (error) {
    next(error);
  }
};
