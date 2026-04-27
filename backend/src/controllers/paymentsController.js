import { pgPool } from "../config/db.js";
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
  const client = await pgPool.connect();

  try {
    await client.query("BEGIN");

    const payment = {
      payment_id: makeId("PAY"),
      bill_id: req.body.bill_id,
      customer_id: req.body.customer_id,
      payment_date: req.body.payment_date,
      amount_paid: Number(req.body.amount_paid),
      payment_method: req.body.payment_method,
      transaction_reference: req.body.transaction_reference || null,
      payment_status: req.body.payment_status || "SUCCESS",
      received_by: req.body.received_by || null
    };

    // 1. Get bill
    const billResult = await client.query(
      "SELECT * FROM bills WHERE bill_id = $1",
      [payment.bill_id]
    );

    if (billResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Bill not found" });
    }

    const bill = billResult.rows[0];

    const newAmountPaid =
      Number(bill.amount_paid || 0) + payment.amount_paid;

    const newBalance =
      Number(bill.total_amount || 0) - newAmountPaid;

    const newStatus = newBalance <= 0 ? "PAID" : "PARTIAL";

    // 2. Insert payment (POSTGRES ONLY)
    await client.query(
      `
      INSERT INTO payments
      (
        payment_id,
        bill_id,
        customer_id,
        payment_date,
        amount_paid,
        payment_method,
        transaction_reference,
        payment_status,
        received_by,
        created_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,CURRENT_TIMESTAMP)
      `,
      [
        payment.payment_id,
        payment.bill_id,
        payment.customer_id,
        payment.payment_date,
        payment.amount_paid,
        payment.payment_method,
        payment.transaction_reference,
        payment.payment_status,
        payment.received_by
      ]
    );

    // 3. Update bill (POSTGRES ONLY)
    await client.query(
      `
      UPDATE bills
      SET
        amount_paid = $1,
        balance_due = $2,
        payment_status = $3
      WHERE bill_id = $4
      `,
      [
        newAmountPaid,
        Math.max(newBalance, 0),
        newStatus,
        payment.bill_id
      ]
    );

    await client.query("COMMIT");

    res.status(201).json({
      message: "Payment recorded successfully",
      payment
    });

  } catch (error) {
    try { await client.query("ROLLBACK"); } catch {}
    next(error);
  } finally {
    client.release();
  }
}