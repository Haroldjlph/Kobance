import bcrypt from "bcryptjs";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";
import { signAuthToken } from "../utils/jwt.js";

const router = Router();

const registerSchema = z.object({
  email: z.string().email("Email invalide.").trim().toLowerCase(),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caracteres."),
  name: z.string().trim().min(1).optional()
});

const loginSchema = z.object({
  email: z.string().email("Email invalide.").trim().toLowerCase(),
  password: z.string().min(1, "Mot de passe requis.")
});

function sanitizeUser(user: { id: string; email: string; name: string | null }) {
  return {
    id: user.id,
    email: user.email,
    name: user.name
  };
}

router.post("/register", async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);

    const existingUser = await prisma.user.findUnique({
      where: { email: data.email }
    });

    if (existingUser) {
      res.status(409).json({ message: "Un compte existe deja avec cet email." });
      return;
    }

    const passwordHash = await bcrypt.hash(data.password, 12);

    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        name: data.name
      },
      select: {
        id: true,
        email: true,
        name: true
      }
    });

    const token = signAuthToken({ userId: user.id });

    res.status(201).json({
      token,
      user: sanitizeUser(user)
    });
  } catch (error) {
    next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const data = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email: data.email }
    });

    if (!user) {
      res.status(401).json({ message: "Identifiants invalides." });
      return;
    }

    const passwordMatches = await bcrypt.compare(data.password, user.passwordHash);

    if (!passwordMatches) {
      res.status(401).json({ message: "Identifiants invalides." });
      return;
    }

    const token = signAuthToken({ userId: user.id });

    res.json({
      token,
      user: sanitizeUser(user)
    });
  } catch (error) {
    next(error);
  }
});

router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const user = await prisma.user.findUnique({
      where: { id: authReq.user.id },
      select: {
        id: true,
        email: true,
        name: true
      }
    });

    if (!user) {
      res.status(404).json({ message: "Utilisateur introuvable." });
      return;
    }

    res.json({ user: sanitizeUser(user) });
  } catch (error) {
    next(error);
  }
});

export { router as authRouter };

