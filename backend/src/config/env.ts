import dotenv from 'dotenv';

dotenv.config();

export const ENV = {
  port: Number(process.env.PORT) || 4000,
  jwtSecret: process.env.JWT_SECRET || 'changeme',
  databaseUrl: process.env.DATABASE_URL || '',
};

if (!ENV.databaseUrl) {
  // eslint-disable-next-line no-console
  console.warn('DATABASE_URL is not set. Prisma may fail to connect.');
}
