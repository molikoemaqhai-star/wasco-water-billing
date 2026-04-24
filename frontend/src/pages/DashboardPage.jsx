import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { PageHeader } from "../components/PageHeader";
import { StatCard } from "../components/StatCard";
import { TableCard } from "../components/TableCard";

function fmt(v) {
  if (v === null || v === undefined || v === "") return "—";
  const n = Number(v);
  if (isNaN(n)) return v;
  return `M ${n.toLocaleString("en-LS", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function fmtUnits(v) {
  if (v === null || v === undefined || v === "") return "—";
  const n = Number(v);
  if (isNaN(n)) return v;
  return `${n.toLocaleString(undefined, { maximumFractionDigits: 2 })} m³`;
}
function badge(s) {
  if (!s) return null;
  const l = String(s).toLowerCase();
  let cls = "badge-pending";
  if (["paid","active","success","resolved"].includes(l)) cls = "badge-paid";
  else if (["unpaid","overdue","failed","open"].includes(l)) cls = "badge-unpaid";
  else if (["partial","pending","in_progress"].includes(l)) cls = "badge-partial";
  else if (["suspended","disconnected","closed"].includes(l)) cls = "badge-suspended";
  return <span className={`badge ${cls}`}>{s}</span>;
}

function periodDefault() {
  return [
    { period: "Daily", usage_units: 0, billed_amount: 0, collected_amount: 0 },
    { period: "Weekly", usage_units: 0, billed_amount: 0, collected_amount: 0 },
    { period: "Monthly", usage_units: 0, billed_amount: 0, collected_amount: 0 },
    { period: "Quarterly", usage_units: 0, billed_amount: 0, collected_amount: 0 },
    { period: "Yearly", usage_units: 0, billed_amount: 0, collected_amount: 0 },
  ];
}

/* ────── ADMIN / MANAGER ────── */
function AdminDashboardView({ stats, report, user }) {
  const balances = (report?.customerBalances || []).slice(0, 5);
  const notices  = (report?.dueNotifications || []).slice(0, 5);
  const branchRows = (report?.branchSummary || []).slice(0, 8);
  const monthlyBills = (report?.monthlyBills || []).slice(0, 6);
  const isManager = user?.role === "BRANCH_MANAGER";
  const totalBilled = Number(stats?.bills || 0);
  const collected   = Number(stats?.revenue || 0);
  const paidPct = totalBilled > 0 ? Math.min(100, Math.round((collected / totalBilled) * 100)) : 67;

  return (
    <>
      <PageHeader
        title={isManager ? "Branch Manager Dashboard" : "Administrator Dashboard"}
        subtitle={
          isManager
            ? `Welcome, ${user?.full_name || "Manager"}! Daily, weekly, monthly, quarterly and yearly insights for your branch.`
            : `Welcome back, ${user?.full_name || "Admin"}! Here is your full operational overview of WASCO billing.`
        }
        action={<div className="date-chip">📅 {new Date().toLocaleDateString("en-LS", { dateStyle: "full" })}</div>}
      />

      {/* ── Stat cards ── */}
      <div className="stats-grid">
        <StatCard label="Total Customers"       value={stats?.customers ?? "—"}    tone="sky"    icon="👥" sub="All registered accounts" />
        <StatCard label="Bills This Month"       value={fmt(stats?.bills ?? 0)}     tone="blue"   icon="📄" sub="Generated & outstanding" />
        <StatCard label="Outstanding Balance"    value={fmt(stats?.outstanding ?? 0)} tone="orange" icon="⚠️" sub="Total unpaid balance" />
        <StatCard label="Revenue Collected"      value={fmt(stats?.revenue ?? 0)}   tone="green"  icon="💰" sub="Total payments received" />
        <StatCard label="Open Leakage Reports"   value={stats?.openLeakages ?? "—"} tone="red"    icon="🔧" sub="Pending resolution" />
      </div>

      {/* ── Main dashboard grid ── */}
      <div className="dashboard-grid">
        {/* Usage line chart */}
        <TableCard>
          <div className="card-title-row">
            <h3>💧 Monthly Water Usage Overview</h3>
            <span className="insight-badge">Live Data</span>
          </div>
          <div className="chart-placeholder">
            <div className="chart-line">
              <svg viewBox="0 0 600 200" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#1ea8de" stopOpacity=".28" />
                    <stop offset="100%" stopColor="#1ea8de" stopOpacity="0"   />
                  </linearGradient>
                </defs>
                <polygon fill="url(#lineGrad)"
                  points="0,200 20,156 100,110 180,118 260,124 340,76 420,120 500,112 580,136 600,200" />
                <polyline fill="none" stroke="#1ea8de" strokeWidth="3" strokeLinejoin="round"
                  points="20,156 100,110 180,118 260,124 340,76 420,120 500,112 580,136" />
                {[20,100,180,260,340,420,500,580].map((x, i) => {
                  const ys = [156,110,118,124,76,120,112,136];
                  return <circle key={i} cx={x} cy={ys[i]} r="5" fill="#1ea8de" stroke="#fff" strokeWidth="2" />;
                })}
                {["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug"].map((m, i) => {
                  const xs = [20,100,180,260,340,420,500,580];
                  return <text key={i} x={xs[i]} y="196" textAnchor="middle" fontSize="12" fill="#5d7990">{m}</text>;
                })}
              </svg>
            </div>
          </div>
          <div style={{ display:"flex", justifyContent:"flex-end", marginTop: 8, gap: 16, fontSize:".8rem", color:"var(--muted)" }}>
            <span>Current Month Usage: <strong style={{color:"var(--primary-dark)"}}>{fmtUnits(stats?.currentMonthUsage || 0)}</strong></span>
            <span>Total Payments: <strong style={{color:"var(--success)"}}>{stats?.payments ?? 0}</strong></span>
          </div>
        </TableCard>

        {/* Right side stacked */}
        <div className="stacked-cards">
          {/* Bills donut */}
          <TableCard>
            <div className="card-title-row">
              <h3>📊 Bills Payment Status</h3>
              <span className="insight-badge">This Month</span>
            </div>
            <div className="donut-card compact">
              <div className="donut"
                style={{ background:`conic-gradient(#1ea8de 0 ${paidPct}%,#9bc8e6 ${paidPct}% 100%)` }} />
              <div className="donut-legend">
                <div className="legend-row">
                  <span className="legend-dot paid" />
                  Paid <strong style={{ marginLeft:"auto" }}>{paidPct}%</strong>
                </div>
                <div className="legend-row">
                  <span className="legend-dot unpaid" />
                  Unpaid <strong style={{ marginLeft:"auto" }}>{100 - paidPct}%</strong>
                </div>
                <div style={{ fontSize:".8rem", color:"var(--muted)", marginTop: 4 }}>
                  Total Billed: <strong>{fmt(totalBilled)}</strong>
                </div>
                <div style={{ fontSize:".8rem", color:"var(--muted)" }}>
                  Collected: <strong style={{color:"var(--success)"}}>{fmt(collected)}</strong>
                </div>
              </div>
            </div>
          </TableCard>

          {/* Notifications */}
          <TableCard>
            <div className="card-title-row">
              <h3>🔔 Bill Notifications</h3>
              <span className="muted" style={{ fontSize:".8rem" }}>Latest {notices.length}</span>
            </div>
            <div className="recent-list">
              {notices.length ? notices.map((r, i) => (
                <div className="recent-item" key={`${r.account_number}-${i}`}>
                  <div>
                    <strong>{r.notification_type} — {r.account_number}</strong>
                    <small>{r.sent_status} · Balance: {fmt(r.balance_due)}</small>
                  </div>
                  <small style={{ whiteSpace:"nowrap" }}>{r.due_date?.slice(0,10) || "—"}</small>
                </div>
              )) : <div className="empty">No pending notifications.</div>}
            </div>
          </TableCard>
        </div>
      </div>

      {/* ── Lower report grid ── */}
      <div className="report-grid lower-grid">
        {/* Branch summary */}
        <TableCard>
          <div className="card-title-row">
            <h3>🏢 Branch / District Performance</h3>
            <span className="muted" style={{ fontSize:".8rem" }}>All {branchRows.length} branches</span>
          </div>
          <table>
            <thead>
              <tr>
                <th>Branch Name</th>
                <th>Customers</th>
                <th>Usage (m³)</th>
                <th>Total Billed</th>
                <th>Collected</th>
              </tr>
            </thead>
            <tbody>
              {branchRows.length ? branchRows.map((r) => (
                <tr key={r.branch_name}>
                  <td><strong>{r.branch_name}</strong></td>
                  <td>{r.customers}</td>
                  <td>{fmtUnits(r.total_units)}</td>
                  <td>{fmt(r.total_billed)}</td>
                  <td style={{ color:"var(--success)", fontWeight:600 }}>{fmt(r.total_paid)}</td>
                </tr>
              )) : <tr><td colSpan="5" className="empty">No branch data available.</td></tr>}
            </tbody>
          </table>
        </TableCard>

        {/* Outstanding balances */}
        <TableCard>
          <div className="card-title-row">
            <h3>⚠️ Top Outstanding Balances</h3>
            <span className="muted" style={{ fontSize:".8rem" }}>Highest first</span>
          </div>
          <table>
            <thead>
              <tr>
                <th>Account No.</th>
                <th>Customer Name</th>
                <th>Balance Due</th>
              </tr>
            </thead>
            <tbody>
              {balances.length ? balances.map((r) => (
                <tr key={r.account_number}>
                  <td><code>{r.account_number}</code></td>
                  <td>{r.customer_name}</td>
                  <td style={{ color:"var(--danger)", fontWeight:600 }}>{fmt(r.outstanding_balance)}</td>
                </tr>
              )) : <tr><td colSpan="3" className="empty">No outstanding balances. ✅</td></tr>}
            </tbody>
          </table>
        </TableCard>

        {/* Monthly bills summary */}
        <TableCard>
          <div className="card-title-row">
            <h3>📅 Monthly Bills Summary</h3>
            <span className="insight-badge">Last 6 months</span>
          </div>
          <table>
            <thead>
              <tr>
                <th>Period (Mon/Year)</th>
                <th>Bills Count</th>
                <th>Total Billed</th>
              </tr>
            </thead>
            <tbody>
              {monthlyBills.length ? monthlyBills.map((r) => (
                <tr key={`${r.bill_year}-${r.bill_month}`}>
                  <td>{r.bill_month}/{r.bill_year}</td>
                  <td>{r.bills_count}</td>
                  <td style={{ fontWeight:600 }}>{fmt(r.total_billed)}</td>
                </tr>
              )) : <tr><td colSpan="3" className="empty">No monthly bill data.</td></tr>}
            </tbody>
          </table>
        </TableCard>

        {/* Usage by customer type */}
        <TableCard>
          <div className="card-title-row">
            <h3>🏠 Water Usage by Customer Type</h3>
          </div>
          <table>
            <thead>
              <tr>
                <th>Customer Type</th>
                <th>Total Usage (m³)</th>
              </tr>
            </thead>
            <tbody>
              {(report?.usageByType || []).length
                ? (report.usageByType || []).map((r) => (
                  <tr key={r.customer_type}>
                    <td><strong>{r.customer_type}</strong></td>
                    <td style={{ fontWeight:600, color:"var(--primary-dark)" }}>{fmtUnits(r.total_units)}</td>
                  </tr>
                ))
                : <tr><td colSpan="2" className="empty">No usage type data.</td></tr>}
            </tbody>
          </table>
        </TableCard>
      </div>
    </>
  );
}

