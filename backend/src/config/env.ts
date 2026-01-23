import dotenv from "dotenv";

// Muat variabel lingkungan dari file .env ke process.env.
dotenv.config();

// Konfigurasi aplikasi yang dibaca dari environment.
export const ENV = {
  port: Number(process.env.PORT) || 4000,
  jwtSecret: process.env.JWT_SECRET || "changeme",
  databaseUrl: process.env.DATABASE_URL || "",
};

// Peringatan awal bila koneksi database belum diset.
if (!ENV.databaseUrl) {
  // eslint-disable-next-line no-console
  console.warn("DATABASE_URL is not set. Database connection may fail.");
}
