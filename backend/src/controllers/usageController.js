import { pgPool } from "../config/db.js";
import { dualDelete, dualInsert, dualUpdate } from "../services/dualDbService.js";
import { makeId } from "../utils/id.js";

export async function getUsage(req, res, next) {
  try {
    const result = await pgPool.query(`
      SELECT wu.*, c.account_number, c.first_name, c.last_name, m.meter_number
      FROM water_usage wu
      JOIN customers c ON c.customer_id = wu.customer_id
      JOIN meters m ON m.meter_id = wu.meter_id
      ORDER BY wu.reading_year DESC, wu.reading_month DESC
    `);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
}

export async function createUsage(req, res, next) {
  try {
    const previous = Number(req.body.previous_reading);
    const current = Number(req.body.current_reading);
    const usage = {
      usage_id: makeId("USE"),
      customer_id: req.body.customer_id,
      meter_id: req.body.meter_id,
      reading_month: Number(req.body.reading_month),
      reading_year: Number(req.body.reading_year),
      previous_reading: previous,
      current_reading: current,
      units_used: current - previous,
      reading_date: req.body.reading_date,
      recorded_by: req.body.recorded_by || null
    };
    await dualInsert("water_usage", usage);
    res.status(201).json({ message: "Usage recorded", usage });
  } catch (error) {
    next(error);
  }
}

export async function updateUsage(req, res, next) {
  try {
    const previous = Number(req.body.previous_reading);
    const current = Number(req.body.current_reading);
    const payload = {
      customer_id: req.body.customer_id,
      meter_id: req.body.meter_id,
      reading_month: Number(req.body.reading_month),
      reading_year: Number(req.body.reading_year),
      previous_reading: previous,
      current_reading: current,
      units_used: current - previous,
      reading_date: req.body.reading_date,
      recorded_by: req.body.recorded_by || null
    };
    await dualUpdate("water_usage", payload, "usage_id", req.params.id);
    res.json({ message: "Usage updated" });
  } catch (error) {
    next(error);
  }
}

export async function deleteUsage(req, res, next) {
  try {
    await dualDelete("water_usage", "usage_id", req.params.id);
    res.json({ message: "Usage deleted" });
  } catch (error) {
    next(error);
  }
}
