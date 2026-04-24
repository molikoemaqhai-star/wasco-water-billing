import { pgPool } from "../config/db.js";
import { dualDelete, dualInsert, dualUpdate } from "../services/dualDbService.js";
import { makeId } from "../utils/id.js";

export async function getCustomers(req, res, next) {
  try {
    const result = await pgPool.query(`
      SELECT c.*, b.branch_name
      FROM customers c
      JOIN branches b ON b.branch_id = c.branch_id
      ORDER BY c.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
}

export async function createCustomer(req, res, next) {
  try {
    const customer = {
      customer_id: makeId("CUS"),
      branch_id: req.body.branch_id,
      account_number: req.body.account_number,
      customer_type: req.body.customer_type,
      first_name: req.body.first_name,
      last_name: req.body.last_name,
      phone: req.body.phone || null,
      email: req.body.email || null,
      national_id: req.body.national_id || null,
      address_line1: req.body.address_line1,
      address_line2: req.body.address_line2 || null,
      district: req.body.district || null,
      village_town: req.body.village_town || null,
      connection_status: req.body.connection_status || "ACTIVE"
    };
    await dualInsert("customers", customer);
    res.status(201).json({ message: "Customer created", customer });
  } catch (error) {
    next(error);
  }
}

export async function updateCustomer(req, res, next) {
  try {
    const payload = {
      branch_id: req.body.branch_id,
      account_number: req.body.account_number,
      customer_type: req.body.customer_type,
      first_name: req.body.first_name,
      last_name: req.body.last_name,
      phone: req.body.phone || null,
      email: req.body.email || null,
      national_id: req.body.national_id || null,
      address_line1: req.body.address_line1,
      address_line2: req.body.address_line2 || null,
      district: req.body.district || null,
      village_town: req.body.village_town || null,
      connection_status: req.body.connection_status || "ACTIVE",
      updated_at: new Date()
    };
    await dualUpdate("customers", payload, "customer_id", req.params.id);
    res.json({ message: "Customer updated" });
  } catch (error) {
    next(error);
  }
}

export async function deleteCustomer(req, res, next) {
  try {
    await dualDelete("customers", "customer_id", req.params.id);
    res.json({ message: "Customer deleted" });
  } catch (error) {
    next(error);
  }
}
