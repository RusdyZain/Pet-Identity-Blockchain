import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

export const connectPrisma = async () => {
  await prisma.$connect();
};
