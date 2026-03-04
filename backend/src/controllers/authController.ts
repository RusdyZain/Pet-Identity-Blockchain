import { Request, Response, NextFunction } from "express";
import {
  createWalletChallenge,
  registerUser,
  loginUser,
} from "../services/authService";
import { UserRole } from "../types/enums";
import { AppError } from "../utils/errors";

export const walletChallenge = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { walletAddress } = req.body;
    if (!walletAddress) {
      throw new AppError("walletAddress is required", 400);
    }
    const challenge = createWalletChallenge(walletAddress);
    res.json(challenge);
  } catch (error) {
    next(error);
  }
};

// Handler registrasi user baru.
export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { name, email, role, walletAddress, message, signature } = req.body;
    if (!name || !email || !role || !walletAddress || !message || !signature) {
      throw new AppError("Missing required fields", 400);
    }

    const user = await registerUser({
      name,
      email,
      role: role as UserRole,
      walletAddress,
      message,
      signature,
    });

    res.status(201).json(user);
  } catch (error) {
    next(error);
  }
};

// Handler login user.
export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { walletAddress, message, signature } = req.body;
    if (!walletAddress || !message || !signature) {
      throw new AppError("Missing credentials", 400);
    }

    const result = await loginUser({ walletAddress, message, signature });
    res.json(result);
  } catch (error) {
    next(error);
  }
};
