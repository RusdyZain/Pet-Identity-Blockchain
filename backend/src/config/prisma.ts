import { PrismaClient } from "@prisma/client";

// Instance Prisma dipakai untuk seluruh query database.
export const prisma = new PrismaClient();

// Helper koneksi eksplisit saat server start.
export const connectPrisma = async () => {
  await prisma.$connect();
};
