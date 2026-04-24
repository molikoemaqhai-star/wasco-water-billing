import { pgPool } from "../config/db.js";
import { dualDelete, dualInsert, dualUpdate } from "../services/dualDbService.js";
import { makeId } from "../utils/id.js";

export async function getRates(req, res, next) {
  try {
    const result = await pgPool.query("SELECT * FROM billing_rates ORDER BY effective_from DESC, customer_type ASC");
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
}

export async function createRate(req, res, next) {
  try {
    const rate = {
      rate_id: makeId("RATE"),
      customer_type: req.body.customer_type,
      tier_name: req.body.tier_name,
      min_units: req.body.min_units,
      max_units: req.body.max_units || null,
      cost_per_unit: req.body.cost_per_unit,
      sewer_charge: req.body.sewer_charge || 0,
      meter_charge: req.body.meter_charge || 0,
      effective_from: req.body.effective_from,
      effective_to: req.body.effective_to || null,
      is_active: String(req.body.is_active ?? "true") === "true"
    };
    await dualInsert("billing_rates", rate);
    res.status(201).json({ message: "Rate created", rate });
  } catch (error) {
    next(error);
  }
}

export async function updateRate(req, res, next) {
  try {
    const payload = {
      customer_type: req.body.customer_type,
      tier_name: req.body.tier_name,
      min_units: req.body.min_units,
      max_units: req.body.max_units || null,
      cost_per_unit: req.body.cost_per_unit,
      sewer_charge: req.body.sewer_charge || 0,
      meter_charge: req.body.meter_charge || 0,
      effective_from: req.body.effective_from,
      effective_to: req.body.effective_to || null,
      is_active: String(req.body.is_active ?? "true") === "true"
    };
    await dualUpdate("billing_rates", payload, "rate_id", req.params.id);
    res.json({ message: "Rate updated" });
  } catch (error) {
    next(error);
  }
}

export async function deleteRate(req, res, next) {
  try {
    await dualDelete("billing_rates", "rate_id", req.params.id);
    res.json({ message: "Rate deleted" });
  } catch (error) {
    next(error);
  }
}
