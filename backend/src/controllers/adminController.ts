import { NextFunction, Request, Response } from "express";
import { getAdminSummary } from "../services/statsService";
import {
  createUser,
  deleteUser,
  listAllPets,
  listUsers,
  updateUser,
} from "../services/adminService";
import { AppError } from "../utils/errors";
import { UserRole } from "../types/enums";

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

// Handler list akun user (semua role).
export const listUsersController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const roleParam =
      typeof req.query.role === "string" ? req.query.role : undefined;
    const search =
      typeof req.query.search === "string" && req.query.search.length > 0
        ? req.query.search
        : undefined;

    let role: UserRole | undefined;
    if (roleParam) {
      if (!Object.values(UserRole).includes(roleParam as UserRole)) {
        throw new AppError("Role tidak valid", 400);
      }
      role = roleParam as UserRole;
    }

    const params: { role?: UserRole; search?: string } = {};
    if (role) params.role = role;
    if (search) params.search = search;
    const users = await listUsers(params);
    res.json(users);
  } catch (error) {
    next(error);
  }
};

// Handler membuat akun user baru.
export const createUserController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password || !role) {
      throw new AppError("Missing required fields", 400);
    }
    const user = await createUser({
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

// Handler update akun user.
export const updateUserController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = Number(req.params.id);
    if (!Number.isInteger(userId)) {
      throw new AppError("Invalid user id", 400);
    }
    const { name, email, password, role } = req.body;
    const params: {
      name?: string;
      email?: string;
      password?: string;
      role?: UserRole;
    } = {};
    if (name !== undefined) params.name = name;
    if (email !== undefined) params.email = email;
    if (password !== undefined) params.password = password;
    if (role !== undefined) params.role = role as UserRole;
    const user = await updateUser(userId, params);
    res.json(user);
  } catch (error) {
    next(error);
  }
};

// Handler hapus akun user.
export const deleteUserController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = Number(req.params.id);
    if (!Number.isInteger(userId)) {
      throw new AppError("Invalid user id", 400);
    }
    if (req.user && req.user.id === userId) {
      throw new AppError("Tidak bisa menghapus akun sendiri", 400);
    }
    const result = await deleteUser(userId);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

// Handler list semua hewan terdaftar.
export const listAllPetsController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const search =
      typeof req.query.search === "string" && req.query.search.length > 0
        ? req.query.search
        : undefined;
    const params: { search?: string } = {};
    if (search) params.search = search;
    const pets = await listAllPets(params);
    res.json(pets);
  } catch (error) {
    next(error);
  }
};
