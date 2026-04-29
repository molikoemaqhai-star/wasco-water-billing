import { pgPool } from "../config/db.js";
import { getRequestUser } from "../utils/requestContext.js";

export async function getDashboard(req, res, next) {
  try {
    const user = getRequestUser(req);

    let customerFilter = "";
    let billFilter = "";
    let paymentFilter = "";
    let leakageFilter = "";
    let usageFilter = "";
    let values = [];

    if (user.role === "CUSTOMER" && user.customer_id) {
      values = [user.customer_id];

      customerFilter = "WHERE c.customer_id = $1";
      billFilter = "WHERE b.customer_id = $1";
      paymentFilter = "WHERE p.customer_id = $1";
      leakageFilter = "WHERE lr.customer_id = $1";
      usageFilter = "WHERE wu.customer_id = $1";
    }

    if (user.role === "BRANCH_MANAGER" && user.branch_id) {
      values = [user.branch_id];

      customerFilter = "WHERE c.branch_id = $1";
      billFilter = "JOIN customers c ON c.customer_id = b.customer_id WHERE c.branch_id = $1";
      paymentFilter = "JOIN customers c ON c.customer_id = p.customer_id WHERE c.branch_id = $1";
      leakageFilter = "WHERE lr.branch_id = $1";
      usageFilter = "JOIN customers c ON c.customer_id = wu.customer_id WHERE c.branch_id = $1";
    }

    const [
      customers,
      bills,
      payments,
      leakages,
      revenue,
      outstanding,
      monthlyUsage
    ] = await Promise.all([
      pgPool.query(
        `SELECT COUNT(*)::int AS total FROM customers c ${customerFilter}`,
        values
      ),

      pgPool.query(
        `SELECT COUNT(*)::int AS total FROM bills b ${billFilter}`,
        values
      ),

      pgPool.query(
        `SELECT COUNT(*)::int AS total FROM payments p ${paymentFilter}`,
        values
      ),

      pgPool.query(
        `
        SELECT COUNT(*)::int AS total
        FROM leakage_reports lr
        ${leakageFilter}
        ${leakageFilter ? "AND" : "WHERE"} lr.report_status NOT IN ('CLOSED','RESOLVED')
        `,
        values
      ),

      pgPool.query(
        `
        SELECT COALESCE(SUM(p.amount_paid),0)::numeric(12,2) AS total
        FROM payments p
        ${paymentFilter}
        `,
        values
      ),

      pgPool.query(
        `
        SELECT COALESCE(SUM(b.balance_due),0)::numeric(12,2) AS total
        FROM bills b
        ${billFilter}
        ${billFilter ? "AND" : "WHERE"} b.balance_due > 0
        `,
        values
      ),

      pgPool.query(
        `
        SELECT COALESCE(SUM(wu.units_used),0)::numeric(12,2) AS total
        FROM water_usage wu
        ${usageFilter}
        ${usageFilter ? "AND" : "WHERE"}
          wu.reading_year = EXTRACT(YEAR FROM CURRENT_DATE)
          AND wu.reading_month = EXTRACT(MONTH FROM CURRENT_DATE)
        `,
        values
      )
    ]);

    res.json({
      customers: customers.rows[0].total,
      bills: bills.rows[0].total,
      payments: payments.rows[0].total,
      openLeakages: leakages.rows[0].total,
      revenue: revenue.rows[0].total,
      outstanding: outstanding.rows[0].total,
      currentMonthUsage: monthlyUsage.rows[0].total
    });
  } catch (error) {
    next(error);
  }
}