import { pgPool } from "../config/db.js";
import { dualDelete, dualInsert, dualUpdate } from "../services/dualDbService.js";
import { makeId } from "../utils/id.js";

export async function getLeakages(req, res, next) {
  try {
    const result = await pgPool.query(`
      SELECT lr.*, c.account_number, c.first_name, c.last_name, b.branch_name
      FROM leakage_reports lr
      LEFT JOIN customers c ON c.customer_id = lr.customer_id
      JOIN branches b ON b.branch_id = lr.branch_id
      ORDER BY lr.reported_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
}

export async function createLeakage(req, res, next) {
  try {
    const report = {
      report_id: makeId("LEAK"),
      customer_id: req.body.customer_id || null,
      branch_id: req.body.branch_id,
      report_title: req.body.report_title,
      description: req.body.description,
      location_description: req.body.location_description,
      report_status: req.body.report_status || "OPEN",
      severity: req.body.severity || "MEDIUM"
    };
    await dualInsert("leakage_reports", report);
    res.status(201).json({ message: "Leakage report created", report });
  } catch (error) {
    next(error);
  }
}

export async function updateLeakage(req, res, next) {
  try {
    const resolved = req.body.report_status === "CLOSED" ? new Date() : null;
    const payload = {
      customer_id: req.body.customer_id || null,
      branch_id: req.body.branch_id,
      report_title: req.body.report_title,
      description: req.body.description,
      location_description: req.body.location_description,
      report_status: req.body.report_status || "OPEN",
      severity: req.body.severity || "MEDIUM",
      resolved_at: resolved
    };
    await dualUpdate("leakage_reports", payload, "report_id", req.params.id);
    res.json({ message: "Leakage report updated" });
  } catch (error) {
    next(error);
  }
}

export async function deleteLeakage(req, res, next) {
  try {
    await dualDelete("leakage_reports", "report_id", req.params.id);
    res.json({ message: "Leakage report deleted" });
  } catch (error) {
    next(error);
  }
}
