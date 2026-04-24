import { Router } from "express";
import { getReports } from "../controllers/reportsController.js";
const router = Router();
router.get("/", getReports);
export default router;
