import { NextFunction, Request, Response } from "express";
import { verifyJwt } from "../utils/jwt";
import { AppError } from "../utils/errors";

// Middleware autentikasi: memvalidasi JWT dan set req.user.
export const authenticate =
  (options: { optional?: boolean } = {}) =>
  (req: Request, _res: Response, next: NextFunction) => {
    const header = req.headers.authorization;
    if (!header) {
      if (options.optional) return next();
      return next(new AppError("Unauthorized", 401));
    }

    const token = header.startsWith("Bearer ") ? header.slice(7) : header;
    try {
      const payload = verifyJwt(token);
      req.user = { id: payload.userId, role: payload.role as any };
      return next();
    } catch (_err) {
      if (options.optional) return next();
      return next(new AppError("Invalid token", 401));
    }
  };

// Middleware otorisasi: membatasi akses berdasarkan role.
export const authorize = (roles: string[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError("Unauthorized", 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(new AppError("Forbidden", 403));
    }

    return next();
  };
};
