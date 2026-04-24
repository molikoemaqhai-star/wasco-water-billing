import { Router } from "express";
import { createCustomer, deleteCustomer, getCustomers, updateCustomer } from "../controllers/customersController.js";
const router = Router();
router.get("/", getCustomers);
router.post("/", createCustomer);
router.put("/:id", updateCustomer);
router.delete("/:id", deleteCustomer);
export default router;
