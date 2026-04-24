import { pgPool } from "../config/db.js";
import { dualInsert } from "../services/dualDbService.js";
import { makeId } from "../utils/id.js";

async function getApplicableRate(customerType, unitsUsed) {
  const result = await pgPool.query(
    `
      SELECT *
      FROM billing_rates
      WHERE customer_type = $1
        AND is_active = TRUE
        AND min_units <= $2
        AND (max_units IS NULL OR max_units >= $2)
      ORDER BY min_units DESC
      LIMIT 1
    `,
    [customerType, unitsUsed]
  );

  return result.rows[0] || null;
}

export async function getBills(req, res, next) {
  try {
    const result = await pgPool.query(`
      SELECT b.*, c.account_number, c.first_name, c.last_name
      FROM bills b
      JOIN customers c ON c.customer_id = b.customer_id
      ORDER BY b.bill_year DESC, b.bill_month DESC, b.generated_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
}

export async function generateBill(req, res, next) {
  try {
    const { usage_id, due_date } = req.body;
    const usageResult = await pgPool.query(`
      SELECT wu.*, c.customer_type
      FROM water_usage wu
      JOIN customers c ON c.customer_id = wu.customer_id
      WHERE wu.usage_id = $1
    `, [usage_id]);

    if (usageResult.rows.length === 0) {
      return res.status(404).json({ message: "Usage record not found" });
    }

    const usage = usageResult.rows[0];
    const rate = await getApplicableRate(usage.customer_type, usage.units_used);

    if (!rate) {
      return res.status(400).json({ message: "No billing rate found for this customer type and usage range" });
    }

    const waterCharge = Number(usage.units_used) * Number(rate.cost_per_unit);
    const sewerCharge = Number(rate.sewer_charge || 0);
    const meterCharge = Number(rate.meter_charge || 0);
    const totalAmount = waterCharge + sewerCharge + meterCharge;

    const bill = {
      bill_id: makeId("BILL"),
      customer_id: usage.customer_id,
      usage_id: usage.usage_id,
      bill_month: usage.reading_month,
      bill_year: usage.reading_year,
      issue_date: new Date().toISOString().slice(0, 10),
      due_date,
      water_charge: waterCharge.toFixed(2),
      sewer_charge: sewerCharge.toFixed(2),
      meter_charge: meterCharge.toFixed(2),
      arrears_brought_forward: "0.00",
      penalties: "0.00",
      total_amount: totalAmount.toFixed(2),
      amount_paid: "0.00",
      balance_due: totalAmount.toFixed(2),
      payment_status: "UNPAID"
    };

    await dualInsert("bills", bill);
    res.status(201).json({ message: "Bill generated", bill });
  } catch (error) {
    next(error);
  }
}
