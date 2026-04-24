import { pgPool } from "../config/db.js";
import { dualInsert } from "../services/dualDbService.js";
import { makeId } from "../utils/id.js";

export async function getPayments(req, res, next) {
  try {
    const result = await pgPool.query(`
      SELECT p.*, c.account_number, c.first_name, c.last_name
      FROM payments p
      JOIN customers c ON c.customer_id = p.customer_id
      ORDER BY p.payment_date DESC, p.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
}

export async function createPayment(req, res, next) {
  const pgClient = await pgPool.connect();
  try {
    await pgClient.query("BEGIN");

    const payment = {
      payment_id: makeId("PAY"),
      bill_id: req.body.bill_id,
      customer_id: req.body.customer_id,
      payment_date: req.body.payment_date,
      amount_paid: Number(req.body.amount_paid).toFixed(2),
      payment_method: req.body.payment_method,
      transaction_reference: req.body.transaction_reference || null,
      payment_status: req.body.payment_status || "SUCCESS",
      received_by: req.body.received_by || null
    };

    const billResult = await pgClient.query("SELECT * FROM bills WHERE bill_id = $1", [payment.bill_id]);
    if (billResult.rows.length === 0) {
      await pgClient.query("ROLLBACK");
      return res.status(404).json({ message: "Bill not found" });
    }

    const bill = billResult.rows[0];
    const newAmountPaid = Number(bill.amount_paid) + Number(payment.amount_paid);
    const newBalance = Number(bill.total_amount) - newAmountPaid;
    const newStatus = newBalance <= 0 ? "PAID" : "PARTIAL";

    await pgClient.query("COMMIT");

    await dualInsert("payments", payment);

    // bills update in both DBMSs
    const { dualUpdate } = await import("../services/dualDbService.js");
    await dualUpdate("bills", {
      amount_paid: newAmountPaid.toFixed(2),
      balance_due: Math.max(newBalance, 0).toFixed(2),
      payment_status: newStatus
    }, "bill_id", payment.bill_id);

    res.status(201).json({ message: "Payment recorded", payment });
  } catch (error) {
    try { await pgClient.query("ROLLBACK"); } catch {}
    next(error);
  } finally {
    pgClient.release();
  }
}
