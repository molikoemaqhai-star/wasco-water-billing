import { pgPool } from "../config/db.js";

const publicServices = [
  { service: "Water Bill Enquiries", audience: "Registered and unregistered customers", description: "View billing guidance, due dates, and account support information before signing in." },
  { service: "Customer Portal", audience: "Registered customers", description: "Track balances, payment history, bills, and leakage reports from one portal." },
  { service: "Branch Manager Insights", audience: "Branch managers", description: "Review daily, weekly, monthly, quarterly, and yearly water usage and billing summaries." },
  { service: "Leakage Reporting", audience: "All customers", description: "Report visible leakages and track the progress of investigations and repairs." }
];

export async function getMeta(req, res, next) {
  try {
    const [branches, customers, meters, usages, bills, users, notifications] = await Promise.all([
      pgPool.query("SELECT branch_id, branch_name FROM branches ORDER BY branch_name"),
      pgPool.query("SELECT customer_id, account_number, first_name, last_name FROM customers ORDER BY created_at DESC"),
      pgPool.query("SELECT meter_id, meter_number, customer_id FROM meters ORDER BY meter_number"),
      pgPool.query("SELECT usage_id, customer_id, reading_month, reading_year FROM water_usage ORDER BY created_at DESC"),
      pgPool.query("SELECT bill_id, customer_id, total_amount, balance_due, payment_status FROM bills ORDER BY created_at DESC"),
      pgPool.query("SELECT user_id, full_name, role, branch_id, customer_id FROM app_users ORDER BY full_name"),
      pgPool.query("SELECT notification_id, notification_type, sent_status FROM bill_notifications ORDER BY created_at DESC")
    ]);

    res.json({
      branches: branches.rows,
      customers: customers.rows,
      meters: meters.rows,
      usages: usages.rows,
      bills: bills.rows,
      users: users.rows,
      notifications: notifications.rows,
      publicServices
    });
  } catch (error) {
    next(error);
  }
}
