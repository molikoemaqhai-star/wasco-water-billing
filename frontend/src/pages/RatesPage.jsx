import { useState } from "react";
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

const emptyForm = {
  customer_type: "RESIDENTIAL",
  tier_name: "",
  min_units: 0,
  max_units: "",
  cost_per_unit: 0,
  sewer_charge: 0,
  meter_charge: 0,
  effective_from: "",
  effective_to: "",
  is_active: true,
};

export function RatesPage() {
  const { data: rates, reload, error } = useApiData("/rates");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) await api.put(`/rates/${editing.rate_id}`, form);
      else await api.post("/rates", form);
      setOpen(false);
      setEditing(null);
      setForm(emptyForm);
      setMsg(editing ? "Rate updated!" : "Rate created!");
      reload();
    } catch (err) {
      setMsg("Error: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this billing rate?")) return;
    try {
      await api.delete(`/rates/${id}`);
      setMsg("Rate deleted.");
      reload();
    } catch (err) {
      setMsg("Error: " + err.message);
    }
  };

  const openEdit = (r) => { setEditing(r); setForm({ ...emptyForm, ...r }); setOpen(true); };
  const openAdd = () => { setEditing(null); setForm(emptyForm); setOpen(true); };

  const countByType = (type) => rates.filter((r) => r.customer_type === type).length;

  return (
    <div>
      <PageHeader
        title="Billing Rates"
        subtitle="Manage tiered water billing rates for residential, commercial, and institutional customers."
        action={<button className="btn primary" onClick={openAdd}>💰 Add Rate Tier</button>}
      />

      {error && <div className="alert error">⚠️ {error}</div>}
      {msg && <div className={`alert ${msg.startsWith("Error") ? "error" : "success"}`}>{msg}</div>}

      {/* Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 12, marginBottom: 18 }}>
        <div className="summary-box">
          <span className="summary-box-label">Total Rate Tiers</span>
          <span className="summary-box-value">{rates.length}</span>
        </div>
        <div className="summary-box">
          <span className="summary-box-label">Residential Tiers</span>
          <span className="summary-box-value">{countByType("RESIDENTIAL")}</span>
        </div>
        <div className="summary-box">
          <span className="summary-box-label">Commercial Tiers</span>
          <span className="summary-box-value">{countByType("COMMERCIAL")}</span>
        </div>
        <div className="summary-box">
          <span className="summary-box-label">Institutional Tiers</span>
          <span className="summary-box-value">{countByType("INSTITUTIONAL")}</span>
        </div>
      </div>

      <TableCard>
        <div className="card-title-row">
          <h3>💰 Billing Rate Tiers — {rates.length} record{rates.length !== 1 ? "s" : ""}</h3>
        </div>
        <table>
          <thead>
            <tr>
              <th>Customer Type</th>
              <th>Tier Name</th>
              <th>Usage Range (m³)</th>
              <th>Cost / Unit</th>
              <th>Sewer Charge</th>
              <th>Meter Charge</th>
              <th>Effective From</th>
              <th>Effective To</th>
              <th>Active</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rates.length ? rates.map((r) => (
              <tr key={r.rate_id}>
                <td><span style={{ fontSize: ".8rem", fontWeight: 600 }}>{r.customer_type}</span></td>
                <td><strong>{r.tier_name}</strong></td>
                <td>{r.min_units} – {r.max_units != null ? r.max_units : "Above"} m³</td>
                <td style={{ fontWeight: 600 }}>{fmt(r.cost_per_unit)}</td>
                <td>{fmt(r.sewer_charge)}</td>
                <td>{fmt(r.meter_charge)}</td>
                <td style={{ fontSize: ".82rem" }}>{r.effective_from?.slice(0, 10) || "—"}</td>
                <td style={{ fontSize: ".82rem" }}>{r.effective_to?.slice(0, 10) || "—"}</td>
                <td>
                  <span className={`badge ${r.is_active ? "badge-paid" : "badge-suspended"}`}>
                    {r.is_active ? "Yes" : "No"}
                  </span>
                </td>
                <td className="actions">
                  <button className="btn small" onClick={() => openEdit(r)}>Edit</button>
                  <button className="btn small danger" onClick={() => remove(r.rate_id)}>Delete</button>
                </td>
              </tr>
            )) : (
              <tr><td colSpan="10" className="empty">No billing rates found.</td></tr>
            )}
          </tbody>
        </table>
      </TableCard>

      <FormModal
        open={open}
        title={editing ? `Edit Rate — ${editing.tier_name}` : "Add New Billing Rate Tier"}
        onClose={() => { setOpen(false); setEditing(null); setForm(emptyForm); }}
      >
        <form className="form-grid" onSubmit={save}>
          <label>
            Customer Type
            <select value={form.customer_type} onChange={(e) => setForm({ ...form, customer_type: e.target.value })}>
              <option>RESIDENTIAL</option>
              <option>COMMERCIAL</option>
              <option>INSTITUTIONAL</option>
            </select>
          </label>
          <label>
            Tier Name
            <input placeholder="e.g. Tier 1 — Basic" value={form.tier_name} onChange={(e) => setForm({ ...form, tier_name: e.target.value })} required />
          </label>
          <label>
            Min Units (m³)
            <input type="number" step="0.01" min="0" value={form.min_units} onChange={(e) => setForm({ ...form, min_units: e.target.value })} required />
          </label>
          <label>
            Max Units (m³)
            <input type="number" step="0.01" min="0" placeholder="Leave blank for unlimited" value={form.max_units ?? ""} onChange={(e) => setForm({ ...form, max_units: e.target.value || null })} />
          </label>
          <label>
            Cost Per Unit (M)
            <input type="number" step="0.01" min="0" value={form.cost_per_unit} onChange={(e) => setForm({ ...form, cost_per_unit: e.target.value })} required />
          </label>
          <label>
            Sewer Charge (M)
            <input type="number" step="0.01" min="0" value={form.sewer_charge} onChange={(e) => setForm({ ...form, sewer_charge: e.target.value })} />
          </label>
          <label>
            Meter Charge (M)
            <input type="number" step="0.01" min="0" value={form.meter_charge} onChange={(e) => setForm({ ...form, meter_charge: e.target.value })} />
          </label>
          <label>
            Active?
            <select value={String(form.is_active)} onChange={(e) => setForm({ ...form, is_active: e.target.value === "true" })}>
              <option value="true">Yes — Active</option>
              <option value="false">No — Inactive</option>
            </select>
          </label>
          <label>
            Effective From
            <input type="date" value={form.effective_from?.slice(0, 10) || ""} onChange={(e) => setForm({ ...form, effective_from: e.target.value })} required />
          </label>
          <label>
            Effective To
            <input type="date" value={form.effective_to?.slice(0, 10) || ""} onChange={(e) => setForm({ ...form, effective_to: e.target.value })} />
          </label>
          <button className="btn primary span-2" disabled={saving}>
            {saving ? "Saving…" : (editing ? "✏️ Update Rate" : "💰 Create Rate Tier")}
          </button>
        </form>
      </FormModal>
    </div>
  );
}
