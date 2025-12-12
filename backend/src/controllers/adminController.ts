import { NextFunction, Request, Response } from "express";
import { getAdminSummary } from "../services/statsService";

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
