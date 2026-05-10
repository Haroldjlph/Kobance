import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { getAuthUserId, requireAuth } from "../middleware/auth.js";

const router = Router();

const clientSchema = z.object({
  name: z.string().trim().min(1, "Le nom est requis."),
  email: z.string().trim().email("Email invalide.").optional().or(z.literal("")),
  phone: z.string().trim().optional(),
  address: z.string().trim().optional(),
  siret: z.string().trim().optional(),
  vatNumber: z.string().trim().optional()
});

function normalizeOptional(value?: string) {
  return value && value.length > 0 ? value : null;
}

router.use(requireAuth);

router.get("/", async (req, res, next) => {
  try {
    const userId = getAuthUserId(req);
    const clients = await prisma.client.findMany({
      where: { userId },
      orderBy: { name: "asc" }
    });

    res.json({ clients });
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const userId = getAuthUserId(req);
    const data = clientSchema.parse(req.body);

    const client = await prisma.client.create({
      data: {
        userId,
        name: data.name,
        email: normalizeOptional(data.email),
        phone: normalizeOptional(data.phone),
        address: normalizeOptional(data.address),
        siret: normalizeOptional(data.siret),
        vatNumber: normalizeOptional(data.vatNumber)
      }
    });

    res.status(201).json({ client });
  } catch (error) {
    next(error);
  }
});

router.put("/:id", async (req, res, next) => {
  try {
    const userId = getAuthUserId(req);
    const data = clientSchema.parse(req.body);

    const client = await prisma.client.update({
      where: {
        id: req.params.id,
        userId
      },
      data: {
        name: data.name,
        email: normalizeOptional(data.email),
        phone: normalizeOptional(data.phone),
        address: normalizeOptional(data.address),
        siret: normalizeOptional(data.siret),
        vatNumber: normalizeOptional(data.vatNumber)
      }
    });

    res.json({ client });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const userId = getAuthUserId(req);

    await prisma.client.delete({
      where: {
        id: req.params.id,
        userId
      }
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export { router as clientsRouter };
