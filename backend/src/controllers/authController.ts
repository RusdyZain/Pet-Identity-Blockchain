import { Request, Response, NextFunction } from 'express';
import { registerUser, loginUser } from '../services/authService';
import { UserRole } from '@prisma/client';
import { AppError } from '../utils/errors';

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password || !role) {
      throw new AppError('Missing required fields', 400);
    }

    const user = await registerUser({
      name,
      email,
      password,
      role: role as UserRole,
    });

    res.status(201).json(user);
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      throw new AppError('Missing credentials', 400);
    }

    const result = await loginUser({ email, password });
    res.json(result);
  } catch (error) {
    next(error);
  }
};
