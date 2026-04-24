import express from "express";
import cors from "cors";
import authRoutes from "./routes/authRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import customersRoutes from "./routes/customersRoutes.js";
import ratesRoutes from "./routes/ratesRoutes.js";
import usageRoutes from "./routes/usageRoutes.js";
import billsRoutes from "./routes/billsRoutes.js";
import paymentsRoutes from "./routes/paymentsRoutes.js";
import leakagesRoutes from "./routes/leakagesRoutes.js";
import reportsRoutes from "./routes/reportsRoutes.js";
import metaRoutes from "./routes/metaRoutes.js";
import { notFound } from "./middleware/notFound.js";
import { errorHandler } from "./middleware/errorHandler.js";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ message: "WASCO API is running" });
});

app.use("/api/auth", authRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/customers", customersRoutes);
app.use("/api/rates", ratesRoutes);
app.use("/api/usage", usageRoutes);
app.use("/api/bills", billsRoutes);
app.use("/api/payments", paymentsRoutes);
app.use("/api/leakages", leakagesRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/meta", metaRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
