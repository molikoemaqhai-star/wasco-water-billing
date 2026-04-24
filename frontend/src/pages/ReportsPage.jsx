import { useEffect, useState } from "react";
import { api } from "../api";
import { PageHeader } from "../components/PageHeader";
import { TableCard } from "../components/TableCard";

function fmt(v) {
  if (v === null || v === undefined || v === "") return "—";
  const n = Number(v); if (isNaN(n)) return v;
  return `M ${n.toLocaleString("en-LS", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function fmtUnits(v) {
  if (v === null || v === undefined || v === "") return "—";
  const n = Number(v); if (isNaN(n)) return v;
  return `${n.toLocaleString(undefined, { maximumFractionDigits: 2 })} m³`;
}
function badge(s) {
  if (!s) return null;
  const l = String(s).toLowerCase();
  let cls = "badge-pending";
  if (["paid","success"].includes(l)) cls = "badge-paid";
  else if (["unpaid","failed","open"].includes(l)) cls = "badge-unpaid";
  else if (["partial","pending"].includes(l)) cls = "badge-partial";
  return <span className={`badge ${cls}`}>{s}</span>;
}

/* ── CUSTOMER PROFILE ── */
function CustomerReportsView({ report, user }) {
  const period         = report?.periodSummary || [];
  const recentPayments = (report?.recentPayments || []).slice(0, 8);
  const paymentMethods = report?.paymentsByMethod || [];
  const outstanding    = report?.outstanding || [];
  const initials = (user?.full_name || "C").split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="profile-grid">
      {/* Left: Profile card */}
      <div style={{ display:"grid", gap:16, alignContent:"start" }}>
        <div className="profile-card table-card">
          <div className="profile-avatar">{initials}</div>
          <h3 style={{ margin:"4px 0 0", fontSize:"1.1rem", fontWeight:700 }}>{user?.full_name}</h3>
          <div className="profile-badge">{user?.role || "CUSTOMER"}</div>
          <div style={{ width:"100%", marginTop:10 }}>
            {[
              ["Account Number", user?.account_number],
              ["Customer Type",  user?.customer_type || "RESIDENTIAL"],
              ["Username",       user?.username],
              ["Email",          user?.email || "—"],
              ["Account Status", "ACTIVE"],
            ].map(([label, value]) => (
              <div className="profile-detail-row" key={label}>
                <span className="profile-detail-label">{label}</span>
                <span style={{ fontWeight:600 }}>{value || "—"}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="table-card" style={{ padding:20 }}>
          <div className="card-title-row"><h3>📊 Payments by Method</h3></div>
          <table>
            <thead><tr><th>Method</th><th>Transactions</th><th>Total Amount</th></tr></thead>
            <tbody>
              {paymentMethods.length
                ? paymentMethods.map((r) => (
                  <tr key={r.payment_method}>
                    <td><strong>{r.payment_method}</strong></td>
                    <td>{r.total_payments}</td>
                    <td style={{ fontWeight:600, color:"var(--success)" }}>{fmt(r.total_amount)}</td>
                  </tr>
                ))
                : <tr><td colSpan="3" className="empty">No payment data yet.</td></tr>
              }
            </tbody>
          </table>
        </div>
      </div>

      {/* Right: Reports */}
      <div style={{ display:"grid", gap:16, alignContent:"start" }}>
        <TableCard>
          <div className="card-title-row">
            <h3>📅 Usage &amp; Billing by Period</h3>
            <span className="insight-badge">Daily → Yearly</span>
          </div>
          <table>
            <thead><tr><th>Period</th><th>Usage (m³)</th><th>Billed (M)</th><th>Collected (M)</th></tr></thead>
            <tbody>
              {period.length
                ? period.map((r) => (
                  <tr key={r.period}>
                    <td><strong>{r.period}</strong></td>
                    <td>{fmtUnits(r.usage_units)}</td>
                    <td>{fmt(r.billed_amount)}</td>
                    <td style={{ color:"var(--success)", fontWeight:600 }}>{fmt(r.collected_amount)}</td>
                  </tr>
                ))
                : <tr><td colSpan="4" className="empty">No period data available.</td></tr>
              }
            </tbody>
          </table>
        </TableCard>

        <TableCard>
          <div className="card-title-row"><h3>⚠️ Outstanding Bills</h3></div>
          <table>
            <thead><tr><th>Bill Period</th><th>Balance Due</th><th>Payment Status</th></tr></thead>
            <tbody>
              {outstanding.length
                ? outstanding.map((r, i) => (
                  <tr key={i}>
                    <td>{r.bill_month}/{r.bill_year}</td>
                    <td style={{ color:"var(--danger)", fontWeight:600 }}>{fmt(r.balance_due)}</td>
                    <td>{badge(r.payment_status)}</td>
                  </tr>
                ))
                : <tr><td colSpan="3" className="empty">No outstanding bills. ✅ All clear!</td></tr>
              }
            </tbody>
          </table>
        </TableCard>

        <TableCard>
          <div className="card-title-row"><h3>💳 Recent Payment History</h3></div>
          <table>
            <thead><tr><th>Date</th><th>Amount Paid</th><th>Method</th><th>Status</th></tr></thead>
            <tbody>
              {recentPayments.length
                ? recentPayments.map((r, i) => (
                  <tr key={i}>
                    <td>{r.payment_date?.slice(0, 10)}</td>
                    <td style={{ fontWeight:600, color:"var(--success)" }}>{fmt(r.amount_paid)}</td>
                    <td>{r.payment_method}</td>
                    <td>{badge(r.payment_status || "SUCCESS")}</td>
                  </tr>
                ))
                : <tr><td colSpan="4" className="empty">No payment history found.</td></tr>
              }
            </tbody>
          </table>
        </TableCard>
      </div>
    </div>
  );
}

/* ── ADMIN / MANAGER REPORTS ── */
function AdminReportsView({ report, user }) {
  const isManager = user?.role === "BRANCH_MANAGER";

  return (
    <div className="report-grid">
      {/* Period Summary */}
      <TableCard>
        <div className="card-title-row">
          <h3>📅 Period Summary</h3>
          <span className="insight-badge">Daily → Yearly</span>
        </div>
        <table>
          <thead><tr><th>Period</th><th>Usage (m³)</th><th>Total Billed</th><th>Collected</th></tr></thead>
          <tbody>
            {(report?.periodSummary || []).map((r) => (
              <tr key={r.period}>
                <td><strong>{r.period}</strong></td>
                <td>{fmtUnits(r.usage_units)}</td>
                <td>{fmt(r.billed_amount)}</td>
                <td style={{ color:"var(--success)", fontWeight:600 }}>{fmt(r.collected_amount)}</td>
              </tr>
            ))}
            {!(report?.periodSummary?.length) && <tr><td colSpan="4" className="empty">No period data available.</td></tr>}
          </tbody>
        </table>
      </TableCard>

      {/* Branch Summary */}
      <TableCard>
        <div className="card-title-row"><h3>🏢 Branch / District Summary</h3></div>
        <table>
          <thead><tr><th>Branch</th><th>Customers</th><th>Usage (m³)</th><th>Billed</th><th>Collected</th></tr></thead>
          <tbody>
            {(report?.branchSummary || []).map((r) => (
              <tr key={r.branch_name}>
                <td><strong>{r.branch_name}</strong></td>
                <td>{r.customers}</td>
                <td>{fmtUnits(r.total_units)}</td>
                <td>{fmt(r.total_billed)}</td>
                <td style={{ color:"var(--success)", fontWeight:600 }}>{fmt(r.total_paid)}</td>
              </tr>
            ))}
            {!(report?.branchSummary?.length) && <tr><td colSpan="5" className="empty">No branch data.</td></tr>}
          </tbody>
        </table>
      </TableCard>

      {/* Usage by Customer Type */}
      <TableCard>
        <div className="card-title-row"><h3>🏠 Usage by Customer Type</h3></div>
        <table>
          <thead><tr><th>Customer Type</th><th>Total Usage (m³)</th></tr></thead>
          <tbody>
            {(report?.usageByType || []).map((r) => (
              <tr key={r.customer_type}>
                <td><strong>{r.customer_type}</strong></td>
                <td style={{ fontWeight:600, color:"var(--primary-dark)" }}>{fmtUnits(r.total_units)}</td>
              </tr>
            ))}
            {!(report?.usageByType?.length) && <tr><td colSpan="2" className="empty">No usage type data.</td></tr>}
          </tbody>
        </table>
      </TableCard>

      {/* Payments by Method */}
      <TableCard>
        <div className="card-title-row"><h3>💳 Payments by Method</h3></div>
        <table>
          <thead><tr><th>Payment Method</th><th>Transactions</th><th>Total Amount</th></tr></thead>
          <tbody>
            {(report?.paymentsByMethod || []).map((r) => (
              <tr key={r.payment_method}>
                <td><strong>{r.payment_method}</strong></td>
                <td>{r.total_payments}</td>
                <td style={{ fontWeight:600, color:"var(--success)" }}>{fmt(r.total_amount)}</td>
              </tr>
            ))}
            {!(report?.paymentsByMethod?.length) && <tr><td colSpan="3" className="empty">No payment data.</td></tr>}
          </tbody>
        </table>
      </TableCard>

      {/* Monthly Bills */}
      <TableCard>
        <div className="card-title-row"><h3>📅 Monthly Bills Breakdown</h3></div>
        <table>
          <thead><tr><th>Period (Mon/Year)</th><th>Bills Count</th><th>Total Billed</th></tr></thead>
          <tbody>
            {(report?.monthlyBills || []).map((r) => (
              <tr key={`${r.bill_year}-${r.bill_month}`}>
                <td>{r.bill_month}/{r.bill_year}</td>
                <td>{r.bills_count}</td>
                <td style={{ fontWeight:600 }}>{fmt(r.total_billed)}</td>
              </tr>
            ))}
            {!(report?.monthlyBills?.length) && <tr><td colSpan="3" className="empty">No monthly bills data.</td></tr>}
          </tbody>
        </table>
      </TableCard>

      {/* Outstanding */}
      <TableCard>
        <div className="card-title-row">
          <h3>⚠️ Outstanding Balances</h3>
          <span className="muted" style={{ fontSize:".8rem" }}>Highest first</span>
        </div>
        <table>
          <thead><tr><th>Account</th><th>Customer</th><th>Balance Due</th><th>Status</th></tr></thead>
          <tbody>
            {(report?.outstanding || []).map((r, i) => (
              <tr key={i}>
                <td><code>{r.account_number}</code></td>
                <td>{r.first_name} {r.last_name}</td>
                <td style={{ color:"var(--danger)", fontWeight:600 }}>{fmt(r.balance_due)}</td>
                <td>{badge(r.payment_status)}</td>
              </tr>
            ))}
            {!(report?.outstanding?.length) && <tr><td colSpan="4" className="empty">No outstanding balances. ✅</td></tr>}
          </tbody>
        </table>
      </TableCard>

      {/* Recent Payments */}
      <TableCard>
        <div className="card-title-row"><h3>💳 Recent Payments</h3></div>
        <table>
          <thead><tr><th>Date</th><th>Account</th><th>Customer Name</th><th>Amount Paid</th><th>Method</th></tr></thead>
          <tbody>
            {(report?.recentPayments || []).map((r, i) => (
              <tr key={i}>
                <td>{r.payment_date?.slice(0, 10)}</td>
                <td><code>{r.account_number}</code></td>
                <td>{r.first_name} {r.last_name}</td>
                <td style={{ fontWeight:600, color:"var(--success)" }}>{fmt(r.amount_paid)}</td>
                <td>{r.payment_method}</td>
              </tr>
            ))}
            {!(report?.recentPayments?.length) && <tr><td colSpan="5" className="empty">No recent payments.</td></tr>}
          </tbody>
        </table>
      </TableCard>

      {/* Bill Notifications */}
      <TableCard>
        <div className="card-title-row"><h3>🔔 Bill Notifications Sent</h3></div>
        <table>
          <thead><tr><th>Account</th><th>Type</th><th>Status</th><th>Due Date</th><th>Balance Due</th></tr></thead>
          <tbody>
            {(report?.dueNotifications || []).map((r, i) => (
              <tr key={i}>
                <td><code>{r.account_number}</code></td>
                <td>{r.notification_type}</td>
                <td>{badge(r.sent_status)}</td>
                <td>{r.due_date?.slice(0, 10)}</td>
                <td style={{ color:"var(--danger)", fontWeight:600 }}>{fmt(r.balance_due)}</td>
              </tr>
            ))}
            {!(report?.dueNotifications?.length) && <tr><td colSpan="5" className="empty">No notifications on record.</td></tr>}
          </tbody>
        </table>
      </TableCard>

      {/* Customer Balances */}
      <TableCard>
        <div className="card-title-row">
          <h3>👥 Customer Balance Summary</h3>
          <span className="muted" style={{ fontSize:".8rem" }}>Highest outstanding first</span>
        </div>
        <table>
          <thead><tr><th>Account Number</th><th>Customer Name</th><th>Outstanding Balance</th></tr></thead>
          <tbody>
            {(report?.customerBalances || []).map((r) => (
              <tr key={r.account_number}>
                <td><code>{r.account_number}</code></td>
                <td>{r.customer_name}</td>
                <td style={{ color:"var(--danger)", fontWeight:600 }}>{fmt(r.outstanding_balance)}</td>
              </tr>
            ))}
            {!(report?.customerBalances?.length) && <tr><td colSpan="3" className="empty">No balance data.</td></tr>}
          </tbody>
        </table>
      </TableCard>
    </div>
  );
}

export function ReportsPage({ user }) {
  const [report, setReport] = useState(null);
  const [error,  setError]  = useState("");
  const isCustomer = user?.role === "CUSTOMER";
  const isManager  = user?.role === "BRANCH_MANAGER";

  useEffect(() => {
    api.get("/reports").then(setReport).catch((err) => setError(err.message));
  }, []);

  const title = isCustomer ? "My Profile & Insights"
    : isManager ? "Branch Manager Insights — Reports"
    : "Advanced Reports & Analytics";

  const subtitle = isCustomer
    ? "Your personal account profile, usage history, payment records, and outstanding billing insights."
    : isManager
      ? "Daily, weekly, monthly, quarterly, and yearly billing and water usage insights for your branch."
      : "Full operational and analytical reports sourced from both PostgreSQL (primary) and MySQL (replica) distributed databases.";

  return (
    <div>
      <PageHeader title={title} subtitle={subtitle} />
      {error && <div className="alert error">⚠️ {error}</div>}
      {isCustomer
        ? <CustomerReportsView report={report} user={user} />
        : <AdminReportsView report={report} user={user} />
      }
    </div>
  );
}
