import { Router } from "express";
import { prisma } from "../db/prisma.js";
import { getAuthUserId, requireAuth } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

function toNumber(value: unknown) {
  return Number(value ?? 0);
}

function monthRange(year: number, month: number) {
  return {
    start: new Date(Date.UTC(year, month - 1, 1)),
    end: new Date(Date.UTC(year, month, 1))
  };
}

async function getMonthSummary(userId: string, year: number, month: number) {
  const { start, end } = monthRange(year, month);

  const [saleTotals, purchaseTotals, sales, purchases] = await Promise.all([
    prisma.sale.aggregate({
      where: { userId, saleDate: { gte: start, lt: end } },
      _sum: { amountHt: true, amountTtc: true, vatAmount: true }
    }),
    prisma.purchase.aggregate({
      where: { userId, purchaseDate: { gte: start, lt: end } },
      _sum: { amountHt: true, amountTtc: true, vatAmount: true }
    }),
    prisma.sale.findMany({
      where: { userId, saleDate: { gte: start, lt: end } },
      include: { client: true },
      orderBy: { saleDate: "desc" }
    }),
    prisma.purchase.findMany({
      where: { userId, purchaseDate: { gte: start, lt: end } },
      include: { supplier: true },
      orderBy: { purchaseDate: "desc" }
    })
  ]);

  const salesHt = toNumber(saleTotals._sum.amountHt);
  const salesTtc = toNumber(saleTotals._sum.amountTtc);
  const purchasesHt = toNumber(purchaseTotals._sum.amountHt);
  const purchasesTtc = toNumber(purchaseTotals._sum.amountTtc);
  const collectedVat = toNumber(saleTotals._sum.vatAmount);
  const deductibleVat = toNumber(purchaseTotals._sum.vatAmount);

  return {
    year,
    month,
    totals: {
      salesHt,
      salesTtc,
      purchasesHt,
      purchasesTtc,
      collectedVat,
      deductibleVat,
      vatDue: collectedVat - deductibleVat,
      profit: salesHt - purchasesHt
    },
    sales,
    purchases
  };
}

router.get("/monthly", async (req, res, next) => {
  try {
    const userId = getAuthUserId(req);
    const now = new Date();
    const year = req.query.year ? Number(req.query.year) : now.getUTCFullYear();
    const month = req.query.month ? Number(req.query.month) : now.getUTCMonth() + 1;

    res.json(await getMonthSummary(userId, year, month));
  } catch (error) {
    next(error);
  }
});

router.get("/dashboard", async (req, res, next) => {
  try {
    const userId = getAuthUserId(req);
    const now = new Date();
    const year = req.query.year ? Number(req.query.year) : now.getUTCFullYear();
    const month = req.query.month ? Number(req.query.month) : now.getUTCMonth() + 1;

    const monthly = await getMonthSummary(userId, year, month);
    const monthlySeries = [];

    for (let currentMonth = 1; currentMonth <= 12; currentMonth += 1) {
      const summary = await getMonthSummary(userId, year, currentMonth);
      monthlySeries.push({
        month: currentMonth,
        ...summary.totals
      });
    }

    res.json({
      ...monthly,
      monthlySeries
    });
  } catch (error) {
    next(error);
  }
});

router.get("/yearly", async (req, res, next) => {
  try {
    const userId = getAuthUserId(req);
    const year = req.query.year ? Number(req.query.year) : new Date().getUTCFullYear();
    const months = [];

    for (let month = 1; month <= 12; month += 1) {
      const summary = await getMonthSummary(userId, year, month);
      months.push({
        month,
        ...summary.totals
      });
    }

    const totals = months.reduce(
      (acc, item) => ({
        salesHt: acc.salesHt + item.salesHt,
        salesTtc: acc.salesTtc + item.salesTtc,
        purchasesHt: acc.purchasesHt + item.purchasesHt,
        purchasesTtc: acc.purchasesTtc + item.purchasesTtc,
        collectedVat: acc.collectedVat + item.collectedVat,
        deductibleVat: acc.deductibleVat + item.deductibleVat,
        vatDue: acc.vatDue + item.vatDue,
        profit: acc.profit + item.profit
      }),
      {
        salesHt: 0,
        salesTtc: 0,
        purchasesHt: 0,
        purchasesTtc: 0,
        collectedVat: 0,
        deductibleVat: 0,
        vatDue: 0,
        profit: 0
      }
    );

    res.json({ year, months, totals });
  } catch (error) {
    next(error);
  }
});

export { router as reportsRouter };

