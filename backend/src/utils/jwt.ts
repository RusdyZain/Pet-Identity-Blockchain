import { Secret, SignOptions, sign, verify } from "jsonwebtoken";
import type { StringValue } from "ms";
import { ENV } from "../config/env";

// Payload minimal yang disimpan di JWT.
export interface JwtPayload {
  userId: number;
  role: string;
}

// Secret diambil dari ENV (fallback jika belum diset).
const secret: Secret = (ENV.jwtSecret || "changeme") as Secret;

// Buat token JWT dengan masa berlaku tertentu.
export const signJwt = (
  payload: JwtPayload,
  expiresIn: StringValue | number = "12h"
) => {
  const options: SignOptions = { expiresIn };
  return sign(payload, secret, options);
};

// Validasi token JWT dan kembalikan payload.
export const verifyJwt = (token: string) => {
  return verify(token, secret) as JwtPayload;
};
