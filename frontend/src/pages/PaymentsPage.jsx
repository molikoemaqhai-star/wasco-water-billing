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
  const l = String(s).toLowerCase();
  let cls = "badge-pending";
  if (l === "success") cls = "badge-paid";
  else if (l === "failed") cls = "badge-unpaid";
  return <span className={`badge ${cls}`}>{s}</span>;
}

const emptyForm = {
  bill_id: "",
  customer_id: "",
  payment_date: new Date().toISOString().slice(0, 10),
  amount_paid: "",
  payment_method: "CASH",
  transaction_reference: "",
  payment_status: "SUCCESS",
  received_by: "",
};

export function PaymentsPage({ user }) {
  const { data: payments, reload, error } = useApiData("/payments");
  const [meta, setMeta] = useState({ bills: [], customers: [], users: [] });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const isCustomer = user?.role === "CUSTOMER";
  const isAdmin = user?.role === "ADMIN";

  useEffect(() => {
    api.get("/meta").then(setMeta).catch(() => {});
  }, []);

  const selectedBill = meta.bills.find((b) => b.bill_id === form.bill_id);

  useEffect(() => {
    if (selectedBill) {
      setForm((prev) => ({
        ...prev,
        customer_id: selectedBill.customer_id,
        amount_paid: selectedBill.balance_due || "",
      }));
    }
  }, [form.bill_id]);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/payments", form);
      setOpen(false);
      setForm(emptyForm);
      setMsg("Payment recorded successfully!");
      reload();
    } catch (err) {
      setMsg("Error: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const visiblePayments = isCustomer
    ? payments.filter((p) => String(p.customer_id) === String(user?.customer_id))
    : payments;

  const totalReceived = visiblePayments.reduce((s, p) => {
    if (p.payment_status === "SUCCESS") return s + (Number(p.amount_paid) || 0);
    return s;
  }, 0);

  const customerBills = isCustomer
    ? meta.bills.filter((b) => String(b.customer_id) === String(user?.customer_id))
    : meta.bills;

  return (
    <div>
      <PageHeader
        title={isCustomer ? "My Payments" : "Payments Management"}
        subtitle={
          isCustomer
            ? "View your payment history and make payments on outstanding bills."
            : "Record customer payments and track payment history across all accounts."
        }
        action={
          <button className="btn primary" onClick={() => setOpen(true)}>
            💳 Record Payment
          </button>
        }
      />

      {error && <div className="alert error">⚠️ {error}</div>}
      {msg && <div className={`alert ${msg.startsWith("Error") ? "error" : "success"}`}>{msg}</div>}

      {/* Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 12, marginBottom: 18 }}>
        <div className="summary-box">
          <span className="summary-box-label">Total Payments</span>
          <span className="summary-box-value">{visiblePayments.length}</span>
        </div>
        <div className="summary-box">
          <span className="summary-box-label">Total Received</span>
          <span className="summary-box-value" style={{ color: "var(--success)" }}>{fmt(totalReceived)}</span>
        </div>
        <div className="summary-box">
          <span className="summary-box-label">Successful Payments</span>
          <span className="summary-box-value">{visiblePayments.filter((p) => p.payment_status === "SUCCESS").length}</span>
        </div>
      </div>

      <TableCard>
        <div className="card-title-row">
          <h3>💳 {isCustomer ? "My Payment History" : "All Payments"} — {visiblePayments.length} record{visiblePayments.length !== 1 ? "s" : ""}</h3>
        </div>
        <table>
          <thead>
            <tr>
              <th>Account</th>
              <th>Customer</th>
              <th>Date</th>
              <th>Amount Paid</th>
              <th>Method</th>
              <th>Reference</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {visiblePayments.length ? visiblePayments.map((p) => (
              <tr key={p.payment_id}>
                <td><code style={{ fontSize: ".82rem" }}>{p.account_number}</code></td>
                <td>{p.first_name} {p.last_name}</td>
                <td>{p.payment_date?.slice(0, 10)}</td>
                <td style={{ fontWeight: 600, color: "var(--success)" }}>{fmt(p.amount_paid)}</td>
                <td>{p.payment_method}</td>
                <td style={{ fontSize: ".82rem", color: "var(--muted)" }}>{p.transaction_reference || "—"}</td>
                <td>{statusBadge(p.payment_status)}</td>
              </tr>
            )) : (
              <tr><td colSpan="7" className="empty">No payments found.</td></tr>
            )}
          </tbody>
        </table>
      </TableCard>

      {/* Payment form */}
      <FormModal open={open} title="Record Payment" onClose={() => { setOpen(false); setForm(emptyForm); }}>
        <form className="form-grid" onSubmit={save}>
          <label className="span-2">
            Select Bill
            <select
              value={form.bill_id}
              onChange={(e) => setForm({ ...form, bill_id: e.target.value })}
              required
            >
              <option value="">— Choose a bill —</option>
              {customerBills.map((b) => {
                const c = meta.customers.find((x) => x.customer_id === b.customer_id);
                return (
                  <option key={b.bill_id} value={b.bill_id}>
                    {c?.account_number || b.customer_id} — Balance: M{Number(b.balance_due || 0).toFixed(2)}
                  </option>
                );
              })}
            </select>
          </label>

          {selectedBill && (
            <div className="span-2" style={{
              background: "var(--sky)", border: "1px solid #b8e4f7",
              borderRadius: 10, padding: "10px 14px", fontSize: ".85rem",
              display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6,
            }}>
              <span>Total Amount: <strong>M{Number(selectedBill.total_amount || 0).toFixed(2)}</strong></span>
              <span>Balance Due: <strong style={{ color: "var(--danger)" }}>M{Number(selectedBill.balance_due || 0).toFixed(2)}</strong></span>
            </div>
          )}

          <label>
            Payment Date
            <input
              type="date"
              value={form.payment_date}
              onChange={(e) => setForm({ ...form, payment_date: e.target.value })}
              required
            />
          </label>
          <label>
            Amount (M)
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={form.amount_paid}
              onChange={(e) => setForm({ ...form, amount_paid: e.target.value })}
              required
            />
          </label>
          <label>
            Payment Method
            <select
              value={form.payment_method}
              onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
            >
              <option>CASH</option>
              <option>CARD</option>
              <option>MOBILE_MONEY</option>
              <option>BANK_TRANSFER</option>
            </select>
          </label>
          <label>
            Transaction Reference
            <input
              placeholder="e.g. TXN-20240101-001"
              value={form.transaction_reference}
              onChange={(e) => setForm({ ...form, transaction_reference: e.target.value })}
            />
          </label>
          <label>
            Payment Status
            <select
              value={form.payment_status}
              onChange={(e) => setForm({ ...form, payment_status: e.target.value })}
            >
              <option>SUCCESS</option>
              <option>PENDING</option>
              <option>FAILED</option>
            </select>
          </label>
          {!isCustomer && (
            <label>
              Received By
              <select
                value={form.received_by}
                onChange={(e) => setForm({ ...form, received_by: e.target.value })}
              >
                <option value="">— None / Self —</option>
                {meta.users.map((u) => (
                  <option key={u.user_id} value={u.user_id}>{u.full_name} ({u.role})</option>
                ))}
              </select>
            </label>
          )}
          <button className="btn primary span-2" disabled={saving}>
            {saving ? "Saving…" : "💳 Save Payment"}
          </button>
        </form>
      </FormModal>
    </div>
  );
}
