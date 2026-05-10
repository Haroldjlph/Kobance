import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import { ZodError } from "zod";
import { authRouter } from "./routes/auth.routes.js";
import { clientsRouter } from "./routes/clients.routes.js";
import { purchasesRouter } from "./routes/purchases.routes.js";
import { reportsRouter } from "./routes/reports.routes.js";
import { salesRouter } from "./routes/sales.routes.js";
import { suppliersRouter } from "./routes/suppliers.routes.js";

const app = express();
const port = Number(process.env.PORT ?? 4000);

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({
    app: "ComptaSimple",
    status: "ok"
  });
});

app.use("/api/auth", authRouter);
app.use("/api/clients", clientsRouter);
app.use("/api/suppliers", suppliersRouter);
app.use("/api/sales", salesRouter);
app.use("/api/purchases", purchasesRouter);
app.use("/api/reports", reportsRouter);

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ZodError) {
    res.status(400).json({
      message: "Donnees invalides.",
      errors: err.issues
    });
    return;
  }

  if (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    err.code === "ECONNREFUSED"
  ) {
    res.status(503).json({
      message: "Base de donnees inaccessible. Demarrez PostgreSQL puis reessayez."
    });
    return;
  }

  console.error(err);
  res.status(500).json({
    message: "Erreur serveur."
  });
});

app.listen(port, () => {
  console.log(`API ComptaSimple demarree sur http://localhost:${port}`);
});
