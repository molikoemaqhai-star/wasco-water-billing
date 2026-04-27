import { pgPool } from "../config/db.js";
import { makeId } from "../utils/id.js";

export async function getLeakages(req, res, next) {
  try {
    const result = await pgPool.query(`
      SELECT
        lr.*,
        c.account_number,
        c.first_name,
        c.last_name,
        b.branch_name
      FROM leakage_reports lr
      LEFT JOIN customers c ON c.customer_id = lr.customer_id
      LEFT JOIN branches b ON b.branch_id = lr.branch_id
      ORDER BY COALESCE(lr.reported_at, lr.created_at) DESC
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
      report_title: req.body.report_title || "Leakage Report",
      description: req.body.description || "",
      location_description: req.body.location_description || "",
      report_status: req.body.report_status || "OPEN",
      severity: req.body.severity || "MEDIUM"
    };

    await pgPool.query(
      `
      INSERT INTO leakage_reports
      (
        report_id,
        customer_id,
        branch_id,
        report_title,
        description,
        location_description,
        report_status,
        severity,
        reported_at,
        created_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
      `,
      [
        report.report_id,
        report.customer_id,
        report.branch_id,
        report.report_title,
        report.description,
        report.location_description,
        report.report_status,
        report.severity
      ]
    );

    res.status(201).json({
      message: "Leakage report created",
      report
    });
  } catch (error) {
    next(error);
  }
}

export async function updateLeakage(req, res, next) {
  try {
    const resolvedAt =
      req.body.report_status === "CLOSED" || req.body.report_status === "RESOLVED"
        ? new Date()
        : null;

    await pgPool.query(
      `
      UPDATE leakage_reports
      SET
        customer_id = $1,
        branch_id = $2,
        report_title = $3,
        description = $4,
        location_description = $5,
        report_status = $6,
        severity = $7,
        resolved_at = $8
      WHERE report_id = $9
      `,
      [
        req.body.customer_id || null,
        req.body.branch_id,
        req.body.report_title || "Leakage Report",
        req.body.description || "",
        req.body.location_description || "",
        req.body.report_status || "OPEN",
        req.body.severity || "MEDIUM",
        resolvedAt,
        req.params.id
      ]
    );

    res.json({ message: "Leakage report updated" });
  } catch (error) {
    next(error);
  }
}

export async function deleteLeakage(req, res, next) {
  try {
    await pgPool.query(
      "DELETE FROM leakage_reports WHERE report_id = $1",
      [req.params.id]
    );

    res.json({ message: "Leakage report deleted" });
  } catch (error) {
    next(error);
  }
}