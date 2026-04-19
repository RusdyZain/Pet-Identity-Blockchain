import { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/errors";
import { uploadEvidenceFile } from "../services/evidenceStorageService";

const resolveRequestBaseUrl = (req: Request) => {
  const forwardedProto = req.headers["x-forwarded-proto"];
  const firstForwardedProto =
    typeof forwardedProto === "string" && forwardedProto.length > 0
      ? forwardedProto.split(",")[0]?.trim()
      : undefined;
  const protocol =
    firstForwardedProto && firstForwardedProto.length > 0
      ? firstForwardedProto
      : req.protocol;
  const host = req.get("host");
  if (!host) {
    throw new AppError("Unable to resolve request host", 500);
  }
  return `${protocol}://${host}`;
};

export const uploadEvidenceController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) throw new AppError("Unauthorized", 401);
    if (!req.file) {
      throw new AppError("File is required", 400);
    }

    const result = await uploadEvidenceFile({
      file: req.file,
      requestBaseUrl: resolveRequestBaseUrl(req),
    });
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};
