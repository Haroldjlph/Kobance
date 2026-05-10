import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { getAuthUserId, requireAuth } from "../middleware/auth.js";

const router = Router();

const supplierSchema = z.object({
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
    const suppliers = await prisma.supplier.findMany({
      where: { userId },
      orderBy: { name: "asc" }
    });

    res.json({ suppliers });
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const userId = getAuthUserId(req);
    const data = supplierSchema.parse(req.body);

    const supplier = await prisma.supplier.create({
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

    res.status(201).json({ supplier });
  } catch (error) {
    next(error);
  }
});

router.put("/:id", async (req, res, next) => {
  try {
    const userId = getAuthUserId(req);
    const data = supplierSchema.parse(req.body);

    const supplier = await prisma.supplier.update({
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

    res.json({ supplier });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const userId = getAuthUserId(req);

    await prisma.supplier.delete({
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

export { router as suppliersRouter };
