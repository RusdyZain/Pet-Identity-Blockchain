import bcrypt from "bcryptjs";

// Jumlah round hash bcrypt agar cukup aman.
const SALT_ROUNDS = 10;

// Hash password sebelum disimpan ke database.
export const hashPassword = async (plain: string) => {
  return bcrypt.hash(plain, SALT_ROUNDS);
};

// Bandingkan password input dengan hash di database.
export const comparePassword = async (plain: string, hash: string) => {
  return bcrypt.compare(plain, hash);
};
