import { useEffect, useState } from "react";
import { api } from "../api";
import { FormModal } from "../components/FormModal";
import { PageHeader } from "../components/PageHeader";
import { TableCard } from "../components/TableCard";
import { useApiData } from "../hooks/useApiData";

function fmt(v) {
  if (v === null || v === undefined || v === "") return "—";
  const n = Number(v);
  if (isNaN(n)) return v;
  return `M ${n.toLocaleString("en-LS", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function statusBadge(s) {
  if (!s) return null;
  const lower = String(s).toLowerCase();
  let cls = "badge-pending";
  if (["paid"].includes(lower)) cls = "badge-paid";
  else if (["unpaid", "overdue"].includes(lower)) cls = "badge-unpaid";
  else if (["partial", "pending"].includes(lower)) cls = "badge-partial";
  return <span className={`badge ${cls}`}>{s}</span>;
}

export function BillsPage({ user }) {
  const { data: bills, reload, error } = useApiData("/bills");
  const [meta, setMeta] = useState({ usages: [], customers: [] });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ usage_id: "", due_date: "" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const isCustomer = user?.role === "CUSTOMER";
  const isAdmin = user?.role === "ADMIN";

  useEffect(() => {
    if (!isCustomer) api.get("/meta").then(setMeta).catch(() => {});
  }, [isCustomer]);

  const generate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/bills/generate", form);
      setOpen(false);
      setForm({ usage_id: "", due_date: "" });
      setMsg("Bill generated successfully!");
      reload();
    } catch (err) {
      setMsg("Error: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const visibleBills = isCustomer
    ? bills.filter((b) => String(b.customer_id) === String(user?.customer_id))
    : bills;

  const totalOutstanding = visibleBills.reduce((s, b) => s + (Number(b.balance_due) || 0), 0);
  const totalBilled = visibleBills.reduce((s, b) => s + (Number(b.total_amount) || 0), 0);
  const totalPaid = visibleBills.reduce((s, b) => s + (Number(b.amount_paid) || 0), 0);

  return (
    <div>
      <PageHeader
        title={isCustomer ? "My Bills" : "Bills Management"}
        subtitle={
          isCustomer
            ? "View your water bills, payment status, and outstanding balances."
            : "Generate and manage water bills based on recorded usage and applicable rates."
        }
        action={
          isAdmin
            ? <button className="btn primary" onClick={() => setOpen(true)}>📄 Generate Bill</button>
            : null
        }
      />

      {error && <div className="alert error">⚠️ {error}</div>}
      {msg && <div className={`alert ${msg.startsWith("Error") ? "error" : "success"}`}>{msg}</div>}

      {/* Summary row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 12, marginBottom: 18 }}>
        <div className="summary-box">
          <span className="summary-box-label">Total Billed</span>
          <span className="summary-box-value">{fmt(totalBilled)}</span>
        </div>
        <div className="summary-box">
          <span className="summary-box-label">Total Paid</span>
          <span className="summary-box-value" style={{ color: "var(--success)" }}>{fmt(totalPaid)}</span>
        </div>
        <div className="summary-box">
          <span className="summary-box-label">Outstanding Balance</span>
          <span className="summary-box-value" style={{ color: totalOutstanding > 0 ? "var(--danger)" : "var(--success)" }}>
            {fmt(totalOutstanding)}
          </span>
        </div>
      </div>

      <TableCard>
        <div className="card-title-row">
          <h3>📄 {isCustomer ? "My Bills" : "All Bills"} — {visibleBills.length} record{visibleBills.length !== 1 ? "s" : ""}</h3>
        </div>
        <table>
          <thead>
            <tr>
              <th>Account</th>
              <th>Customer Name</th>
              <th>Period</th>
              <th>Total Amount</th>
              <th>Amount Paid</th>
              <th>Balance Due</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {visibleBills.length ? visibleBills.map((bill) => (
              <tr key={bill.bill_id}>
                <td><code style={{ fontSize: ".82rem" }}>{bill.account_number}</code></td>
                <td>{bill.first_name} {bill.last_name}</td>
                <td>{bill.bill_month}/{bill.bill_year}</td>
                <td style={{ fontWeight: 600 }}>{fmt(bill.total_amount)}</td>
                <td style={{ color: "var(--success)", fontWeight: 600 }}>{fmt(bill.amount_paid)}</td>
                <td style={{ color: Number(bill.balance_due) > 0 ? "var(--danger)" : "var(--success)", fontWeight: 600 }}>
                  {fmt(bill.balance_due)}
                </td>
                <td>{statusBadge(bill.payment_status)}</td>
              </tr>
            )) : (
              <tr><td colSpan="7" className="empty">No bills found.</td></tr>
            )}
          </tbody>
        </table>
      </TableCard>

      {/* Generate bill modal (admin only) */}
      <FormModal open={open} title="Generate Bill from Usage Record" onClose={() => setOpen(false)}>
        <form className="form-grid" onSubmit={generate}>
          <label className="span-2">
            Usage Record
            <select
              value={form.usage_id}
              onChange={(e) => setForm({ ...form, usage_id: e.target.value })}
              required
            >
              <option value="">— Select a usage record —</option>
              {meta.usages.map((u) => {
                const c = meta.customers.find((x) => x.customer_id === u.customer_id);
                return (
                  <option key={u.usage_id} value={u.usage_id}>
                    {c?.account_number || u.customer_id} — {u.reading_month}/{u.reading_year} ({u.units_used || "?"} m³)
                  </option>
                );
              })}
            </select>
          </label>
          <label className="span-2">
            Due Date
            <input
              type="date"
              value={form.due_date}
              onChange={(e) => setForm({ ...form, due_date: e.target.value })}
              required
            />
          </label>
          <button className="btn primary span-2" disabled={saving}>
            {saving ? "Generating…" : "📄 Generate Bill"}
          </button>
        </form>
      </FormModal>
    </div>
  );
}
