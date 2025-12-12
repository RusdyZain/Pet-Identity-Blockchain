import { Request, Response, NextFunction } from "express";
import {
  listCorrections,
  reviewCorrection,
} from "../services/correctionService";
import { AppError } from "../utils/errors";
import { CorrectionStatus } from "@prisma/client";

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
