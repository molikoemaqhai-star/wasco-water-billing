import { useEffect, useState } from "react";
import { api } from "../api";
import { FormModal } from "../components/FormModal";
import { PageHeader } from "../components/PageHeader";
import { TableCard } from "../components/TableCard";
import { useApiData } from "../hooks/useApiData";

function fmtUnits(v) {
  if (v === null || v === undefined || v === "") return "—";
  const n = Number(v);
  if (isNaN(n)) return v;
  return `${n.toLocaleString(undefined, { maximumFractionDigits: 2 })} m³`;
}

const emptyForm = {
  customer_id: "",
  meter_id: "",
  reading_month: new Date().getMonth() + 1,
  reading_year: new Date().getFullYear(),
  previous_reading: 0,
  current_reading: 0,
  reading_date: new Date().toISOString().slice(0, 10),
  recorded_by: "",
};

export function UsagePage({ user }) {
  const { data: usages, reload, error } = useApiData("/usage");
  const [meta, setMeta] = useState({ customers: [], meters: [], users: [] });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const isCustomer = user?.role === "CUSTOMER";
  const isAdmin = user?.role === "ADMIN";

  useEffect(() => {
    api.get("/meta").then(setMeta).catch(() => {});
  }, []);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) await api.put(`/usage/${editing.usage_id}`, form);
      else await api.post("/usage", form);
      setOpen(false);
      setEditing(null);
      setForm(emptyForm);
      setMsg(editing ? "Usage updated!" : "Usage recorded!");
      reload();
    } catch (err) {
      setMsg("Error: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this usage record?")) return;
    try {
      await api.delete(`/usage/${id}`);
      setMsg("Usage record deleted.");
      reload();
    } catch (err) {
      setMsg("Error: " + err.message);
    }
  };

  const openEdit = (u) => {
    setEditing(u);
    setForm({ ...emptyForm, ...u });
    setOpen(true);
  };

  const filteredMeters = meta.meters.filter(
    (m) => !form.customer_id || m.customer_id === form.customer_id
  );

  const visibleUsages = isCustomer
    ? usages.filter((u) => String(u.customer_id) === String(user?.customer_id))
    : usages;

  const totalUnits = visibleUsages.reduce((s, u) => s + (Number(u.units_used) || 0), 0);

  return (
    <div>
      <PageHeader
        title={isCustomer ? "My Water Usage" : "Water Usage Records"}
        subtitle={
          isCustomer
            ? "View your monthly meter readings and water consumption history."
            : "Record and manage monthly meter readings for all customers."
        }
        action={
          isAdmin
            ? (
              <button className="btn primary" onClick={() => { setEditing(null); setForm(emptyForm); setOpen(true); }}>
                💧 Add Usage Record
              </button>
            )
            : null
        }
      />

      {error && <div className="alert error">⚠️ {error}</div>}
      {msg && <div className={`alert ${msg.startsWith("Error") ? "error" : "success"}`}>{msg}</div>}

      {/* Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 12, marginBottom: 18 }}>
        <div className="summary-box">
          <span className="summary-box-label">Total Records</span>
          <span className="summary-box-value">{visibleUsages.length}</span>
        </div>
        <div className="summary-box">
          <span className="summary-box-label">Total Usage</span>
          <span className="summary-box-value">{fmtUnits(totalUnits)}</span>
        </div>
        <div className="summary-box">
          <span className="summary-box-label">Average per Record</span>
          <span className="summary-box-value">
            {visibleUsages.length ? fmtUnits(totalUnits / visibleUsages.length) : "—"}
          </span>
        </div>
      </div>

      <TableCard>
        <div className="card-title-row">
          <h3>💧 {isCustomer ? "My Usage History" : "All Usage Records"} — {visibleUsages.length} record{visibleUsages.length !== 1 ? "s" : ""}</h3>
        </div>
        <table>
          <thead>
            <tr>
              <th>Account</th>
              <th>Customer Name</th>
              <th>Meter No.</th>
              <th>Period</th>
              <th>Prev. Reading</th>
              <th>Curr. Reading</th>
              <th>Units Used</th>
              <th>Reading Date</th>
              {isAdmin && <th></th>}
            </tr>
          </thead>
          <tbody>
            {visibleUsages.length ? visibleUsages.map((u) => (
              <tr key={u.usage_id}>
                <td><code style={{ fontSize: ".82rem" }}>{u.account_number}</code></td>
                <td>{u.first_name} {u.last_name}</td>
                <td style={{ fontSize: ".82rem" }}>{u.meter_number || "—"}</td>
                <td>{u.reading_month}/{u.reading_year}</td>
                <td>{u.previous_reading}</td>
                <td>{u.current_reading}</td>
                <td style={{ fontWeight: 600, color: "var(--primary-dark)" }}>{fmtUnits(u.units_used)}</td>
                <td>{u.reading_date?.slice(0, 10)}</td>
                {isAdmin && (
                  <td className="actions">
                    <button className="btn small" onClick={() => openEdit(u)}>Edit</button>
                    <button className="btn small danger" onClick={() => remove(u.usage_id)}>Delete</button>
                  </td>
                )}
              </tr>
            )) : (
              <tr><td colSpan={isAdmin ? 9 : 8} className="empty">No usage records found.</td></tr>
            )}
          </tbody>
        </table>
      </TableCard>

      <FormModal
        open={open}
        title={editing ? "Edit Usage Record" : "Add Usage Record"}
        onClose={() => { setOpen(false); setEditing(null); setForm(emptyForm); }}
      >
        <form className="form-grid" onSubmit={save}>
          <label>
            Customer
            <select
              value={form.customer_id}
              onChange={(e) => setForm({ ...form, customer_id: e.target.value, meter_id: "" })}
              required
            >
              <option value="">— Select customer —</option>
              {meta.customers.map((c) => (
                <option key={c.customer_id} value={c.customer_id}>
                  {c.account_number} — {c.first_name} {c.last_name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Meter
            <select
              value={form.meter_id}
              onChange={(e) => setForm({ ...form, meter_id: e.target.value })}
              required
            >
              <option value="">— Select meter —</option>
              {filteredMeters.map((m) => (
                <option key={m.meter_id} value={m.meter_id}>{m.meter_number}</option>
              ))}
            </select>
          </label>
          <label>
            Month (1–12)
            <input
              type="number" min="1" max="12"
              value={form.reading_month}
              onChange={(e) => setForm({ ...form, reading_month: e.target.value })}
              required
            />
          </label>
          <label>
            Year
            <input
              type="number" min="2000" max="2099"
              value={form.reading_year}
              onChange={(e) => setForm({ ...form, reading_year: e.target.value })}
              required
            />
          </label>
          <label>
            Previous Reading (m³)
            <input
              type="number" step="0.01" min="0"
              value={form.previous_reading}
              onChange={(e) => setForm({ ...form, previous_reading: e.target.value })}
              required
            />
          </label>
          <label>
            Current Reading (m³)
            <input
              type="number" step="0.01" min="0"
              value={form.current_reading}
              onChange={(e) => setForm({ ...form, current_reading: e.target.value })}
              required
            />
          </label>
          <label>
            Reading Date
            <input
              type="date"
              value={form.reading_date?.slice(0, 10) || ""}
              onChange={(e) => setForm({ ...form, reading_date: e.target.value })}
              required
            />
          </label>
          <label>
            Recorded By
            <select
              value={form.recorded_by || ""}
              onChange={(e) => setForm({ ...form, recorded_by: e.target.value })}
            >
              <option value="">— None —</option>
              {meta.users.map((u) => (
                <option key={u.user_id} value={u.user_id}>{u.full_name} ({u.role})</option>
              ))}
            </select>
          </label>
          <button className="btn primary span-2" disabled={saving}>
            {saving ? "Saving…" : (editing ? "✏️ Update Usage" : "💧 Add Usage Record")}
          </button>
        </form>
      </FormModal>
    </div>
  );
}
