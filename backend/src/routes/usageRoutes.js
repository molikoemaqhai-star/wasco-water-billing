import { Router } from "express";
import { createUsage, deleteUsage, getUsage, updateUsage } from "../controllers/usageController.js";
const router = Router();
router.get("/", getUsage);
router.post("/", createUsage);
router.put("/:id", updateUsage);
router.delete("/:id", deleteUsage);
export default router;
