import { Request, Response, NextFunction } from "express";
import {
  deleteOwnerProfile,
  getOwnerProfile,
  updateOwnerProfile,
} from "../services/ownerService";
import { AppError } from "../utils/errors";

// Handler ambil profil akun owner.
export const getOwnerProfileController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) throw new AppError("Unauthorized", 401);
    const owner = await getOwnerProfile(req.user.id);
    res.json(owner);
  } catch (error) {
    next(error);
  }
};

// Handler update data akun owner.
export const updateOwnerProfileController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) throw new AppError("Unauthorized", 401);
    const { name, email, password } = req.body;
    const owner = await updateOwnerProfile({
      userId: req.user.id,
      name,
      email,
      password,
    });
    res.json(owner);
  } catch (error) {
    next(error);
  }
};

// Handler hapus akun owner.
export const deleteOwnerProfileController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) throw new AppError("Unauthorized", 401);
    const result = await deleteOwnerProfile(req.user.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
};
