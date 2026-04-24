import { Router } from "express";
import { generateBill, getBills } from "../controllers/billsController.js";
const router = Router();
router.get("/", getBills);
router.post("/generate", generateBill);
export default router;
