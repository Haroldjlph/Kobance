import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { getAuthUserId, requireAuth } from "../middleware/auth.js";
import { calculateInvoiceAmounts } from "../utils/money.js";

const router = Router();

const purchaseSchema = z.object({
  supplierId: z.string().min(1),
  purchaseDate: z.string().date(),
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
    const supplierId = typeof req.query.supplierId === "string" ? req.query.supplierId : null;

    const startDate = month && year ? new Date(Date.UTC(year, month - 1, 1)) : null;
    const endDate = month && year ? new Date(Date.UTC(year, month, 1)) : null;

    const purchases = await prisma.purchase.findMany({
      where: {
        userId,
        ...(supplierId ? { supplierId } : {}),
        ...(startDate && endDate ? { purchaseDate: { gte: startDate, lt: endDate } } : {})
      },
      include: { supplier: true },
      orderBy: { purchaseDate: "desc" }
    });

    res.json({ purchases });
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const userId = getAuthUserId(req);
    const data = purchaseSchema.parse(req.body);
    const { vatAmount, amountTtc } = calculateInvoiceAmounts(data.amountHt, data.vatRate);

    const supplier = await prisma.supplier.findFirst({
      where: { id: data.supplierId, userId }
    });

    if (!supplier) {
      res.status(404).json({ message: "Fournisseur introuvable." });
      return;
    }

    const purchase = await prisma.purchase.create({
      data: {
        userId,
        supplierId: data.supplierId,
        purchaseDate: new Date(`${data.purchaseDate}T00:00:00.000Z`),
        description: data.description,
        amountHt: data.amountHt,
        vatRate: data.vatRate,
        vatAmount,
        amountTtc,
        status: data.status
      },
      include: { supplier: true }
    });

    res.status(201).json({ purchase });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const userId = getAuthUserId(req);

    await prisma.purchase.delete({
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

export { router as purchasesRouter };

