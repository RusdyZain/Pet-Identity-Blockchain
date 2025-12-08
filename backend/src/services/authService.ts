import { UserRole } from '@prisma/client';
import { prisma } from '../config/prisma';
import { AppError } from '../utils/errors';
import { hashPassword, comparePassword } from '../utils/password';
import { signJwt } from '../utils/jwt';

const SELF_REGISTER_ROLES: UserRole[] = [UserRole.OWNER, UserRole.CLINIC];

export const registerUser = async (params: {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}) => {
  if (!SELF_REGISTER_ROLES.includes(params.role)) {
    throw new AppError('Only OWNER or CLINIC can self-register', 400);
  }

  const email = params.email.toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new AppError('Email already registered', 400);
  }

  const passwordHash = await hashPassword(params.password);
  const user = await prisma.user.create({
    data: {
      name: params.name,
      email,
      passwordHash,
      role: params.role,
    },
    select: { id: true, name: true, email: true, role: true },
  });

  return user;
};

export const loginUser = async (params: { email: string; password: string }) => {
  const email = params.email.toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new AppError('Invalid credentials', 401);
  }

  const isValid = await comparePassword(params.password, user.passwordHash);
  if (!isValid) {
    throw new AppError('Invalid credentials', 401);
  }

  const token = signJwt({ userId: user.id, role: user.role });

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
};
