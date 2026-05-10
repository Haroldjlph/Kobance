import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { getAuthUserId, requireAuth } from "../middleware/auth.js";
import { calculateInvoiceAmounts } from "../utils/money.js";

const router = Router();

const saleSchema = z.object({
  clientId: z.string().min(1),
  saleDate: z.string().date(),
  description: z.string().trim().min(1),
  amountHt: z.coerce.number().nonnegative(),
  vatRate: z.coerce.number(),
  status: z.enum(["PAID", "UNPAID"]).default("UNPAID")
});

router.use(requireAuth);

router.get("/", async (req, res, next) => {
  try {
    const userId = getAuthUserId(req);
    const month = req.query.month ? Number(req.query.month) : null;
    const year = req.query.year ? Number(req.query.year) : null;
    const clientId = typeof req.query.clientId === "string" ? req.query.clientId : null;

    const startDate = month && year ? new Date(Date.UTC(year, month - 1, 1)) : null;
    const endDate = month && year ? new Date(Date.UTC(year, month, 1)) : null;

    const sales = await prisma.sale.findMany({
      where: {
        userId,
        ...(clientId ? { clientId } : {}),
        ...(startDate && endDate ? { saleDate: { gte: startDate, lt: endDate } } : {})
      },
      include: { client: true },
      orderBy: { saleDate: "desc" }
    });

    res.json({ sales });
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const userId = getAuthUserId(req);
    const data = saleSchema.parse(req.body);
    const { vatAmount, amountTtc } = calculateInvoiceAmounts(data.amountHt, data.vatRate);

    const client = await prisma.client.findFirst({
      where: { id: data.clientId, userId }
    });

    if (!client) {
      res.status(404).json({ message: "Client introuvable." });
      return;
    }

    const sale = await prisma.sale.create({
      data: {
        userId,
        clientId: data.clientId,
        saleDate: new Date(`${data.saleDate}T00:00:00.000Z`),
        description: data.description,
        amountHt: data.amountHt,
        vatRate: data.vatRate,
        vatAmount,
        amountTtc,
        status: data.status
      },
      include: { client: true }
    });

    res.status(201).json({ sale });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const userId = getAuthUserId(req);

    await prisma.sale.delete({
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

export { router as salesRouter };

