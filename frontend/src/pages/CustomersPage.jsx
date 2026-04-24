import { useEffect, useState } from "react";
import { api } from "../api";
import { FormModal } from "../components/FormModal";
import { PageHeader } from "../components/PageHeader";
import { TableCard } from "../components/TableCard";
import { useApiData } from "../hooks/useApiData";

const DISTRICTS = [
  "Maseru","Leribe","Berea","Mafeteng","Mohale's Hoek","Quthing",
  "Qacha's Nek","Mokhotlong","Thaba-Tseka","Butha-Buthe"
];

const emptyForm = {
  branch_id: "",
  account_number: "",
  customer_type: "RESIDENTIAL",
  first_name: "",
  last_name: "",
  phone: "",
  email: "",
  national_id: "",
  address_line1: "",
  address_line2: "",
  district: "",
  village_town: "",
  connection_status: "ACTIVE",
};

function statusBadge(s) {
  if (!s) return null;
  const l = String(s).toLowerCase();
  let cls = "badge-pending";
  if (l === "active") cls = "badge-paid";
  else if (l === "suspended") cls = "badge-partial";
  else if (l === "disconnected") cls = "badge-suspended";
  return <span className={`badge ${cls}`}>{s}</span>;
}

export function CustomersPage({ user }) {
  const { data: customers, reload, error, loading } = useApiData("/customers");
  const [meta, setMeta] = useState({ branches: [] });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    api.get("/meta").then(setMeta).catch(() => {});
  }, []);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) await api.put(`/customers/${editing.customer_id}`, form);
      else await api.post("/customers", form);
      setOpen(false);
      setEditing(null);
      setForm(emptyForm);
      setMsg(editing ? "Customer updated!" : "Customer created!");
      reload();
    } catch (err) {
      setMsg("Error: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this customer? This cannot be undone.")) return;
    try {
      await api.delete(`/customers/${id}`);
      setMsg("Customer deleted.");
      reload();
    } catch (err) {
      setMsg("Error: " + err.message);
    }
  };

  const openAdd = () => { setEditing(null); setForm(emptyForm); setOpen(true); };
  const openEdit = (c) => { setEditing(c); setForm({ ...emptyForm, ...c }); setOpen(true); };

  const filtered = customers.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (c.account_number || "").toLowerCase().includes(q) ||
      (c.first_name || "").toLowerCase().includes(q) ||
      (c.last_name || "").toLowerCase().includes(q) ||
      (c.phone || "").toLowerCase().includes(q) ||
      (c.email || "").toLowerCase().includes(q)
    );
  });

  const countByType = (type) => customers.filter((c) => c.customer_type === type).length;

  return (
    <div>
      <PageHeader
        title="Customers Management"
        subtitle="Add, edit, and manage all WASCO customer accounts across all districts."
        action={<button className="btn primary" onClick={openAdd}>👥 Add Customer</button>}
      />

      {error && <div className="alert error">⚠️ {error}</div>}
      {msg && <div className={`alert ${msg.startsWith("Error") ? "error" : "success"}`}>{msg}</div>}

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 12, marginBottom: 18 }}>
        <div className="summary-box">
          <span className="summary-box-label">Total Customers</span>
          <span className="summary-box-value">{customers.length}</span>
        </div>
        <div className="summary-box">
          <span className="summary-box-label">Residential</span>
          <span className="summary-box-value">{countByType("RESIDENTIAL")}</span>
        </div>
        <div className="summary-box">
          <span className="summary-box-label">Commercial</span>
          <span className="summary-box-value">{countByType("COMMERCIAL")}</span>
        </div>
        <div className="summary-box">
          <span className="summary-box-label">Institutional</span>
          <span className="summary-box-value">{countByType("INSTITUTIONAL")}</span>
        </div>
      </div>

      <TableCard>
        <div className="card-title-row">
          <h3>👥 All Customers — {filtered.length} shown</h3>
          <input
            placeholder="🔍 Search by name, account, phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 260, padding: "8px 12px", borderRadius: 10, border: "1px solid var(--line)" }}
          />
        </div>
        <table>
          <thead>
            <tr>
              <th>Account No.</th>
              <th>Full Name</th>
              <th>Type</th>
              <th>Branch</th>
              <th>District</th>
              <th>Status</th>
              <th>Phone</th>
              <th>Email</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length ? filtered.map((c) => (
              <tr key={c.customer_id}>
                <td><code style={{ fontSize: ".82rem" }}>{c.account_number}</code></td>
                <td><strong>{c.first_name} {c.last_name}</strong></td>
                <td><span style={{ fontSize: ".8rem", color: "var(--muted)" }}>{c.customer_type}</span></td>
                <td>{c.branch_name || "—"}</td>
                <td>{c.district || "—"}</td>
                <td>{statusBadge(c.connection_status)}</td>
                <td style={{ fontSize: ".85rem" }}>{c.phone || "—"}</td>
                <td style={{ fontSize: ".82rem", color: "var(--muted)" }}>{c.email || "—"}</td>
                <td className="actions">
                  <button className="btn small" onClick={() => openEdit(c)}>Edit</button>
                  <button className="btn small danger" onClick={() => remove(c.customer_id)}>Delete</button>
                </td>
              </tr>
            )) : (
              <tr><td colSpan="9" className="empty">{loading ? "Loading…" : "No customers found."}</td></tr>
            )}
          </tbody>
        </table>
      </TableCard>

      <FormModal
        open={open}
        title={editing ? `Edit Customer — ${editing.account_number}` : "Add New Customer"}
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
          <label>
            Account Number
            <input
              placeholder="e.g. WASCO-001"
              value={form.account_number}
              onChange={(e) => setForm({ ...form, account_number: e.target.value })}
              required
            />
          </label>
          <label>
            First Name
            <input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} required />
          </label>
          <label>
            Last Name
            <input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} required />
          </label>
          <label>
            Customer Type
            <select value={form.customer_type} onChange={(e) => setForm({ ...form, customer_type: e.target.value })}>
              <option>RESIDENTIAL</option>
              <option>COMMERCIAL</option>
              <option>INSTITUTIONAL</option>
            </select>
          </label>
          <label>
            Connection Status
            <select value={form.connection_status} onChange={(e) => setForm({ ...form, connection_status: e.target.value })}>
              <option>ACTIVE</option>
              <option>SUSPENDED</option>
              <option>DISCONNECTED</option>
            </select>
          </label>
          <label>
            Phone
            <input placeholder="+266 xxxx xxxx" value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </label>
          <label>
            Email
            <input type="email" placeholder="customer@example.com" value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </label>
          <label>
            National ID
            <input value={form.national_id || ""} onChange={(e) => setForm({ ...form, national_id: e.target.value })} />
          </label>
          <label>
            District
            <select value={form.district || ""} onChange={(e) => setForm({ ...form, district: e.target.value })}>
              <option value="">— Select district —</option>
              {DISTRICTS.map((d) => <option key={d}>{d}</option>)}
            </select>
          </label>
          <label className="span-2">
            Address Line 1
            <input
              placeholder="Street / area address"
              value={form.address_line1}
              onChange={(e) => setForm({ ...form, address_line1: e.target.value })}
              required
            />
          </label>
          <label className="span-2">
            Address Line 2
            <input
              placeholder="Additional address info (optional)"
              value={form.address_line2 || ""}
              onChange={(e) => setForm({ ...form, address_line2: e.target.value })}
            />
          </label>
          <label>
            Village / Town
            <input value={form.village_town || ""} onChange={(e) => setForm({ ...form, village_town: e.target.value })} />
          </label>
          <div />
          <button className="btn primary span-2" disabled={saving}>
            {saving ? "Saving…" : (editing ? "✏️ Update Customer" : "👥 Create Customer")}
          </button>
        </form>
      </FormModal>
    </div>
  );
}
