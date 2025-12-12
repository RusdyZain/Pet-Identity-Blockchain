import { Request, Response, NextFunction } from "express";
import { getTraceByPublicId } from "../services/petService";
import { AppError } from "../utils/errors";

export const traceController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { publicId } = req.params;
    if (!publicId) throw new AppError("publicId required", 400);
    const trace = await getTraceByPublicId(publicId);
    res.json(trace);
  } catch (error) {
    next(error);
  }
};
