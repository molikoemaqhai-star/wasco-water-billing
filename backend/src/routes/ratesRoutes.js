import { Router } from "express";
import { createRate, deleteRate, getRates, updateRate } from "../controllers/ratesController.js";
const router = Router();
router.get("/", getRates);
router.post("/", createRate);
router.put("/:id", updateRate);
router.delete("/:id", deleteRate);
export default router;
