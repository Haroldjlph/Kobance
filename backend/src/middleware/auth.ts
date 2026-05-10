import type { NextFunction, Request, Response } from "express";
import { verifyAuthToken } from "../utils/jwt.js";

export type AuthenticatedRequest = Request & {
  user: {
    id: string;
  };
};

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authorization = req.header("Authorization");
  const token = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : null;

  if (!token) {
    res.status(401).json({ message: "Authentification requise." });
    return;
  }

  try {
    const payload = verifyAuthToken(token);
    (req as AuthenticatedRequest).user = {
      id: payload.userId
    };
    next();
  } catch {
    res.status(401).json({ message: "Session invalide ou expiree." });
  }
}

export function getAuthUserId(req: Request) {
  return (req as unknown as AuthenticatedRequest).user.id;
}
