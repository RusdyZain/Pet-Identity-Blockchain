import { NextFunction, Request, Response } from "express";
import { getAdminSummary } from "../services/statsService";

// Handler ringkasan statistik untuk admin.
export const adminSummaryController = async (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const summary = await getAdminSummary();
    res.json(summary);
  } catch (error) {
    next(error);
  }
};
