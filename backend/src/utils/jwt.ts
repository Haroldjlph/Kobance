import jwt, { type JwtPayload } from "jsonwebtoken";
import { env } from "../config/env.js";

const tokenDuration = "7d";

export type AuthTokenPayload = {
  userId: string;
};

export function signAuthToken(payload: AuthTokenPayload) {
  return jwt.sign(payload, env.jwtSecret, {
    expiresIn: tokenDuration
  });
}

export function verifyAuthToken(token: string) {
  const payload = jwt.verify(token, env.jwtSecret) as JwtPayload;

  if (typeof payload.userId !== "string") {
    throw new Error("Token invalide.");
  }

  return {
    userId: payload.userId
  };
}
