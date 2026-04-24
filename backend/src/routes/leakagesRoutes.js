import { Router } from "express";
import { createLeakage, deleteLeakage, getLeakages, updateLeakage } from "../controllers/leakagesController.js";
const router = Router();
router.get("/", getLeakages);
router.post("/", createLeakage);
router.put("/:id", updateLeakage);
router.delete("/:id", deleteLeakage);
export default router;
