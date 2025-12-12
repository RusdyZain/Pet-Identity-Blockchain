import { Secret, SignOptions, sign, verify } from "jsonwebtoken";
import type { StringValue } from "ms";
import { ENV } from "../config/env";

export interface JwtPayload {
  userId: number;
  role: string;
}

const secret: Secret = (ENV.jwtSecret || "changeme") as Secret;

export const signJwt = (
  payload: JwtPayload,
  expiresIn: StringValue | number = "12h"
) => {
  const options: SignOptions = { expiresIn };
  return sign(payload, secret, options);
};

export const verifyJwt = (token: string) => {
  return verify(token, secret) as JwtPayload;
};