/* ────── CUSTOMER ────── */
function CustomerDashboardView({ stats, report, user }) {
  const navigate = useNavigate();
  const latestBill    = (report?.outstanding || [])[0] || null;
  const recentPayments = (report?.recentPayments || []).slice(0, 5);
  const paymentMethods = (report?.paymentsByMethod || []).slice(0, 5);
  const period = (report?.periodSummary || []).length ? report.periodSummary : periodDefault();
  const maxUsage = Math.max(...period.map((r) => Number(r.usage_units) || 0), 1);

  return (
    <>
      <PageHeader
        title="My Account Dashboard"
        subtitle={`Welcome, ${user?.full_name || "Customer"}! Here is your complete water usage and billing summary.`}
        action={<div className="date-chip">📅 {new Date().toLocaleDateString("en-LS", { dateStyle: "long" })}</div>}
      />

      {/* Account summary */}
      <div className="customer-summary">
        <div className="summary-box">
          <span className="summary-box-label">Account Number</span>
          <span className="summary-box-value" style={{ fontSize:"1rem", color:"var(--primary-dark)" }}>{user?.account_number || "—"}</span>
        </div>
        <div className="summary-box">
          <span className="summary-box-label">Account Type</span>
          <span className="summary-box-value">{user?.customer_type || "RESIDENTIAL"}</span>
        </div>
        <div className="summary-box">
          <span className="summary-box-label">Outstanding Balance</span>
          <span className="summary-box-value" style={{ color:"var(--danger)" }}>
            {fmt(stats?.outstanding || latestBill?.balance_due || 0)}
          </span>
        </div>
        <div className="summary-box">
          <span className="summary-box-label">Connection Status</span>
          <span className="summary-box-value" style={{ color:"var(--success)" }}>ACTIVE ✓</span>
        </div>
      </div>

      <div className="customer-grid">
        {/* Latest bill card */}
        <TableCard>
          <h3 style={{ margin:"0 0 16px", fontSize:"1rem", fontWeight:700 }}>📄 Latest Bill</h3>
          <div className="bill-focus">
            <div>
              <div className="bill-amount-label">Total Amount Due</div>
              <div className="bill-amount-display">{fmt(latestBill?.balance_due || stats?.outstanding || 0)}</div>
            </div>
            <div className="bill-meta">
              <div className="bill-meta-item">
                <span>Bill Period</span>
                <strong>{latestBill ? `${latestBill.bill_month || "—"}/${latestBill.bill_year || "—"}` : "No current bill"}</strong>
              </div>
              <div className="bill-meta-item">
                <span>Payment Status</span>
                <strong>{badge(latestBill?.payment_status || "ACTIVE")}</strong>
              </div>
              <div className="bill-meta-item">
                <span>Total Billed</span>
                <strong>{fmt(latestBill?.total_amount || 0)}</strong>
              </div>
              <div className="bill-meta-item">
                <span>Amount Paid</span>
                <strong style={{ color:"var(--success)" }}>{fmt(latestBill?.amount_paid || 0)}</strong>
              </div>
            </div>
            <button className="btn primary full" onClick={() => navigate("/payments")}>💳 Pay Bill Now</button>
            <button className="btn full" onClick={() => navigate("/bills")}>📄 View All My Bills</button>
          </div>
        </TableCard>

        {/* Usage bar chart */}
        <TableCard>
          <div className="card-title-row">
            <h3>💧 My Water Usage — All Periods</h3>
            <span className="insight-badge">Summary</span>
          </div>
          <div className="bar-chart">
            {period.map((row, i) => {
              const h = Math.max(18, Math.round((Number(row.usage_units) / maxUsage) * 120));
              return (
                <div className="bar-item" key={`${row.period}-${i}`}>
                  <div className="bar" style={{ height: h }} title={`${row.period}: ${fmtUnits(row.usage_units)}`} />
                  <span className="bar-label">{row.period?.slice(0, 3)}</span>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 12, display:"grid", gap: 5 }}>
            {period.map((row, i) => (
              <div key={i} style={{ display:"flex", justifyContent:"space-between", fontSize:".82rem", color:"var(--muted)", padding:"3px 0", borderBottom:"1px solid var(--line)" }}>
                <span style={{ fontWeight:600 }}>{row.period}</span>
                <span>{fmtUnits(row.usage_units)}</span>
                <span style={{ color:"var(--primary-dark)" }}>{fmt(row.billed_amount)}</span>
              </div>
            ))}
          </div>
        </TableCard>
      </div>

      {/* Quick actions + recent payments */}
      <div className="customer-grid lower-grid">
        <TableCard>
          <h3 style={{ margin:"0 0 14px", fontSize:"1rem", fontWeight:700 }}>⚡ Quick Actions</h3>
          <div className="quick-actions">
            {[
              ["💳","Pay My Bill","/payments"],
              ["📄","View All Bills","/bills"],
              ["💧","View Water Usage","/usage"],
              ["🔧","Report a Leakage","/leakages"],
              ["👤","My Profile & Insights","/reports"],
            ].map(([icon, label, path]) => (
              <div className="action-link" key={path} onClick={() => navigate(path)}>
                <div className="action-link-left">
                  <span>{icon}</span>
                  <span>{label}</span>
                </div>
                <strong style={{ fontSize:"1.1rem", color:"var(--primary)" }}>›</strong>
              </div>
            ))}
          </div>
        </TableCard>

        <TableCard>
          <h3 style={{ margin:"0 0 14px", fontSize:"1rem", fontWeight:700 }}>💳 Recent Payment History</h3>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Method</th>
                <th>Amount Paid</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentPayments.length ? recentPayments.map((r, i) => (
                <tr key={`${r.payment_date}-${i}`}>
                  <td>{r.payment_date?.slice(0, 10)}</td>
                  <td>{r.payment_method}</td>
                  <td style={{ fontWeight:600, color:"var(--success)" }}>{fmt(r.amount_paid)}</td>
                  <td>{badge(r.payment_status || "SUCCESS")}</td>
                </tr>
              )) : <tr><td colSpan="4" className="empty">No payment history yet.</td></tr>}
            </tbody>
          </table>
        </TableCard>
      </div>

      {/* Usage vs Billing + Methods */}
      <div className="report-grid lower-grid">
        <TableCard>
          <h3 style={{ margin:"0 0 14px", fontSize:"1rem", fontWeight:700 }}>📅 Usage vs Billing by Period</h3>
          <table>
            <thead>
              <tr>
                <th>Period</th>
                <th>Usage (m³)</th>
                <th>Amount Billed</th>
                <th>Amount Collected</th>
              </tr>
            </thead>
            <tbody>
              {period.map((r, i) => (
                <tr key={i}>
                  <td><strong>{r.period}</strong></td>
                  <td>{fmtUnits(r.usage_units)}</td>
                  <td>{fmt(r.billed_amount)}</td>
                  <td style={{ color:"var(--success)", fontWeight:600 }}>{fmt(r.collected_amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableCard>

        <TableCard>
          <h3 style={{ margin:"0 0 14px", fontSize:"1rem", fontWeight:700 }}>📊 Payments by Method</h3>
          <table>
            <thead>
              <tr>
                <th>Payment Method</th>
                <th>Transactions</th>
                <th>Total Paid</th>
              </tr>
            </thead>
            <tbody>
              {paymentMethods.length ? paymentMethods.map((r) => (
                <tr key={r.payment_method}>
                  <td><strong>{r.payment_method}</strong></td>
                  <td>{r.total_payments}</td>
                  <td style={{ fontWeight:600, color:"var(--success)" }}>{fmt(r.total_amount)}</td>
                </tr>
              )) : <tr><td colSpan="3" className="empty">No payment method data.</td></tr>}
            </tbody>
          </table>
        </TableCard>
      </div>
    </>
  );
}

/* ────── MAIN ────── */
export function DashboardPage({ user }) {
  const [stats, setStats]   = useState(null);
  const [report, setReport] = useState(null);
  const [error, setError]   = useState("");

  useEffect(() => {
    Promise.all([api.get("/dashboard"), api.get("/reports")])
      .then(([dashboard, reports]) => { setStats(dashboard); setReport(reports); })
      .catch((err) => setError(err.message));
  }, []);

  return (
    <div>
      {error && <div className="alert error">⚠️ {error}</div>}
      {user?.role === "CUSTOMER"
        ? <CustomerDashboardView stats={stats} report={report} user={user} />
        : <AdminDashboardView   stats={stats} report={report} user={user} />
      }
    </div>
  );
}
