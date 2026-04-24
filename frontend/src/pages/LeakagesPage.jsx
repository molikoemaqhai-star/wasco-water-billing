import { useEffect, useState } from "react";
import { api } from "../api";
import { FormModal } from "../components/FormModal";
import { PageHeader } from "../components/PageHeader";
import { TableCard } from "../components/TableCard";
import { useApiData } from "../hooks/useApiData";

function severityBadge(s) {
  if (!s) return null;
  const l = String(s).toLowerCase();
  let cls = "badge-pending";
  if (l === "high") cls = "badge-unpaid";
  else if (l === "medium") cls = "badge-partial";
  else if (l === "low") cls = "badge-paid";
  return <span className={`badge ${cls}`}>{s}</span>;
}

function statusBadge(s) {
  if (!s) return null;
  const l = String(s).toLowerCase();
  let cls = "badge-pending";
  if (l === "resolved" || l === "closed") cls = "badge-paid";
  else if (l === "open") cls = "badge-unpaid";
  else if (l === "in_progress") cls = "badge-partial";
  return <span className={`badge ${cls}`}>{s}</span>;
}

const emptyForm = {
  customer_id: "",
  branch_id: "",
  report_title: "",
  description: "",
  location_description: "",
  report_status: "OPEN",
  severity: "MEDIUM",
};

export function LeakagesPage({ user }) {
  const { data: leakages, reload, error } = useApiData("/leakages");
  const [meta, setMeta] = useState({ branches: [], customers: [] });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const isCustomer = user?.role === "CUSTOMER";

  useEffect(() => {
    api.get("/meta").then(setMeta).catch(() => {});
  }, []);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = { ...form };
    if (isCustomer) {
      payload.customer_id = user?.customer_id || "";
    }
    try {
      if (editing) await api.put(`/leakages/${editing.report_id}`, payload);
      else await api.post("/leakages", payload);
      setOpen(false);
      setEditing(null);
      setForm(emptyForm);
      setMsg(editing ? "Report updated!" : "Leakage reported successfully!");
      reload();
    } catch (err) {
      setMsg("Error: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this leakage report?")) return;
    try {
      await api.delete(`/leakages/${id}`);
      setMsg("Report deleted.");
      reload();
    } catch (err) {
      setMsg("Error: " + err.message);
    }
  };

  const openEdit = (r) => { setEditing(r); setForm({ ...emptyForm, ...r }); setOpen(true); };

  const countByStatus = (s) => leakages.filter((r) => r.report_status === s).length;

  return (
    <div>
      <PageHeader
        title={isCustomer ? "Report a Leakage" : "Leakage Reports"}
        subtitle={
          isCustomer
            ? "Submit a water leakage report for your area and track its resolution status."
            : "Track, manage, and resolve water leakage reports across all districts."
        }
        action={
          <button className="btn primary" onClick={() => { setEditing(null); setForm(emptyForm); setOpen(true); }}>
            🔧 {isCustomer ? "Report Leakage" : "Add Report"}
          </button>
        }
      />

      {error && <div className="alert error">⚠️ {error}</div>}
      {msg && <div className={`alert ${msg.startsWith("Error") ? "error" : "success"}`}>{msg}</div>}

      {/* Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 12, marginBottom: 18 }}>
        <div className="summary-box">
          <span className="summary-box-label">Total Reports</span>
          <span className="summary-box-value">{leakages.length}</span>
        </div>
        <div className="summary-box">
          <span className="summary-box-label">Open</span>
          <span className="summary-box-value" style={{ color: "var(--danger)" }}>{countByStatus("OPEN")}</span>
        </div>
        <div className="summary-box">
          <span className="summary-box-label">In Progress</span>
          <span className="summary-box-value" style={{ color: "var(--warning)" }}>{countByStatus("IN_PROGRESS")}</span>
        </div>
        <div className="summary-box">
          <span className="summary-box-label">Resolved</span>
          <span className="summary-box-value" style={{ color: "var(--success)" }}>{countByStatus("RESOLVED")}</span>
        </div>
      </div>

      <TableCard>
        <div className="card-title-row">
          <h3>🔧 Leakage Reports — {leakages.length} total</h3>
        </div>
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Branch</th>
              <th>Customer</th>
              <th>Location</th>
              <th>Severity</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {leakages.length ? leakages.map((r) => (
              <tr key={r.report_id}>
                <td><strong>{r.report_title}</strong></td>
                <td>{r.branch_name || "—"}</td>
                <td style={{ fontSize: ".85rem" }}>
                  {r.account_number
                    ? `${r.account_number} — ${r.first_name} ${r.last_name}`
                    : <span className="muted">Public / Unlinked</span>}
                </td>
                <td style={{ fontSize: ".82rem", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {r.location_description || "—"}
                </td>
                <td>{severityBadge(r.severity)}</td>
                <td>{statusBadge(r.report_status)}</td>
                <td className="actions">
                  <button className="btn small" onClick={() => openEdit(r)}>Edit</button>
                  {!isCustomer && (
                    <button className="btn small danger" onClick={() => remove(r.report_id)}>Delete</button>
                  )}
                </td>
              </tr>
            )) : (
              <tr><td colSpan="7" className="empty">No leakage reports found.</td></tr>
            )}
          </tbody>
        </table>
      </TableCard>

      <FormModal
        open={open}
        title={editing ? "Edit Leakage Report" : "Submit Leakage Report"}
        onClose={() => { setOpen(false); setEditing(null); setForm(emptyForm); }}
      >
        <form className="form-grid" onSubmit={save}>
          <label>
            Branch
            <select value={form.branch_id} onChange={(e) => setForm({ ...form, branch_id: e.target.value })} required>
              <option value="">— Select branch —</option>
              {meta.branches.map((b) => (
                <option key={b.branch_id} value={b.branch_id}>{b.branch_name}</option>
              ))}
            </select>
          </label>
          {!isCustomer && (
            <label>
              Linked Customer
              <select value={form.customer_id || ""} onChange={(e) => setForm({ ...form, customer_id: e.target.value })}>
                <option value="">— None / Public —</option>
                {meta.customers.map((c) => (
                  <option key={c.customer_id} value={c.customer_id}>
                    {c.account_number} — {c.first_name} {c.last_name}
                  </option>
                ))}
              </select>
            </label>
          )}
          {isCustomer && <div />}
          <label className="span-2">
            Report Title
            <input
              placeholder="Brief description of the leakage"
              value={form.report_title}
              onChange={(e) => setForm({ ...form, report_title: e.target.value })}
              required
            />
          </label>
          <label className="span-2">
            Full Description
            <textarea
              rows="3"
              placeholder="Detailed description of the leakage issue…"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              required
            />
          </label>
          <label className="span-2">
            Location Description
            <textarea
              rows="2"
              placeholder="Street name, landmark, or GPS coordinates…"
              value={form.location_description}
              onChange={(e) => setForm({ ...form, location_description: e.target.value })}
              required
            />
          </label>
          <label>
            Severity
            <select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })}>
              <option>LOW</option>
              <option>MEDIUM</option>
              <option>HIGH</option>
            </select>
          </label>
          <label>
            Status
            <select value={form.report_status} onChange={(e) => setForm({ ...form, report_status: e.target.value })}>
              <option>OPEN</option>
              <option>IN_PROGRESS</option>
              <option>RESOLVED</option>
              <option>CLOSED</option>
            </select>
          </label>
          <button className="btn primary span-2" disabled={saving}>
            {saving ? "Saving…" : (editing ? "✏️ Update Report" : "🔧 Submit Report")}
          </button>
        </form>
      </FormModal>
    </div>
  );
}
