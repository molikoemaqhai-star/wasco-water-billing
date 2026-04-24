import { pgPool } from "../config/db.js";
import { getRequestUser } from "../utils/requestContext.js";

export async function getReports(req, res, next) {
  try {
    const user = getRequestUser(req);
    const isCustomer = user.role === "CUSTOMER" && user.customer_id;

    const vals = isCustomer ? [user.customer_id] : [];
    const wc   = isCustomer ? " WHERE c.customer_id=$1" : "";
    const wb   = isCustomer ? " WHERE customer_id=$1"   : "";
    const wp   = isCustomer ? " WHERE customer_id=$1"   : "";

    // Period Summary: Daily, Weekly, Monthly, Quarterly, Yearly
    const periodSummarySQL = `
      SELECT period, usage_units, billed_amount, collected_amount FROM (
        SELECT 1 AS ord, 'Daily' AS period,
          COALESCE((SELECT SUM(wu.units_used)  FROM water_usage wu ${wb} ${wb ? "AND" : "WHERE"} wu.reading_date = CURRENT_DATE), 0)::numeric(12,2) AS usage_units,
          COALESCE((SELECT SUM(b.total_amount) FROM bills b        ${wb} ${wb ? "AND" : "WHERE"} b.issue_date    = CURRENT_DATE), 0)::numeric(12,2) AS billed_amount,
          COALESCE((SELECT SUM(p.amount_paid)  FROM payments p     ${wp} ${wp ? "AND" : "WHERE"} p.payment_date  = CURRENT_DATE), 0)::numeric(12,2) AS collected_amount
      UNION ALL
        SELECT 2, 'Weekly',
          COALESCE((SELECT SUM(wu.units_used)  FROM water_usage wu ${wb} ${wb ? "AND" : "WHERE"} wu.reading_date >= CURRENT_DATE - INTERVAL '7 days'), 0)::numeric(12,2),
          COALESCE((SELECT SUM(b.total_amount) FROM bills b        ${wb} ${wb ? "AND" : "WHERE"} b.issue_date    >= CURRENT_DATE - INTERVAL '7 days'), 0)::numeric(12,2),
          COALESCE((SELECT SUM(p.amount_paid)  FROM payments p     ${wp} ${wp ? "AND" : "WHERE"} p.payment_date  >= CURRENT_DATE - INTERVAL '7 days'), 0)::numeric(12,2)
      UNION ALL
        SELECT 3, 'Monthly',
          COALESCE((SELECT SUM(wu.units_used)  FROM water_usage wu ${wb} ${wb ? "AND" : "WHERE"} EXTRACT(MONTH FROM wu.reading_date) = EXTRACT(MONTH FROM CURRENT_DATE) AND EXTRACT(YEAR FROM wu.reading_date) = EXTRACT(YEAR FROM CURRENT_DATE)), 0)::numeric(12,2),
          COALESCE((SELECT SUM(b.total_amount) FROM bills b        ${wb} ${wb ? "AND" : "WHERE"} b.bill_month = EXTRACT(MONTH FROM CURRENT_DATE) AND b.bill_year = EXTRACT(YEAR FROM CURRENT_DATE)), 0)::numeric(12,2),
          COALESCE((SELECT SUM(p.amount_paid)  FROM payments p     ${wp} ${wp ? "AND" : "WHERE"} EXTRACT(MONTH FROM p.payment_date) = EXTRACT(MONTH FROM CURRENT_DATE) AND EXTRACT(YEAR FROM p.payment_date) = EXTRACT(YEAR FROM CURRENT_DATE)), 0)::numeric(12,2)
      UNION ALL
        SELECT 4, 'Quarterly',
          COALESCE((SELECT SUM(wu.units_used)  FROM water_usage wu ${wb} ${wb ? "AND" : "WHERE"} wu.reading_date >= DATE_TRUNC('quarter', CURRENT_DATE)), 0)::numeric(12,2),
          COALESCE((SELECT SUM(b.total_amount) FROM bills b        ${wb} ${wb ? "AND" : "WHERE"} b.issue_date    >= DATE_TRUNC('quarter', CURRENT_DATE)), 0)::numeric(12,2),
          COALESCE((SELECT SUM(p.amount_paid)  FROM payments p     ${wp} ${wp ? "AND" : "WHERE"} p.payment_date  >= DATE_TRUNC('quarter', CURRENT_DATE)), 0)::numeric(12,2)
      UNION ALL
        SELECT 5, 'Yearly',
          COALESCE((SELECT SUM(wu.units_used)  FROM water_usage wu ${wb} ${wb ? "AND" : "WHERE"} EXTRACT(YEAR FROM wu.reading_date) = EXTRACT(YEAR FROM CURRENT_DATE)), 0)::numeric(12,2),
          COALESCE((SELECT SUM(b.total_amount) FROM bills b        ${wb} ${wb ? "AND" : "WHERE"} b.bill_year = EXTRACT(YEAR FROM CURRENT_DATE)), 0)::numeric(12,2),
          COALESCE((SELECT SUM(p.amount_paid)  FROM payments p     ${wp} ${wp ? "AND" : "WHERE"} EXTRACT(YEAR FROM p.payment_date) = EXTRACT(YEAR FROM CURRENT_DATE)), 0)::numeric(12,2)
      ) periods ORDER BY ord
    `;

    const branchSummarySQL = isCustomer
      ? `SELECT 'My Account' AS branch_name, 1::int AS customers,
           COALESCE(SUM(wu.units_used),  0)::numeric(12,2) AS total_units,
           COALESCE(SUM(b.total_amount), 0)::numeric(12,2) AS total_billed,
           COALESCE(SUM(p.amount_paid),  0)::numeric(12,2) AS total_paid
         FROM customers c
         LEFT JOIN water_usage wu ON wu.customer_id = c.customer_id
         LEFT JOIN bills b        ON b.customer_id  = c.customer_id
         LEFT JOIN payments p     ON p.customer_id  = c.customer_id
         WHERE c.customer_id = $1 GROUP BY c.customer_id`
      : `SELECT br.branch_name,
           COUNT(DISTINCT c.customer_id)::int             AS customers,
           COALESCE(SUM(wu.units_used),  0)::numeric(12,2) AS total_units,
           COALESCE(SUM(b.total_amount), 0)::numeric(12,2) AS total_billed,
           COALESCE(SUM(p.amount_paid),  0)::numeric(12,2) AS total_paid
         FROM branches br
         LEFT JOIN customers c    ON c.branch_id    = br.branch_id
         LEFT JOIN water_usage wu ON wu.customer_id = c.customer_id
         LEFT JOIN bills b        ON b.customer_id  = c.customer_id
         LEFT JOIN payments p     ON p.customer_id  = c.customer_id
         GROUP BY br.branch_name ORDER BY br.branch_name`;

    const [
      usageByType, monthlyBills, outstanding, paymentsByMethod,
      periodSummary, branchSummary, recentPayments, dueNotifications, customerBalances
    ] = await Promise.all([
      pgPool.query(
        `SELECT c.customer_type, COALESCE(SUM(wu.units_used),0)::numeric(12,2) AS total_units
         FROM customers c LEFT JOIN water_usage wu ON wu.customer_id=c.customer_id
         ${wc} GROUP BY c.customer_type ORDER BY c.customer_type`, vals),

      pgPool.query(
        `SELECT bill_year, bill_month, COUNT(*)::int AS bills_count,
           COALESCE(SUM(total_amount),0)::numeric(12,2) AS total_billed
         FROM bills ${wb} GROUP BY bill_year,bill_month
         ORDER BY bill_year DESC, bill_month DESC LIMIT 12`, vals),

      pgPool.query(
        `SELECT c.account_number, c.first_name, c.last_name,
           b.balance_due, b.payment_status, b.bill_month, b.bill_year
         FROM bills b JOIN customers c ON c.customer_id=b.customer_id
         ${wc ? "WHERE c.customer_id=$1 AND" : "WHERE"} b.balance_due>0
         ORDER BY b.balance_due DESC LIMIT 10`, vals),

      pgPool.query(
        `SELECT payment_method, COUNT(*)::int AS total_payments,
           COALESCE(SUM(amount_paid),0)::numeric(12,2) AS total_amount
         FROM payments ${wp} GROUP BY payment_method ORDER BY total_amount DESC`, vals),

      pgPool.query(periodSummarySQL, vals),
      pgPool.query(branchSummarySQL, vals),

      pgPool.query(
        `SELECT p.payment_date, c.account_number, c.first_name, c.last_name,
           p.amount_paid, p.payment_method, p.payment_status
         FROM payments p JOIN customers c ON c.customer_id=p.customer_id
         ${wc} ORDER BY p.payment_date DESC LIMIT 8`, vals),

      pgPool.query(
        `SELECT bn.notification_type, bn.sent_status,
           c.account_number, b.due_date, b.balance_due
         FROM bill_notifications bn
         JOIN bills b     ON b.bill_id     = bn.bill_id
         JOIN customers c ON c.customer_id = bn.customer_id
         ${wc} ORDER BY bn.created_at DESC LIMIT 10`, vals),

      pgPool.query(
        `SELECT account_number,
           first_name || ' ' || last_name AS customer_name,
           outstanding_balance
         FROM vw_customer_balances
         ${isCustomer ? "WHERE customer_id=$1" : ""}
         ORDER BY outstanding_balance DESC`, vals),
    ]);

    res.json({
      usageByType:      usageByType.rows,
      monthlyBills:     monthlyBills.rows,
      outstanding:      outstanding.rows,
      paymentsByMethod: paymentsByMethod.rows,
      periodSummary:    periodSummary.rows,
      branchSummary:    branchSummary.rows,
      recentPayments:   recentPayments.rows,
      dueNotifications: dueNotifications.rows,
      customerBalances: customerBalances.rows,
    });
  } catch (error) {
    next(error);
  }
}
